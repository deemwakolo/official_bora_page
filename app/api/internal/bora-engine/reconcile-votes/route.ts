import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { reconcileSecureVoteDelivery } from '@/lib/bora-engine/vote-event-reconciliation';

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

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Vote reconciliation is not configured.' },
      { status: 503 },
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoverIso = process.env.BORA_ENGINE_VOTE_CUTOVER_AT;
  if (
    !cutoverIso ||
    !Number.isFinite(Date.parse(cutoverIso)) ||
    !/Z$/i.test(cutoverIso) ||
    Date.parse(cutoverIso) > Date.now()
  ) {
    return NextResponse.json(
      { error: 'Vote reconciliation cutover is not configured.' },
      { status: 503 },
    );
  }

  try {
    const report = await reconcileSecureVoteDelivery({ cutoverIso });
    if (
      report.status === 'configuration-unavailable' ||
      report.status === 'invalid-input'
    ) {
      return NextResponse.json(
        { status: report.status },
        { status: 503 },
      );
    }

    const hasEventErrors =
      report.counts.invalidInput > 0 ||
      report.counts.conflictingIdentity > 0 ||
      report.counts.persistenceFailure > 0 ||
      report.counts.commitUnknown > 0;
    return NextResponse.json({
      status: report.status,
      stopReason: report.stopReason,
      batches: report.batches,
      sourceRowsScanned: report.sourceRowsScanned,
      pendingEvents: report.pendingEvents,
      counts: report.counts,
    }, {
      status: report.status === 'aborted' || hasEventErrors ? 503 : 200,
    });
  } catch (error) {
    console.error(
      '[bora-engine-vote-reconciliation] invocation failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return NextResponse.json(
      { error: 'Vote reconciliation failed.' },
      { status: 500 },
    );
  }
}
