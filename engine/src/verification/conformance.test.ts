/**
 * BORA - PHASE 21 DIFFERENTIAL CONFORMANCE
 * =============================================================
 *
 *     REFERENCE MODEL  ->  expected
 *              X
 *     ENGINE UNDER TEST ->  actual
 *
 * Every test here asks the same question and nothing else: would an
 * independently written mathematician, reading only the specification, have
 * obtained these same numbers?
 *
 * The reference model lives in ./reference/** and imports nothing from
 * src/engine. The engine is reached only through ./adapters, which translates
 * shapes and copies no formula. If the two ever agree, they agree because the
 * mathematics agrees - not because they share a helper.
 *
 * TOLERANCE POLICY (Phase 21 section 18, REASSESSED in Phase 22 section 14)
 * ------------------------------------------------------------------------
 * 1e-9 EVERYWHERE. Discrete quantities (K, rank, song identity) are compared
 * EXACTLY, with no epsilon at all.
 *
 * PHASE 22 REMOVED THE WIDENING. Phase 21 permitted 1e-6 for the "extreme
 * seed" case, on the grounds that unbounded seed values made the contract's own
 * arithmetic ill-conditioned. That reasoning has expired: seed C is now bounded
 * by [0, C_MAX], so no accepted seed is ill-conditioned and no accepted seed
 * needs arithmetic tolerance beyond the ordinary 1e-9. Extreme NUMBERS
 * (Number.MAX_VALUE and similar) now appear only in REJECTION tests, where no
 * arithmetic is performed at all.
 *
 * A failing tolerance is never widened to make a run green. If a case cannot be
 * met at 1e-9 it is either a real disagreement or a documented numerical
 * artefact, and both are recorded in the phase report.
 */

import { describe, it, expect } from 'vitest';

import {
  canonicalFromEngine,
  canonicalFromReference,
  kMap,
  runEngine,
  runReference,
  runEngineRollover,
} from './adapters';
import { diffCanonical, formatDifferences, serialise } from './reference/canonical';
import { REF_TOLERANCE } from './reference/contract';
import {
  refHourlyC,
  refUpvoteContribution,
  refDownvoteContribution,
  refDecayRate,
  refPersistentNext,
  refXpAndFreshKura,
  refResolveHours,
  refActiveC,
  refCompare,
  refRestore,
  refVault,
  refSeededHourlyCAccepts,
  refSongSeedsWithinDomain,
} from './reference/model';
import { refRolloverHour } from './reference/rollover';
import { toReference } from './adapters';
import {
  allCorpus,
  buildRandomCorpus,
  CORPUS_HOUR,
  CORPUS_WINDOW_START,
} from './generator';
import { calculateHourlyC } from '../engine/votes/threshold';
import { sumActiveC, getActiveWindow } from '../engine/window/hours';
import { updatePersistentKura, calculateDecay } from '../engine/kura/persistent';
import type { SpecScenario } from './spec';
import type { RefSong } from './reference/types';

const CORPUS = allCorpus();
const RANDOM = buildRandomCorpus(20260410, 60);

/** Assert the two models agree on one scenario, and explain any gap. */
function expectConforms(spec: SpecScenario, tolerance = REF_TOLERANCE): void {
  const expected = canonicalFromReference(runReference(spec));
  const actual = canonicalFromEngine(runEngine(spec), kMap(spec.songs));

  const differences = diffCanonical(expected, actual, tolerance);
  expect(
    differences,
    `conformance failure in "${spec.name}" (tolerance ${tolerance})\n` +
      formatDifferences(differences) +
      `\n\n--- reference ---\n${serialise(expected)}` +
      `\n\n--- engine ---\n${serialise(actual)}`,
  ).toEqual([]);
}
// =============================================================================
// C1 - THRESHOLD CONFORMANCE  (REF-THRESHOLD, Contract 9)
// =============================================================================

describe('C1 threshold conformance', () => {
  const upValues = [0, 1, 2, 3, 4, 5, 6, 7, 50, 1000000];
  const downValues = [0, 1, 2, 3, 4, 5, 6, 40];

  it('reference C_U saturates exactly where the contract says', () => {
    for (const up of upValues) {
      const expected = up === 0 ? 0 : up < 5 ? 1 : 2;
      expect(refUpvoteContribution(up)).toBe(expected);
      // C_D = 0 here, so C_h is exactly C_U on both sides.
      const engine = calculateHourlyC({
        hourIndex: 0 as never, upvotes: up, downvotes: 0,
        phase: 'CLOSED' as const, version: 0,
      });
      expect(engine.ok).toBe(true);
      expect((engine as { value: number }).value).toBe(expected);
    }
  });

  it('reference C_D saturates exactly where the contract says', () => {
    for (const down of downValues) {
      const expected = down === 0 ? 0 : down < 5 ? 0.5 : 1;
      expect(refDownvoteContribution(down)).toBe(expected);
    }
  });

  it('reference and engine agree on C_h across the full up/down lattice', () => {
    for (const up of upValues) {
      for (const down of downValues) {
        const engine = calculateHourlyC({
          hourIndex: 0 as never, upvotes: up, downvotes: down,
          phase: 'CLOSED' as const, version: 0,
        });
        expect(engine.ok).toBe(true);
        const expected = refHourlyC({ hour: 0, up, down });
        expect((engine as { value: number }).value).toBe(expected);
      }
    }
  });

  it('effective C always lies on the 0.5 lattice and never exceeds C_MAX', () => {
    for (const up of upValues) {
      for (const down of downValues) {
        const c = refHourlyC({ hour: 0, up, down });
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(2);
        expect(Math.abs(c * 2 - Math.round(c * 2))).toBeLessThan(1e-12);
      }
    }
  });

  it('a heavily downvoted hour clamps to 0 and never goes negative', () => {
    const engine = calculateHourlyC({
      hourIndex: 0 as never, upvotes: 0, downvotes: 1000000,
      phase: 'CLOSED' as const, version: 0,
    });
    expect(engine.ok && engine.value).toBe(0);
    expect(refHourlyC({ hour: 0, up: 0, down: 1000000 })).toBe(0);
  });

  it('the 4/5 boundary is where the engine and reference diverge from each other', () => {
    // 4 upvotes -> C_U 1; 5 upvotes -> C_U 2. The critical edge.
    expect(refHourlyC({ hour: 0, up: 4, down: 0 })).toBe(1);
    expect(refHourlyC({ hour: 0, up: 5, down: 0 })).toBe(2);
  });
});
// =============================================================================
// C2 - WINDOW CONFORMANCE  (REF-WINDOW, Contract 3/4, A5)
// =============================================================================

