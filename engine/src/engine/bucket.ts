/**
 * BORA Engine — hourly vote buckets
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 3. Establishes the deterministic hourly vote container and its event
 * behaviour. Nothing else.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO:
 *   · no C_U, C_D, or C_h  — thresholds are a later phase
 *   · no Kura, XP, or platform points
 *   · no ranking
 *   · no 10-minute transition routing (that is a later phase; `phase` is only
 *     carried through untouched here)
 *   · no K update — K and hourly voting are mathematically separate, and the
 *     simulation layer will eventually orchestrate "vote event → K update +
 *     bucket update". That orchestration is NOT part of this phase, and this
 *     module imports nothing from `k.ts`.
 *
 * A bucket stores RAW counts only. C is always a pure function of those
 * counts, derived later, never stored here. Storing C in the bucket would
 * make it impossible to recompute C from raw votes when a threshold rule
 * changes, and would invite the seed/actual double-counting bug (Contract 9).
 *
 * PURE: returns new buckets, never mutates, never reads a clock or randomness.
 */

import type {
  VoteBucket,
  HourIndex,
  Result,
  EngineError,
  VoteDirection,
  HourPhase,
} from './types';

/** The status a new bucket is created with. */
const INITIAL_PHASE: HourPhase = 'CLOSED';

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION (Phase 2 conventions, reused verbatim)
// ───────────────────────────────────────────────────────────────────────────

/**
 * A valid vote count is a finite, non-negative integer.
 *
 * Identical to the Phase 2 `k.ts` rule: reject NaN, Infinity, negatives and
 * fractions. No clamping, rounding, or coercion (A7).
 */
function isNonNegativeInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function invalidBucketState(bucket: VoteBucket): Result<VoteBucket, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_MEASUREMENT',
      message:
        'Bucket counts must be finite, non-negative integers. Received a ' +
        'bucket whose state is NaN, infinite, negative, or fractional.',
      context: {
        upvotes: String(bucket.upvotes),
        downvotes: String(bucket.downvotes),
        version: String(bucket.version),
      },
    },
  };
}

function invalidVoteCount(count: number): Result<VoteBucket, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_MEASUREMENT',
      message:
        'Vote count must be a finite, non-negative integer. Received a value ' +
        'that is NaN, infinite, negative, or fractional.',
      context: { count: String(count) },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Create an empty bucket for a canonical hour.
 *
 * The bucket is identified by `hourIndex` — NEVER by its position in an
 * array. Two buckets for the same hour are the same bucket regardless of
 * where they sit in a collection.
 *
 * @param hourIndex Canonical clock hour this bucket represents.
 * @param phase     Optional initial status. Defaults to CLOSED.
 * @returns A fresh bucket with zero counts and version 0.
 */
export function emptyBucket(
  hourIndex: HourIndex,
  phase: HourPhase = INITIAL_PHASE,
): VoteBucket {
  return {
    hourIndex,
    upvotes: 0,
    downvotes: 0,
    phase,
    version: 0,
  };
}

/**
 * Apply a vote to a bucket, returning a NEW bucket.
 *
 * The input bucket is never mutated (B-6), so a caller holding a reference to
 * a prior chart state cannot have it corrupted underneath them.
 *
 * Version rule (Phase 3 decision): each SUCCESSFUL mutation increments the
 * version by exactly 1, regardless of `count`. A rejected vote returns the
 * error and leaves the caller's bucket entirely alone — there is no partially
 * applied state to clean up.
 *
 * `phase` is carried through UNCHANGED. Applying a vote does not open or close
 * an hour; the 10-minute transition is a later phase (B-11).
 *
 * @param bucket    Current bucket. Not mutated.
 * @param direction UP or DOWN.
 * @param count     Votes to add. Finite, non-negative integer.
 * @returns The new bucket, or INVALID_MEASUREMENT.
 */
export function applyVote(
  bucket: VoteBucket,
  direction: VoteDirection,
  count: number,
): Result<VoteBucket, EngineError> {
  if (!isNonNegativeInteger(bucket.upvotes) ||
      !isNonNegativeInteger(bucket.downvotes) ||
      !isNonNegativeInteger(bucket.version)) {
    return invalidBucketState(bucket);
  }
  if (!isNonNegativeInteger(count)) {
    return invalidVoteCount(count);
  }

  const next: VoteBucket = {
    hourIndex: bucket.hourIndex, // identity is preserved (B-9)
    upvotes: direction === 'UP' ? bucket.upvotes + count : bucket.upvotes,
    downvotes: direction === 'DOWN' ? bucket.downvotes + count : bucket.downvotes,
    phase: bucket.phase, // status is never changed by a vote (B-11)
    version: bucket.version + 1, // per successful MUTATION, not per vote
  };

  return { ok: true, value: next };
}

/**
 * Total votes recorded in the bucket (upvotes + downvotes).
 *
 * Pure read-only convenience for the formula inspector. This is NOT a scoring
 * quantity — C is derived in a later phase and is not simply this total,
 * because the thresholds are non-linear.
 */
export function totalVotes(bucket: VoteBucket): number {
  return bucket.upvotes + bucket.downvotes;
}
