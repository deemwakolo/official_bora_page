/**
 * BORA Engine — platform points for a chart population
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 10. Composes the Phase 6 platform window and normalisation into a
 * chart-level allocation over a supplied active population.
 *
 *   platformPoints_i = (platformActive_i / Σ platformActive) × weight
 *
 * ── WHAT IS REUSED, NOT REIMPLEMENTED ─────────────────────────────────────
 *
 *   · the 168-clock-hour window      → getPlatformWindow
 *   · active observation selection   → selectActiveObservations
 *   · active value aggregation       → sumActiveValue
 *   · normalisation and weights      → normalizePlatform
 *
 *   There is deliberately no second window, no second observation model, and
 *   no duplicated weight table in this file.
 *
 * ── PER-PLATFORM DENOMINATORS (the important reading) ────────────────────
 *
 *   `totalActivePlatformActivity` is PER PLATFORM, not one grand total across
 *   YouTube + Spotify + Boomplay. Each platform is normalised against its own
 *   activity sum:
 *
 *       YT points use Σ YT activity
 *       SP points use Σ SP activity
 *       BP points use Σ BP activity
 *
 *   This preserves the Phase 6 total-based model and cross-platform
 *   independence: an artist dominant on YouTube earns nothing extra on
 *   Spotify. A single combined denominator would let one platform's volume
 *   distort the others, which is exactly the hidden balancing that Contract
 *   18-21 (per-platform normalization) forbids.
 *
 * ── ZERO-TOTAL ACTIVITY (Phase 6 contract, reused) ────────────────────────
 *
 *   `normalizePlatform` already defines this: when a platform's total is 0,
 *   every song receives 0 points for that platform. No NaN, no division by
 *   zero, and critically NO REDISTRIBUTION — YouTube's unused 30 points are
 *   not handed to Spotify or Boomplay. A chart can therefore total less than
 *   50, and that is correct, not a defect.
 *
 * ── NO DECAY (A4) ─────────────────────────────────────────────────────────
 *
 *   Platform points are recomputed from the active window on every evaluation.
 *   They are not a stored balance and never decay.
 *
 * PURE: no mutation, no clock, no randomness, no React, no Supabase, no AI,
 * no network. The reference hour is always supplied.
 */

import {
  getPlatformWindow,
  sumActiveValue,
  normalizePlatform,
} from './window';
import { PLATFORM_WEIGHTS, PLATFORM_IDS } from '../constants';
import type {
  ActiveWindow,
  HourIndex,
  PlatformId,
  PlatformObservation,
  Result,
  EngineError,
} from '../types';

/** One song's stored observations, grouped per platform. */
export interface PlatformSongInput {
  readonly id: string;

  /** Observations for this song, grouped by platform, in any order. */
  readonly observations: Readonly<
    Record<PlatformId, readonly PlatformObservation[]>
  >;
}

/** One song's allocated platform points. */
export interface PlatformPointsEntry {
  readonly songId: string;

  /** Raw active-window activity per platform, for observability. */
  readonly activeYouTube: number;
  readonly activeSpotify: number;
  readonly activeBoomplay: number;

  /** Normalised points. Never exceeds the platform weight. */
  readonly yt: number;
  readonly sp: number;
  readonly bp: number;

  /** yt + sp + bp. At most PLATFORM_TOTAL, and less when a platform is idle. */
  readonly total: number;
}

/** The chart-level platform allocation. */
export interface PlatformPointsChart {
  readonly referenceHour: HourIndex;

  /** One entry per supplied song, in population order. */
  readonly entries: readonly PlatformPointsEntry[];

  /** Σ active activity per platform — the per-platform denominators. */
  readonly activityTotals: Readonly<Record<PlatformId, number>>;

  /**
   * Σ points actually allocated per platform. Equals the platform weight when
   * that platform had positive activity, otherwise 0.
   */
  readonly allocatedTotals: Readonly<Record<PlatformId, number>>;
}

function zeroRecord(): Record<PlatformId, number> {
  return { youtube: 0, spotify: 0, boomplay: 0 };
}

/**
 * Allocate platform points across the supplied active population.
 *
 * @param population    Already-valid active songs, in any order.
 * @param referenceHour The current clock hour. Supplied by the caller.
 * @returns Per-song points plus the chart-level activity and allocation
 *   totals, or the first validation error encountered.
 */
export function evaluatePlatformPoints(
  population: readonly PlatformSongInput[],
  referenceHour: HourIndex,
): Result<PlatformPointsChart, EngineError> {
  // 1. The Phase 6 window. Resolved once and reused for every song/platform.
  const window = getPlatformWindow(referenceHour);
  if (!window.ok) {
    return { ok: false, error: window.error };
  }
  const activeWindow: ActiveWindow = window.value;

  // 2. Per-song, per-platform active activity.
  //    A song absent from a platform's map is simply not a candidate for that
  //    platform's allocation; it earns 0 there.
  const activities: Record<PlatformId, Map<string, number>> = {
    youtube: new Map(),
    spotify: new Map(),
    boomplay: new Map(),
  };

  for (const song of population) {
    for (const platform of PLATFORM_IDS) {
      const list = song.observations[platform] ?? [];
      const sum = sumActiveValue(list, activeWindow);
      if (!sum.ok) {
        return { ok: false, error: sum.error };
      }
      activities[platform].set(song.id, sum.value);
    }
  }

  // 3. Normalise each platform against ITS OWN total (Phase 6, total-based).
  //    A platform whose total is 0 yields all-zero points; its weight is not
  //    redistributed to any other platform.
  //
  //    Points are collected per song/platform and assembled into entries at the
  //    end, so no readonly field is ever mutated.
  const pointsBySong = new Map<string, Record<PlatformId, number>>();

  for (const platform of PLATFORM_IDS) {
    const weight = PLATFORM_WEIGHTS[platform];
    const points = normalizePlatformFor(activities[platform], weight);

    for (const [songId, value] of points) {
      let row = pointsBySong.get(songId);
      if (!row) {
        row = { youtube: 0, spotify: 0, boomplay: 0 };
        pointsBySong.set(songId, row);
      }
      row[platform] = value;
    }
  }

  // 4. Assemble entries, preserving population order.
  const entries: PlatformPointsEntry[] = population.map((song) => {
    const row = pointsBySong.get(song.id);
    const yt = row?.youtube ?? 0;
    const sp = row?.spotify ?? 0;
    const bp = row?.boomplay ?? 0;
    return {
      songId: song.id,
      activeYouTube: activities.youtube.get(song.id) ?? 0,
      activeSpotify: activities.spotify.get(song.id) ?? 0,
      activeBoomplay: activities.boomplay.get(song.id) ?? 0,
      yt,
      sp,
      bp,
      total: yt + sp + bp,
    };
  });

  const activityTotals = zeroRecord();
  const allocatedTotals = zeroRecord();
  for (const platform of PLATFORM_IDS) {
    for (const value of activities[platform].values()) {
      activityTotals[platform] += value;
    }
  }
  for (const e of entries) {
    allocatedTotals.youtube += e.yt;
    allocatedTotals.spotify += e.sp;
    allocatedTotals.boomplay += e.bp;
  }

  return {
    ok: true,
    value: { referenceHour, entries, activityTotals, allocatedTotals },
  };
}

/**
 * Thin wrapper over the Phase 6 normaliser.
 *
 * Kept as a named call so the reuse is explicit and greppable, rather than
 * re-deriving the total-based rule here.
 */
function normalizePlatformFor(
  performances: ReadonlyMap<string, number>,
  weight: number,
): Map<string, number> {
  return normalizePlatform(performances, weight);
}