describe('C2 window conformance', () => {
  const H = CORPUS_HOUR;

  it('both models place the window at H-71 .. H inclusive', () => {
    const engineWindow = getActiveWindow(H as never);
    expect(engineWindow.ok).toBe(true);
    const engineValue = (engineWindow as { value: { startHour: number; endHour: number; hours: number } }).value;

    expect(engineValue.startHour).toBe(CORPUS_WINDOW_START);
    expect(engineValue.endHour).toBe(H);
    expect(engineValue.hours).toBe(72);
  });

  it('both models exclude H-72 and H+1, and include H-71 and H', () => {
    for (const hour of [H - 71, H]) {
      const engineSum = sumActiveC(
        [{ hourIndex: hour as never, upvotes: 5, downvotes: 0, phase: 'CLOSED' as const, version: 0 }],
        H as never,
      );
      expect(engineSum.ok && engineSum.value).toBe(2);
    }

    for (const hour of [H - 72, H + 1]) {
      const engineSum = sumActiveC(
        [{ hourIndex: hour as never, upvotes: 5, downvotes: 0, phase: 'CLOSED' as const, version: 0 }],
        H as never,
      );
      expect(engineSum.ok && engineSum.value).toBe(0);
    }
  });

  it('active C agrees on every window-shaped case in the corpus', () => {
    const cases = CORPUS.filter((c) => c.name.startsWith('window/'));
    expect(cases.length).toBeGreaterThan(0);
    for (const spec of cases) {
      expectConforms(spec);
    }
  });

  it('a 73-record history contributes exactly the 72 in-window hours', () => {
    const spec = CORPUS.find((c) => c.name === 'window/73-hours-includes-expired')!;
    const expected = canonicalFromReference(runReference(spec));
    // 73 buckets at 2.0 each, one of which is the expired H-72.
    expect(expected.rows[0]!.activeC).toBeCloseTo(144, 9);
    expectConforms(spec);
  });
});
// =============================================================================
// C3 - SEED CONFORMANCE  (REF-SEED, Contract 9, A6)
// =============================================================================

