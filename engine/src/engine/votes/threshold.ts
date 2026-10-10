/**
 * BORA Engine — hourly vote thresholds
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 4. Converts one validated `VoteBucket` into its effective hourly C.
 * This is the FIRST place C exists in the engine.
 *
 *   C_U(upvotes)     0 → 0    1–4 → 1    5+ → 2
 *   C_D(downvotes)   0 → 0    1–4 → 0.5  5+ → 1
 *   C_h              max(0, C_U − C_D)
 *
 * WHY THE THRESHOLDS SATURATE (structural consequence, not an accident):
 *   C_U caps at 2 and C_D caps at 1, so C_h ∈ [0, 2] and takes values only on
 *   the 0.5 lattice {0, 0.5, 1, 1.5, 2}. 1 upvote and 4 upvotes are
 *   mathematically identical; so are 5 upvotes and 1,000,000. Vote brigading
 *   beyond the threshold therefore buys nothing, and downvote attacks are
 *   capped at removing half of a song's hourly C. This is why C_MAX is a
 *   property of the model rather than a limit someone chose.
 *
 * THE 4/5 BOUNDARY IS THE CRITICAL EDGE. 4 upvotes → C_U 1; 5 → C_U 2.
 *
 * SCOPE — this module deliberately does NOT:
 *   · modify the bucket, or K
 *   · compute XP, Kura, platform points, ranking, or any C window
 *   · read time, randomness, simulation state, or the network
 *   · expose the thresholds as configuration (Contract 9: fixed mathematics)
 *
 * PURE: no mutation, no clock, no randomness, no global state.
 */

import {
  UPVOTE_TIER_2_THRESHOLD,
  DOWNVOTE_TIER_2_THRESHOLD,
  C_ZERO,
  C_TIER_1,
  C_TIER_2,
  C_DOWN_TIER_1,
  C_DOWN_TIER_2,
} from '../constants';
import type { VoteBucket, Result, EngineError } from '../types';

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * A valid raw vote count is a finite, non-negative integer.
 *
 * Identical to the Phase 2/3 convention. A corrupt bucket is REJECTED, never
 * coerced: clamping a NaN upvote count to 0 would silently invent "this hour
 * had no votes" and manufacture a plausible-looking but false C (A7).
 */
function isValidRawCount(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

/**
 * Build the rejection for a corrupt bucket.
 *
 * Returns the `EngineError` itself rather than a `Result`, so callers can
 * wrap it into whichever `Result` shape their signature requires without
 * needing to narrow a union first.
 */
function invalidBucketError(bucket: VoteBucket): EngineError {
  return {
    code: 'INVALID_MEASUREMENT',
    message:
      'Raw vote counts must be finite, non-negative integers. A corrupt ' +
      'bucket is rejected rather than coerced, so a false C value is never ' +
      'manufactured from invalid state.',
    context: {
      hourIndex: String(bucket.hourIndex),
      upvotes: String(bucket.upvotes),
      downvotes: String(bucket.downvotes),
    },
  };
}

/**
 * Validate a bucket's raw counts.
 *
 * Only `upvotes` and `downvotes` are inspected. `hourIndex`, `phase` and
 * `version` are structural metadata and are not inputs to the mathematics.
 */
function validate(bucket: VoteBucket): Result<true, EngineError> {
  if (!isValidRawCount(bucket.upvotes) || !isValidRawCount(bucket.downvotes)) {
    return { ok: false, error: invalidBucketError(bucket) };
  }
  return { ok: true, value: true };
}

// ───────────────────────────────────────────────────────────────────────────
// THRESHOLD STEPS (exposed for the formula inspector, Contract Phase 47/48)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Upvote contribution C_U for a raw hourly upvote count.
 *
 *   0 → 0,  1–4 → 1,  5+ → 2
 *
 * Exported so the formula inspector can show C_U and C_D separately rather
 * than presenting C_h as an unexplained number.
 *
 * @param upvotes Raw hourly upvote count. Must be a finite non-negative integer.
 */
export function upvoteContribution(upvotes: number): number {
  if (upvotes === C_ZERO) return C_ZERO;
  if (upvotes < UPVOTE_TIER_2_THRESHOLD) return C_TIER_1;
  return C_TIER_2;
}

/**
 * Downvote contribution C_D for a raw hourly downvote count.
 *
 *   0 → 0,  1–4 → 0.5,  5+ → 1
 *
 * @param downvotes Raw hourly downvote count. Must be a finite non-negative
 *   integer. Callers should use `calculateHourlyC`, which validates.
 */
export function downvoteContribution(downvotes: number): number {
  if (downvotes === C_ZERO) return C_ZERO;
  if (downvotes < DOWNVOTE_TIER_2_THRESHOLD) return C_DOWN_TIER_1;
  return C_DOWN_TIER_2;
}

// ───────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Effective hourly C for one bucket.
 *
 *   C_h = max(0, C_U − C_D)
 *
 * The `max(0, …)` floor guarantees C is never negative: a heavily downvoted
 * hour clamps to 0 rather than producing a negative contribution that would
 * corrupt every downstream sum (T_C, XP, Kura).
 *
 * The bucket is not modified, and K is not touched. Calling this repeatedly
 * on the same bucket always yields the same value — C is a pure function of
 * the raw counts, never accumulated incrementally.
 *
 * @param bucket One hour of raw votes. Not modified.
 * @returns The effective hourly C, or INVALID_MEASUREMENT for a corrupt bucket.
 */
export function calculateHourlyC(
  bucket: VoteBucket,
): Result<number, EngineError> {
  const check = validate(bucket);
  if (!check.ok) {
    return { ok: false, error: check.error };
  }

  const cU = upvoteContribution(bucket.upvotes);
  const cD = downvoteContribution(bucket.downvotes);

  // The floor is the contract, not a defensive afterthought: Scenario I
  // (huge downvote burst) must be impossible to express as negative C.
  const c = cU - cD;

  return { ok: true, value: c > 0 ? c : 0 };
}
