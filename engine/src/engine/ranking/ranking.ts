/**
 * BORA Engine — deterministic ranking
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 12. The ORDERING layer.
 *
 * It receives already-calculated song results and decides their order. It is
 * not another calculation engine: it recomputes nothing. No C, XP, Kura,
 * decay, platform window, platform normalisation, seed, or lifecycle logic
 * lives here, and none of those modules are imported.
 *
 * ── THE COMPLETE RANKING PRIORITY (Contract 7) ────────────────────────────
 *
 *   1. BORA Score           higher first
 *   2. K                    higher first      (K is score-neutral; this is
 *                                              its ONLY role)
 *   3. platformPerformance  higher first      (already-normalised points)
 *   4. songId               lower lexical first (determinism only)
 *
 *   There is no fifth criterion. `platformPerformance` is YT + SP + BP as
 *   resolved upstream — it is NOT the BORA Score and the weights are NOT
 *   re-applied here.
 *
 * ── WHY songId IS NOT A SCORE ──────────────────────────────────────────────
 *
 *   Level 4 exists purely for reproducibility. Two songs identical across
 *   score, K, and platform performance still need a defined order, otherwise
 *   the chart's arrangement would depend on input order — which would break
 *   every determinism and golden-test guarantee in the project.
 *
 * ── DETERMINISM ────────────────────────────────────────────────────────────
 *
 *   Input order is NEVER a tie-breaker. The same set of songs ranked from any
 *   permutation produces byte-identical output. Song ids are compared by UTF-16
 *   code unit (plain `<` / `>`), NOT `localeCompare`, which is locale- and
 *   environment-dependent and could reorder songs between machines.
 *
 * ── NO STATE ───────────────────────────────────────────────────────────────
 *
 *   `rankSongs` is pure: it sorts a copy and returns a new array. The caller's
 *   array and every song object are left untouched.
 *
 * PURE: no clock, no randomness, no Supabase, no React, no Vault/lifecycle, no
 * database, no UI.
 */

import type { Result, EngineError, RankComparison } from '../types';

/** Already-calculated platform points for one song. */
export interface RankPlatformPoints {
  readonly youtube: number;
  readonly spotify: number;
  readonly boomplay: number;
}

/** One song's resolved values, as produced by Phases 9, 10, and 11. */
export interface RankSongInput {
  readonly songId: string;

  /** Phase 11 output. */
  readonly boraScore: number;

  /** Historical upvotes. Score-neutral; ranking tie-break #2 only. */
  readonly k: number;

  /** Phase 10 output, already normalised. Weights are NOT re-applied. */
  readonly platformPoints: RankPlatformPoints;
}

/** A ranked song: the original input plus its 1-based rank. */
export interface RankedSong extends RankSongInput {
  /** 1 is the top of the chart. */
  readonly rank: number;
}

/**
 * Current normalised platform performance = youtube + spotify + boomplay.
 *
 * Tie-break #3 only. Deliberately NOT the BORA Score, and the platform
 * weights have already been applied upstream.
 */
export function platformPerformance(song: RankSongInput): number {
  return (
    song.platformPoints.youtube +
    song.platformPoints.spotify +
    song.platformPoints.boomplay
  );
}

/**
 * Deterministic UTF-16 code-unit comparison of two song ids.
 *
 * Uses `<` / `>` rather than `localeCompare`, which depends on the host
 * locale and would produce different chart orders on different machines.
 */
function compareSongIds(a: string, b: string): RankComparison {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * The complete ranking comparator.
 *
 * Exported so ordering can be tested directly, independently of the sorting
 * machinery. Returns -1 when `a` ranks above `b`, 1 when below, 0 when fully
 * tied — which, given valid distinct ids, cannot occur: level 4 always
 * resolves a tie.
 */
export function compareSongs(
  a: RankSongInput,
  b: RankSongInput,
): RankComparison {
  // 1. BORA Score, descending.
  if (a.boraScore !== b.boraScore) {
    return a.boraScore > b.boraScore ? -1 : 1;
  }

  // 2. Historical K, descending. A tie-break only — never added to the score.
  if (a.k !== b.k) {
    return a.k > b.k ? -1 : 1;
  }

  // 3. Current normalised platform performance, descending.
  const aPerf = platformPerformance(a);
  const bPerf = platformPerformance(b);
  if (aPerf !== bPerf) {
    return aPerf > bPerf ? -1 : 1;
  }

  // 4. songId, ascending lexical. Determinism only.
  return compareSongIds(a.songId, b.songId);
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function reject<T>(
  code: EngineError['code'],
  message: string,
  context: Record<string, string>,
): Result<T, EngineError> {
  return { ok: false, error: { code, message, context } };
}

/**
 * Validate one song's resolved ranking values.
 *
 * Nothing is coerced or substituted: an invalid value rejects the whole call
 * rather than silently demoting a song to zero and corrupting its position.
 */
function validateSong(song: RankSongInput): Result<true, EngineError> {
  if (typeof song.songId !== 'string' || song.songId.length === 0) {
    return reject(
      'INVALID_SONG_ID',
      'songId must be a non-empty string. Ranking falls back to songId for ' +
        'determinism, so a missing or empty id has no defined order.',
      { songId: String(song.songId) },
    );
  }

  if (!isNonNegativeFinite(song.boraScore)) {
    return reject(
      'INVALID_MEASUREMENT',
      'boraScore must be a finite, non-negative number. Rejected rather than ' +
        'zeroed: a fabricated score would misplace the song in the chart.',
      { songId: song.songId, boraScore: String(song.boraScore) },
    );
  }

  if (!isNonNegativeFinite(song.k)) {
    return reject(
      'INVALID_K',
      'K must be a finite, non-negative number. Rejected rather than zeroed: ' +
        'a fabricated K would corrupt the tie-break.',
      { songId: song.songId, k: String(song.k) },
    );
  }

  const fields: Array<[string, number]> = [
    ['youtube', song.platformPoints.youtube],
    ['spotify', song.platformPoints.spotify],
    ['boomplay', song.platformPoints.boomplay],
  ];

  for (const [field, value] of fields) {
    if (typeof value !== 'number' || !isNonNegativeFinite(value)) {
      return reject(
        'INVALID_MEASUREMENT',
        `platformPoints.${field} must be a finite, non-negative number. ` +
          'Rejected rather than zeroed: a fabricated platform point would ' +
          'distort both the score and the tie-break.',
        { songId: song.songId, [field]: String(value) },
      );
    }
  }

  return { ok: true, value: true };
}

/**
 * Rank a collection of songs deterministically.
 *
 * The caller's array is never mutated: a copy is sorted internally, and each
 * returned entry spreads its input so the originals stay untouched. Rank 1 is
 * the first result.
 *
 * @param songs Resolved song values, in any order.
 * @returns Songs with 1-based ranks, best first, or the first validation error.
 */
export function rankSongs(
  songs: readonly RankSongInput[],
): Result<RankedSong[], EngineError> {
  // Validate everything before sorting, so a bad song is reported by identity
  // rather than by whatever position it happened to occupy.
  for (const song of songs) {
    const valid = validateSong(song);
    if (!valid.ok) {
      return { ok: false, error: valid.error };
    }
  }

  const sorted = [...songs].sort(compareSongs);

  return {
    ok: true,
    value: sorted.map((song, index) => ({ ...song, rank: index + 1 })),
  };
}