/**
 * BORA Engine — rolling 7-day platform window
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 6. Deterministic selection and allocation of platform performance over
 * the active rolling 7-day window.
 *
 * THE WINDOW IS 168 ELAPSED CLOCK-HOURS, NOT 7 CALENDAR DATES.
 *
 *   A calendar-date window ("today, plus the previous 6 days") is a DIFFERENT
 *   interval and can be 144–168 hours wide depending on the month. The contract
 *   means a fixed elapsed duration, so the window here is a plain clock-hour
 *   range with the same inclusive convention as the 72-hour C window:
 *
 *       start = referenceHour − (168 − 1)  =  referenceHour − 167
 *       end   = referenceHour
 *
 *       H−167 → ACTIVE    (oldest included hour)
 *       H−168 → EXCLUDED  (first expired hour)
 *       H     → ACTIVE    (reference hour)
 *       H+1   → EXCLUDED  (future)
 *
 *   Like the C window, this is 168 CLOCK-HOURS ≠ 168 stored records. A song
 *   with 5 observations still has a 168-hour window.
 *
 * PLATFORM POINTS DO NOT DECAY (A4).
 *
 *   Platform points are a pure allocation derived fresh from the active window
 *   on every evaluation. They are NOT a stored, decaying balance like
 *   persistent Kura. There is deliberately no decay term in this module.
 *
 *   Platform points are also completely separate from K, from hourly C, and
 *   from Kura. Nothing here reads or writes any of them.
 *
 * NORMALISATION IS BY TOTAL ACTIVE ACTIVITY (LOCKED, Phase 6 decision)
 *
 *   points_i = (value_i / total_active_value) × weight
 *
 *   The denominator is the TOTAL activity in the active window. It is NOT a
 *   per-hour rate, and no additional hourly-rate denominator may be introduced.
 *
 *   CONSEQUENCE — missing observations are settled by construction:
 *
 *   Model A (not measured) and Model B (zero activity) are NUMERICALLY
 *   IDENTICAL here, because `points = value / total × weight` and adding zeros
 *   to a sum does not change the sum. A rate denominator would have separated
 *   them — and would have inverted rankings, rewarding sparse data — which is
 *   precisely why total-based normalisation was locked.
 *
 *   `platform/window.test.ts` (block P-E) pins this equivalence permanently, so
 *   a future switch to a rate denominator fails loudly instead of silently
 *   changing chart results.
 *
 * MISSING OBSERVATIONS
 *
 *   No explicit rule is required, because the locked total-based denominator
 *   makes the question arithmetically moot: aggregating only supplied
 *   observations and materialising every absent hour as zero produce the same
 *   number. `sumActiveValue` implements the former; the two coincide exactly.
 *
 * PURE: no mutation, no real clock, no randomness, no simulation state, no
 * React, no network. The reference hour is ALWAYS supplied by the caller.
 */

import { PLATFORM_WINDOW_HOURS, PLATFORM_WEIGHTS, PLATFORM_IDS } from '../constants';
import type {
  ActiveWindow,
  HourIndex,
  PlatformId,
  PlatformObservation,
  Result,
  EngineError,
} from '../types';

/** One song's active performance on a single platform. */
export interface PlatformPerformance {
  readonly songId: string;
  readonly platform: PlatformId;

  /** Aggregated raw activity inside the active window. */
  readonly totalValue: number;

  /** Normalised points. Never exceeds the platform weight. */
  readonly points: number;
}

/** A song's complete platform allocation across all three platforms. */
export interface PlatformAllocation {
  readonly songId: string;
  readonly youtube: number;
  readonly spotify: number;
  readonly boomplay: number;
  /** youtube + spotify + boomplay. Never exceeds PLATFORM_TOTAL (50). */
  readonly total: number;
}

// ───────────────────────────────────────────────────────────────────────────
// WINDOW
// ───────────────────────────────────────────────────────────────────────────

/**
 * The active 7-day (168 clock-hour) platform window for a reference hour.
 *
 * Uses the SAME inclusive convention as the 72-hour C window, so the two
 * windows are directly comparable and cannot drift apart:
 *
 *     startHour = referenceHour − (PLATFORM_WINDOW_HOURS − 1)
 *     endHour   = referenceHour
 *
 * @param referenceHour The current clock hour. Supplied by the caller.
 * @returns The inclusive 168-hour window, or INVALID_MEASUREMENT when the
 *   reference hour is not a finite integer (the same rule as the C window).
 */
