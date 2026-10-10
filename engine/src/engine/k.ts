/**
 * BORA Engine — K (historical upvotes)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 2. Answers exactly one question:
 *
 *   Can the engine represent and calculate permanent historical upvotes
 *   correctly and independently?
 *
 * K is the single most durable quantity in the BORA model:
 *   · incremented by every VALID upvote
 *   · never decremented (downvotes do not touch it)
 *   · never decayed
 *   · never reset by the 72-hour window, Vault, or restoration
 *   · score-neutral (Contract 2) — it is ranking tie-break #2, nothing more
 *
 * K INDEPENDENCE (Phase 2, K-4): this module imports NOTHING from the C,
 * bucket, threshold, Kura, platform, or scoring modules. That is enforced
 * structurally — there is no import to violate — rather than by a runtime
 * test. The engine's independence from C is therefore a property of the
 * dependency graph, provable by reading this file's import list.
 *
 * This module is PURE: no mutation, no clock, no randomness, no global state.
 */

import type { Result, EngineError } from './types';

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION (Phase 2 decision)
// ───────────────────────────────────────────────────────────────────────────

/**
 * A valid K or vote count is a finite, non-negative integer.
 *
 * Rejects: NaN, Infinity, -Infinity, negatives, and fractions.
 *
 * Why integers: K counts discrete votes. A fractional K would mean a vote was
 * partially applied, which has no meaning in the model. Because K is summed
 * across a song's whole lifetime, accepting a fraction would let a single
 * malformed call permanently corrupt every downstream value.
 */
function isNonNegativeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function invalidK(k: number): Result<number, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_K',
      message:
        'K must be a finite, non-negative integer. Received a value that is ' +
        'NaN, infinite, negative, or fractional.',
      context: { k: String(k) },
    },
  };
}

function invalidVoteCount(n: number): Result<number, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_MEASUREMENT',
      message:
        'Vote count must be a finite, non-negative integer. Received a value ' +
        'that is NaN, infinite, negative, or fractional.',
      context: { n: String(n) },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Add `n` valid upvotes to the current K.
 *
 *   K_new = K + n
 *
 * K-5: for n >= 0 this is monotonically non-decreasing, and strictly
 * increasing for n > 0. There is no path through this function that lowers K.
 *
 * K-6: no artificial cap. JS numbers represent integers exactly up to
 * 2^53 - 1 (9,007,199,254,740,991), so any realistic lifetime upvote total is
 * summed without precision loss. The cap is a property of the numeric type,
 * not a business rule, and is documented rather than enforced.
 *
 * @param k Current K. Must be a finite, non-negative integer.
 * @param n Upvotes to add. Must be a finite, non-negative integer.
 * @returns The new K, or INVALID_K / INVALID_MEASUREMENT. Never clamps.
 */
export function addUpvotes(k: number, n: number): Result<number, EngineError> {
  if (!isNonNegativeInteger(k)) {
    return invalidK(k);
  }
  if (!isNonNegativeInteger(n)) {
    return invalidVoteCount(n);
  }
  return { ok: true, value: k + n };
}

/**
 * Apply `n` downvotes to the current K.
 *
 *   K_new = K      (unchanged)
 *
 * K-3: downvotes NEVER affect K. This function exists solely to make that
 * invariant explicit and testable rather than an absence. The vote is still
 * validated, because a malformed downvote must be rejected loudly — but a
 * VALID downvote leaves K exactly as it was.
 *
 * Note this is NOT a no-op signature: a future engine that wrongly let
 * downvotes touch K would break K-3 here, in a test written before any scoring
 * code existed.
 *
 * @param k Current K. Must be a finite, non-negative integer.
 * @param n Downvotes received. Must be a finite, non-negative integer.
 * @returns K unchanged, or INVALID_K / INVALID_MEASUREMENT.
 */
export function addDownvotes(k: number, n: number): Result<number, EngineError> {
  if (!isNonNegativeInteger(k)) {
    return invalidK(k);
  }
  if (!isNonNegativeInteger(n)) {
    return invalidVoteCount(n);
  }
  return { ok: true, value: k };
}
