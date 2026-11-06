import 'server-only';

import {
  HOUR_MS,
  TRANSITION_MS,
} from '../../engine/src/engine/constants';
import type { HourIndex } from '../../engine/src/engine/types';
import { createBoraEnginePersistenceFromEnv } from './persistence';
import { runHourlyRollover } from './hourly-runner';
import type { HourlyRolloverResult } from './hourly-runner';

const LEASE_DURATION_MS = 120_000;
const MAX_HOURS_PER_INVOCATION = 4;

export type BoraEngineHourEntryResult =
  | { readonly status: 'invalid-request' }
  | { readonly status: 'configuration-unavailable' }
  | { readonly status: 'bootstrap-required' }
  | { readonly status: 'already-completed'; readonly closedHour: number }
  | { readonly status: 'state-hour-mismatch' }
  | {
      readonly status: 'persistence-failure';
      readonly reason?: Extract<
        HourlyRolloverResult,
        { status: 'retryable-failure' }
      >['reason'];
    }
  | {
      readonly status: 'completed';
      readonly closedHour: number;
      readonly nextHour: number;
      readonly processedActiveSongCount: number;
      readonly processedHourCount: number;
    }
  | {
      readonly status: 'catching-up';
      readonly closedHour: number;
      readonly nextHour: number;
      readonly remainingHours: number;
      readonly processedHourCount: number;
    }
  | { readonly status: 'already-claimed'; readonly closedHour: number }
  | {
      readonly status: 'not-eligible';
      readonly closedHour: number;
      readonly eligibleAtMs: number;
    }
  | {
      readonly status: 'not-ready';
      readonly closedHour: number;
      readonly gapCount: number;
      readonly reason?: string;
    };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sanitizeResult(
  result: HourlyRolloverResult,
): BoraEngineHourEntryResult {
  switch (result.status) {
    case 'completed':
      return {
        status: 'completed',
        closedHour: result.closedHour,
        nextHour: result.nextHour,
        processedActiveSongCount: result.processedActiveSongCount,
        processedHourCount: 1,
      };
    case 'already-completed':
    case 'already-claimed':
      return { status: result.status, closedHour: result.closedHour };
    case 'not-eligible':
      return {
        status: result.status,
        closedHour: result.closedHour,
        eligibleAtMs: result.eligibleAtMs,
      };
    case 'not-ready':
      return {
        status: 'not-ready',
        closedHour: result.closedHour,
        gapCount: result.gaps.length,
      };
    case 'blocked-by-missing-persistence':
      return { status: 'configuration-unavailable' };
    case 'retryable-failure':
      return { status: 'persistence-failure', reason: result.reason };
  }
}

/** Internal server-only entry point for the protected hourly worker route. */
export async function runBoraEngineHour(input: {
  readonly closedHour: number;
  readonly claimRequestId: string;
}): Promise<BoraEngineHourEntryResult> {
  if (
    !input ||
    typeof input !== 'object' ||
    !Number.isSafeInteger(input.closedHour) ||
    input.closedHour < 0 ||
    !Number.isSafeInteger(input.closedHour * HOUR_MS) ||
    !isUuid(input.claimRequestId)
  ) {
    return { status: 'invalid-request' };
  }

  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status === 'configuration-unavailable') {
    return { status: 'configuration-unavailable' };
  }

  const closedHour = input.closedHour as HourIndex;
  const nowMs = Date.now();
  const eligibleAtMs = (input.closedHour + 1) * HOUR_MS + TRANSITION_MS;
  if (!Number.isSafeInteger(eligibleAtMs)) {
    return { status: 'invalid-request' };
  }
  if (nowMs < eligibleAtMs) {
    return {
      status: 'not-eligible',
      closedHour: input.closedHour,
      eligibleAtMs,
    };
  }

  try {
    const result = await runHourlyRollover({
      closedHour: input.closedHour,
      claimRequestId: input.claimRequestId,
      nowMs,
      leaseDurationMs: LEASE_DURATION_MS,
      persistence: setup.persistence,
    });
    return sanitizeResult(result);
  } catch (error) {
    console.error(
      '[bora-engine-hourly] single-hour rollover failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return { status: 'persistence-failure' };
  }
}