export function getPlatformWindow(
  referenceHour: HourIndex,
): Result<ActiveWindow, EngineError> {
  if (!Number.isFinite(referenceHour) || !Number.isInteger(referenceHour)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MEASUREMENT',
        message:
          'Reference hour must be a finite integer. Rejected rather than ' +
          'coerced, so a malformed anchor can never shift the platform window.',
        context: { referenceHour: String(referenceHour) },
      },
    };
  }

  return {
    ok: true,
    value: {
      startHour: (referenceHour - (PLATFORM_WINDOW_HOURS - 1)) as HourIndex,
      endHour: referenceHour,
      hours: PLATFORM_WINDOW_HOURS,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// SELECTION
// ───────────────────────────────────────────────────────────────────────────

/**
 * Select a song's active observations for ONE platform, in hour order.
 *
 * A song has at most one observation per (platform, clock hour). A repeated
 * pair is invalid data and is rejected with `DUPLICATE_HOUR_INDEX` — the same
 * rule Phase 5 established for hourly C buckets, and for the same reason:
 * summing duplicates would invent performance that was never measured.
 *
 * Detection is order-independent and covers expired/future observations too,
 * because a repeated slot is a data defect regardless of current activity.
 *
 * @param observations One song's observations for a single platform.
 * @param window       An active platform window.
 * @returns Active observations ascending by hour, or an error.
 */
export function selectActiveObservations(
  observations: readonly PlatformObservation[],
  window: ActiveWindow,
): Result<PlatformObservation[], EngineError> {
  const seen = new Set<number>();

  for (const obs of observations) {
    if (!Number.isFinite(obs.hourIndex) || !Number.isInteger(obs.hourIndex)) {
      continue; // malformed hours are skipped, not reported as duplicates
    }
    if (seen.has(obs.hourIndex)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_HOUR_INDEX',
          message:
            'A song may hold only one observation per platform per clock ' +
            'hour. Summing duplicates would invent unmeasured performance.',
          context: {
            hourIndex: String(obs.hourIndex),
            platform: obs.platform,
          },
        },
      };
    }
    seen.add(obs.hourIndex);
  }

  const active = observations
    .filter(
      (o) =>
        Number.isFinite(o.hourIndex) &&
        Number.isInteger(o.hourIndex) &&
        o.hourIndex >= window.startHour &&
        o.hourIndex <= window.endHour,
    )
    .sort((a, b) => a.hourIndex - b.hourIndex);

  return { ok: true, value: active };
}

/**
 * Aggregate a song's active raw value for one platform.
 *
 * Only supplied observations are aggregated. Under the locked total-based
 * denominator this is arithmetically identical to materialising every absent
 * hour as zero, so no explicit missing-observation rule is needed.
 *
 * @returns The summed active value, or an error.
 */
export function sumActiveValue(
  observations: readonly PlatformObservation[],
  window: ActiveWindow,
): Result<number, EngineError> {
  const active = selectActiveObservations(observations, window);
  if (!active.ok) {
    return { ok: false, error: active.error };
  }

  let total = 0;
  for (const obs of active.value) {
    if (!Number.isFinite(obs.value) || obs.value < 0) {
      return {
        ok: false,
        error: {
          code: 'INVALID_MEASUREMENT',
          message:
            'Platform observation values must be finite and non-negative. ' +
            'Rejected rather than coerced.',
          context: {
            hourIndex: String(obs.hourIndex),
            platform: obs.platform,
            value: String(obs.value),
          },
        },
      };
    }
    total += obs.value;
  }

  return { ok: true, value: total };
}

// ───────────────────────────────────────────────────────────────────────────
// NORMALISATION AND ALLOCATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * Normalise one platform's performances into points.
 *
 *   points_i = (value_i / total) × weight
 *
 * GUARANTEES:
 *   · points sum to exactly `weight` when total > 0
 *   · no single song exceeds `weight` (values are non-negative)
 *   · when total === 0 every song receives exactly 0 — a platform with no
 *     activity contributes zero points rather than dividing by zero
 *
 * NO DECAY IS APPLIED (A4). These points are a pure function of the supplied
 * performances, recomputed on every evaluation. They are not a stored,
 * decaying balance the way persistent Kura is.
 *
 * @param performances Per-song active values for ONE platform.
 * @param weight       That platform's fixed weight (30 / 15 / 5).
 * @returns songId → points.
 */
export function normalizePlatform(
  performances: ReadonlyMap<string, number>,
  weight: number,
): Map<string, number> {
  const points = new Map<string, number>();

  let total = 0;
  for (const value of performances.values()) {
    total += value;
  }

  if (total <= 0) {
    // No activity on this platform: every song scores zero. No NaN, no
    // division by zero, and the platform simply contributes nothing.
    for (const songId of performances.keys()) {
      points.set(songId, 0);
    }
    return points;
  }

  for (const [songId, value] of performances) {
    points.set(songId, (value / total) * weight);
  }

  return points;
}

/**
 * Allocate all three platforms for one song.
 *
 * Each platform is normalised INDEPENDENTLY: YouTube points depend only on
 * YouTube activity, Spotify only on Spotify, Boomplay only on Boomplay. There
 * is no cross-platform balancing and no hidden renormalisation, so dominance
 * on one platform earns nothing on another.
 *
 * @param performances Per-song active values, one map per platform.
 * @param songId       The song to allocate for.
 * @returns The song's allocation. `total` never exceeds PLATFORM_TOTAL (50).
 */
export function allocatePlatformPoints(
  performances: Readonly<Record<PlatformId, ReadonlyMap<string, number>>>,
  songId: string,
): PlatformAllocation {
  const yt =
    normalizePlatform(performances.youtube, PLATFORM_WEIGHTS.youtube).get(songId) ?? 0;
  const sp =
    normalizePlatform(performances.spotify, PLATFORM_WEIGHTS.spotify).get(songId) ?? 0;
  const bp =
    normalizePlatform(performances.boomplay, PLATFORM_WEIGHTS.boomplay).get(songId) ?? 0;

  return {
    songId,
    youtube: yt,
    spotify: sp,
    boomplay: bp,
    total: yt + sp + bp,
  };
}

// Re-exported so callers can read the locked weights from this module.
export { PLATFORM_WEIGHTS, PLATFORM_IDS, PLATFORM_WINDOW_HOURS };
