/**
 * BORA — PHASE 21 TEST-LAYER ADAPTERS
 * ═══════════════════════════════════════════════════════════════════════════
 * The only place in Phase 21 that is allowed to know BOTH vocabularies.
 *
 * ── WHERE THE INDEPENDENCE BOUNDARY SITS ──────────────────────────────────────
 *
 *     src/verification/reference/**   ← imports NOTHING from src/engine
 *     src/verification/adapters.ts    ← THIS FILE. The seam.
 *     src/verification/*.test.ts      ← authored scenarios + comparisons
 *
 * The reference model is fed plain numbers through `toReference`; the engine is
 * fed its own branded types through `toEngine`. Neither translator copies a
 * formula — they copy SHAPES. The mathematics lives entirely on each side of
 * the seam.
 *
 * This file is test infrastructure. It is not production code, it is not
 * imported by `src/engine/**`, and it is never imported by the reference model.
 *
 * ── WHY CANONICALISATION LIVES HERE ───────────────────────────────────────────
 *
 * `canonicalFromReference` and `canonicalFromEngine` must extract the SAME
 * mathematical quantities from two differently-shaped results. Writing them
 * side by side in one file makes the correspondence auditable: a reader can
 * check that `entry.kuraFresh` on the left and `entry.freshKura` on the right
 * really are the same claimed quantity. Splitting them apart would hide exactly
 * the accidental mismatch this phase exists to find.
 */

import { evaluateChart } from '../engine/evaluation/chart';
import { rolloverHour } from '../engine/rollover/rollover';
import type {
  EngineSong,
  EngineInput,
  ChartEvaluationResult,
  EvaluatedSong,
} from '../engine/evaluation/chart';
import type { RolloverSong, EngineState } from '../engine/rollover/rollover';
import type {
  HourIndex,
  VoteBucket,
  HourlyCRecord,
  PlatformObservation,
  PlatformId,
} from '../engine/types';

import { refEvaluate } from './reference/model';
import type { RefScenario, RefSong, RefChart } from './reference/types';
import {
  canonicalChart,
  sortRows,
  type CanonicalChart,
  type CanonicalRow,
} from './reference/canonical';
import type { SpecScenario, SpecSong } from './spec';

// ═════════════════════════════════════════════════════════════════════════════
// SCENARIO → REFERENCE MODEL
// ═════════════════════════════════════════════════════════════════════════════

