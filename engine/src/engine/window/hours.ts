/**
 * BORA Engine — rolling 72-clock-hour C window
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 5. Deterministic selection of the active hourly buckets for a song.
 *
 * THE CENTRAL DISTINCTION (A5):
 *
 *     72 CLOCK-HOURS  ≠  72 STORED RECORDS
 *
 * The window is a range of clock time, not a count of rows. The active
 * interval for reference hour H is H−71 … H inclusive — exactly 72 clock
 * hours, the current in-progress hour included. Missing hours are simply
 * hours with zero activity; they do NOT shrink the window and are NOT
 * fabricated as stored records.
 *
 * Concretely, for reference hour H:
 *
 *     H − 71  →  ACTIVE    (oldest included hour)
 *     H − 72  →  EXCLUDED  (first expired hour)
 *     H       →  ACTIVE    (reference hour, in-progress)
 *     H + 1   →  EXCLUDED  (future)
 *
 * So a song holding only 3 stored buckets inside the window still has a
 * 72-hour window; those 3 contribute, and the other 69 hours contribute 0.
 * A song holding 71 records does NOT have its window end early.
 *
 * EXPIRY IS A SELECTION, NOT A DELETION (Contract 11). Records outside the
 * window are never removed, mutated, or archived by this module. Archiving is
 * a simulation-layer concern that happens to agree with this selection; the
 * mathematics here only decides membership.
 *
 * PURE: no mutation, no real clock, no randomness, no simulation state, no
 * React, no network. The reference hour is ALWAYS supplied by the caller.
 */

import { C_WINDOW_HOURS } from '../constants';
import type {
  ActiveWindow,
  HourIndex,
  VoteBucket,
  Result,
  EngineError,
} from '../types';
import { calculateHourlyC } from '../votes/threshold';

/** Any record identified by a canonical clock hour. */
export interface HourBearing {
  readonly hourIndex: HourIndex;
}

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * A valid hour index is a finite integer.
 *
 * Deliberately NOT required to be non-negative: a window anchored at a small
 * reference hour legitimately extends to negative indices, where no records
 * exist and every hour therefore contributes 0. Imposing a non-negative rule
 * would be inventing a constraint the contract never states.
 */
function isValidHourIndex(hour: number): boolean {
  return Number.isFinite(hour) && Number.isInteger(hour);
}

function invalidReferenceHour(hour: number): Result<ActiveWindow, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_MEASUREMENT',
      message:
        'Reference hour must be a finite integer. Rejected rather than ' +
        'coerced, so a malformed anchor can never silently shift the window.',
      context: { referenceHour: String(hour) },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// WINDOW DEFINITION
// ───────────────────────────────────────────────────────────────────────────

/**
 * The active 72-clock-hour window for a reference hour.
 *
 * This is the SINGLE place the boundary is defined. Both bounds are
 * inclusive, so the window spans exactly `C_WINDOW_HOURS` clock hours:
 * `referenceHour − (72 − 1)` through `referenceHour`.
 *
 * The off-by-one is the whole point. `H − 72` is EXCLUDED; using `H − 72` as
 * the start would produce a 73-hour window and let one extra hour of C leak
 * into every chart, which is precisely the class of bug this phase exists to
 * prevent.
 *
 * @param referenceHour The current clock hour. Supplied by the caller.
 * @returns The inclusive window, or INVALID_MEASUREMENT if the hour is
 *   non-finite or fractional.
 */
export function getActiveWindow(
  referenceHour: HourIndex,
): Result<ActiveWindow, EngineError> {
  if (!isValidHourIndex(referenceHour)) {
    return invalidReferenceHour(referenceHour);
  }

  return {
    ok: true,
    value: {
      startHour: (referenceHour - (C_WINDOW_HOURS - 1)) as HourIndex,
      endHour: referenceHour,
      hours: C_WINDOW_HOURS,
    },
  };
}

/**
 * Is `hour` inside the window? Both bounds inclusive.
 *
 * The reusable membership predicate. Boundary behaviour:
 *   startHour → true, endHour → true, startHour − 1 → false, endHour + 1 → false
 */
export function isHourInWindow(hour: HourIndex, window: ActiveWindow): boolean {
  return hour >= window.startHour && hour <= window.endHour;
}

// ───────────────────────────────────────────────────────────────────────────
// SELECTION
// ───────────────────────────────────────────────────────────────────────────