describe('C3 seed conformance', () => {
  const H = CORPUS_HOUR;

  it('every seed case in the corpus conforms', () => {
    const cases = CORPUS.filter((c) => c.name.startsWith('seed/'));
    expect(cases.length).toBeGreaterThan(0);
    for (const spec of cases) {
      // Phase 22: every seed case now conforms at the NORMAL 1e-9 tolerance.
      // The former extreme-seed widening is gone because seed C is bounded by
      // [0, C_MAX]; nothing accepted is ill-conditioned any more.
      expectConforms(spec);
    }
  });

  it('an ACTUAL C of 0 suppresses the seed for that exact hour', () => {
    const reference = toReference({
      name: 'probe',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
        buckets: [{ hour: H, up: 0, down: 0 }],
        seed: [{ hour: H, c: 2, source: 'SEED', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    });
    const hours = refResolveHours(reference.songs[0]!, H);
    const atH = hours.find((h) => h.hour === H)!;

    expect(atH.source).toBe('ACTUAL');
    expect(atH.actualC).toBe(0);
    // The seed is not merely outranked - it is suppressed entirely, so it can
    // never be added back in.
    expect(atH.seedC).toBeNull();
    expect(refActiveC(hours)).toBe(0);
  });

  it('actual and seed are never summed for the same hour', () => {
    const reference = toReference({
      name: 'probe',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
        buckets: [{ hour: H, up: 5, down: 0 }],
        seed: [{ hour: H, c: 2, source: 'SEED', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    });
    const hours = refResolveHours(reference.songs[0]!, H);
    // Actual 2.0 wins outright. A summing model would report 4.0 here.
    expect(refActiveC(hours)).toBe(2);
  });

  it('a seeded zero is distinguishable from an unmeasured hour', () => {
    const reference = toReference({
      name: 'probe',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
        buckets: [],
        seed: [
          { hour: H - 1, c: 0, source: 'SEED', archived: false },
          { hour: H - 2, c: 1, source: 'SEED', archived: false },
        ],
        youtube: [], spotify: [], boomplay: [],
      }],
    });
    const hours = refResolveHours(reference.songs[0]!, H);
    const seeded = hours.find((h) => h.hour === H - 1)!;
    const unmeasured = hours.find((h) => h.hour === H - 3)!;

    expect(seeded.source).toBe('SEED');
    expect(seeded.seedC).toBe(0);
    expect(unmeasured.source).toBe('NONE');
    expect(unmeasured.seedC).toBeNull();
  });

  it('an ARCHIVED seed record is retained but contributes nothing', () => {
    const spec = CORPUS.find((c) => c.name === 'seed/archived-records-do-not-contribute')!;
    expectConforms(spec);
    const chart = runReference(spec);
    const entry = chart.ranked.find((e) => e.songId === 'a')!;
    // Only the non-archived record at H-1 counts.
    expect(entry.activeC).toBeCloseTo(2, 9);
  });

  it('a record declared ACTUAL does not act as seed even when it carries a C', () => {
    const spec = CORPUS.find((c) => c.name === 'seed/actual-source-record-is-not-seed')!;
    expectConforms(spec);
    const chart = runReference(spec);
    expect(chart.ranked.find((e) => e.songId === 'a')!.activeC).toBe(0);
  });
});
// =============================================================================
// C4 - DISTRIBUTION CONFORMANCE  (REF-DISTRIBUTION, Contract 6, A2)
// =============================================================================

describe('C4 distribution conformance', () => {
  it('T_C, XP, and fresh Kura agree across the whole corpus', () => {
    for (const spec of [...CORPUS, ...RANDOM]) {
      expectConforms(spec);
    }
  });

  it('fresh Kura sums to exactly 50 when T_C > 0', () => {
    // Phase 22: the corpus is exempt from NOTHING. The old filter excluded the
    // extreme-seed case from these sums because unbounded seeds made them
    // ill-conditioned; with seed C bounded by [0, C_MAX] they are not.
    for (const spec of CORPUS) {
      const chart = runReference(spec);
      if (chart.tC <= 0) continue;
      const total = chart.ranked.reduce((sum, e) => sum + e.freshKura, 0);
      expect(Math.abs(total - 50)).toBeLessThan(1e-9);
    }
  });

  it('XP sums to exactly 1 when T_C > 0', () => {
    for (const spec of CORPUS) {
      const chart = runReference(spec);
      if (chart.tC <= 0) continue;
      const total = chart.ranked.reduce((sum, e) => sum + e.xp, 0);
      expect(Math.abs(total - 1)).toBeLessThan(1e-9);
    }
  });

  it('at T_C = 0 every song gets XP 0 and fresh Kura 0, with no NaN', () => {
    const spec = CORPUS.find((c) => c.name === 'c/all-zero-no-buckets')!;
    const chart = runReference(spec);
    expect(chart.tC).toBe(0);
    for (const entry of chart.ranked) {
      expect(entry.xp).toBe(0);
      expect(entry.freshKura).toBe(0);
      expect(Number.isFinite(entry.xp)).toBe(true);
      expect(Number.isFinite(entry.freshKura)).toBe(true);
    }
    expectConforms(spec);
  });

  it('a zero-C ACTIVE song stays in the population with zero contribution', () => {
    // Counted, not dropped: the song count is the point of the assertion.
    const spec = CORPUS.find((c) => c.name === 'lifecycle/zero-c-active-vs-vaulted')!;
    const chart = runReference(spec);
    expect(chart.ranked).toHaveLength(1);
    expect(chart.ranked[0]!.songId).toBe('zero-c-active');
    expect(chart.ranked[0]!.activeC).toBe(0);
    expectConforms(spec);
  });

  it('the reference distribution formula is the plain textbook one', () => {
    expect(refXpAndFreshKura(3, 12)).toEqual({ xp: 0.25, freshKura: 12.5 });
    expect(refXpAndFreshKura(0, 0)).toEqual({ xp: 0, freshKura: 0 });
  });
});

// =============================================================================
// C5 - PERSISTENT KURA CONFORMANCE  (REF-KURA, A1, A3)
// =============================================================================

describe('C5 persistent Kura conformance', () => {
  it('decay rate agrees with D_h = 0.0025 * (1 - C_h / 2)', () => {
    for (const c of [0, 0.5, 1, 1.5, 2]) {
      const engine = updatePersistentKura(100, 0, c);
      expect(engine.ok).toBe(true);
      // Recover the rate the engine actually applied from its own outputs.
      const after = (engine as { value: number }).value;
      const implied = 1 - after / 100;
      expect(Math.abs(implied - refDecayRate(c))).toBeLessThan(1e-12);
    }
  });

  it('fresh Kura is injected BEFORE decay, never after', () => {
    // At C = 2 the decay rate is zero, so the accepted and rejected forms
    // COINCIDE: (110) * (1 - 0) === 110 * (1 - 0) + 10 === 110. Only hours
    // with a non-zero decay rate can distinguish the two orderings, so that is
    // what this loop ranges over. Pinning the C = 2 coincidence separately
    // keeps the degenerate case from being mistaken for evidence either way.
    for (const c of [0, 0.5, 1, 1.5]) {
      const engine = updatePersistentKura(100, 10, c);
      expect(engine.ok).toBe(true);
      const accepted = (engine as { value: number }).value;
      const rejected = 100 * (1 - refDecayRate(c)) + 10;
      expect(accepted).not.toBeCloseTo(rejected, 10);
      expect(accepted).toBeCloseTo(refPersistentNext(100, 10, c), 12);
    }
  });

  it('at C = 2 both decay orderings coincide, because decay is zero', () => {
    const engine = updatePersistentKura(100, 10, 2);
    expect(engine.ok).toBe(true);
    expect((engine as { value: number }).value).toBe(110);
    expect(refDecayRate(2)).toBe(0);
  });

  it('a full C = 2 hour produces zero decay', () => {
    expect(refDecayRate(2)).toBe(0);
    expect(refPersistentNext(37, 13, 2)).toBe(50);
  });

  it('every Kura case in the corpus conforms', () => {
    const cases = CORPUS.filter((c) => c.name.startsWith('kura/'));
    expect(cases.length).toBeGreaterThan(0);
    for (const spec of cases) expectConforms(spec);
  });

  it('persistentKuraNext is null when no closed hour is supplied', () => {
    const spec = CORPUS.find((c) => c.name === 'c/full-2.0')!;
    for (const entry of runReference(spec).ranked) {
      expect(entry.persistentKuraNext).toBeNull();
    }
  });
});
// =============================================================================
// C6 - PLATFORM CONFORMANCE  (REF-PLATFORM, Contract 18-21, A4)
// =============================================================================

describe('C6 platform conformance', () => {
  it('every platform case in the corpus conforms', () => {
    const cases = CORPUS.filter((c) => c.name.startsWith('platform/'));
    expect(cases.length).toBeGreaterThan(0);
    for (const spec of cases) expectConforms(spec);
  });

  it('weights are exactly 30 / 15 / 5 and sum to 50', () => {
    const spec = CORPUS.find((c) => c.name === 'platform/all-active')!;
    const totals = runReference(spec).platformTotals;
    expect(totals.youtube).toBeCloseTo(30, 9);
    expect(totals.spotify).toBeCloseTo(15, 9);
    expect(totals.boomplay).toBeCloseTo(5, 9);
  });

  it('each platform normalises against its OWN total, not a combined one', () => {
    // Song a is 100% of YouTube but only a small share of Spotify and
    // Boomplay. A combined denominator would equalise those shares, which is
    // precisely the cross-platform balancing the contract forbids.
    const spec = CORPUS.find((c) => c.name === 'platform/all-active')!;
    const chart = runReference(spec);
    const a = chart.ranked.find((e) => e.songId === 'a')!;
    const b = chart.ranked.find((e) => e.songId === 'b')!;
    const c = chart.ranked.find((e) => e.songId === 'c')!;

    expect(a.yt).toBeCloseTo(30 * (10 / 41), 9);
    expect(b.yt).toBeCloseTo(30 * (30 / 41), 9);
    expect(a.sp).toBeCloseTo(15 * (5 / 7), 9);
    expect(c.sp).toBeCloseTo(15 * (1 / 7), 9);
    expect(a.bp).toBeCloseTo(5 * (2 / 9), 9);
    expect(c.bp).toBeCloseTo(5 * (1 / 9), 9);
  });

  it('an idle platform contributes zero and its weight is NOT redistributed', () => {
    const spec = CORPUS.find((c) => c.name === 'platform/youtube-only')!;
    const chart = runReference(spec);
    for (const entry of chart.ranked) {
      expect(entry.sp).toBe(0);
      expect(entry.bp).toBe(0);
    }
    // The chart totals 30, not 50. Unused weight is simply not awarded.
    const total = chart.ranked.reduce((sum, e) => sum + e.platformTotal, 0);
    expect(total).toBeCloseTo(30, 9);
    expectConforms(spec);
  });

  it('all-idle platforms produce a chart of exactly zero points, without NaN', () => {
    const spec = CORPUS.find((c) => c.name === 'platform/all-idle')!;
    const chart = runReference(spec);
    for (const entry of chart.ranked) {
      expect(entry.yt).toBe(0);
      expect(entry.sp).toBe(0);
      expect(entry.bp).toBe(0);
      expect(entry.platformTotal).toBe(0);
      expect(Number.isFinite(entry.boraScore)).toBe(true);
    }
    expectConforms(spec);
  });

  it('the platform window is 168 clock hours, excluding H-168', () => {
    const spec = CORPUS.find((c) => c.name === 'platform/outside-168h-window')!;
    const chart = runReference(spec);
    const a = chart.ranked.find((e) => e.songId === 'a')!;
    const b = chart.ranked.find((e) => e.songId === 'b')!;
    const c = chart.ranked.find((e) => e.songId === 'c')!;
    // Every YouTube observation in this chart sits at H-168, which is the
    // first EXCLUDED hour. YouTube's active total is therefore 0, so the
    // platform is idle and every song scores 0 there - no NaN, no division by
    // zero, and no redistribution of the unused 30 points.
    expect(a.yt).toBe(0);
    expect(b.yt).toBe(0);
    expect(c.yt).toBe(0);
    expect(chart.platformTotals.youtube).toBe(0);
    // Spotify is active only at H, so it awards its full 15 to b.
    expect(b.sp).toBeCloseTo(15, 9);
    // Boomplay sits exactly on H-167, the OLDEST INCLUDED hour, so it counts.
    expect(c.bp).toBeCloseTo(5, 9);
    expectConforms(spec);
  });
});

// =============================================================================
// C7 - SCORE CONFORMANCE  (REF-SCORE, Contract 2, A4)
// =============================================================================

describe('C7 score conformance', () => {
  it('BORA Score is exactly persistentKura + yt + sp + bp', () => {
    for (const spec of [...CORPUS, ...RANDOM]) {
      const chart = runReference(spec);
      for (const entry of chart.ranked) {
        const sum = entry.persistentKuraBefore + entry.yt + entry.sp + entry.bp;
        expect(Math.abs(entry.boraScore - sum)).toBeLessThan(1e-12);
      }
    }
  });

  it('the score uses the CURRENT persistent Kura, never the projected next', () => {
    const spec = CORPUS.find((c) => c.name === 'kura/medium-cycle-1')!;
    const chart = runReference(spec);
    for (const entry of chart.ranked) {
      expect(entry.persistentKuraNext).not.toBeNull();
      expect(entry.boraScore).toBeCloseTo(
        entry.persistentKuraBefore + entry.yt + entry.sp + entry.bp,
        12,
      );
      // A model that scored the projection would differ here, because decay
      // makes persistentNext strictly smaller than persistentBefore.
      expect(entry.persistentKuraNext!).toBeLessThan(entry.persistentKuraBefore + entry.freshKura);
    }
    expectConforms(spec);
  });

  it('K never contributes to the score', () => {
    // 'rank/exact-score-ties-broken-by-k' holds score constant across a wide K
    // spread; if K leaked into the score the entries would not tie.
    const spec = CORPUS.find((c) => c.name === 'rank/exact-score-ties-broken-by-k')!;
    const chart = runReference(spec);
    const ks = chart.ranked.map((e) => e.k).sort((a, b) => a - b);
    expect(ks[0]).toBe(100);
    expect(ks[2]).toBe(200);
    const scores = chart.ranked.map((e) => e.boraScore);
    expect(Math.abs(scores[0]! - scores[1]!)).toBeLessThan(1e-12);
    expectConforms(spec);
  });

  it('the score stays within persistentKura <= score <= persistentKura + 50', () => {
    for (const spec of CORPUS) {
      for (const entry of runReference(spec).ranked) {
        expect(entry.boraScore).toBeGreaterThanOrEqual(entry.persistentKuraBefore - 1e-9);
        expect(entry.boraScore).toBeLessThanOrEqual(entry.persistentKuraBefore + 50 + 1e-9);
      }
    }
  });
});
// =============================================================================
// C8 - RANKING CONFORMANCE  (REF-RANK, Contract 7)
// =============================================================================

describe('C8 ranking conformance', () => {
  it('ranks agree on every ranking case in the corpus', () => {
    const cases = CORPUS.filter((c) => c.name.startsWith('rank/'));
    expect(cases.length).toBeGreaterThan(0);
    for (const spec of cases) expectConforms(spec);
  });

  it('rank 1 is the highest BORA Score', () => {
    for (const spec of CORPUS) {
      const ranked = runReference(spec).ranked;
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1]!.boraScore).toBeGreaterThanOrEqual(ranked[i]!.boraScore - 1e-12);
      }
    }
  });

  it('equal scores fall through to K, descending', () => {
    const spec = CORPUS.find((c) => c.name === 'rank/exact-score-ties-broken-by-k')!;
    const ranked = runReference(spec).ranked;
    expect(ranked.map((e) => e.k)).toEqual([200, 200, 100]);
    // The two K=200 songs tie on score and K, so songId decides.
    expect(ranked[0]!.songId).toBe('b');
    expect(ranked[1]!.songId).toBe('c');
  });

  it('equal score and K fall through to platform performance, descending', () => {
    const spec = CORPUS.find((c) => c.name === 'rank/k-ties-broken-by-platform')!;
    const ranked = runReference(spec).ranked;
    expect(ranked[0]!.songId).toBe('b');
    expect(ranked[1]!.songId).toBe('a');
    expect(ranked[0]!.platformTotal).toBeGreaterThan(ranked[1]!.platformTotal);
  });

  it('a total tie falls through to songId, ascending UTF-16', () => {
    const spec = CORPUS.find((c) => c.name === 'rank/songid-tiebreak')!;
    const ranked = runReference(spec).ranked;
    expect(ranked.map((e) => e.songId)).toEqual(['alpha', 'bravo', 'charlie', 'delta']);
  });

  it('UTF-16 code-unit order, not locale order', () => {
    // Uppercase sorts before lowercase by code unit, and digits before both.
    const spec = CORPUS.find((c) => c.name === 'rank/identical-except-id-utf16')!;
    const ranked = runReference(spec).ranked;
    expect(ranked.map((e) => e.songId)).toEqual(['0', 'A', 'Z', 'a']);
  });

  it('ranks are a dense 1..n sequence with no gaps or repeats', () => {
    for (const spec of CORPUS) {
      const ranked = runReference(spec).ranked;
      expect(ranked.map((e) => e.rank)).toEqual(
        ranked.map((_, i) => i + 1),
      );
    }
  });

  it('the comparator is a total order and never reports equality for distinct songs', () => {
    const spec = CORPUS.find((c) => c.name === 'rank/identical-except-id')!;
    const ranked = runReference(spec).ranked;
    for (const a of ranked) {
      for (const b of ranked) {
        if (a.songId === b.songId) continue;
        expect(refCompare(a, b)).not.toBe(0);
        // Antisymmetry: the comparison must be consistent in both directions.
        expect(refCompare(a, b)).toBe(-refCompare(b, a) as -1 | 0 | 1);
      }
    }
  });
});