/** Translate an authored scenario into reference-model input. */
export function toReference(spec: SpecScenario): RefScenario {
  const songs: RefSong[] = spec.songs.map((song) => ({
    id: song.id,
    lifecycle: song.lifecycle,
    k: song.k,
    persistentKura: song.persistentKura,
    buckets: song.buckets.map((b) => ({ hour: b.hour, up: b.up, down: b.down })),
    seed: song.seed.map((s) => ({
      hour: s.hour,
      c: s.c,
      source: s.source,
      archived: s.archived,
    })),
    youtube: song.youtube.map((o) => ({ hour: o.hour, value: o.value })),
    spotify: song.spotify.map((o) => ({ hour: o.hour, value: o.value })),
    boomplay: song.boomplay.map((o) => ({ hour: o.hour, value: o.value })),
  }));

  return {
    referenceHour: spec.referenceHour,
    closedHourC: spec.closedHourC,
    songs,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SCENARIO → ENGINE
// ═════════════════════════════════════════════════════════════════════════════

/** Translate an authored scenario into the engine's own input types. */
export function toEngine(spec: SpecScenario): EngineInput {
  const songs: EngineSong[] = spec.songs.map((song) => toEngineSong(song));

  return {
    songs,
    referenceHour: spec.referenceHour as HourIndex,
    closedHourC: spec.closedHourC,
  };
}

function toEngineSong(song: SpecSong): EngineSong {
  const buckets: VoteBucket[] = song.buckets.map((b) => ({
    hourIndex: b.hour as HourIndex,
    upvotes: b.up,
    downvotes: b.down,
    phase: 'CLOSED',
    version: 0,
  }));

  const seedHours: HourlyCRecord[] = song.seed.map((s) => ({
    hourIndex: s.hour as HourIndex,
    c: s.c,
    source: s.source,
    lifecycle: s.archived ? 'ARCHIVED' : 'ACTIVE',
    version: 0,
  }));

  const observations = (
    list: readonly { hour: number; value: number }[],
    platform: PlatformId,
  ): PlatformObservation[] =>
    list.map((o) => ({
      hourIndex: o.hour as HourIndex,
      platform,
      value: o.value,
      source: 'IN_CHART',
      lifecycle: 'ACTIVE',
      version: 0,
    }));

  return {
    songId: song.id,
    lifecycle: song.lifecycle,
    k: song.k,
    persistentKura: song.persistentKura,
    buckets,
    seedHours,
    platform: {
      youtube: observations(song.youtube, 'youtube'),
      spotify: observations(song.spotify, 'spotify'),
      boomplay: observations(song.boomplay, 'boomplay'),
    },
  };
}

/** Translate an authored scenario into the engine's committed-state type. */
export function toEngineState(spec: SpecScenario): EngineState {
  const songs: RolloverSong[] = spec.songs.map((song) => toEngineSong(song));
  return { referenceHour: spec.referenceHour as HourIndex, songs };
}

// ═════════════════════════════════════════════════════════════════════════════
// RESULTS → CANONICAL COMPARISON FORM
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Reduce a reference chart to canonical rows.
 *
 * Read off the reference model's OWN fields. Nothing here consults the engine.
 */
export function canonicalFromReference(chart: RefChart): CanonicalChart {
  const rows: CanonicalRow[] = chart.ranked.map((entry) => ({
    songId: entry.songId,
    k: entry.k,
    activeC: entry.activeC,
    tC: entry.tC,
    xp: entry.xp,
    freshKura: entry.freshKura,
    persistentKuraBefore: entry.persistentKuraBefore,
    persistentKuraNext: entry.persistentKuraNext,
    yt: entry.yt,
    sp: entry.sp,
    bp: entry.bp,
    platformTotal: entry.platformTotal,
    boraScore: entry.boraScore,
    rank: entry.rank,
  }));

  return canonicalChart(
    chart.referenceHour,
    chart.tC,
    rows,
    chart.excludedVaulted,
    chart.platformTotals,
  );
}

/**
 * Reduce an engine chart to canonical rows.
 *
 * The correspondence is field-for-field and is the heart of the comparison:
 *
 *     entry.activeC                       ↔  activeC
 *     chart.totalActiveC                  ↔  tC
 *     entry.xp                            ↔  xp
 *     entry.kuraFresh                     ↔  freshKura
 *     entry.platformPerformance.youtube   ↔  yt
 *     entry.boraScore                     ↔  boraScore
 *     entry.rank                          ↔  rank
 *
 * `k` is NOT a field of the engine's `EvaluatedSong` — deliberately, because K
 * is score-neutral. It is joined back in from the authored input, which is the
 * only place the engine surfaces it. That absence is part of the ratified
 * contract (Contract 2), not a gap in this adapter.
 */
export function canonicalFromEngine(
  chart: ChartEvaluationResult,
  kBySongId: ReadonlyMap<string, number>,
): CanonicalChart {
  const rows: CanonicalRow[] = chart.ranked.map((entry: EvaluatedSong) => ({
    songId: entry.songId,
    k: kBySongId.get(entry.songId) ?? 0,
    activeC: entry.activeC,
    tC: chart.totalActiveC,
    xp: entry.xp,
    freshKura: entry.kuraFresh,
    persistentKuraBefore: entry.persistentKuraBefore,
    persistentKuraNext: entry.persistentKuraNext,
    yt: entry.platformPerformance.youtube,
    sp: entry.platformPerformance.spotify,
    bp: entry.platformPerformance.boomplay,
    platformTotal:
      entry.platformPerformance.youtube +
      entry.platformPerformance.spotify +
      entry.platformPerformance.boomplay,
    boraScore: entry.boraScore,
    rank: entry.rank,
  }));

  return canonicalChart(
    chart.referenceHour,
    chart.totalActiveC,
    rows,
    chart.excludedVaulted,
    chart.platformTotals,
  );
}

/** Map of songId → K, for the fields the engine intentionally does not score. */
export function kMap(songs: readonly SpecSong[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const song of songs) map.set(song.id, song.k);
  return map;
}

/** Run the engine on a spec and return the unwrapped chart result. */
export function runEngine(spec: SpecScenario): ChartEvaluationResult {
  const result = evaluateChart(toEngine(spec));
  if (!result.ok) {
    throw new Error(
      `engine rejected scenario "${spec.name}": ${result.error.code} — ` +
        result.error.message,
    );
  }
  return result.value;
}

/** Run the reference model on a spec. */
export function runReference(spec: SpecScenario): RefChart {
  return refEvaluate(toReference(spec));
}

/** Run the engine's rollover on a spec. */
export function runEngineRollover(spec: SpecScenario) {
  const result = rolloverHour(toEngineState(spec), spec.referenceHour as HourIndex);
  if (!result.ok) {
    throw new Error(
      `engine rollover rejected scenario "${spec.name}": ${result.error.code} — ` +
        result.error.message,
    );
  }
  return result.value;
}

/** Re-exported so callers can order canonical rows without a second import. */
export { sortRows };

