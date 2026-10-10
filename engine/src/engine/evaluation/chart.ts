/**
 * BORA Engine — whole-engine evaluation (orchestration layer)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 14. The architectural bridge: it composes the independently proven
 * modules into one deterministic chart evaluation.
 *
 *     ENGINE INPUT ──▶ C ──▶ XP ──▶ fresh Kura ──▶ persistent Kura
 *                  └─▶ platform points ──────────┘
 *                              ▼
 *                       BORA Score ──▶ ranking
 *
 * ── ORCHESTRATION, NOT MATHEMATICS ─────────────────────────────────────────
 *
 *   Every formula is imported and CALLED, never rewritten here:
 *
 *     Phase 4  calculateHourlyC                       per-hour C
 *     Phase 5  getActiveWindow / selectActive         72-hour window
 *     Phase 7  validateSeededHourlyC               seeded hours
 *     Phase 8  distributeActiveC                      T_C, XP, fresh Kura
 *     Phase 9  updatePersistentKura                   persistent + decay
 *     Phase 10 evaluatePlatformPoints                 platform points
 *     Phase 11 calculateBoraScore                      BORA Score
 *     Phase 12 rankSongs                              ordering
 *
 * ── ACTIVE-VS-VAULT IS AN EXCLUSION, NEVER A RESET ─────────────────────────
 *
 *   Phase 13 deliberately RETAINS a Vaulted song's dormant persistent Kura.
 *   This layer therefore EXCLUDES Vaulted songs from every active computation
 *   and never zeroes their balance:
 *
 *     Vault ≠ delete   Vault ≠ reset   Vault = exclude from active evaluation
 *
 * ── EVALUATION IS NOT A STATE TRANSITION ───────────────────────────────────
 *
 *   `evaluateChart` is PURE. It reads state, computes the next persistent Kura
 *   via Phase 9, and RETURNS it. It never commits anything; the later
 *   simulation layer decides whether to write it back.
 *
 * ── PERFORMANCE IS NOT A MATHEMATICAL CONTRACT (Phase 20R, R6 — RATIFIED) ────
 *
 *   Current performance is an OBSERVED ENGINEERING CHARACTERISTIC, not a BORA
 *   mathematical contract. Correctness, determinism, and bounded derived-state
 *   behaviour take precedence at this stage. Performance may be optimized in a
 *   later phase without changing the mathematical contract.
 *
 *   Phase 19 measured long-run behaviour successfully: performance is
 *   acceptable for the present engine scope, and window scans are mildly
 *   superlinear in the growing historical bucket count. No optimization is
 *   currently required. No algorithm was changed in Phase 20R, and none should
 *   be changed merely to make a benchmark look better.
 *
 * ── NO CLOCK ───────────────────────────────────────────────────────────────
 *
 *   The reference hour and the closed-hour C are always supplied. This module
 *   cannot read time, which is what makes evaluation reproducible.
 *
 * PURE: no mutation, no clock, no randomness, no simulation, no Supabase, no
 * React, no network, no filesystem.
 */

import { getActiveWindow, selectActive } from '../window/hours';
import { calculateHourlyC } from '../votes/threshold';
import { validateSeededHourlyC } from '../seed/seed';
import { distributeActiveC } from '../kura/distribution';
import { updatePersistentKura } from '../kura/persistent';
import { evaluatePlatformPoints } from '../platform/points';
import { calculateBoraScore } from '../score/boraScore';
import { rankSongs } from '../ranking/ranking';
import { C_MAX } from '../constants';
import type {
  ActiveWindow,
  HourIndex,
  SongLifecycle,
  VoteBucket,
  HourlyCRecord,
  CHistorySource,
  PlatformSeries,
  Result,
  EngineError,
} from '../types';
import type { ActiveCInput } from '../kura/distribution';
import type { PlatformPointsEntry } from '../platform/points';
import type { RankSongInput } from '../ranking/ranking';

/**
 * One song's resolved hourly C for a single clock hour.
 *
 * This is the ACTUAL-vs-SEED seam (Contract 9, Phase 7). An hour carries
 * exactly one value: if real votes exist, `actualC` is used and the seeded
 * value is IGNORED; otherwise `seedC` applies. They are never summed.
 */
export interface HourlyValue {
  readonly hourIndex: HourIndex;

  /** C derived from real votes via the Phase 4 thresholds, if any. */
  readonly actualC: number | null;

