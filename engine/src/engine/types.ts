/**
 * BORA Engine — domain model
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 1 CONTRACT. Types only — no formulas live in this file.
 *
 * This is the mathematical data model the engine accepts and returns. It is
 * deliberately NOT a copy of the production database schema: it contains only
 * what the mathematics requires (Contract, Phase 2).
 *
 * ── The one hard architectural rule ────────────────────────────────────────
 *   `src/engine/**` is PURE. It never mutates, never reads a real clock, and
 *   never imports from `src/sim` or `src/ui`. Time is ALWAYS an argument.
 *   `src/sim/**` owns all mutation and event ordering.
 *   This is enforced mechanically by `engine/purity.test.ts`.
 * ───────────────────────────────────────────────────────────────────────────
 */

import type { PlatformId, DecayAppliesTo } from './constants';

/**
 * Re-exported so consumers of the domain model can import time, lifecycle and
 * platform primitives from `types` alone, without reaching into `constants`.
 */
export type { DecayAppliesTo, PlatformId };

// ───────────────────────────────────────────────────────────────────────────
// TIME
// ───────────────────────────────────────────────────────────────────────────

declare const simTimeBrand: unique symbol;
declare const hourIndexBrand: unique symbol;

/**
 * Simulated wall-clock time in epoch milliseconds.
 *
 * Branded so a raw `Date.now()` cannot be passed in by accident. The engine
 * must never depend on the real computer clock (Contract Phase 3); a
 * deterministic simulated clock makes bugs reproducible.
 */
export type SimTime = number & { readonly [simTimeBrand]: 'SimTime' };

/**
 * Integer index of a clock hour, i.e. `floor(SimTime / HOUR_MS)`.
 *
 * The canonical key for the 72-hour window. A5 makes the window a range of
 * clock hours, so an explicit hour key is required — a record's position in an
 * array is not an identity.
 */
export type HourIndex = number & { readonly [hourIndexBrand]: 'HourIndex' };

/**
 * State of an hour bucket relative to the transition window (Contract 5).
 * The transition is operational: it routes events, never alters scoring.
 */
export type HourPhase = 'OPEN' | 'TRANSITION' | 'CLOSED';

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION (A7)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Deterministic validation failures.
 *
 * A7 forbids silently clamping invalid input. Every rejected input MUST
 * surface one of these codes so a caller can distinguish "rejected" from
 * "clamped" and never mistake a clamped value for a valid one.
 */
export type EngineErrorCode =
  /** E >= 1, or any external normalised input at/above 1. A7. */
  | 'INVALID_EXTERNAL_INPUT'
  /** p at/above 1 — C_seed -> infinity. Reject, never clamp. A7. */
  | 'INVALID_TARGET_SHARE'
  /** Target share below 0. */
  | 'INVALID_TARGET_SHARE_RANGE'
  /** T_C at seed time was zero or negative. */
  | 'INVALID_TOTAL_C'
  /** A vote or platform value was negative or non-finite. */
  | 'INVALID_MEASUREMENT'
  /**
   * The K accumulator was not a finite, non-negative integer.
   *
   * Added in Phase 2. K is validated at the function boundary rather than
   * trusted as internal state, so a corrupted accumulator is rejected loudly
   * instead of propagating silently through every downstream calculation.
   * Consistent with A7: reject, never clamp or coerce.
   */
  | 'INVALID_K'
  /**
   * Two records claimed the same (platform, hour) slot.
   *
   * Added in Phase 5 revision. A song has exactly ONE state per clock hour, so
   * a repeated `HourIndex` is invalid data, not something to reconcile.
   * Merging, summing, picking a winner, or dropping a record would all hide a
   * data-layer defect behind a plausible-looking number — and summing would
   * silently double-count activity. Rejecting is the only option that keeps
   * the error visible (Golden Rule).
   */
  | 'DUPLICATE_HOUR_INDEX'
  /**
   * A song was supplied without a usable `songId`.
   *
   * Added in Phase 12. Ranking's final tie-break IS the songId, so a missing or
   * empty id has no deterministic order to fall back to. `INVALID_MEASUREMENT`
   * does not apply: it is documented for numeric vote/platform values, and a
   * string is not a measurement.
   */
  | 'INVALID_SONG_ID'
  /** An operation referenced a song that does not exist. */
  | 'UNKNOWN_SONG'
  /** An operation was illegal for the song's current lifecycle state. */
  | 'ILLEGAL_LIFECYCLE_OPERATION';

