import { NextResponse } from 'next/server';
import { HOUR_MS } from '@/engine/src/engine/constants';
import { authorizeScheduledRequest } from '@/lib/bora-engine/scheduled-request-auth';
import { createBoraEnginePersistenceFromEnv } from '@/lib/bora-engine/persistence';

export const runtime = 'nodejs';

async function handleRequest(request: Request) {
  const authorization = await authorizeScheduledRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json(
      {
        error:
          authorization.reason === 'misconfigured'
            ? 'Engine health check is not configured.'
            : 'Unauthorized',
      },
      { status: authorization.reason === 'misconfigured' ? 503 : 401 },
    );
  }

  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status !== 'available') {
    return NextResponse.json(
      { status: 'unavailable', reason: 'configuration-unavailable' },
      { status: 503 },
    );
  }

  try {
    const referenceHour = await setup.persistence.readHourlyReferenceHour();
    const latestClosedHour = Math.floor(Date.now() / HOUR_MS) - 1;
    if (referenceHour === null) {
      return NextResponse.json(
        {
          status: 'uninitialized',
          latestClosedHour,
          checkedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    const lastCompletedHour = referenceHour - 1;
    const lagHours = Math.max(0, latestClosedHour - lastCompletedHour);
    const status = lagHours > 2 ? 'stale' : 'fresh';
    return NextResponse.json(
      {
        status,
        referenceHour,
        latestClosedHour,
        lastCompletedHour,
        lagHours,
        checkedAt: new Date().toISOString(),
      },
      { status: status === 'stale' ? 503 : 200 },
    );
  } catch (error) {
    console.error(
      '[bora-engine-worker-health] invocation failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return NextResponse.json(
      { error: 'Engine freshness check failed.' },
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
