import { NextResponse } from 'next/server';
import { authorizeScheduledRequest } from '@/lib/bora-engine/scheduled-request-auth';

export const runtime = 'nodejs';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function invokeInternalWorker(
  request: Request,
  path: string,
  secret: string,
): Promise<{ readonly response: Response; readonly result: JsonRecord }> {
  const response = await fetch(new URL(path, request.url), {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });
  const result: unknown = await response.json();
  if (!isRecord(result)) {
    throw new Error('BORA_ENGINE_INVALID_WORKER_RESPONSE');
  }
  return { response, result };
}

export async function POST(request: Request) {
  const authorization = await authorizeScheduledRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      {
        error:
          authorization.reason === 'misconfigured'
            ? 'Scheduled Engine cycle is not configured.'
            : 'Unauthorized',
      },
      { status: authorization.reason === 'misconfigured' ? 503 : 401 },
    );
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Scheduled Engine cycle is not configured.' },
      { status: 503 },
    );
  }

  try {
    const reconciliation = await invokeInternalWorker(
      request,
      '/api/internal/bora-engine/reconcile-votes',
      secret,
    );
    const counts = reconciliation.result.counts;
    const hasEventErrors =
      !isRecord(counts) ||
      ['invalidInput', 'conflictingIdentity', 'persistenceFailure', 'commitUnknown']
        .some((key) => typeof counts[key] !== 'number' || counts[key] !== 0);
    const reconciliationCompleted =
      reconciliation.response.status === 200 &&
      reconciliation.result.status === 'completed' &&
      reconciliation.result.stopReason === 'source-exhausted' &&
      !hasEventErrors;

    if (!reconciliationCompleted) {
      return NextResponse.json(
        {
          status: 'reconciliation-blocked',
          httpStatus: reconciliation.response.status,
          result: reconciliation.result,
        },
        { status: 503 },
      );
    }

    const hourly = await invokeInternalWorker(
      request,
      '/api/internal/bora-engine/hourly',
      secret,
    );
    const hourlyStatus = hourly.result.status;
    const hourlyCompleted =
      hourly.response.status === 200 &&
      (hourlyStatus === 'completed' ||
        hourlyStatus === 'already-completed' ||
        hourlyStatus === 'catching-up');

    if (!hourlyCompleted) {
      return NextResponse.json(
        {
          status: 'hourly-processing-blocked',
          reconciliation: 'completed',
          httpStatus: hourly.response.status,
          result: hourly.result,
        },
        { status: hourly.response.status === 409 ? 409 : 503 },
      );
    }

    return NextResponse.json({
      status: hourlyStatus,
      reconciliation: 'completed',
      hourly: hourly.result,
    });
  } catch (error) {
    console.error(
      '[bora-engine-scheduled-cycle] invocation failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return NextResponse.json(
      { error: 'Scheduled Engine cycle failed.' },
      { status: 500 },
    );
  }
}
