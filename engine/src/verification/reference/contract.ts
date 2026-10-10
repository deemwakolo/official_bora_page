/**
 * BORA — PHASE 21 INDEPENDENT REFERENCE MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The locked contract, transcribed from the SPECIFICATION.
 *
 * ── WHY THESE NUMBERS ARE LITERALS AND NOT IMPORTS ───────────────────────────
 *
 * Every value below is written out longhand instead of being imported from
 * `src/engine/constants.ts`. That is the entire point of this directory.
 *
 * If these constants were imported, the reference model would become a second
 * view of the production implementation: a bug in `C_WINDOW_HOURS` would be
 * reproduced faithfully here, both models would agree, and the differential
 * tests would pass while proving nothing. Two models that share a constant
 * share a mistake.
 *
 * So the reference model is transcribed from the WRITTEN CONTRACT:
 *
 *     Contract 3/4  → windows          Contract 7  → ranking levels
 *     Contract 6    → C_i definition   Contract 8  → platform tie-break
 *     Contract 9    → vote thresholds  Contract 16 → decay
 *     Contract 18-21→ platform weights A1/A3       → Kura
 *
 * where the reference constants and the engine constants DISAGREE, that is a
 * finding — reported as a discrepancy, not silently reconciled.
 *
 * PURE: this file holds numbers and strings. No imports at all, by design.
 */

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION IDENTIFIERS (Phase 21 §28 — stable, human-readable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every locked mathematical subsystem, named.
 *
 * These identifiers are the join key of the Phase 21 traceability chain:
 *
 *     CONTRACT → REF-* → ENGINE MODULE → CONFORMANCE TEST
 */
export const REF_IDS = {
  REF_K: 'REF-K',
  REF_THRESHOLD: 'REF-THRESHOLD',
  REF_WINDOW: 'REF-WINDOW',
  REF_SEED: 'REF-SEED',
  REF_DISTRIBUTION: 'REF-DISTRIBUTION',
  REF_KURA: 'REF-KURA',
  REF_PLATFORM: 'REF-PLATFORM',
  REF_SCORE: 'REF-SCORE',
  REF_RANK: 'REF-RANK',
  REF_LIFECYCLE: 'REF-LIFECYCLE',
  REF_ROLLOVER: 'REF-ROLLOVER',
} as const;

export type RefId = (typeof REF_IDS)[keyof typeof REF_IDS];

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED CONSTANTS — transcribed from the specification
// ─────────────────────────────────────────────────────────────────────────────

/** Contract 3/4, A5: the active C window spans exactly 72 clock hours. */
export const REF_C_WINDOW_HOURS = 72;

/** Contract 4: the active platform window spans exactly 7 clock days. */
export const REF_PLATFORM_WINDOW_DAYS = 7;

/** 7 clock days expressed in clock hours = 168. */
export const REF_PLATFORM_WINDOW_HOURS = 168;

// Contract 9 — vote thresholds. "4 → 1, 5 → 2" is the critical edge.
/** At or above this many hourly upvotes, C_U becomes 2. */
export const REF_UPVOTE_TIER_2 = 5;

/** At or above this many hourly downvotes, C_D becomes 1. */
export const REF_DOWNVOTE_TIER_2 = 5;

/** C_U = 0 → 0, 1–4 → 1. */
export const REF_C_TIER_1 = 1;

/** C_U = 5+ → 2. Also the structural ceiling of effective C. */
export const REF_C_TIER_2 = 2;

/** C_D = 1–4 → 0.5. */
export const REF_C_DOWN_TIER_1 = 0.5;

/** C_D = 5+ → 1. */
export const REF_C_DOWN_TIER_2 = 1;

/** Effective C can never exceed 2 (Contract 6). */
export const REF_C_MAX = 2;

/** The structural lattice of effective hourly C. */
export const REF_C_LATTICE: readonly number[] = [0, 0.5, 1, 1.5, 2];

/** Contract 18-21 — platform weights. FIXED mathematics, never configuration. */
export const REF_WEIGHT_YOUTUBE = 30;
export const REF_WEIGHT_SPOTIFY = 15;
export const REF_WEIGHT_BOOMPLAY = 5;

/** 30 + 15 + 5 = 50 points distributed across all platforms. */
export const REF_PLATFORM_TOTAL = 50;

/** A2: fresh Kura is `XP × 50` — the Kura block distributes 50 points. */
export const REF_KURA_TOTAL = 50;

/** A1: base hourly decay is 0.25% of the balance. */
export const REF_DECAY_BASE = 0.0025;

// ─────────────────────────────────────────────────────────────────────────────
// TOLERANCES (Phase 21 §18)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normal floating-point comparison tolerance for differential tests.
 *
 * PHASE 22: this is now the ONLY tolerance in the differential suite.
 *
 * Phase 21 shipped a second, wider constant for "extreme seed" cases, on the
 * theory that unbounded seed values made the contract's own arithmetic
 * ill-conditioned. That justification expired with the D-001 ruling: seed C is
 * bounded by [0, C_MAX], so every accepted seed is well conditioned and needs
 * nothing beyond 1e-9. Extreme NUMBERS such as Number.MAX_VALUE now appear only
 * in REJECTION tests, which perform no arithmetic and therefore need no
 * tolerance at all.
 *
 * A tolerance is never widened to make a run green. If a case cannot be met at
 * 1e-9 it is a real disagreement until proven otherwise.
 */
export const REF_TOLERANCE = 1e-9;

/**
 * ⚠ RETIRED IN PHASE 22 (D-001 ruling). Kept only so the removal is auditable.
 *
 * Do not reintroduce this as a general escape hatch. A second, wider tolerance
 * is precisely the mechanism that lets a numerical defect hide behind a number
 * nobody re-derives. Widening is permitted only when the CONTRACT ITSELF is
 * ill-conditioned AND that is stated in the constant's own text.
 */
export const REF_TOLERANCE_EXTREME_SEED = 1e-6;
