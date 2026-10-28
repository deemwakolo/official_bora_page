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

export type BoraEngineHourEntryResult =
  | { readonly status: 'invalid-request' }
  | { readonly status: 'configuration-unavailable' }
  | { readonly status: 'bootstrap-required' }
  | { readonly status: 'already-completed'; readonly closedHour: number }
  | { readonly status: 'state-hour-mismatch' }
  | { readonly status: 'persistence-failure' }
  | {
      readonly status: 'completed';
      readonly closedHour: number;
      readonly nextHour: number;
      readonly processedActiveSongCount: number;
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
      return { status: 'persistence-failure' };
  }
}

/**
 * Internal server-only entry point. It is not registered as a route, action,
 * UI handler, or scheduled task. An operator integration must explicitly call
 * it with a stable request UUID for safe retries.
 */
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
    const bootstrap = await setup.persistence.checkBootstrap(closedHour);
    if (bootstrap.status === 'missing') {
      return { status: 'bootstrap-required' };
    }
    if (bootstrap.status === 'reference-hour-mismatch') {
      return { status: 'state-hour-mismatch' };
    }
    if (bootstrap.status === 'already-completed') {
      return { status: 'already-completed', closedHour: input.closedHour };
    }
  } catch {
    return { status: 'persistence-failure' };
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
  } catch {
    return { status: 'persistence-failure' };
  }
}