// =============================================================================
// C9 - LIFECYCLE CONFORMANCE  (REF-LIFECYCLE, Phase 13, A8)
// =============================================================================

describe('C9 lifecycle conformance', () => {
  it('every lifecycle case in the corpus conforms', () => {
    const cases = CORPUS.filter((c) => c.name.startsWith('lifecycle/'));
    expect(cases.length).toBeGreaterThan(0);
    for (const spec of cases) expectConforms(spec);
  });

  it('a Vaulted song is excluded from active evaluation but its K is retained', () => {
    const spec = CORPUS.find((c) => c.name === 'lifecycle/vaulted-excluded')!;
    const chart = runReference(spec);
    expect(chart.excludedVaulted).toEqual(['b']);
    expect(chart.ranked.map((e) => e.songId)).toEqual(['a']);
    // The vaulted song's dormant balance is neither scored nor advanced.
    expect(chart.tC).toBeCloseTo(6, 9);
  });

  it('an all-Vaulted chart is a valid chart, not an error', () => {
    const spec = CORPUS.find((c) => c.name === 'lifecycle/all-vaulted')!;
    const chart = runReference(spec);
    expect(chart.ranked).toHaveLength(0);
    expect(chart.tC).toBe(0);
    expect(chart.excludedVaulted).toEqual(['a', 'b']);
    expectConforms(spec);
  });

  it('restore resets persistent Kura to zero and retains K and history', () => {
    const vaulted: RefSong = {
      id: 'a', lifecycle: 'VAULT', k: 4242, persistentKura: 123.5,
      buckets: [{ hour: CORPUS_HOUR, up: 5, down: 0 }],
      seed: [], youtube: [], spotify: [], boomplay: [],
    };
    const restored = refRestore(vaulted);
    expect(restored.lifecycle).toBe('ACTIVE');
    expect(restored.persistentKura).toBe(0);
    expect(restored.k).toBe(4242);
    expect(restored.buckets).toEqual(vaulted.buckets);
  });

  it('repeated vault/restore cycles preserve K and never invent a seed', () => {
    let current: RefSong = {
      id: 'a', lifecycle: 'ACTIVE', k: 10, persistentKura: 33.5,
      buckets: [{ hour: CORPUS_HOUR, up: 5, down: 0 }],
      seed: [{ hour: CORPUS_HOUR, c: 1, source: 'SEED', archived: false }],
      youtube: [], spotify: [], boomplay: [],
    };

    for (let i = 0; i < 5; i++) {
      const before = current.persistentKura;

      current = refVault(current);
      // VAULT IS EXCLUSION, NOT RESET: the dormant balance is PRESERVED, not
      // zeroed. Compared against the value carried INTO this cycle, so the
      // assertion stays meaningful once restore has legitimately zeroed it.
      expect(current.persistentKura).toBe(before);
      expect(current.k).toBe(10);

      current = refRestore(current);
      // RESTORE is what zeroes it, and it does so every time.
      expect(current.persistentKura).toBe(0);
      expect(current.k).toBe(10);
    }

    // Restore never manufactures seed: the timeline is exactly as authored.
    expect(current.seed).toHaveLength(1);
    expect(current.buckets).toHaveLength(1);
  });
});
// =============================================================================
// C10 - WHOLE-CHART CONFORMANCE
// =============================================================================