  /**
   * The SEED value covering THIS EXACT hour, if one exists.
   *
   * Null means no seed record covers this hour. A seed record with `c === 0`
   * yields `0`, not null, so a seeded zero is distinguishable from no seed at
   * all — provenance is carried by the field, never inferred from the number.
   */
  readonly seedC: number | null;

  /**
   * The provenance of this hour's single resolved value.
   *
   * A7 / Contract 9: exactly one source per hour, chosen by the locked
   * precedence below. `NONE` is a real outcome — an hour with neither an
   * actual record nor a seed record resolves to 0 — and is deliberately
   * distinct from `SEED` carrying 0 and from `ACTUAL` carrying 0, so an
   * observer can tell "measured and silent" from "seeded at zero" from
   * "unmeasured".
   *
   * Resolution order (locked):
   *   1. an ACTUAL record exists for this hour → `ACTUAL` (including C = 0)
   *   2. else a SEED record exists for this hour → `SEED`
   *   3. else                               → `NONE`
   */
  readonly source: CHistorySource | 'NONE';
}

/** One song's full engine state, as held by the (future) simulator. */
export interface EngineSong {
  readonly songId: string;

  /** ACTIVE or VAULT (Phase 13). */
  readonly lifecycle: SongLifecycle;

  /** Permanent historical upvotes. Never an active-evaluation input. */
  readonly k: number;

  /** The song's persistent-Kura balance. */
  readonly persistentKura: number;

  /** Real hourly vote buckets, in any order. */
  readonly buckets: readonly VoteBucket[];

  /**
   * The seed runway, as EXPLICIT hour-indexed C records.
   *
   * ── WHY THIS IS A TIMELINE, NOT A SCALAR ──────────────────────────────────
   *
   * Seed coverage is HOURLY (D1 repair). A seed value belongs to the exact
   * clock hour it was placed on and to no other hour, so a runway that covers
   * one hour must contribute to one hour — never to all 72.
   *
   * The previous `seedCPerHour: number | null` field could not express that: a
   * bare scalar carries no hour, so `resolveHourlyC` had to apply it to every
   * unresolved hour in the window. A one-hour runway therefore behaved as a
   * 72-hour uniform overlay, which is exactly the "regenerate/extrapolate seed
   * outside its runway" behaviour the locked contract forbids.
   *
   * With an explicit timeline the distinction the contract requires is
   * representable directly:
   *
   *     "seed exists for THIS exact hour"  → authoritative
   *     "a seed value exists SOMEWHERE"    → insufficient, cannot be applied
   *
   * Resolution order per requested hour (see `resolveHourlyC`):
   *   1. an ACTUAL record for this hour  → use it, including C = 0
   *   2. else a SEED record for this hour → use that value
   *   3. else                             → 0
   *
   * ARCHIVED records no longer contribute: expiry is selection, never deletion
   * (Contract 11).
   *
   * ── WHERE THESE RECORDS COME FROM (Phase 20R, R3) ──────────────────────────
   *
   * The specification opens with "chart assessment → 72 explicit seed values",
   * and Phase 20R RATIFIES where that assessment lives. It lives OUTSIDE the
   * engine:
   *
   *     Chart / external assessment        ← human, operator, or future AI
   *             ↓                               (NOT an engine responsibility)
   *     explicit hourly seed C values
   *             ↓
   *     operator / harness injection
   *             ↓
   *     BORA Engine validation             ← engine responsibility BEGINS here
   *             ↓
   *     exact-hour seed resolution         (`resolveHourlyC`)
   *             ↓
   *     C distribution
   *
   * The engine does NOT assess popularity, invent values, derive a runway from
   * T_C, convert a scalar into 72 values, or infer missing seed hours. Partial
   * coverage is valid; a missing hour simply has no seed.
   *
   * There is deliberately no AI dependency, no network call, and no randomness
   * here. The engine remains pure and deterministic. Its responsibility begins
   * when explicit hourly seed input is supplied to it.
   */
  readonly seedHours: readonly HourlyCRecord[];

  /** Platform observations, grouped per platform. */
  readonly platform: Readonly<PlatformSeries>;
}

/** The complete, explicit input to one evaluation. */
export interface EngineInput {
  readonly songs: readonly EngineSong[];

  /** The current clock hour. Never obtained internally. */
  readonly referenceHour: HourIndex;

  /**
   * The C of the most recently CLOSED hour, used by Phase 9 decay (A3).
   *
   * Supplied rather than derived, because the evaluator has no clock and must
   * not invent a closed hour. When null, no Kura cycle is applied.
   */
  readonly closedHourC: number | null;
}

