/**
 * BORA Engine — BORA Score composition
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 11. The final additive composition of the two proven score branches:
 *
 *     boraScore_i = persistentKura_i + yt_i + sp_i + bp_i
 *
 * ── WHAT THIS MODULE DOES NOT DO ───────────────────────────────────────────
 *
 *   It is a pure SUM. It recomputes nothing and inspects nothing:
 *   · no C, XP, or fresh Kura
 *   · no persistent-Kura update, no decay, no hourly cycle
 *   · no platform window, normalisation, or raw observations
 *   · no K (Contract 2 — K is score-neutral, a ranking tie-break only)
 *   · no ranking, ordering, or tie-breaking
 *
 *   Dependency direction is strictly forward: Phase 9 + Phase 10 output IN,
 *   BORA Score OUT. There is no reverse import.
 *
 * ── NO NORMALISATION, NO CAP ───────────────────────────────────────────────
 *
 *   The BORA Score is an ADDITIVE RAW SCORE. There is deliberately:
 *     · no division by totalScore
 *     · no division by 100
 *     · no multiplication by 50
 *     · no clamp or Math.min(score, 100)
 *
 *   Platform weights (30/15/5) were already applied in Phase 10 and are NOT
 *   applied again here — doing so would double-weight them.
 *
 *   Because persistent Kura accumulates across hourly cycles and may exceed 50
 *   on its own, the score has NO fixed ceiling. The only structural bound is:
 *
 *     persistentKura <= boraScore <= persistentKura + 50
 *
 *   where 50 = PLATFORM_TOTAL is the total current platform contribution.
 *   A score below the Kura value would be impossible, and one more than 50
 *   above it would be impossible, for any valid input.
 *
 * ── ZERO VALUES ARE VALID ──────────────────────────────────────────────────
 *
 *   A song with no persistent Kura and no platform points scores exactly 0.
 *   That is a legitimate cold-chart result, not a missing value.
 *
 * PURE: no mutation, no clock, no randomness, no React, no Supabase, no AI,
 * no network, no caching, no global state.
 */

import { PLATFORM_TOTAL } from '../constants';
import type { Result, EngineError } from '../types';
import type { PlatformPointsEntry } from '../platform/points';

/**
 * A finite, non-negative number.
 *
 * Applied to every component. Platform points and persistent Kura are already
 * bounded upstream, but the boundary is re-checked here so a malformed input
 * can never produce a NaN score that silently sorts to the bottom of a chart.
 */
function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function invalidScoreComponent(
  field: string,
  value: number,
): Result<number, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_MEASUREMENT',
      message:
        `${field} must be a finite, non-negative number. Rejected rather than ` +
        'clamped or zeroed: a fabricated score component would silently ' +
        'corrupt a chart ranking.',
      context: { [field]: String(value) },
    },
  };
}

/**
 * Compose the BORA Score for one song.
 *
 *   boraScore = persistentKura + yt + sp + bp
 *
 * Additive and linear: increasing any single component by d increases the
 * score by exactly d, and no component alters another's coefficient.
 *
 * @param persistentKura The song's persistent Kura balance, >= 0.
 * @param platformPoints Phase 10 output for the same song. Only the normalised
 *   point fields (yt/sp/bp) are read — the raw activity fields are ignored,
 *   because Phase 10 already applied the platform weights.
 * @returns The BORA Score, or INVALID_MEASUREMENT for any invalid component.
 */
export function calculateBoraScore(
  persistentKura: number,
  platformPoints: PlatformPointsEntry,
): Result<number, EngineError> {
  if (!isNonNegativeFinite(persistentKura)) {
    return invalidScoreComponent('persistentKura', persistentKura);
  }
  if (!isNonNegativeFinite(platformPoints.yt)) {
    return invalidScoreComponent('platformPoints.yt', platformPoints.yt);
  }
  if (!isNonNegativeFinite(platformPoints.sp)) {
    return invalidScoreComponent('platformPoints.sp', platformPoints.sp);
  }
  if (!isNonNegativeFinite(platformPoints.bp)) {
    return invalidScoreComponent('platformPoints.bp', platformPoints.bp);
  }

  // A plain sum. No normalisation, no coefficient, no cap.
  return {
    ok: true,
    value:
      persistentKura +
      platformPoints.yt +
      platformPoints.sp +
      platformPoints.bp,
  };
}

/**
 * The largest current platform contribution any song can receive (50).
 *
 * Exported so the score's structural bounds can be asserted by name rather
 * than by re-deriving `30 + 15 + 5` inline at each call site.
 */
export const MAX_PLATFORM_CONTRIBUTION = PLATFORM_TOTAL;

/**
 * Compose a full chart of scores from Phase 9 balances and Phase 10 output.
 *
 * Convenience for the simulation layer: it preserves the population order of
 * `platformPoints` and reports the first invalid song rather than silently
 * dropping it or substituting zero.
 */
export function calculateChartScores(
  population: readonly {
    readonly songId: string;
    readonly persistentKura: number;
    readonly platformPoints: PlatformPointsEntry;
  }[],
): Result<readonly { songId: string; boraScore: number }[], EngineError> {
  const scores: { songId: string; boraScore: number }[] = [];

  for (const song of population) {
    const score = calculateBoraScore(song.persistentKura, song.platformPoints);
    if (!score.ok) {
      return { ok: false, error: score.error };
    }
    scores.push({ songId: song.songId, boraScore: score.value });
  }

  return { ok: true, value: scores };
}