describe('C10 whole-chart conformance', () => {
  it('every authored corpus case conforms end to end', () => {
    for (const spec of CORPUS) {
      // Phase 22: no per-case tolerance exemption remains anywhere in this suite.
      expectConforms(spec);
    }
  });

  it('every seeded random case conforms end to end', () => {
    for (const spec of RANDOM) {
      expectConforms(spec);
    }
  });

  it('the reference hour is echoed unchanged by both models', () => {
    for (const spec of [...CORPUS, ...RANDOM]) {
      expect(canonicalFromReference(runReference(spec)).referenceHour).toBe(spec.referenceHour);
      expect(canonicalFromEngine(runEngine(spec), kMap(spec.songs)).referenceHour)
        .toBe(spec.referenceHour);
    }
  });

  it('an empty chart is a valid chart on both sides', () => {
    const spec = CORPUS.find((c) => c.name === 'population/0-songs')!;
    const expected = canonicalFromReference(runReference(spec));
    expect(expected.rows).toHaveLength(0);
    expect(expected.tC).toBe(0);
    expectConforms(spec);
  });

  it('a ten-song chart conforms with every rank distinct', () => {
    const spec = CORPUS.find((c) => c.name === 'population/10-songs')!;
    expectConforms(spec);
    const ranked = runReference(spec).ranked;
    expect(ranked).toHaveLength(10);
    expect(new Set(ranked.map((e) => e.rank)).size).toBe(10);
  });
});

// =============================================================================
// C11 - ROLLOVER CONFORMANCE  (REF-ROLLOVER, A3)
// =============================================================================

describe('C11 rollover conformance', () => {
  /** Compare the reference transition to the engine transition. */
  /** Compare the reference transition to the engine transition. */
  function expectRolloverConforms(spec: SpecScenario): void {
    // Every assertion carries the case name. A differential suite that says
    // only "expected 2 to be close to 0" has failed at its actual job: making
    // the disagreement findable.
    const at = (msg: string) => `[${spec.name}] ${msg}`;
    const engine = runEngineRollover(spec);
    const reference = refRolloverHour(
      { referenceHour: spec.referenceHour, songs: toReference(spec).songs },
      spec.referenceHour,
    );

    expect(reference.fromHour, at(`fromHour`)).toBe(engine.fromHour);
    expect(reference.toHour, at(`toHour`)).toBe(engine.toHour);
    expect(reference.state.referenceHour, at(`committed referenceHour`)).toBe(
      engine.state.referenceHour,
    );

    const engineSongs = new Map(engine.state.songs.map((s) => [s.songId, s]));
    for (const song of reference.state.songs) {
      const engineSong = engineSongs.get(song.id)!;
      expect(engineSong.persistentKura, at(`committed Kura for ${song.id}`)).toBeCloseTo(
        song.persistentKura, 9,
      );
      expect(engineSong.lifecycle, at(`lifecycle for ${song.id}`)).toBe(song.lifecycle);
    }

    const expected = canonicalFromReference(reference.chartAtNextHour);
    const actual = canonicalFromEngine(engine.chartAtNextHour, kMap(spec.songs));
    const differences = diffCanonical(expected, actual, REF_TOLERANCE);
    expect(
      differences,
      at(`chart-at-H+1 mismatch`) + '\n' + formatDifferences(differences),
    ).toEqual([]);

    const engineSteps = new Map(engine.steps.map((s) => [s.songId, s]));
    for (const step of reference.steps) {
      const engineStep = engineSteps.get(step.songId)!;
      expect(engineStep.hourClosed, at(`hourClosed for ${step.songId}`)).toBe(step.hourClosed);
      expect(engineStep.closedHourC, at(`closedHourC for ${step.songId}`)).toBeCloseTo(
        step.closedHourC, 12,
      );
      expect(engineStep.freshInjected, at(`freshInjected for ${step.songId}`)).toBeCloseTo(
        step.freshInjected, 9,
      );
      expect(engineStep.persistentBefore, at(`persistentBefore for ${step.songId}`)).toBeCloseTo(
        step.persistentBefore, 9,
      );
      expect(engineStep.persistentAfter, at(`persistentAfter for ${step.songId}`)).toBeCloseTo(
        step.persistentAfter, 9,
      );
    }
  }

  it('every corpus case rolls over conformantly', () => {
    for (const spec of [...CORPUS, ...RANDOM]) {
      expectRolloverConforms(spec);
    }
  });

  it('decay uses the JUST-CLOSED hour, never the new hour', () => {
    const H = CORPUS_HOUR;
    // Activity at H-1 is high; at H it is zero. If D_H were computed from H+1
    // or from the wrong hour, the committed balance would differ.
    const spec: SpecScenario = {
      name: 'rollover/decay-uses-closed-hour',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 100,
        buckets: [{ hour: H - 1, up: 5, down: 0 }, { hour: H, up: 0, down: 0 }],
        seed: [], youtube: [], spotify: [], boomplay: [],
      }],
    };
    expectRolloverConforms(spec);

    const reference = refRolloverHour(
      { referenceHour: H, songs: toReference(spec).songs },
      H,
    );
    // C_H = 0 because an actual bucket exists at H, even though it is empty.
    expect(reference.steps[0]!.closedHourC).toBe(0);
    expect(reference.steps[0]!.decayRate).toBeCloseTo(0.0025, 12);
  });

  it('a Vaulted song receives no injection and no decay across a rollover', () => {
    const spec = CORPUS.find((c) => c.name === 'lifecycle/vaulted-excluded')!;
    const reference = refRolloverHour(
      { referenceHour: spec.referenceHour, songs: toReference(spec).songs },
      spec.referenceHour,
    );
    const vaulted = reference.state.songs.find((s) => s.id === 'b')!;
    expect(vaulted.persistentKura).toBe(500);
    expect(reference.steps.find((s) => s.songId === 'b')).toBeUndefined();
    expectRolloverConforms(spec);
  });

  it('rollover advances exactly one hour and never skips', () => {
    const spec = CORPUS.find((c) => c.name === 'c/full-2.0')!;
    const reference = refRolloverHour(
      { referenceHour: spec.referenceHour, songs: toReference(spec).songs },
      spec.referenceHour,
    );
    expect(reference.toHour - reference.fromHour).toBe(1);
  });

  it('refuses a closed hour that is not the state hour', () => {
    const spec = CORPUS.find((c) => c.name === 'c/full-2.0')!;
    expect(() =>
      refRolloverHour(
        { referenceHour: spec.referenceHour, songs: toReference(spec).songs },
        spec.referenceHour + 1,
      ),
    ).toThrow();
  });
});