/** One active song's evaluated result. */
export interface EvaluatedSong {
  readonly songId: string;

  readonly activeC: number;
  readonly xp: number;
  readonly kuraFresh: number;

  /** Persistent Kura BEFORE the cycle. */
  readonly persistentKuraBefore: number;

  /**
   * Persistent Kura AFTER the Phase 9 cycle, or null when no Kura update
   * applies in this evaluation.
   */
  readonly persistentKuraNext: number | null;

  readonly platformPerformance: {
    readonly youtube: number;
    readonly spotify: number;
    readonly boomplay: number;
  };

  readonly boraScore: number;

  /** 1-based position from Phase 12 ranking. */
  readonly rank: number | null;
}

/** The complete chart evaluation. */
export interface ChartEvaluationResult {
  readonly referenceHour: HourIndex;

  /** T_C across ACTIVE songs only (Phase 8). */
  readonly totalActiveC: number;

  /** Evaluated ACTIVE songs in RANKED order. Never contains a Vaulted song. */
  readonly ranked: readonly EvaluatedSong[];

  /** Evaluated ACTIVE songs, in input order. */
  readonly active: readonly EvaluatedSong[];

  /** Song ids excluded because they are VAULT. Present for inspection. */
  readonly excludedVaulted: readonly string[];

  /** Platform allocation totals (Phase 10). */
  readonly platformTotals: Readonly<{
    youtube: number;
    spotify: number;
    boomplay: number;
  }>;
}

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION
// ───────────────────────────────────────────────────────────────────────────

function reject<T>(
  code: EngineError['code'],
  message: string,
  context: Record<string, string>,
): Result<T, EngineError> {
  return { ok: false, error: { code, message, context } };
}

/** Validate the engine-level input before any module is called. */
function validateInput(input: EngineInput): Result<true, EngineError> {
  if (!Number.isFinite(input.referenceHour) || !Number.isInteger(input.referenceHour)) {
    return reject(
      'INVALID_MEASUREMENT',
      'referenceHour must be a finite integer. The evaluator has no clock and ' +
        'must never supply one itself.',
      { referenceHour: String(input.referenceHour) },
    );
  }

  if (
    input.closedHourC !== null &&
    (!Number.isFinite(input.closedHourC) ||
      input.closedHourC < 0 ||
      input.closedHourC > C_MAX)
  ) {
    return reject(
      'INVALID_MEASUREMENT',
      `closedHourC must be null or a finite value within [0, ${C_MAX}].`,
      { closedHourC: String(input.closedHourC) },
    );
  }

  if (!Array.isArray(input.songs)) {
    return reject('INVALID_MEASUREMENT', 'songs must be an array.', {});
  }

  return { ok: true, value: true };
}

// ───────────────────────────────────────────────────────────────────────────
// STEP 1 — THE ACTUAL-VS-SEED SEAM
// ───────────────────────────────────────────────────────────────────────────

/**
 * Resolve one song's hourly C across the active window.
 *
 * EXACTLY ONE VALUE PER HOUR (Contract 9):
 *
 *     actual C exists   → actual C is used, and the seed is SUPPRESSED
 *     no actual, seeded → the seeded value is used
 *     neither           → the hour contributes nothing
 *
 * `actualC + seedC` is never formed. The seed is the provisional value for an
 * otherwise-unresolved hour, not a bonus layered on top of real activity, so an
 * hour that already has real votes can never be double counted.
 *
 * The window's own arithmetic is Phase 5's: its length comes from
 * `ActiveWindow.hours` rather than being recomputed here, and actual C comes
 * from the Phase 4 thresholds. Seeded values come from Phase 7.
 *
 * @param song   One ACTIVE song. Not mutated.
 * @param window The active 72-clock-hour window (Phase 5).
 * @returns One entry per clock hour in the window, in ascending hour order, or
 *   the first validation error from an upstream module.
 */