export interface EngineError {
  readonly code: EngineErrorCode;
  readonly message: string;
  /** Values that caused the rejection, for the formula inspector. */
  readonly context?: Readonly<Record<string, number | string>>;
}

/**
 * Explicit success/failure channel.
 *
 * Pure engine functions that can reject input (A7) return this instead of
 * throwing, so rejection is a value in the type system and can be asserted.
 */
export type Result<T, E = EngineError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// ───────────────────────────────────────────────────────────────────────────
// LIFECYCLE AND PROVENANCE
// ───────────────────────────────────────────────────────────────────────────

export type SongLifecycle = 'ACTIVE' | 'VAULT';

export type VoteDirection = 'UP' | 'DOWN';

/** Active or archived. Expired records are never deleted (Contract 11). */
export type RecordLifecycle = 'ACTIVE' | 'ARCHIVED';

/**
 * Which subsystem produced a value.
 *
 * Contract 9 / A6: an hour is either SEED or ACTUAL, never both. The
 * discriminant is what makes double counting a type error rather than a
 * runtime bug.
 */
export type CHistorySource = 'ACTUAL' | 'SEED';

/** Measured inside the chart, or supplied at external entry. */
export type PlatformSource = 'IN_CHART' | 'EXTERNAL';

// ───────────────────────────────────────────────────────────────────────────
// HOURLY VOTE BUCKET (Contract Phase 6)
// ───────────────────────────────────────────────────────────────────────────

/**
 * One clock hour of raw vote counts.
 *
 * Votes are stored RAW. Thresholds are applied when C is derived, never
 * incrementally, so a bucket's C is always a pure function of its counts.
 */
export interface VoteBucket {
  readonly hourIndex: HourIndex;

  /** Total UPvotes cast in this hour, lifetime of the bucket. */
  upvotes: number;

  /** Total DOWNvotes cast in this hour, lifetime of the bucket. */
  downvotes: number;

  phase: HourPhase;

  /**
   * Monotonic per-song-per-hour bucket mutation counter, used for deterministic
   * event ordering.
   *
   * Phase 3 decision:
   *   · `emptyBucket()` starts at 0
   *   · each SUCCESSFUL `applyVote()` increments by exactly 1
   *   · a rejected vote does NOT increment
   *   · the step is per successful bucket MUTATION, not per individual vote:
   *     applying count = 5 in one operation yields version + 1, not version + 5
   *
   * This counter belongs to the individual hourly bucket. There is deliberately
   * no global song-level counter (Contract Phase 42 relies on per-bucket
   * ordering to detect conflicting writes).
   */
  version: number;
}

// ───────────────────────────────────────────────────────────────────────────
// HOURLY C RECORD (Contract Phase 10, Contract 11, A5, A6)
// ───────────────────────────────────────────────────────────────────────────

/**
 * One clock hour of effective C, plus its provenance.
 *
 * A5: the active window is the latest 72 CLOCK hours. An hour with no record
 * is implicitly C = 0 and must NOT cause the window to stretch further back.
 */
export interface HourlyCRecord {
  readonly hourIndex: HourIndex;

  /**
   * Effective C for this hour.
   *
   * CANONICAL SEEDED HOURLY C DOMAIN (Phase 22, D-001 ruling):
   *
   *     0 <= c <= C_MAX          where C_MAX = 2
   *
   * An explicit seeded hourly C is valid IFF it is finite and lies in the
   * CLOSED interval [0, C_MAX]. Seed values are bounded by the structural
   * maximum hourly C of the BORA activity model, because a seed above C_MAX
   * would drive the decay rate
   *
   *     D_h = 0.0025 * (1 - C_h / 2)
   *
   * NEGATIVE, turning decay into growth.
   *
   * The domain is CONTINUOUS on [0, 2]. Actual, vote-derived C lies on the
   * five-point threshold lattice {0, 0.5, 1, 1.5, 2}; a SEEDED C may be ANY
   * finite real in [0, 2], for example 1.25. `validateSeededHourlyC` in
   * `seed/seed.ts` is the single authority for this rule, and both chart
   * evaluation and rollover call it.
   *
   * Seed C is supplied externally as an exact-hour value. The engine does not
   * derive seed values or seed profiles. Actual hourly C, including C = 0,
   * takes precedence over seed C for the same hour.
   */
  c: number;