// =============================================================================
// DETERMINISM  (Phase 21 section 27)
// =============================================================================

describe('Phase 21 determinism', () => {
  it('the reference model serialises byte-identically across repeated evaluation', () => {
    const first = CORPUS.map((s) => serialise(canonicalFromReference(runReference(s))));
    const second = CORPUS.map((s) => serialise(canonicalFromReference(runReference(s))));
    expect(second).toEqual(first);
  });

  it('the engine serialises byte-identically across repeated evaluation', () => {
    const first = CORPUS.map((s) =>
      serialise(canonicalFromEngine(runEngine(s), kMap(s.songs))),
    );
    const second = CORPUS.map((s) =>
      serialise(canonicalFromEngine(runEngine(s), kMap(s.songs))),
    );
    expect(second).toEqual(first);
  });

  it('a controlled input change moves the result exactly where the contract says', () => {
    const base = CORPUS.find((c) => c.name === 'c/full-2.0')!;
    const changed: SpecScenario = {
      ...base,
      name: 'c/full-2.0-mutated',
      songs: base.songs.map((s) =>
        s.id === 'a' ? { ...s, buckets: [{ hour: CORPUS_HOUR, up: 0, down: 0 }] } : s,
      ),
    };

    const before = canonicalFromReference(runReference(base));
    const after = canonicalFromReference(runReference(changed));

    const beforeA = before.rows.find((r) => r.songId === 'a')!;
    const afterA = after.rows.find((r) => r.songId === 'a')!;

    // Muting song a's only hour removes its C entirely...
    expect(beforeA.activeC).toBeCloseTo(2, 9);
    expect(afterA.activeC).toBe(0);
    // ...which removes it from the shared denominator, moving everyone else.
    expect(after.tC).toBeCloseTo(2, 9);
    expect(before.tC).toBeCloseTo(4, 9);
    // ...and hands song b the whole Kura block.
    expect(afterA.xp).toBe(0);
    expect(after.rows.find((r) => r.songId === 'b')!.xp).toBeCloseTo(1, 9);
  });
});
// =============================================================================
// PHASE 22 - D-001 RESOLVED: THE BOUNDED SEEDED HOURLY C DOMAIN  [0, C_MAX]
// =============================================================================

/**
 * D-001 WAS: CONTRACT AMBIGUITY
 * -----------------------------
 * Phase 21 found the engine validating a per-hour seed by ROUND-TRIPPING it
 * through a scalar -- `seedCPerHour(record.c * 72) -> record.c * 72 / 72` --
 * intending `c * 72 / 72 === c`. That identity is not exact at the top of the
 * double range: `(Number.MAX_VALUE / 72) * 72` is Infinity. So the engine
 * derived an upper bound of MAX_VALUE/72 (~2.5e306) that the contract never
 * stated, and it differed between paths -- the chart admitted a seeded C of
 * 7.5 while the rollover refused it.
 *
 * The ruling: seed C is valid IFF finite AND in the CLOSED interval [0, C_MAX].
 *
 *     0 <= C_seed <= C_MAX          where C_MAX = 2
 *
 * WHY THE UPPER BOUND IS MATHEMATICAL, NOT COSMETIC
 * ------------------------------------------------
 * The decay equation is `D_h = 0.0025 * (1 - C_h / 2)`. A seed above 2 makes
 * D_h NEGATIVE, which turns "decay" into GROWTH and contradicts the semantic
 * role of the coefficient. Bounding seed C by the structural maximum hourly C
 * of the activity model guarantees `0 <= D_h <= 0.0025` for every accepted
 * input, so the decay equation can never change species.
 *
 * WHAT CHANGED
 * ------------
 * The x72 round trip is GONE. `validateSeededHourlyC` inspects the supplied
 * hourly value directly, and BOTH `chart.ts` and `rollover.ts` call it, so the
 * split-brain validation that produced the discrepancy is structurally
 * impossible now rather than merely fixed.
 *
 * THESE TESTS REPLACE the Phase 21 pinning tests, which asserted the OLD
 * unbounded behaviour (a 1e300 seed accepted, the chart/rollover split). They
 * are deleted rather than kept, because what they pinned is now forbidden.
 */

/** The ruling's boundary values, in the form Phase 22 section 9 requires. */
const SEED_DOMAIN = {
  /** Accepted: the closed interval, endpoints included. */
  valid: [0, Number.MIN_VALUE, 1e-12, 0.5, 1, 1.25, 1.5, 2] as const,
  /** Rejected: above C_MAX, below zero, or non-finite. */
  invalid: [
    2 + 2 * Number.EPSILON, // smallest double strictly above 2
    2.0000001,
    7.5,
    Number.MAX_VALUE, // finite, but far above C_MAX
    -Number.MIN_VALUE,
    -1e-12,
    -2,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ] as const,
};