export function resolveHourlyC(
  song: EngineSong,
  window: ActiveWindow,
): Result<HourlyValue[], EngineError> {
  // Real votes inside the window, via Phase 5 selection. It validates hour
  // uniqueness across the whole input and returns a Result, so a duplicate hour
  // surfaces here rather than silently inflating a later sum.
  const selected = selectActive(song.buckets, window);
  if (!selected.ok) {
    return { ok: false, error: selected.error };
  }

  // Actual C per active hour, via the Phase 4 thresholds.
  const actualByHour = new Map<HourIndex, number>();

  for (const bucket of selected.value) {
    const c = calculateHourlyC(bucket);
    if (!c.ok) {
      return { ok: false, error: c.error };
    }
    actualByHour.set(bucket.hourIndex, c.value);
  }

  // ── SEED, RESOLVED PER EXACT HOUR (D1 repair) ───────────────────────────
  //
  // The runway is now placed on the timeline, so coverage is a lookup by hour
  // rather than a value applied to every unresolved hour.
  //
  // Two phases, deliberately separate:
  //
  //   A. SELECT the records inside this window. Expiry is selection, never
  //      deletion (Contract 11), and `selectActive` additionally enforces hour
  //      uniqueness — a duplicated seed hour surfaces as DUPLICATE_HOUR_INDEX
  //      here instead of silently doubling an hour.
  //
  //   B. VALIDATE each selected value through `validateSeededHourlyC`, the single
  //      authority for the canonical seeded-hourly-C domain [0, C_MAX] (Phase 22,
  //      D-001 ruling). Deriving the value from its own total is exactly the
  //      x72 round trip Phase 22 removed; the value is validated AS SUPPLIED.
  const selectedSeed = selectActive(song.seedHours, window);
  if (!selectedSeed.ok) {
    return { ok: false, error: selectedSeed.error };
  }

  const seedByHour = new Map<HourIndex, number>();

  for (const record of selectedSeed.value) {
    // A record is only a seed if it declares itself one. Provenance is read
    // from the data, never inferred from the resulting C value.
    if (record.source !== 'SEED') {
      continue;
    }

    // ARCHIVED means the record has left the timeline. It is retained forever
    // (Contract 11 — never deleted) but no longer contributes to the window,
    // exactly as an archived bucket does.
    if (record.lifecycle === 'ARCHIVED') {
      continue;
    }

    // -- PHASE 22: validate the SUPPLIED HOURLY VALUE DIRECTLY --------------
    //
    // This used to round-trip the value through a scalar:
    //
    //     seedCPerHour(record.c * 72)   ->   (record.c * 72) / 72
    //
    // intending `c * 72 / 72 === c`. That is not an identity at the top of the
    // double range -- `(Number.MAX_VALUE / 72) * 72` is Infinity -- so the
    // round trip imposed an artificial boundary at MAX_VALUE/72 that appeared
    // nowhere in the contract, and it did so by multiplying the input by 72
    // purely to inspect it.
    //
    // `validateSeededHourlyC` is now the single authority for the canonical
    // seeded-hourly-C domain, and it inspects `record.c` as supplied:
    //
    //     finite AND >= 0 AND <= C_MAX
    //
    // `rollover.ts` calls the SAME function, so evaluation and the hourly
    // transition cannot disagree about which seeds are legal (Phase 22 section 7).
    const validated = validateSeededHourlyC(record.c);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    seedByHour.set(record.hourIndex, validated.value);
  }

  // One entry per clock hour in the window. Missing hours are present with null
  // values and source NONE: a 72-hour window is a range of clock time, not a
  // count of stored records (Phase 5).
  const hours: HourlyValue[] = [];

  for (let i = 0; i < window.hours; i++) {
    const hourIndex = (window.startHour + i) as HourIndex;
    const actualC = actualByHour.get(hourIndex);
    const seedC = actualC === undefined ? (seedByHour.get(hourIndex) ?? null) : null;

    let source: HourlyValue['source'] = 'NONE';
    if (actualC !== undefined) {
      source = 'ACTUAL';
    } else if (seedC !== null) {
      source = 'SEED';
    }

    hours.push({
      hourIndex,
      // An ACTUAL record of 0 is 0, not null — measured silence is not absence.
      actualC: actualC === undefined ? null : actualC,
      // Actual REPLACES seed: never summed with it, and never allowed to
      // invite the seed back in.
      seedC,
      source,
    });
  }

  return { ok: true, value: hours };
}

/**
 * Resolve a song's total active C by summing its per-hour resolved values.
 *
 * This is a SUM over already-resolved values, not a new definition of C: each
 * term came from Phase 4 (actual) or Phase 7 (seed), and the actual-over-seed
 * precedence was applied when the hour was resolved. No threshold, seed, or
 * window boundary is recomputed here.
 */
function sumResolvedC(
  song: EngineSong,
  window: ActiveWindow,
): Result<number, EngineError> {
  const hours = resolveHourlyC(song, window);
  if (!hours.ok) {
    return { ok: false, error: hours.error };
  }

  let total = 0;

  for (const hour of hours.value) {
    // Exactly one of these is non-null by construction.
    total += hour.actualC ?? hour.seedC ?? 0;
  }

  return { ok: true, value: total };
}