/** Reconcile and roll forward from the persisted head without skipping hours. */
export async function runBoraEngineThroughHour(input: {
  readonly targetClosedHour: number;
  readonly cutoverAt: string;
  readonly claimRequestIdForHour: (closedHour: number) => string;
}): Promise<BoraEngineHourEntryResult> {
  if (
    !input ||
    !Number.isSafeInteger(input.targetClosedHour) ||
    input.targetClosedHour < 0 ||
    !Number.isSafeInteger(input.targetClosedHour * HOUR_MS) ||
    !Number.isFinite(Date.parse(input.cutoverAt)) ||
    !/Z$/i.test(input.cutoverAt)
  ) {
    return { status: 'invalid-request' };
  }

  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status === 'configuration-unavailable') {
    return { status: 'configuration-unavailable' };
  }

  let nextHour: number | null;
  try {
    nextHour = await setup.persistence.readHourlyReferenceHour();
  } catch (error) {
    console.error(
      '[bora-engine-hourly] state-head read failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return { status: 'persistence-failure' };
  }
  if (nextHour === null) return { status: 'bootstrap-required' };
  if (nextHour > input.targetClosedHour) {
    return {
      status: 'already-completed',
      closedHour: input.targetClosedHour,
    };
  }

  let processedHourCount = 0;
  let lastProcessedSongCount = 0;
  let lastClosedHour = nextHour;
  const nowMs = Date.now();

  while (
    nextHour <= input.targetClosedHour &&
    processedHourCount < MAX_HOURS_PER_INVOCATION
  ) {
    const claimRequestId = input.claimRequestIdForHour(nextHour);
    const claim = await setup.persistence.claimHour({
      closedHour: nextHour as HourIndex,
      claimRequestId,
      leaseDurationMs: LEASE_DURATION_MS,
    });

    if (claim.status === 'already-claimed') {
      return { status: 'already-claimed', closedHour: nextHour };
    }
    if (claim.status === 'already-completed') {
      return { status: 'already-completed', closedHour: nextHour };
    }
    if (claim.status === 'not-eligible') {
      return {
        status: 'not-eligible',
        closedHour: nextHour,
        eligibleAtMs: claim.eligibleAtMs,
      };
    }
    if (claim.status !== 'claimed' || !claim.leaseToken) {
      return { status: 'persistence-failure', reason: 'claim-failed' };
    }

    let coverage;
    try {
      coverage = await setup.persistence.reconcileHourlyCoverage({
        closedHour: nextHour as HourIndex,
        cutoverAt: input.cutoverAt,
      });
    } catch (error) {
      console.error(
        '[bora-engine-hourly] coverage reconciliation failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
      await setup.persistence.releaseNotReady({
        closedHour: nextHour as HourIndex,
        leaseToken: claim.leaseToken,
      });
      return { status: 'persistence-failure' };
    }
    if (
      coverage.status === 'ready' &&
      coverage.processedActiveSongCount === 0
    ) {
      await setup.persistence.releaseNotReady({
        closedHour: nextHour as HourIndex,
        leaseToken: claim.leaseToken,
      });
      return {
        status: 'not-ready',
        closedHour: nextHour,
        gapCount: 1,
        reason: 'no-active-songs',
      };
    }
    if (coverage.status !== 'ready') {
      await setup.persistence.releaseNotReady({
        closedHour: nextHour as HourIndex,
        leaseToken: claim.leaseToken,
      });
      if (coverage.reason === 'reference-hour-mismatch') {
        return { status: 'state-hour-mismatch' };
      }
      return {
        status: 'not-ready',
        closedHour: nextHour,
        gapCount: coverage.mismatchCount ?? 1,
        ...(coverage.reason ? { reason: coverage.reason } : {}),
      };
    }

    let rollover: HourlyRolloverResult;
    try {
      rollover = await runHourlyRollover({
        closedHour: nextHour,
        claimRequestId,
        nowMs,
        leaseDurationMs: LEASE_DURATION_MS,
        persistence: setup.persistence,
        preclaimedLeaseToken: claim.leaseToken,
      });
    } catch {
      await setup.persistence.releaseNotReady({
        closedHour: nextHour as HourIndex,
        leaseToken: claim.leaseToken,
      });
      return { status: 'persistence-failure' };
    }
    if (rollover.status !== 'completed') {
      if (rollover.status === 'retryable-failure') {
        console.error(
          '[bora-engine-hourly] rollover persistence failure:',
          rollover.reason,
        );
      }
      return sanitizeResult(rollover);
    }

    lastClosedHour = rollover.closedHour;
    lastProcessedSongCount = rollover.processedActiveSongCount;
    nextHour = rollover.nextHour;
    processedHourCount += 1;
  }

  if (processedHourCount === 0) {
    return {
      status: 'already-completed',
      closedHour: input.targetClosedHour,
    };
  }
  if (nextHour <= input.targetClosedHour) {
    return {
      status: 'catching-up',
      closedHour: lastClosedHour,
      nextHour,
      remainingHours: input.targetClosedHour - nextHour + 1,
      processedHourCount,
    };
  }
  return {
    status: 'completed',
    closedHour: lastClosedHour,
    nextHour,
    processedActiveSongCount: lastProcessedSongCount,
    processedHourCount,
  };
}
