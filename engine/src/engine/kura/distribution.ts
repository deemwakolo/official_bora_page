/**
 * BORA Engine — active C distribution, XP, and fresh Kura
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 8. Composes the already-proven pieces into the first chart-level
 * distribution:
 *
 *     active hourly C
 *         ↓  (Phase 5 window + Phase 4 thresholds)
 *     C_i  — active C per song
 *         ↓
 *     T_C  — total active C across the supplied population
 *         ↓
 *     XP_i = C_i / T_C
 *         ↓
 *     kuraFresh_i = XP_i × 50
 *
 * NOTHING IS REIMPLEMENTED HERE. This module composes, it does not duplicate:
 *   · the 72-hour window and active selection come from `window/hours`
 *   · the vote thresholds come from `votes/threshold`
 * There is deliberately no second threshold or window implementation in this
 * file — only the composition between them.
 *
 * ── THE DISTRIBUTION BOUNDARY ──────────────────────────────────────────────
 *
 *   The distribution mathematics (T_C, XP, fresh Kura) is a SEPARATE concern
 *   from deciding where a song's active C came from. It therefore lives in
 *   exactly one place — `distributeActiveC` — and is reachable from two
 *   callers:
 *
 *     evaluateActiveDistribution   vote buckets  → sumActiveC → distribute
 *     a higher layer                resolved C   → distribute
 *
 *   `distributeActiveC` accepts ALREADY-RESOLVED active C values. It has no
 *   knowledge of votes, hours, seeds, lifecycle, platforms, or time, and it
 *   never recomputes C. That blindness is deliberate: whichever upstream layer
 *   resolved a song's C — from real votes, or otherwise — the resulting C
 *   enters T_C, XP, and fresh Kura through the same single path, so a value
 *   cannot be treated differently depending on its origin.
 *
 *   It is for this reason that Phase 8 remains the single authoritative
 *   implementation of the C → T_C → XP → fresh Kura chain.
 *
 * THE POPULATION IS SUPPLIED BY THE CALLER.
 *
 *   This function receives an already-valid active song population. It does
 *   not know what Vault is, does not filter by lifecycle, and does not inspect
 *   simulation state. Deciding which songs are active is the simulation
 *   layer's job; deciding how to distribute C among them is this module's job.
 *   That separation is why there is no hidden denominator here.
 *
 * ZERO TOTAL C (Phase 8 locked contract):
 *
 *   When T_C = 0 every song receives XP = 0 and kuraFresh = 0. The result
 *   stays valid, deterministic, and renderable — no error, no null, no NaN.
 *
 *   The normalisation invariants ΣXP = 1 and ΣkuraFresh = 50 are explicitly
 *   CONDITIONAL on T_C > 0 (types.ts, testing/invariants.ts). At T_C = 0 they
 *   yield 0 and 0, which does not violate them. A cold chart is a legitimate
 *   chart state, and activity is never manufactured from no activity — the
 *   same principle Phase 7 applies to the seed.
 *
 * FRESH KURA ONLY. This module produces `kuraFresh`, which is the normalised
 * instantaneous distribution. It does NOT produce persistent Kura, decay,
 * platform points, BORA Score, or ranking; those arrive in later phases.
 *
 * PURE: no mutation, no clock, no randomness, no caching, no global state, no
 * React, no Supabase, no AI, no network.
 */

import { KURA_TOTAL } from '../constants';
import { sumActiveC } from '../window/hours';
import type { HourIndex, VoteBucket, Result, EngineError } from '../types';

/** The minimal identity this module needs from a song. */
export interface ChartSongInput {
  readonly id: string;
  /** That song's stored hourly buckets, in any order. */
  readonly buckets: readonly VoteBucket[];
}

/**
 * One song's already-resolved active C, supplied by the caller.
 *
 * This is the ONLY input `distributeActiveC` needs. It deliberately does not
 * carry buckets, hours, or any provenance: by the time a value reaches the
 * distribution stage it is simply C.
 */
export interface ActiveCInput {
  readonly songId: string;

  /** C_i for this song. Finite and non-negative. */
  readonly activeC: number;
}

/** One song's position in the active distribution. */
export interface ActiveDistributionEntry {
  readonly songId: string;

  /** C_i = Σ active hourly C_h over the 72-hour window. */
  readonly activeC: number;

  /** XP_i = C_i / T_C, in [0, 1]. Exactly 0 when T_C = 0. */
  readonly xp: number;