// ───────────────────────────────────────────────────────────────────────────
// STEP 2 — THE WHOLE-CHART EVALUATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * Evaluate the complete chart at one reference hour.
 *
 * The pipeline, each stage delegated to the module that owns it:
 *
 *     EngineInput
 *       → validate
 *       → lifecycle split (ACTIVE participates, VAULT is excluded)
 *       → resolve active C per song      (Phases 4/5/7 via resolveHourlyC)
 *       → distribute                     (Phase 8 `distributeActiveC`)
 *       → persistent Kura                (Phase 9 `updatePersistentKura`)
 *       → platform points                (Phase 10 `evaluatePlatformPoints`)
 *       → BORA Score                     (Phase 11 `calculateBoraScore`)
 *       → ranking                        (Phase 12 `rankSongs`)
 *       → ChartEvaluationResult
 *
 * VAULT IS AN EXCLUSION, NEVER A RESET
 *
 *   A Vaulted song is filtered out BEFORE any active computation, so it cannot
 *   contribute to active C, T_C, XP, fresh Kura, platform allocation, score, or
 *   rank. Its stored state is never read for output and never zeroed — the
 *   input object is returned exactly as supplied. Vaulted ids are reported in
 *   `excludedVaulted` so callers can see exactly what was withheld.
 *
 * EVALUATION IS NOT A STATE TRANSITION
 *
 *   Nothing is written back. `persistentKuraNext` is RETURNED for the caller
 *   (the Phase 15 rollover) to decide whether to commit. Evaluating twice with
 *   the same input therefore yields the same result, which is what makes this
 *   layer reproducible and testable.
 *
 * @param input The complete engine state and explicit reference hour.
 * @returns The evaluated chart, or the first validation error encountered.
 */