  /** SEED or ACTUAL. Contract 9: actual REPLACES seed, never adds to it. */
  source: CHistorySource;

  /**
   * ACTIVE or ARCHIVED. Expired records move here and are retained forever
   * (Contract 11) — never deleted inside the simulator.
   */
  lifecycle: RecordLifecycle;

  /** Monotonic counter for deterministic event ordering. */
  version: number;

  /** Audit trail: the event that produced this value. */
  originEventId?: string;
}

/**
 * A5: the active window for a given current hour.
 *
 * Both bounds are INCLUSIVE, so the window contains exactly `hours` entries.
 * Deriving this as a value (rather than filtering ad hoc everywhere) keeps the
 * boundary definition in one place — the most bug-prone area per the plan.
 */
export interface ActiveWindow {
  /** First hour of the window, inclusive. */
  readonly startHour: HourIndex;

  /** Current hour, inclusive. */
  readonly endHour: HourIndex;

  /** Number of clock hours covered. Always C_WINDOW_HOURS. */
  readonly hours: number;
}

// ───────────────────────────────────────────────────────────────────────────
// PLATFORM OBSERVATIONS (Contract Phase 18, Contract 22, A4)
// ───────────────────────────────────────────────────────────────────────────

/**
 * One raw, UNNORMALISED platform measurement for one clock hour.
 *
 * A4: platform points are never decayed. They are re-derived from the active
 * 7-day window on every evaluation.
 */
export interface PlatformObservation {
  readonly hourIndex: HourIndex;
  readonly platform: PlatformId;

  /** Raw measurement. Non-negative. NOT yet scaled to points. */
  value: number;

  source: PlatformSource;

  /** ACTIVE or ARCHIVED (Contract 11 — retained, never deleted). */
  lifecycle: RecordLifecycle;

  readonly version: number;
}

export interface PlatformSeries {
  readonly youtube: PlatformObservation[];
  readonly spotify: PlatformObservation[];
  readonly boomplay: PlatformObservation[];
}

// ───────────────────────────────────────────────────────────────────────────
// KURA STATE (A1, A2, A3, A4)
// ───────────────────────────────────────────────────────────────────────────

/**
 * A1: fresh Kura and persistent Kura are CONCEPTUALLY DIFFERENT STATES and are
 * held separately so neither can silently overwrite the other.
 *
 *   kuraFresh      — instantaneous, re-derived from XP on every evaluation.
 *                    Normalised: SUM kuraFresh = 50 (A2).
 *   kuraPersistent — the SCORED Kura. Carries across time; decays; receives a
 *                    one-time injection of fresh Kura each hourly cycle.
 *
 * A2: SUM kuraPersistent is NOT required to equal 50 and drifts below 50 as
 * decay accumulates. Never assert that invariant.
 */
export interface KuraState {
  /**
   * Current instantaneous Kura = XP * KURA_TOTAL.
   *
   * Diagnostic and invariant-bearing ONLY. A1: never use this directly as the
   * BORA Score Kura component.
   */
  fresh: number;

  /**
   * The persistent balance, and the authoritative Kura input to BORA Score.
   *
   * A1 recurrence: `persistent_next = (persistent + fresh) * (1 - D_h)`.
   * A8: reset to 0 on restore. Never accumulates while Vaulted.
   */
  persistent: number;

  /** Observability (Contract Phase 47): total decay removed over all cycles. */
  decayedTotal: number;

  /** Number of hourly cycles this song has participated in. */
  cycleCount: number;

  /**
   * A3: the hour whose close triggered the last decay. Guards against
   * double-decaying the same hour if a rollover is somehow replayed.
   */
  lastDecayHour: HourIndex | null;
}

// ───────────────────────────────────────────────────────────────────────────
// EXTERNAL ENTRY (Contract Phase 24-26, A6, A7)
// ───────────────────────────────────────────────────────────────────────────

/** Normalised external measurements supplied at entry. Each in [0, 1). */
export interface ExternalInput {
  readonly youtube: number;
  readonly spotify: number;
  readonly boomplay: number;
}