  /** kuraFresh_i = XP_i × KURA_TOTAL. Diagnostic only, never scored (A1). */
  readonly kuraFresh: number;
}

/**
 * The distribution mathematics alone, with no reference-hour metadata.
 *
 * This is what `distributeActiveC` returns. The reference hour is descriptive
 * context supplied by a caller, never an input to the mathematics, so the
 * primitive's own result type does not carry it.
 */
export interface CoreDistribution {
  /** T_C = Σ C_i across the supplied population. */
  readonly totalActiveC: number;

  /** One entry per supplied song, in the population's input order. */
  readonly entries: readonly ActiveDistributionEntry[];
}

/** The full active distribution at one reference hour. */
export interface ActiveDistribution extends CoreDistribution {
  readonly referenceHour: HourIndex;
}

// ───────────────────────────────────────────────────────────────────────────
// DISTRIBUTION PRIMITIVE — the authoritative implementation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Distribute ALREADY-RESOLVED active C across a population.
 *
 *     T_C       = Σ C_i
 *     XP_i      = C_i / T_C          (exactly 0 when T_C = 0)
 *     kuraFresh = XP_i × KURA_TOTAL  (exactly 0 when T_C = 0)
 *
 * This function is the SINGLE place in the engine where the distribution
 * mathematics exists. `evaluateActiveDistribution` below is a thin caller, and
 * any other layer that has already resolved its own C calls in here too. There
 * is deliberately no second copy of the formulas anywhere.
 *
 * WHAT THIS FUNCTION DOES NOT KNOW
 *
 * It receives finished numbers. It has no notion of votes, clock hours, the
 * 72-hour window, seeded values, platform observations, or song lifecycle, and
 * it never recomputes active C. A caller that resolved a value from any origin
 * therefore gets identical treatment: the primitive cannot distinguish how a C
 * was obtained, which is precisely the property that stops an
 * origin-dependent special case from leaking into T_C, XP, or fresh Kura.
 *
 * ZERO TOTAL C (Phase 8 locked contract)
 *
 *   When T_C = 0 every song receives XP = 0 and kuraFresh = 0. The result
 *   stays valid, deterministic, and renderable — no error, no null, no NaN.
 *   The normalisation invariants ΣXP = 1 and ΣkuraFresh = 50 are explicitly
 *   CONDITIONAL on T_C > 0. At T_C = 0 they yield 0 and 0, which does not
 *   violate them. A cold chart is a legitimate chart state, and activity is
 *   never manufactured from no activity.
 *
 * ORDERING
 *
 *   Entries keep the population's input order, and every derived value is
 *   order-independent, so the caller's ordering is preserved without sorting.
 *
 * PURE: no mutation, no clock, no randomness, no global state.
 *
 * @param population Already-resolved active C per song, in any order.
 * @returns The T_C / XP / fresh-Kura distribution, or the first validation
 *   error encountered.
 */
export function distributeActiveC(
  population: readonly ActiveCInput[],
): Result<CoreDistribution, EngineError> {
  // Validate every supplied value BEFORE summing, so a corrupt entry is
  // reported by identity rather than silently cancelling another entry's value
  // inside T_C. Per-entry validation is stricter than the total check alone, and
  // is still exactly equivalent for any real caller: hourly C is floored at 0
  // by Phase 4, so vote-derived C is never negative to begin with.
  for (const song of population) {
    if (!Number.isFinite(song.activeC) || song.activeC < 0) {
      return {
        ok: false,
        error: {
          code: 'INVALID_MEASUREMENT',
          message:
            'Resolved active C must be a finite, non-negative number. ' +
            'Rejected rather than coerced, since a corrupt value would ' +
            'corrupt every share derived from it.',
          context: { songId: song.songId, activeC: String(song.activeC) },
        },
      };
    }
  }

  // Pass 1 — T_C. A sum of validated non-negative values, so it cannot be
  // negative, but guarded anyway: a negative total would silently invert every
  // XP share.
  let totalActiveC = 0;

  for (const song of population) {
    totalActiveC += song.activeC;
  }

  if (!Number.isFinite(totalActiveC) || totalActiveC < 0) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TOTAL_C',
        message:
          'Total active C must be a finite, non-negative number. Rejected ' +
          'rather than coerced, since a corrupted total would corrupt every ' +
          'share derived from it.',
        context: { totalActiveC: String(totalActiveC) },
      },
    };
  }

  // Pass 2 — distribute.
  const entries: ActiveDistributionEntry[] = [];

  for (const song of population) {
    // Zero total: every song receives zero rather than a division by zero.
    const xp = totalActiveC > 0 ? song.activeC / totalActiveC : 0;

    entries.push({
      songId: song.songId,
      activeC: song.activeC,
      xp,
      kuraFresh: xp * KURA_TOTAL,
    });
  }

  return { ok: true, value: { totalActiveC, entries } };
}