export function evaluateChart(
  input: EngineInput,
): Result<ChartEvaluationResult, EngineError> {
  // 1. Validate the engine-level input before anything is computed.
  const valid = validateInput(input);
  if (!valid.ok) {
    return { ok: false, error: valid.error };
  }

  // 2. The active window (Phase 5). Resolved once, reused for every song.
  const window = getActiveWindow(input.referenceHour);
  if (!window.ok) {
    return { ok: false, error: window.error };
  }

  // 3. Lifecycle split. Vault is an exclusion, never a mutation.
  const activeSongs: EngineSong[] = [];
  const excludedVaulted: string[] = [];

  for (const song of input.songs) {
    if (song.lifecycle === 'ACTIVE') {
      activeSongs.push(song);
      continue;
    }

    if (song.lifecycle === 'VAULT') {
      excludedVaulted.push(song.songId);
      continue;
    }

    // An unrecognised lifecycle is rejected rather than silently treated as
    // VAULT: guessing would hide a corrupt record by quietly excluding it.
    return reject(
      'INVALID_MEASUREMENT',
      'A song lifecycle must be exactly ACTIVE or VAULT. Rejected rather ' +
        'than treated as Vault, since silently excluding a corrupt record ' +
        'would hide the defect.',
      { songId: song.songId, lifecycle: String(song.lifecycle) },
    );
  }

  // 4. Resolve each ACTIVE song's C, then distribute ONCE across the whole
  //    population so every song shares a single T_C denominator. Seeded C is
  //    already inside those resolved values, so it participates in T_C, XP,
  //    and fresh Kura exactly like actual C.
  const resolved: ActiveCInput[] = [];

  for (const song of activeSongs) {
    const activeC = sumResolvedC(song, window.value);
    if (!activeC.ok) {
      return { ok: false, error: activeC.error };
    }
    resolved.push({ songId: song.songId, activeC: activeC.value });
  }

  // 5. Phase 8 owns T_C, XP, and fresh Kura. None of it is computed here.
  const distribution = distributeActiveC(resolved);
  if (!distribution.ok) {
    return { ok: false, error: distribution.error };
  }

  // 6. Phase 10 platform points, over the ACTIVE population only.
  //
  // ── WHAT "ACTIVE POPULATION" MEANS (Phase 20R, R4 — RATIFIED) ──────────────
  //
  // The active population is the set of LIFECYCLE-ACTIVE songs participating in
  // chart evaluation. It is decided by lifecycle status, never by how much C a
  // song happens to have accumulated.
  //
  // Consequently a song whose current 72-hour C total is exactly 0 REMAINS in
  // this population. It is evaluated, receives zero C-derived contribution, and
  // therefore earns XP = 0 and fresh Kura = 0. It is NOT given an artificial
  // minimum, and it is NOT dropped. This is mathematically safe and fully
  // deterministic: zero activity produces exactly zero contribution.
  //
  // For platform normalization specifically, a zero-activity song contributes a
  // zero numerator. It does not inflate the platform's activity denominator,
  // because that denominator is driven by measured activity rather than by mere
  // membership of the population. Platform math is unchanged by this note.
  const platform = evaluatePlatformPoints(
    activeSongs.map((song) => ({ id: song.songId, observations: song.platform })),
    input.referenceHour,
  );
  if (!platform.ok) {
    return { ok: false, error: platform.error };
  }

  const pointsBySong = new Map<string, PlatformPointsEntry>();
  for (const entry of platform.value.entries) {
    pointsBySong.set(entry.songId, entry);
  }

  // 7. Assemble the per-song results, keeping the population's input order.
  const active: EvaluatedSong[] = [];

  for (let i = 0; i < activeSongs.length; i++) {
    const song = activeSongs[i];
    const distributed = distribution.value.entries[i];
    const points = pointsBySong.get(song.songId);

    if (!points) {
      return reject(
        'INVALID_MEASUREMENT',
        'Platform evaluation returned no entry for an ACTIVE song.',
        { songId: song.songId },
      );
    }

    // Persistent Kura (Phase 9). Applied ONLY when a closed hour is supplied,
    // and only ONCE — evaluation never advances a clock of its own, so it
    // cannot apply hourly decay repeatedly.
    let persistentKuraNext: number | null = null;

    if (input.closedHourC !== null) {
      const next = updatePersistentKura(
        song.persistentKura,
        distributed.kuraFresh,
        input.closedHourC,
      );
      if (!next.ok) {
        return { ok: false, error: next.error };
      }
      persistentKuraNext = next.value;
    }

    // BORA Score (Phase 11). Scored on the CURRENT persistent Kura, not the
    // projected next value: the score reflects the state as it stands, and the
    // projection is a separate, explicitly-returned figure. K is never an input.
    const score = calculateBoraScore(song.persistentKura, points);
    if (!score.ok) {
      return { ok: false, error: score.error };
    }

    active.push({
      songId: song.songId,
      activeC: distributed.activeC,
      xp: distributed.xp,
      kuraFresh: distributed.kuraFresh,
      persistentKuraBefore: song.persistentKura,
      persistentKuraNext,
      platformPerformance: {
        youtube: points.yt,
        spotify: points.sp,
        boomplay: points.bp,
      },
      boraScore: score.value,
      rank: null,
    });
  }

  // 8. Ranking (Phase 12). The comparator, its tie-breaks, and the songId
  //    ordering all live in that module; none is re-derived here.
  const kBySongId = new Map<string, number>();
  for (const song of activeSongs) {
    kBySongId.set(song.songId, song.k);
  }

  const rankInput: RankSongInput[] = active.map((entry) => ({
    songId: entry.songId,
    boraScore: entry.boraScore,
    // K is ranking tie-break #2 only; it is never scored.
    k: kBySongId.get(entry.songId) ?? 0,
    // Weights are already applied upstream, so they are passed through as-is.
    platformPoints: {
      youtube: entry.platformPerformance.youtube,
      spotify: entry.platformPerformance.spotify,
      boomplay: entry.platformPerformance.boomplay,
    },
  }));

  const rankedSongs = rankSongs(rankInput);
  if (!rankedSongs.ok) {
    return { ok: false, error: rankedSongs.error };
  }

  const bySongId = new Map<string, EvaluatedSong>();
  for (const entry of active) {
    bySongId.set(entry.songId, entry);
  }

  const ranked: EvaluatedSong[] = [];

  for (const rankedSong of rankedSongs.value) {
    const entry = bySongId.get(rankedSong.songId);
    if (!entry) {
      return reject(
        'INVALID_MEASUREMENT',
        'Ranking returned a song that was never evaluated.',
        { songId: rankedSong.songId },
      );
    }
    ranked.push({ ...entry, rank: rankedSong.rank });
  }

  // 9. Compose. `active` keeps input order; `ranked` carries Phase 12's order
  //    and the authoritative rank, so no ordering is invented here.
  return {
    ok: true,
    value: {
      referenceHour: input.referenceHour,
      totalActiveC: distribution.value.totalActiveC,
      ranked,
      active,
      excludedVaulted,
      platformTotals: platform.value.allocatedTotals,
    },
  };
}