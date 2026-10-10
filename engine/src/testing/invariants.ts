/**
 * BORA Engine — reusable invariant assertions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * These encode the spec's invariants ONCE, so no test re-derives them and no
 * test can accidentally assert a weaker or stronger version.
 *
 * A2 CORRECTION — read this before adding an assertion:
 *   Guaranteed:       Σ kuraFresh = 50
 *   NOT guaranteed:   Σ kuraPersistent = 50   ← decay makes this drift below 50
 *   There is deliberately NO assertKuraPersistentSum function, so the invalid
 *   invariant cannot be reintroduced by accident.
 */

import { expect } from 'vitest';
import {
  KURA_TOTAL,
  PLATFORM_WEIGHTS,
  PLATFORM_TOTAL,
  C_MAX,
  C_WINDOW_HOURS,
} from '../engine/constants';
import type { ChartEvaluation, ChartEntry, PlatformId } from '../engine/types';
import { expectClose, expectSumClose, expectInRange, expectNonNegative } from './compare';

/** A2: Σ kuraFresh = KURA_TOTAL (50) when there is active C. */
export function assertKuraFreshSum(evaluation: ChartEvaluation): void {
  if (evaluation.tC <= 0) return; // invariant is conditional on T_C > 0
  expectSumClose(
    evaluation.entries.map((e) => e.kuraFresh),
    KURA_TOTAL,
  );
}

/** A2: Σ XP = 1 when T_C > 0. */
export function assertXpSum(evaluation: ChartEvaluation): void {
  if (evaluation.tC <= 0) return;
  expectSumClose(
    evaluation.entries.map((e) => e.xp),
    1,
  );
}

/**
 * `ChartEntry` names its platform fields YT/SP/BP for readability, while
 * `PlatformId` uses the canonical youtube/spotify/boomplay. This map is the
 * single, explicit bridge between the two naming schemes.
 *
 * Making it explicit (rather than indexing dynamically) means a future
 * rename of either side fails to compile instead of silently reading
 * `undefined` and asserting against NaN.
 */
const ENTRY_FIELD_BY_PLATFORM: Readonly<Record<PlatformId, keyof ChartEntry>> =
  Object.freeze({
    youtube: 'yt',
    spotify: 'sp',
    boomplay: 'bp',
  });

/** Contract 19/20/21: ΣYT = 30, ΣSP = 15, ΣBP = 5 when that platform is active. */
export function assertPlatformSums(evaluation: ChartEvaluation): void {
  for (const platform of Object.keys(PLATFORM_WEIGHTS) as PlatformId[]) {
    const weight = PLATFORM_WEIGHTS[platform];
    if (evaluation.platformTotals[platform] > 0) {
      const field = ENTRY_FIELD_BY_PLATFORM[platform];
      const values = evaluation.entries.map(
        (e) => e[field] as number,
      );
      expectSumClose(values, weight);
    }
  }
}

/** A4: BORA = kuraScored + YT + SP + BP. Uses scored Kura, NOT fresh. */
export function assertBoraComposition(entry: ChartEntry): void {
  expectClose(
    entry.boraScore,
    entry.kuraScored + entry.yt + entry.sp + entry.bp,
  );
}

/** A4: platform points are never decayed and never negative. */
export function assertPlatformPointsNonNegative(entries: readonly ChartEntry[]): void {
  for (const e of entries) {
    expectNonNegative(e.yt, `${e.songId}.yt`);
    expectNonNegative(e.sp, `${e.songId}.sp`);
    expectNonNegative(e.bp, `${e.songId}.bp`);
  }
}

/** Contract Phase 9 / Scenario I: C >= 0, and within the 72h structural ceiling. */
export function assertCWithinBounds(entries: readonly ChartEntry[]): void {
  for (const e of entries) {
    expectNonNegative(e.cActive, `${e.songId}.cActive`);
    expect(
      e.cActive <= C_MAX * C_WINDOW_HOURS + 1e-9,
      `${e.songId}.cActive must respect the 72h ceiling`,
    ).toBe(true);
  }
}

/** Contract Phase 14: XP in [0, 1] for every song, including zero-C songs. */
export function assertXpInUnitRange(entries: readonly ChartEntry[]): void {
  for (const e of entries) {
    expectInRange(e.xp, 0, 1, `${e.songId}.xp`);
  }
}