/**
 * The record of a song's external entry.
 * ⚠ LEGACY (Phase 20R) -- QUARANTINED. NOT the production seed path. ⚠
 *
 * This whole interface belongs to the retired external-entry subsystem, which
 * has NO production evaluation caller. Nothing here may be read as the
 * canonical seed contract.
 *
 * The canonical seed rule (Phase 22) is stated on `HourlyCRecord.c`: an
 * explicit seeded hourly C is valid iff it is finite and lies in the closed
 * interval [0, C_MAX], where C_MAX = 2. Seed C is supplied externally as an
 * EXACT-HOUR value; the engine never derives seed values or seed profiles.
 *
 * The uniform `C_seed / 72` spread described below is exactly the scalar
 * seed-generation design the ratified contract forbids during evaluation, and
 * it survives here only inside quarantined, test-only machinery.
 *
 * Original (legacy) wording: C_seed was spread UNIFORMLY across the full
 * 72-hour runway at C_seed / 72 per hour.
 *
 * A7: a rejected entry produces a Result error and creates NO partial record.
 */
export interface ExternalEntry {
  readonly enteredAt: SimTime;
  readonly enteredAtHour: HourIndex;

  /** As supplied, before validation. Retained for audit even if rejected. */
  readonly input: ExternalInput;

  /** E = 0.60*YT + 0.30*SP + 0.10*BP. */
  readonly e: number;

  /** p = E (Contract 13), guaranteed in [0, 1). */
  readonly p: number;

  /** C_seed = p / (1 - p) * T_C. */
  readonly cSeed: number;

  /** T_C observed at the moment of entry. Audit + exactness reproduction. */
  readonly tCAtEntry: number;

  /** ⚠ LEGACY (Phase 20R): uniform per-hour seeded C = cSeed / SEED_RUNWAY_HOURS.
   *  NOT the canonical seed domain. See HourlyCRecord.c. */
  readonly cSeedPerHour: number;

  /**
   * A8 / Contract Phase 32: a returning song is NEVER reseeded.
   * Set on first external entry, never reset.
   */
  seedConsumed: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// K (Contract Phase 5, Contract 2)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Append-only audit of K changes.
 *
 * Contract 2: K is score-neutral. It never contributes to BORA Score; it is
 * ranking tie-break #2 and a permanent historical quantity.
 */
export interface KEvent {
  readonly eventId: string;
  readonly at: SimTime;
  readonly hourIndex: HourIndex;
  /** Always >= 0. K is monotonic non-decreasing. */
  readonly deltaK: number;
  readonly kAfter: number;
}

/**
 * Contract Phase 32 / A8: a Vault interval.
 *
 * `kuraAtVault` is AUDIT ONLY. A8 forbids using it to restore a score — on
 * restore, persistent Kura is reset to 0, not resurrected.
 */
export interface VaultInterval {
  readonly from: SimTime;
  readonly fromHour: HourIndex;

  /** null while the song is currently Vaulted. */
  to: SimTime | null;
  toHour: HourIndex | null;

  /** Audit only. Never used as a restore source. */
  readonly kuraAtVault: number;
  readonly cActiveAtVault: number;
}

// ───────────────────────────────────────────────────────────────────────────
// SONG (Contract Phase 2)
// ───────────────────────────────────────────────────────────────────────────

/**
 * The conceptual song state. Not a database row — this is what the
 * mathematics requires and nothing more (Contract Phase 2).
 */
export interface Song {
  /**
   * Stable identifier. Contract 7: the FINAL deterministic ordering key, used
   * only when BORA, K, and platform totals are all exactly tied. Not a score.
   */
  readonly id: string;

  title: string;
  artist: string;

  lifecycle: SongLifecycle;
  readonly createdAt: SimTime;

  /**
   * K = total historical upvotes (Contract Phase 5).
   *
   * Monotonic non-decreasing. Unaffected by downvotes, by the passage of
   * time, or by Vault. Score-neutral (Contract 2).
   */
  k: number;
  readonly kLog: readonly KEvent[];

  /**
   * All hourly C records, ACTIVE and ARCHIVED.
   *
   * Contract 11: expired records are retained forever. Evaluation must filter
   * by window and MUST NOT read archived records as active.
   */
  hours: HourlyCRecord[];

  /** Raw vote buckets, retained for the formula inspector. */
  votes: VoteBucket[];

  platform: PlatformSeries;

  /** Present only if the song entered via external strength. */
  external?: ExternalEntry;

  kura: KuraState;

  vaultHistory: VaultInterval[];