describe('D-001 seeded hourly C domain is [0, C_MAX]', () => {
  /** A one-song chart whose only C evidence is a seeded hour of `c`. */
  function seedSpec(c: number): SpecScenario {
    return {
      name: `d-001/seed-value/${String(c)}`,
      referenceHour: CORPUS_HOUR,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
        buckets: [],
        seed: [{ hour: CORPUS_HOUR, c, source: 'SEED', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    };
  }

  /** Does EVALUATION accept this seed, and use the value verbatim? */
  function evaluationAccepts(c: number): boolean {
    try {
      return runEngine(seedSpec(c)).totalActiveC === c;
    } catch {
      return false;
    }
  }

  /** Does ROLLOVER accept this seed? */
  function rolloverAccepts(c: number): boolean {
    try {
      runEngineRollover(seedSpec(c));
      return true;
    } catch {
      return false;
    }
  }

  it('accepts every value in the closed interval, endpoints included', () => {
    for (const c of SEED_DOMAIN.valid) {
      expect(evaluationAccepts(c), `evaluation must accept c=${c}`).toBe(true);
      expect(rolloverAccepts(c), `rollover must accept c=${c}`).toBe(true);
    }
  });

  it('rejects every value outside the closed interval', () => {
    for (const c of SEED_DOMAIN.invalid) {
      expect(evaluationAccepts(c), `evaluation must reject ${String(c)}`).toBe(false);
      expect(rolloverAccepts(c), `rollover must reject ${String(c)}`).toBe(false);
    }
  });

  it('EVALUATION and ROLLOVER never disagree about a seed (no split brain)', () => {
    // This is the whole point of the phase. Under the old gate the chart
    // accepted 7.5 while the rollover refused it, so one input had two answers
    // inside one engine. Every value in both lists must get the SAME verdict
    // from both paths.
    const every = [...SEED_DOMAIN.valid, ...SEED_DOMAIN.invalid];
    for (const c of every) {
      expect(
        evaluationAccepts(c),
        `split-brain at c=${String(c)}: evaluation and rollover disagree`,
      ).toBe(rolloverAccepts(c));
    }
  });

  it('the REFERENCE MODEL reaches the same verdict independently', () => {
    // The reference model re-implements the rule from the contract text; it
    // does not import the engine's validator. Agreement is therefore evidence,
    // not tautology.
    for (const c of SEED_DOMAIN.valid) {
      expect(refSeededHourlyCAccepts(c), `reference must accept c=${c}`).toBe(true);
    }
    for (const c of SEED_DOMAIN.invalid) {
      expect(
        refSeededHourlyCAccepts(c),
        `reference must reject ${String(c)}`,
      ).toBe(false);
    }
  });

  it('reference and engine agree on the whole matrix, value by value', () => {
    for (const c of [...SEED_DOMAIN.valid, ...SEED_DOMAIN.invalid]) {
      const engine = evaluationAccepts(c);
      const reference = refSeededHourlyCAccepts(c);
      expect(
        engine,
        `engine/reference disagreement at c=${String(c)}`,
      ).toBe(reference);
      expect(rolloverAccepts(c), `rollover/reference at c=${String(c)}`)
        .toBe(reference);
    }
  });

  it('the domain is CONTINUOUS [0, 2], not the five-point threshold lattice', () => {
    // Actual, vote-derived C lives on {0, 0.5, 1, 1.5, 2}. A SEEDED C is an
    // assessed expectation and may be any finite real in [0, 2]. Confining
    // seeds to the lattice would be a category error.
    for (const c of [0.2, 0.75, 1.25, 1.8, 1.9999]) {
      expect(refSeededHourlyCAccepts(c), `c=${c} is on the lattice`).toBe(true);
      expect(evaluationAccepts(c), `c=${c} must be accepted`).toBe(true);
    }
  });

  it('the upper bound is exactly inclusive and nothing beyond it', () => {
    // Representable values only: `2 + Number.EPSILON === 2` exactly, because
    // EPSILON is the ulp of [1, 2) while 2.0 opens the binade [2, 4) whose ulp
    // is 2^-51. Half-an-ulp ties round to even, i.e. back down to 2.
    expect(2 + Number.EPSILON).toBe(2);
    expect(2 + 2 * Number.EPSILON).toBeGreaterThan(2);

    expect(evaluationAccepts(2)).toBe(true);
    expect(evaluationAccepts(2 + 2 * Number.EPSILON)).toBe(false);
  });

  it('preserves the decay invariant 0 <= D_h <= 0.0025 for every accepted seed', () => {
    // The point of the ruling, proved against the engine's OWN decay function
    // rather than a re-typed copy of the formula.
    for (const c of SEED_DOMAIN.valid) {
      const d = calculateDecay(c);
      expect(d.ok, `decay must be computable at c=${c}`).toBe(true);
      if (d.ok) {
        expect(d.value, `D_h at c=${c}`).toBeGreaterThanOrEqual(0);
        expect(d.value, `D_h at c=${c}`).toBeLessThanOrEqual(0.0025);
      }
    }

    // And across the continuum, not just the sampled values.
    for (let i = 0; i <= 2000; i++) {
      const c = (i / 2000) * 2;
      const d = calculateDecay(c);
      expect(d.ok).toBe(true);
      if (d.ok) {
        expect(d.value).toBeGreaterThanOrEqual(0);
        expect(d.value).toBeLessThanOrEqual(0.0025);
      }
    }
  });

  it('D_h hits both endpoints exactly: 0.0025 at C=0, 0 at C=C_MAX', () => {
    expect(calculateDecay(0)).toEqual({ ok: true, value: 0.0025 });
    expect(calculateDecay(2)).toEqual({ ok: true, value: 0 });
  });

  it('no accepted seed can make decay negative -- the ruling\'s whole purpose', () => {
    // D_h = 0.0025 * (1 - C_h / 2) < 0 whenever C_h > 2. If any accepted seed
    // could exceed 2, "decay" would become growth. This is the invariant the
    // ruling exists to protect.
    for (const c of SEED_DOMAIN.valid) {
      const d = 0.0025 * (1 - c / 2);
      expect(d, `D_h at c=${c} must not be negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it('a rejected seed is REJECTED, never clamped into the chart', () => {
    // Clamping 7.5 down to 2 would silently invent a different chart; clamping
    // -3 up to 0 would silently invent an hour of measured activity.
    for (const c of [7.5, -3, Number.NaN]) {
      let resolved: number | null = null;
      try {
        resolved = runEngine(seedSpec(c)).totalActiveC;
      } catch {
        resolved = null;
      }
      expect(resolved, `c=${String(c)} must not enter the chart`).toBeNull();
    }
  });

  it('an out-of-domain seed does not taint the OTHER songs in the chart', () => {
    // One corrupt record must not be silently dropped so the rest of the chart
    // evaluates on data the engine had already declared illegal.
    const spec: SpecScenario = {
      name: 'd-001/one-bad-seed',
      referenceHour: CORPUS_HOUR,
      closedHourC: null,
      songs: [
        {
          id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [],
          seed: [{ hour: CORPUS_HOUR, c: 7.5, source: 'SEED', archived: false }],
          youtube: [], spotify: [], boomplay: [],
        },
        {
          id: 'b', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: CORPUS_HOUR, up: 5, down: 0 }],
          seed: [],
          youtube: [], spotify: [], boomplay: [],
        },
      ],
    };
    expect(() => runEngine(spec)).toThrow(/within \[0, C_MAX\]/);
  });

  it('an ARCHIVED out-of-domain record is out of scope and cannot reject', () => {
    // Expiry is selection, never deletion. An archived record has left the
    // timeline, so its value is never resolved and never validated. This
    // mirrors the reference model's scope rule exactly.
    const spec = seedSpec(0);
    const archived: SpecScenario = {
      ...spec,
      name: 'd-001/archived-out-of-domain',
      songs: [{
        ...spec.songs[0]!,
        seed: [{ hour: CORPUS_HOUR, c: 7.5, source: 'SEED', archived: true }],
      }],
    };
    expect(evaluationAccepts(0)).toBe(true);
    expect(() => runEngine(archived)).not.toThrow();
    expect(runEngine(archived).totalActiveC).toBe(0);
  });

  it('an ACTUAL-source record is never validated as a seed', () => {
    // D-002 established that provenance is read from the data: only a record
    // declaring source SEED is a seed. An ACTUAL-source record carrying 7.5 is
    // not seed input, so the seed domain does not apply to it.
    const spec: SpecScenario = {
      name: 'd-001/actual-source-7.5',
      referenceHour: CORPUS_HOUR,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
        buckets: [],
        seed: [{ hour: CORPUS_HOUR, c: 7.5, source: 'ACTUAL', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    };
    // Not a seed, so it contributes nothing -- and is not rejected either.
    expect(runEngine(spec).totalActiveC).toBe(0);

    const reference = toReference(spec);
    expect(refSongSeedsWithinDomain(reference.songs[0]!)).toBe(true);
  });
});
// =============================================================================
// PHASE 21 DISCREPANCY D-002 - SEED PROVENANCE IN ROLLOVER  (ENGINE REPAIR)
// =============================================================================

/**
 * FOUND BY THE REFERENCE MODEL, REPAIRED IN THE ENGINE, NOW PINNED HERE.
 *
 * MINIMAL REPRODUCTION
 * -------------------
 *     song.buckets   = []
 *     song.seedHours = [{ hourIndex: H, c: 2, source: 'ACTUAL', lifecycle: 'ACTIVE' }]
 *     song.lifecycle = 'ACTIVE'
 *
 * BEFORE THE REPAIR, the engine gave two different answers for the same hour:
 *
 *     evaluateChart(..) at H   ->  C_H = 0
 *         because `chart.ts` skips any record whose `source !== 'SEED'`,
 *         on the documented grounds that "a record is only a seed if it
 *         declares itself one".
 *
 *     rolloverHour(.., H)      ->  C_H = 2
 *         because `rollover.ts`'s `resolveHourC` matched the record on
 *         `hourIndex` alone and honoured its `c`.
 *
 * The consequence was not cosmetic. C_H is the input to D_H, so the committed
 * persistent Kura was decayed using activity the chart evaluation had already
 * decided did not exist. At C_H = 2 the decay rate is 0; at C_H = 0 it is
 * 0.0025. One engine, one locked contract, two answers.
 *
 * CLASSIFICATION: ENGINE BUG — a duplicated-but-divergent formula.
 *
 * This is the precise defect class Phase 21 exists to detect, and it is the
 * strongest possible argument for building an independent oracle: the
 * engine's own 858-test suite passed throughout, because every existing test
 * supplied seeds whose `source` was 'SEED', so both paths agreed on every input
 * anyone had thought to write down. Only a model that asked "what SHOULD an
 * ACTUAL-source record in a seed timeline do?" found it.
 *
 * THE REPAIR is one guard in `rollover.ts`, matching the rule Phase 14 already
 * applied. No mathematical constant, coefficient, window, threshold, or
 * ordering was changed.
 */
describe('D-002 seed provenance in rollover', () => {
  const H = CORPUS_HOUR;

  const actualSourceInSeedTimeline: SpecScenario = {
    name: 'd-002/actual-source-in-seed-timeline',
    referenceHour: H,
    closedHourC: null,
    songs: [{
      id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 100,
      buckets: [],
      seed: [{ hour: H, c: 2, source: 'ACTUAL', archived: false }],
      youtube: [], spotify: [], boomplay: [],
    }],
  };

  it('chart evaluation ignores an ACTUAL-source record in the seed timeline', () => {
    // The Phase 14 rule, stated directly.
    const chart = runEngine(actualSourceInSeedTimeline);
    expect(chart.ranked[0]!.activeC).toBe(0);
  });

  it('rollover resolves the SAME hour to the SAME C the chart used', () => {
    // This is the assertion that failed before the repair: the rollover path
    // reported closedHourC = 2 while the chart path reported 0.
    const engine = runEngineRollover(actualSourceInSeedTimeline);
    const step = engine.steps.find((s) => s.songId === 'a')!;
    expect(step.closedHourC).toBe(0);
  });

  it('decay is therefore the C=0 decay, not the C=2 decay', () => {
    const engine = runEngineRollover(actualSourceInSeedTimeline);
    const step = engine.steps.find((s) => s.songId === 'a')!;

    // There is no activity anywhere in this scenario: the only record is an
    // ACTUAL-source C record, which is not a seed, so active C is 0, T_C is 0,
    // and freshInjected is 0. The committed balance is therefore 100 under two
    // different decay rates:
    //
    //   C_H = 0  ->  D = 0.0025  ->  (100 + 0) * 0.9975 = 99.75   <- correct
    //   C_H = 2  ->  D = 0       ->  (100 + 0) * 1       = 100     <- the bug
    //
    // Before the repair the engine produced 100 here, decaying the song by
    // nothing at all on the strength of activity the chart had already ruled
    // out.
    expect(step.freshInjected).toBe(0);
    expect(step.persistentAfter).toBeCloseTo(99.75, 9);
    expect(step.persistentAfter).not.toBeCloseTo(100, 6);
  });

  it('the reference model agrees with the repaired engine', () => {
    expectConforms(actualSourceInSeedTimeline);
  });

  it('a genuine SEED record at the same hour is still honoured', () => {
    // The repair must not have disabled seeding: it distinguishes provenance,
    // it does not suppress the seed path.
    const realSeed: SpecScenario = {
      name: 'd-002/genuine-seed-still-honoured',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 100,
        buckets: [],
        seed: [{ hour: H, c: 2, source: 'SEED', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    };

    expect(runEngine(realSeed).ranked[0]!.activeC).toBe(2);
    const engine = runEngineRollover(realSeed);
    const step = engine.steps.find((s) => s.songId === 'a')!;
    expect(step.closedHourC).toBe(2);
    // C = 2 means no decay at all, and fresh Kura is the full 50 because the
    // seed IS honoured here, so (100 + 50) * 1 = 150.
    expect(step.freshInjected).toBeCloseTo(50, 9);
    expect(step.persistentAfter).toBeCloseTo(150, 9);
    expectConforms(realSeed);
  });

  it('an ACTUAL bucket still takes precedence over an ACTUAL-source seed record', () => {
    // Both are "actual", so the bucket path decides and its own C is used.
    const bothActual: SpecScenario = {
      name: 'd-002/actual-bucket-and-actual-source-record',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 100,
        buckets: [{ hour: H, up: 1, down: 0 }],
        seed: [{ hour: H, c: 2, source: 'ACTUAL', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    };
    const engine = runEngineRollover(bothActual);
    const step = engine.steps.find((s) => s.songId === 'a')!;
    // C_U(1) = 1 from the bucket; the seed timeline record is ignored.
    expect(step.closedHourC).toBe(1);
    expectConforms(bothActual);
  });
});
