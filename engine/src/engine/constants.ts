/**
 * BORA Engine — constants
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SINGLE SOURCE OF TRUTH for every number in the BORA Engine Specification.
 *
 * Contract rule: no formula module may contain a bare numeric literal for a
 * business constant. Import it from here instead. This keeps the mathematics
 * auditable and makes Phase 49 (freeze) mechanical.
 *
 * Every value is traceable to an authoritative decision:
 *   Contract 3/4  → windows          Contract 7  → ranking levels
 *   Contract 6    → C_i definition   Contract 8  → platform tiebreak
 *   Contract 9    → thresholds       Contract 13 → E and p
 *   A1            → persistent Kura  A3  → decay cadence
 *   A4            → platform decay   A6  → seed distribution
 *   A7            → p validity       A9  → tolerances
 */

// ───────────────────────────────────────────────────────────────────────────
// VERSIONING (Contract 58 / build-order step 35)
// ───────────────────────────────────────────────────────────────────────────

/** Mathematical identity of this engine. Reproducible forever. */
export const ENGINE_VERSION = 'bora-engine-v1' as const;

export type EngineVersion = typeof ENGINE_VERSION;

// ───────────────────────────────────────────────────────────────────────────
// TIME UNITS
// ───────────────────────────────────────────────────────────────────────────

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

// ───────────────────────────────────────────────────────────────────────────
// WINDOWS (Contract 3, Contract 4, A5, A6)
// ───────────────────────────────────────────────────────────────────────────

/** Clock hours in the active C window. A5: clock time, not record count. */
export const C_WINDOW_HOURS = 72;

/** Clock days in the active platform window. */
export const PLATFORM_WINDOW_DAYS = 7;

/** Platform window in clock hours (168). */
export const PLATFORM_WINDOW_HOURS = PLATFORM_WINDOW_DAYS * 24;

/**
 * Length of the operational transition after each hour boundary (Contract 5).
 * Controls EVENT ROUTING ONLY — no scoring coefficient, never alters a C value.
 *
 * ── PHASE 23 ORPHAN FINDING ───────────────────────────────────────────────────
 *
 * Neither constant has any consumer anywhere in the repository: no production
 * module, no simulation module, and no test reads them. Contract 5 governs
 * EVENT ROUTING, which is the layer that will eventually decide whether a late
 * event arrived before or after a commitment boundary. That layer is the
 * SIMULATION/APPLICATION layer (`src/sim`), and it has not yet adopted it —
 * `src/sim/s1-late-data.test.ts` states the boundary as an explicit contract
 * rather than deriving it from this constant.
 *
 * This is UNDOCUMENTED-BUT-UNCONSUMED, not orphan behaviour: it encodes no
 * behaviour at all, so it cannot contradict the mathematical contract. It is
 * retained because it is a named contract constant that production integration
 * will need, and deleting a Contract 5 constant during a reconciliation phase
 * would be a design decision rather than a reconciliation one.
 *
 * Contract 5 is therefore traced as DEFERRED, not as missing. See
 * PHASE-23-RECONCILIATION.md, requirement R-41.
 */
export const TRANSITION_MINUTES = 10;

export const TRANSITION_MS = TRANSITION_MINUTES * MINUTE_MS;

/**
 * A6: seed is spread uniformly across the full 72-hour runway, inclusive of
 * the current in-progress hour. Divisor is the window size, not size-1.
 */
export const SEED_RUNWAY_HOURS = C_WINDOW_HOURS;

// ───────────────────────────────────────────────────────────────────────────
// VOTE THRESHOLDS (Contract 9 — authoritative, no exceptions)
// ───────────────────────────────────────────────────────────────────────────

/** At or above this many UPvotes in one hour, C_U becomes 2. */
export const UPVOTE_TIER_2_THRESHOLD = 5;

/** At or above this many DOWNvotes in one hour, C_D becomes 1. */
export const DOWNVOTE_TIER_2_THRESHOLD = 5;

export const C_ZERO = 0;

/** C for 1–4 upvotes. */
export const C_TIER_1 = 1;

/** C for 5+ upvotes, and the ceiling of effective C. */
export const C_TIER_2 = 2;

/** C for 1–4 downvotes. */
export const C_DOWN_TIER_1 = 0.5;

/** C for 5+ downvotes. */
export const C_DOWN_TIER_2 = 1;

/** C_MAX is structural: effective C per hour can never exceed 2. */
export const C_MAX = C_TIER_2;

// ───────────────────────────────────────────────────────────────────────────
// DECAY (Contract 16, A3, A4)
// ───────────────────────────────────────────────────────────────────────────

/** Base hourly decay rate: 0.25%. */
export const DECAY_BASE_RATE = 0.0025;