/** Contract Phase 14: a song with C = 0 must have XP exactly 0. */

/** Contract 33 / Scenario G: Vault songs never accumulate scored Kura. */
export function assertVaultScoresZero(entries: readonly ChartEntry[]): void {
  for (const e of entries) {
    if (e.lifecycle === 'VAULT') {
      expectNonNegative(e.cActive, `${e.songId} vaulted cActive`);
      expect(
        e.kuraScored,
        `${e.songId} vaulted must not accumulate scored Kura`,
      ).toBe(0);
    }
  }
}

/** Contract 7: ranks must be 1..n with no gaps or duplicates. */
export function assertRanksContiguous(evaluation: ChartEvaluation): void {
  const ranks = evaluation.entries.map((e) => e.rank).sort((a, b) => a - b);
  ranks.forEach((r, i) => {
    expect(r, `rank ${i} must equal ${i + 1}`).toBe(i + 1);
  });
}

/** Contract 7: the chart must be sorted by the full 4-level key. */
export function assertChartProperlySorted(evaluation: ChartEvaluation): void {
  for (let i = 1; i < evaluation.entries.length; i++) {
    const prev = evaluation.entries[i - 1];
    const cur = evaluation.entries[i];
    const isOrdered =
      prev.boraScore > cur.boraScore ||
      (prev.boraScore === cur.boraScore && prev.k > cur.k) ||
      (prev.boraScore === cur.boraScore &&
        prev.k === cur.k &&
        prev.platformTotal > cur.platformTotal) ||
      (prev.boraScore === cur.boraScore &&
        prev.k === cur.k &&
        prev.platformTotal === cur.platformTotal &&
        prev.songId < cur.songId);
    expect(
      isOrdered,
      `chart out of order at ${prev.songId} / ${cur.songId}`,
    ).toBe(true);
  }
}

/** Platform weights must sum to the declared total (sanity on the spec). */
export function assertPlatformWeightsSum(): void {
  const sum = Object.values(PLATFORM_WEIGHTS).reduce((a, b) => a + b, 0);
  expect(sum, 'platform weights must sum to 50').toBe(PLATFORM_TOTAL);
  expect(sum).toBe(50);
}

/**
 * EXTERNAL_WEIGHTS[k] === PLATFORM_WEIGHTS[k] / PLATFORM_TOTAL.
 *
 * ── PHASE 23 RECONCILIATION ───────────────────────────────────────────────────
 *
 * This is a LEGACY identity, asserted to keep the retirement of Contract 13
 * auditable — NOT because Contract 13 is current. `p = E` was removed together
 * with `seedC(p, T_C)`; the seed pipeline no longer derives any value.
 *
 * The earlier wording ("is WHY Contract 13 CAN lock p = E coherently") stated a
 * superseded rule in the present tense and read as though the engine still
 * turned a platform measurement into a seed. It does not. See
 * `seed/external.ts` (quarantined) and the seeded contract in
 * PHASE-20R-RATIFICATION.md.
 *
 * The identity is retained because it is a real numerical relationship between
 * two retained constants: if PLATFORM_WEIGHTS is ever edited, this assertion
 * fails and the discrepancy is visible instead of silent.
 */
export function assertExternalWeightIdentity(): void {
  const pairs: Array<[PlatformId, number]> = [
    ['youtube', 0.6],
    ['spotify', 0.3],
    ['boomplay', 0.1],
  ];
  for (const [platform, expected] of pairs) {
    expect(
      PLATFORM_WEIGHTS[platform] / PLATFORM_TOTAL,
      `${platform} external weight must equal its platform share`,
    ).toBeCloseTo(expected, 12);
  }
}

/** Every numeric field in an evaluation must be finite — no NaN, no Infinity. */
export function assertNoNonFinite(evaluation: ChartEvaluation): void {
  for (const e of evaluation.entries) {
    for (const [key, value] of Object.entries(e)) {
      if (typeof value === 'number') {
        expect(
          Number.isFinite(value),
          `${e.songId}.${key} is not finite: ${value}`,
        ).toBe(true);
      }
    }
  }
}

export function assertZeroCSongsHaveZeroXp(entries: readonly ChartEntry[]): void {
  for (const e of entries) {
    if (e.cActive === 0) {
      expect(e.xp, `${e.songId} has C=0 so XP must be exactly 0`).toBe(0);
    }
  }
}
