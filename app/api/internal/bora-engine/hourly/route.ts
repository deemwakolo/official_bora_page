import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { HOUR_MS } from '@/engine/src/engine/constants';
import { runBoraEngineThroughHour } from '@/lib/bora-engine/hour-entry';
import { authorizeScheduledRequest } from '@/lib/bora-engine/scheduled-request-auth';

export const runtime = 'nodejs';

function requestIdForHour(secret: string, closedHour: number): string {
  const bytes = createHmac('sha256', secret)
    .update(`bora-engine-hour:${closedHour}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function handleRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = await authorizeScheduledRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      {
        error:
          authorization.reason === 'misconfigured'
            ? 'Hourly worker is not configured.'
            : 'Unauthorized',
      },
      { status: authorization.reason === 'misconfigured' ? 503 : 401 },
    );
  }
  if (!secret) {
    return NextResponse.json(
      { error: 'Hourly worker is not configured.' },
      { status: 503 },
    );
  }

  const cutoverAt = process.env.BORA_ENGINE_VOTE_CUTOVER_AT;
  if (
    !cutoverAt ||
    !Number.isFinite(Date.parse(cutoverAt)) ||
    !/Z$/i.test(cutoverAt) ||
    Date.parse(cutoverAt) > Date.now()
  ) {
    return NextResponse.json(
      { error: 'Vote reconciliation cutover is not configured.' },
      { status: 503 },
    );
  }

  const closedHour = Math.floor(Date.now() / HOUR_MS) - 1;
  if (!Number.isSafeInteger(closedHour) || closedHour < 0) {
    return NextResponse.json(
      { error: 'Unable to determine the closed UTC hour.' },
      { status: 500 },
    );
  }

  try {
    const result = await runBoraEngineThroughHour({
      targetClosedHour: closedHour,
      cutoverAt,
      claimRequestIdForHour: (hour) => requestIdForHour(secret, hour),
    });
    const status =
      result.status === 'invalid-request'
        ? 400
        : result.status === 'not-eligible' ||
            result.status === 'not-ready' ||
            result.status === 'state-hour-mismatch' ||
            result.status === 'already-claimed'
          ? 409
          : result.status === 'catching-up'
            ? 200
          : result.status === 'configuration-unavailable' ||
              result.status === 'bootstrap-required' ||
              result.status === 'persistence-failure'
            ? 503
            : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error(
      '[bora-engine-hourly] invocation failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return NextResponse.json(
      { error: 'Hourly Engine processing failed.' },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