/**
 * Select the records that fall inside the active window.
 *
 * ORDERING: results are returned in ascending chronological hour order,
 * independent of the input array's order. Input order must never be able to
 * change a mathematical result.
 *
 * MISSING HOURS: absent hours are NOT materialised. The returned array holds
 * only stored records, so its length is at most the window size and may be far
 * fewer. Use `window.hours` for the true window span. The mathematical
 * contribution of a missing hour is 0, which `sumActiveC` obtains for free by
 * summing only what exists.
 *
 * DUPLICATE HOURS ARE REJECTED (Phase 5 revision).
 *
 *   A song has exactly ONE state per clock hour, so the same `HourIndex`
 *   appearing twice is INVALID DATA, not something to reconcile. The window
 *   operation returns `DUPLICATE_HOUR_INDEX` instead of:
 *     · merging the records      — invents data
 *     · summing the records      — silently DOUBLE-COUNTS activity
 *     · picking one arbitrarily  — depends on input order, and which one wins
 *                                 would change the score
 *     · discarding one silently  — discards real votes
 *
 *   Detection is order-independent: a set of hours is a set, so any input
 *   permutation of the same data produces the same rejection. Detection also
 *   covers duplicates OUTSIDE the window (expired or future), because a
 *   repeated hour is a data-integrity defect regardless of whether the record
 *   happens to be active right now.
 *
 * NO MUTATION: a new array is returned. The input array and its records are
 * untouched, and excluded records are neither deleted nor archived.
 *
 * @param records Stored records, in any order.
 * @param window  An active window from `getActiveWindow`.
 * @returns The active records in ascending hour order, or
 *   DUPLICATE_HOUR_INDEX if any hour appears more than once.
 */
export function selectActive<T extends HourBearing>(
  records: readonly T[],
  window: ActiveWindow,
): Result<T[], EngineError> {
  // 1. Validate uniqueness across the WHOLE input, before any selection, so
  //    detection cannot depend on which records happen to be active.
  const seen = new Set<number>();

  for (const record of records) {
    if (!isValidHourIndex(record.hourIndex)) {
      continue; // invalid hours are filtered below, not reported as duplicates
    }
    if (seen.has(record.hourIndex)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_HOUR_INDEX',
          message:
            'A song may hold only one record per clock hour. The same ' +
            'HourIndex appeared more than once; merging, summing, or ' +
            'discarding would hide a data defect, and summing would ' +
            'double-count activity.',
          context: {
            hourIndex: String(record.hourIndex),
            windowStart: String(window.startHour),
            windowEnd: String(window.endHour),
          },
        },
      };
    }
    seen.add(record.hourIndex);
  }

  // 2. Select and order.
  const selected: T[] = [];

  for (const record of records) {
    if (
      isValidHourIndex(record.hourIndex) &&
      isHourInWindow(record.hourIndex, window)
    ) {
      selected.push(record);
    }
  }

  return { ok: true, value: selected.sort((a, b) => a.hourIndex - b.hourIndex) };
}

/**
 * The active `VoteBucket` records for a reference hour, chronologically.
 *
 * Convenience wrapper over `selectActive`, so callers do not have to build a
 * window by hand just to list active buckets.
 *
 * @param buckets Stored buckets, in any order.
 * @param referenceHour The current clock hour.
 * @returns Active buckets in ascending hour order, or INVALID_MEASUREMENT.
 */
export function getActiveBuckets(
  buckets: readonly VoteBucket[],
  referenceHour: HourIndex,
): Result<VoteBucket[], EngineError> {
  const window = getActiveWindow(referenceHour);
  if (!window.ok) {
    return { ok: false, error: window.error };
  }
  return selectActive(buckets, window.value);
}

// ───────────────────────────────────────────────────────────────────────────
// ACTIVE C SUM
// ───────────────────────────────────────────────────────────────────────────

/**
 * Sum the effective C across the active 72-clock-hour window.
 *
 * This is the song-level `C_i = Σ active C_h` (Contract 6), computed by
 * applying the Phase 4 thresholds to each active bucket and adding the
 * results.
 *
 * MISSING HOURS CONTRIBUTE ZERO — no record, no term. A window holding 3
 * buckets and a window holding 72 buckets both span 72 clock hours; the
 * difference is only how many terms the sum has.
 *
 * A corrupt bucket inside the window causes the whole sum to FAIL rather than
 * contributing a fabricated value: a NaN count coerced to 0 would quietly
 * report less C than the song actually earned, and that error would then
 * propagate invisibly into T_C, XP and Kura.
 *
 * No XP, Kura, seed, platform, or ranking logic is involved — raw active C
 * only.
 *
 * @param buckets Stored buckets, in any order. Not mutated.
 * @param referenceHour The current clock hour.
 * @returns The summed active C, or the first validation error encountered.
 */
export function sumActiveC(
  buckets: readonly VoteBucket[],
  referenceHour: HourIndex,
): Result<number, EngineError> {
  const active = getActiveBuckets(buckets, referenceHour);
  if (!active.ok) {
    return { ok: false, error: active.error };
  }

  let total = 0;

  for (const bucket of active.value) {
    const c = calculateHourlyC(bucket);
    if (!c.ok) {
      return { ok: false, error: c.error };
    }
    total += c.value;
  }

  return { ok: true, value: total };
}