/**
 * Attach a reference hour to a core distribution.
 *
 * `referenceHour` is descriptive metadata about WHEN a distribution was taken,
 * not an input to the mathematics. The primitive has no clock and therefore
 * cannot know it; callers that do know it stamp it here. Keeping the field in
 * the result type preserves the established Phase 8 shape without letting an
 * invented hour leak into any calculation — the primitive never fabricates one.
 */
function withReferenceHour(
  core: CoreDistribution,
  referenceHour: HourIndex,
): ActiveDistribution {
  return {
    referenceHour,
    totalActiveC: core.totalActiveC,
    entries: core.entries,
  };
}

/**
 * Resolve each supplied song's active C from its hourly vote buckets, then
 * delegate the distribution to the authoritative primitive.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠ LEGACY (Phase 20R) — TEST-ONLY COMPOSITION LAYER. NOT THE PRODUCTION
 *   CHART PATH. ⚠
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CLASSIFICATION (from the Phase 20R dependency audit):
 *
 *   Category B — required only by tests/harness.
 *   Production evaluation callers: NONE.
 *   Callers found: `boraScore.test.ts`, `chart.test.ts`, `distribution.test.ts`,
 *   `ranking.test.ts` — all test files. Zero production callers.
 *
 * THE PRODUCTION PATH IS ELSEWHERE:
 *
 *   `chart.ts` → `buildCoreDistribution` → `distributeActiveC`
 *
 * `chart.test.ts` asserts this explicitly, so the separation is enforced by a
 * test rather than by convention alone.
 *
 * WHY RETAINED:
 *
 * It is a useful equivalence oracle: `distribution.test.ts` proves that routing
 * a population through this wrapper yields byte-identical results to calling
 * `distributeActiveC` directly. That property is worth keeping as a regression
 * guard even though production does not use the wrapper.
 *
 * It is LEGACY, not supported API. Do not call it from production code.
 *
 * ── WHAT IT DOES ─────────────────────────────────────────────────────────────
 *
 * This function is a THIN COMPOSITION LAYER and contains no distribution
 * mathematics of its own:
 *
 *     vote buckets
 *         ↓  existing `sumActiveC` (Phase 5 window + Phase 4 thresholds)
 *     precomputed C values
 *         ↓  `distributeActiveC`
 *     T_C, XP, fresh Kura
 *
 * It exists to bridge hourly vote records into the distribution stage. A caller
 * that has already resolved its C by some other route should call
 * `distributeActiveC` directly rather than passing it through here.
 *
 * THE POPULATION IS SUPPLIED BY THE CALLER.
 *
 *   This function receives an already-valid active song population. It does
 *   not know what Vault is, does not filter by lifecycle, and does not inspect
 *   simulation state. Deciding which songs are active is the simulation
 *   layer's job; deciding how to distribute C among them is this module's job.
 *   That separation is why there is no hidden denominator here.
 *
 * PURE: no mutation, no clock, no randomness, no caching, no global state, no
 * React, no Supabase, no AI, no network.
 *
 * @param population    Already-valid active songs, in any order.
 * @param referenceHour The current clock hour. Supplied by the caller.
 * @returns The per-song C / XP / fresh-Kura distribution and the chart total,
 *   or the first validation error encountered (e.g. a duplicate hour index in
 *   one song's buckets, or a corrupt bucket).
 */
export function evaluateActiveDistribution(
  population: readonly ChartSongInput[],
  referenceHour: HourIndex,
): Result<ActiveDistribution, EngineError> {
  // Pass 1 — resolve each song's active C, reusing Phase 5 + Phase 4 unchanged.
  const resolved: ActiveCInput[] = [];

  for (const song of population) {
    const sum = sumActiveC(song.buckets, referenceHour);
    if (!sum.ok) {
      return { ok: false, error: sum.error };
    }
    resolved.push({ songId: song.id, activeC: sum.value });
  }

  // Pass 2 — the distribution itself, delegated in full.
  const distributed = distributeActiveC(resolved);
  if (!distributed.ok) {
    return { ok: false, error: distributed.error };
  }

  return {
    ok: true,
    value: withReferenceHour(distributed.value, referenceHour),
  };
}