  /** Pure derivation cache. NEVER a scoring input (Contract 2). */
  cachedScore?: number;
  scoreVersion: number;
}

// ───────────────────────────────────────────────────────────────────────────
// CHART EVALUATION OUTPUT (Contract Phase 35, Contract Phase 34)
// ───────────────────────────────────────────────────────────────────────────

/**
 * One song's fully-derived chart position, produced by PURE evaluation.
 * Every field is explainable (Contract Phase 47) — no black-box numbers.
 */
export interface ChartEntry {
  readonly songId: string;
  readonly title: string;
  readonly artist: string;

  /** 1-based rank after all tie-breaks. */
  rank: number;

  /** C_i = sum of active C_h (Contract 6). */
  cActive: number;

  /** XP_i = C_i / T_C, in [0, 1]. */
  xp: number;

  /** Chart-wide T_C. Repeated per row to ease invariant checks. */
  tC: number;

  /** A1: the SCORED Kura — `KuraState.persistent`, never `fresh`. */
  kuraScored: number;

  /** Diagnostic only. SUM kuraFresh = 50 (A2); SUM kuraScored need not be. */
  kuraFresh: number;

  /** D_h most recently applied. Observability for Contract Phase 47. */
  decayRate: number;

  /** Normalised platform points from the active 7-day window. A4: undecayed. */
  yt: number;
  sp: number;
  bp: number;

  /** yt + sp + bp. Ranking tie-break #3 (Contract 8). */
  platformTotal: number;

  /** kuraScored + yt + sp + bp (A4). */
  boraScore: number;

  /** K. Score-neutral; ranking tie-break #2. */
  k: number;

  lifecycle: SongLifecycle;
}

/** A ranked chart: the full evaluation at a point in simulated time. */
export interface ChartEvaluation {
  readonly at: SimTime;
  readonly atHour: HourIndex;

  /** Chart-wide total active C. */
  readonly tC: number;

  /** Every song, ranked. Vault songs included and flagged, for observability. */
  readonly entries: readonly ChartEntry[];

  /** Per-platform active totals, for the YT/SP/BP sum invariants. */
  readonly platformTotals: Readonly<Record<PlatformId, number>>;
}

// ───────────────────────────────────────────────────────────────────────────
// RANKING (Contract 7, Contract 8, Contract Phase 34)
// ───────────────────────────────────────────────────────────────────────────

/**
 * The complete, exhaustive ordering key.
 *
 * Contract 7: exactly three mathematical levels, then a deterministic
 * fallback. DO NOT add a fourth scoring factor — the fallback exists purely
 * so results are byte-for-byte reproducible.
 */
export interface RankKey {
  /** 1 — primary. */
  boraScore: number;

  /** 2 — K (score-neutral, but a legitimate tie-break). */
  k: number;

  /** 3 — current normalised in-chart platform points (Contract 8).
   *  NOT the external entry measurements. */
  platformTotal: number;

  /** 4 — deterministic only. Not a score. */
  songId: string;
}

export type RankComparison = -1 | 0 | 1;

// ───────────────────────────────────────────────────────────────────────────
// SIMULATION STATE TRANSITION (A3, A1)
// ───────────────────────────────────────────────────────────────────────────

/**
 * What a single hourly scoring cycle did to one song's persistent Kura.
 *
 * A3 defines the order precisely:
 *   1. close the hour
 *   2. resolve its actual/seed C
 *   3. calculate fresh Kura from the active distribution
 *   4. inject fresh Kura into persistent Kura
 *   5. apply decay using the JUST-CLOSED hour's C
 *   6. advance to the next hour
 *
 * Exposed so the formula inspector can show the cycle rather than hide it.
 */
export interface KuraCycleStep {
  readonly songId: string;
  readonly hourClosed: HourIndex;

  /** C of the just-closed hour — the input to D_h. */
  readonly closedHourC: number;

  /** The fresh Kura injected this cycle. Gain is exactly 1 (A1). */
  readonly freshInjected: number;

  /** D_h = 0.25% * (1 - C_closed / C_MAX). */
  readonly decayRate: number;

  readonly persistentBefore: number;
  readonly persistentAfter: number;

  /** Amount removed by decay this cycle. */
  readonly decayed: number;
}

/** The outcome of advancing the clock across one or more hour boundaries. */
export interface RolloverResult {
  readonly fromHour: HourIndex;
  readonly toHour: HourIndex;

  /** How many hourly cycles were actually executed. */
  readonly cycles: number;

  /** Per-song cycle steps, in songId order. */
  readonly steps: readonly KuraCycleStep[];

  /** Hours that left the active window and were archived (Contract 11). */
  readonly archivedHours: readonly HourlyCRecord[];
}