/** Numerator of D_h = DECAY_NUMERATOR × (1 - C_h / C_MAX) */
export const DECAY_NUMERATOR = DECAY_BASE_RATE;

/**
 * A3: decay is applied exactly once per hourly rollover, using the C of the
 * JUST-CLOSED hour. Chart evaluation is side-effect-free and never decays.
 *
 * A4: platform points (YT/SP/BP) are NEVER decayed. This constant applies to
 * the persistent Kura balance only.
 */
export const DECAY_APPLIES_TO = 'PERSISTENT_KURA_ONLY' as const;

export type DecayAppliesTo = typeof DECAY_APPLIES_TO;

// ───────────────────────────────────────────────────────────────────────────
// PLATFORM WEIGHTS (Contract 18–21, A4, A8)
// ───────────────────────────────────────────────────────────────────────────

export const PLATFORM_IDS = ['youtube', 'spotify', 'boomplay'] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

/** Total points distributed across all platforms (30 + 15 + 5 = 50). */
export const PLATFORM_TOTAL = 30 + 15 + 5;

export const PLATFORM_WEIGHTS: Readonly<Record<PlatformId, number>> = Object.freeze({
  youtube: 30,
  spotify: 15,
  boomplay: 5,
});

// ───────────────────────────────────────────────────────────────────────────
// EXTERNAL STRENGTH (Contract 24, Contract 13, A7)
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⚠ LEGACY (Phase 20R) — consumed only by `seed/external.ts`, which has NO
 * production evaluation caller. See the quarantine banner in that module.
 * ⚠
 *
 * E = 0.60·YT_ext + 0.30·SP_ext + 0.10·BP_ext
 *
 * NOTE: these are exactly PLATFORM_WEIGHTS / PLATFORM_TOTAL. Contract 13 locked
 * p = E, which is structurally coherent for that reason. The identity
 * EXTERNAL_WEIGHTS[k] === PLATFORM_WEIGHTS[k] / PLATFORM_TOTAL is asserted by
 * the invariant suite, not assumed.
 *
 * RETAINED so the weight identity stays auditable and the retirement of the
 * target-share design stays reversible. Not a supported production constant.
 */
export const EXTERNAL_WEIGHTS: Readonly<Record<PlatformId, number>> = Object.freeze({
  youtube: 0.6,
  spotify: 0.3,
  boomplay: 0.1,
});

/** A7: domain of valid normalised external inputs is [0, 1). */
export const EXTERNAL_INPUT_MIN = 0;

/** A7: exclusive upper bound. Any input at or above 1 is rejected. */
export const EXTERNAL_INPUT_MAX_EXCLUSIVE = 1;

/**
 * A7: because p = E, the valid target-share domain is [0, 1).
 * p = 1 is undefined (C_seed → ∞) and MUST be rejected, never clamped.
 */
export const TARGET_SHARE_MIN = 0;
export const TARGET_SHARE_MAX_EXCLUSIVE = 1;

// ───────────────────────────────────────────────────────────────────────────
// NUMERICAL TOLERANCES (A9)
// ───────────────────────────────────────────────────────────────────────────

/** ε for distribution invariants: ΣXP, ΣkuraFresh, platform allocations. */
export const EPSILON_SUM = 1e-9;

/**
 * ⚠ RETIRED IN PHASE 22, QUARANTINED IN PHASE 23. No production or test caller
 * remains except the quarantined `expectSeedClose` helper.
 *
 * This was the "seed exactness at extreme p" tolerance. Its premise was that
 * unbounded seed values made the contract's own arithmetic ill-conditioned. The
 * D-001 ruling closed seed C to `[0, C_MAX]`, which retired that premise: every
 * ACCEPTED seed is well conditioned and `EPSILON_SUM` is sufficient. The engine
 * now compares all accepted-seed arithmetic at 1e-9.
 *
 * Retained rather than deleted so the retirement stays auditable, and so that a
 * second tolerance cannot be reintroduced silently.
 */
export const EPSILON_SEED = 1e-6;

/**
 * A9: where exact integer/rational comparison is possible, prefer it over any
 * epsilon. This is the reciprocal step for values that are exactly 1/2 etc.
 */
export const EXACT_COMPARISON_TOLERANCE = 0;

// ───────────────────────────────────────────────────────────────────────────
// KURA (A1, A2, A4)
// ───────────────────────────────────────────────────────────────────────────

/** Total points the Kura block distributes across the active chart. */
export const KURA_TOTAL = 50;

/**
 * A1: fresh Kura is injected into the persistent balance with an implicit gain
 * of exactly 1 — `persistent_next = (persistent + fresh) × (1 - D)`.
 *
 * This is NOT a tunable coefficient and must never be exposed as one. Recorded
 * here only so the A1 formula reads as a single named constant.
 */
export const PERSISTENT_KURA_INJECTION_GAIN = 1;
