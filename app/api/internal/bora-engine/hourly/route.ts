import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { HOUR_MS } from '@/engine/src/engine/constants';
import { runBoraEngineHour } from '@/lib/bora-engine/hour-entry';

export const runtime = 'nodejs';

function isAuthorized(request: Request, secret: string): boolean {
  const authorization = request.headers.get('authorization');
  if (!authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authorization);
  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
}

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

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Hourly worker is not configured.' },
      { status: 503 },
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const closedHour = Math.floor(Date.now() / HOUR_MS) - 1;
  if (!Number.isSafeInteger(closedHour) || closedHour < 0) {
    return NextResponse.json(
      { error: 'Unable to determine the closed UTC hour.' },
      { status: 500 },
    );
  }

  try {
    const result = await runBoraEngineHour({
      closedHour,
      claimRequestId: requestIdForHour(secret, closedHour),
    });
    const status =
      result.status === 'invalid-request'
        ? 400
        : result.status === 'not-eligible' ||
            result.status === 'not-ready' ||
            result.status === 'state-hour-mismatch' ||
            result.status === 'already-claimed'
          ? 409
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
