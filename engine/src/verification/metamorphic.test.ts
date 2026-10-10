/**
 * BORA - PHASE 21 METAMORPHIC PROPERTIES
 * =============================================================
 *
 * Differential tests ask "do the two models agree?". Metamorphic tests ask a
 * different and harder question: "given a transformation T that the contract
 * says must not matter, does the result stay unchanged?"
 *
 * These catch a whole class of defect that value comparison cannot: an
 * implementation that happens to agree with the oracle on the inputs we chose,
 * but only because those inputs never varied the quantity in question. If the
 * engine accidentally consulted array order, P1 and P2 would fail even though
 * every golden test still passed.
 *
 * Each property below is stated as a REQUIREMENT from the contract, never as an
 * observation about current behaviour. A property that merely describes what the
 * code happens to do is not a test.
 */

import { describe, it, expect } from 'vitest';

import {
  canonicalFromEngine,
  canonicalFromReference,
  kMap,
  runEngine,
  runEngineRollover,
  runReference,
} from './adapters';
import { refRestore, refVault, refDecayRate, refSeededHourlyCAccepts } from './reference/model';
import { allCorpus, CORPUS_HOUR, buildRandomCorpus, makeRng, shuffle } from './generator';
import type { SpecScenario, SpecSong } from './spec';

const CORPUS = allCorpus();

/** Multi-song cases: permutation properties need more than one row. */
const MULTI = [...CORPUS, ...buildRandomCorpus(777, 40)].filter(
  (s) => s.songs.length >= 2,
);

/** Reorder the songs of a scenario. */
function permuteSongs(spec: SpecScenario, seed: number): SpecScenario {
  return { ...spec, songs: shuffle(makeRng(seed), spec.songs) };
}

/** Reorder every song's buckets, seed records, and platform observations. */
function permuteHourRecords(spec: SpecScenario, seed: number): SpecScenario {
  const rng = makeRng(seed);
  return {
    ...spec,
    songs: spec.songs.map((s) => ({
      ...s,
      buckets: shuffle(rng, s.buckets),
      seed: shuffle(rng, s.seed),
      youtube: shuffle(rng, s.youtube),
      spotify: shuffle(rng, s.spotify),
      boomplay: shuffle(rng, s.boomplay),
    })),
  };
}


// =============================================================================
// P1 - SONG PERMUTATION
// Contract 7: input order is NEVER a tie-breaker.
// =============================================================================

describe('P1 song permutation', () => {
  it('reordering songs changes no computed value and no rank', () => {
    for (const spec of MULTI) {
      for (const seed of [1, 2, 3]) {
        const permuted = permuteSongs(spec, seed);

        const beforeRef = canonicalFromReference(runReference(spec));
        const afterRef = canonicalFromReference(runReference(permuted));
        expect(afterRef.tC).toBeCloseTo(beforeRef.tC, 12);
        for (const row of beforeRef.rows) {
          const match = afterRef.rows.find((r) => r.songId === row.songId)!;
          expect(match.boraScore).toBeCloseTo(row.boraScore, 12);
          expect(match.rank).toBe(row.rank);
          expect(match.activeC).toBeCloseTo(row.activeC, 12);
          expect(match.freshKura).toBeCloseTo(row.freshKura, 12);
        }

        const beforeEng = canonicalFromEngine(runEngine(spec), kMap(spec.songs));
        const afterEng = canonicalFromEngine(runEngine(permuted), kMap(spec.songs));
        for (const row of beforeEng.rows) {
          const match = afterEng.rows.find((r) => r.songId === row.songId)!;
          expect(match.rank).toBe(row.rank);
          expect(match.boraScore).toBeCloseTo(row.boraScore, 12);
        }
      }
    }
  });
});

// =============================================================================
// P2 - HOUR RECORD PERMUTATION
// A5: the window is clock time, not record order.
// =============================================================================

describe('P2 hour record permutation', () => {
  it('reordering buckets, seeds, and observations changes nothing', () => {
    for (const spec of [...CORPUS, ...buildRandomCorpus(31337, 30)]) {
      for (const seed of [11, 22]) {
        const permuted = permuteHourRecords(spec, seed);

        const before = canonicalFromReference(runReference(spec));
        const after = canonicalFromReference(runReference(permuted));
        for (const row of before.rows) {
          const match = after.rows.find((r) => r.songId === row.songId)!;
          expect(match.activeC).toBeCloseTo(row.activeC, 12);
          expect(match.boraScore).toBeCloseTo(row.boraScore, 12);
          expect(match.rank).toBe(row.rank);
        }

        const beforeEng = canonicalFromEngine(runEngine(spec), kMap(spec.songs));
        const afterEng = canonicalFromEngine(runEngine(permuted), kMap(spec.songs));
        for (const row of beforeEng.rows) {
          const match = afterEng.rows.find((r) => r.songId === row.songId)!;
          expect(match.activeC).toBeCloseTo(row.activeC, 12);
          expect(match.rank).toBe(row.rank);
        }
      }
    }
  });
});

// =============================================================================
// P3 - ZERO PADDING
// A5: a missing hour is an hour of zero activity, not a shorter window.
// =============================================================================

describe('P3 zero padding', () => {
  it('adding empty buckets for unrecorded hours changes no total', () => {
    for (const spec of CORPUS) {
      const padded: SpecScenario = {
        ...spec,
        name: `${spec.name}-padded`,
        songs: spec.songs.map((s) => {
          const recorded = new Set(s.buckets.map((b) => b.hour));
          // Seed-covered hours are skipped as well. Padding a SEEDED hour with
          // an empty bucket would not be an inert transformation at all: it
          // would replace that hour's seed with an ACTUAL zero, which is
          // precisely the precedence change property P6 exists to test. P3 is
          // about padding genuinely empty hours, nothing else.
          const seeded = new Set(s.seed.map((r) => r.hour));
          const missing: SpecSong['buckets'][number][] = [];
          for (let h = spec.referenceHour - 71; h <= spec.referenceHour; h++) {
            if (!recorded.has(h) && !seeded.has(h)) missing.push({ hour: h, up: 0, down: 0 });
          }
          return { ...s, buckets: [...s.buckets, ...missing] };
        }),
      };

      const before = canonicalFromReference(runReference(spec));
      const after = canonicalFromReference(runReference(padded));
      expect(after.tC).toBeCloseTo(before.tC, 12);
      for (const row of before.rows) {
        const match = after.rows.find((r) => r.songId === row.songId)!;
        expect(match.activeC).toBeCloseTo(row.activeC, 12);
        expect(match.boraScore).toBeCloseTo(row.boraScore, 12);
        expect(match.rank).toBe(row.rank);
      }

      const beforeEng = canonicalFromEngine(runEngine(spec), kMap(spec.songs));
      const afterEng = canonicalFromEngine(runEngine(padded), kMap(padded.songs));
      expect(afterEng.tC).toBeCloseTo(beforeEng.tC, 12);
    }
  });
});

// =============================================================================
// P4 - EXPIRED ISOLATION
// A5: H-72 is outside the window. Expiry is selection, never deletion.
// =============================================================================

describe('P4 expired isolation', () => {
  it('changing activity at H-72 does not affect the evaluation at H', () => {
    const H = CORPUS_HOUR;
    const base: SpecScenario = {
      name: 'p4/base',
      referenceHour: H,
      closedHourC: null,
      songs: [
        { id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
        { id: 'b', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [], seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };
    const mutated: SpecScenario = {
      ...base,
      name: 'p4/expired-mutated',
      songs: base.songs.map((s) =>
        s.id === 'a'
          ? { ...s, buckets: [...s.buckets, { hour: H - 72, up: 999, down: 0 }] }
          : s,
      ),
    };

    const before = canonicalFromReference(runReference(base));
    const after = canonicalFromReference(runReference(mutated));
    expect(after.tC).toBeCloseTo(before.tC, 12);
    for (const row of before.rows) {
      const match = after.rows.find((r) => r.songId === row.songId)!;
      expect(match.activeC).toBeCloseTo(row.activeC, 12);
      expect(match.boraScore).toBeCloseTo(row.boraScore, 12);
    }

    const beforeEng = canonicalFromEngine(runEngine(base), kMap(base.songs));
    const afterEng = canonicalFromEngine(runEngine(mutated), kMap(mutated.songs));
    expect(afterEng.tC).toBeCloseTo(beforeEng.tC, 12);
  });
});

// =============================================================================
// P5 - FUTURE ISOLATION
// A5: H+1 is not yet in the window.
// =============================================================================

describe('P5 future isolation', () => {
  it('changing activity at H+1 does not affect the evaluation at H', () => {
    const H = CORPUS_HOUR;
    const base: SpecScenario = {
      name: 'p5/base',
      referenceHour: H,
      closedHourC: null,
      songs: [
        { id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
        { id: 'b', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [], seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };
    const mutated: SpecScenario = {
      ...base,
      name: 'p5/future-mutated',
      songs: base.songs.map((s) =>
        s.id === 'b'
          ? { ...s, buckets: [{ hour: H + 1, up: 999, down: 0 }] }
          : s,
      ),
    };

    const before = canonicalFromReference(runReference(base));
    const after = canonicalFromReference(runReference(mutated));
    expect(after.tC).toBeCloseTo(before.tC, 12);

    const beforeEng = canonicalFromEngine(runEngine(base), kMap(base.songs));
    const afterEng = canonicalFromEngine(runEngine(mutated), kMap(mutated.songs));
    expect(afterEng.tC).toBeCloseTo(beforeEng.tC, 12);
  });
});

// =============================================================================
// P6 - ACTUAL-ZERO PRECEDENCE
// Contract 9: actual REPLACES seed, including when the actual value is 0.
// =============================================================================

describe('P6 actual-zero precedence', () => {
  it('replacing a seed-covered hour with actual C=0 removes that seed contribution', () => {
    const H = CORPUS_HOUR;
    const withSeed: SpecScenario = {
      name: 'p6/seed-only',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
        buckets: [],
        seed: [{ hour: H, c: 2, source: 'SEED', archived: false }],
        youtube: [], spotify: [], boomplay: [],
      }],
    };
    const muted: SpecScenario = {
      ...withSeed,
      name: 'p6/actual-zero',
      songs: [{
        ...withSeed.songs[0]!,
        buckets: [{ hour: H, up: 0, down: 0 }],
      }],
    };

    const seeded = runReference(withSeed);
    const actual = runReference(muted);
    expect(seeded.ranked[0]!.activeC).toBe(2);
    expect(actual.ranked[0]!.activeC).toBe(0);
    // The seed must be suppressed, not merely outranked and then still added.
    expect(actual.ranked[0]!.activeC).not.toBeCloseTo(2, 9);

    const engineSeeded = canonicalFromEngine(runEngine(withSeed), kMap(withSeed.songs));
    const engineMuted = canonicalFromEngine(runEngine(muted), kMap(muted.songs));
    expect(engineSeeded.rows[0]!.activeC).toBe(2);
    expect(engineMuted.rows[0]!.activeC).toBe(0);
  });
});

// =============================================================================
// P7 - K INDEPENDENCE
// Contract 2: downvotes NEVER reduce K.
// =============================================================================

describe('P7 K independence', () => {
  it('changing historical downvotes without changing upvotes leaves K unchanged', () => {
    const H = CORPUS_HOUR;
    const base: SpecScenario = {
      name: 'p7/base',
      referenceHour: H,
      closedHourC: null,
      songs: [{
        id: 'a', lifecycle: 'ACTIVE', k: 500, persistentKura: 0,
        buckets: [{ hour: H, up: 5, down: 2 }],
        seed: [], youtube: [], spotify: [], boomplay: [],
      }],
    };
    const downvoted: SpecScenario = {
      ...base,
      name: 'p7/more-downvotes',
      songs: [{
        ...base.songs[0]!,
        buckets: [{ hour: H, up: 5, down: 900 }],
      }],
    };

    // K is an input, not a derived quantity, so it is identical by
    // construction. What matters is that nothing else moved.
    const before = canonicalFromReference(runReference(base));
    const after = canonicalFromReference(runReference(downvoted));
    expect(after.rows[0]!.k).toBe(500);
    // The downvote does change C, which is the point of the control: if this
    // assertion were vacuous the property would prove nothing.
    expect(after.rows[0]!.activeC).not.toBeCloseTo(before.rows[0]!.activeC, 9);
  });
});

// =============================================================================
// P8 - SCORE K INDEPENDENCE
// Contract 2: K is score-neutral. It is ranking tie-break #2 and nothing more.
// =============================================================================

describe('P8 score K independence', () => {
  it('changing K alone leaves BORA Score unchanged, and may change rank', () => {
    const H = CORPUS_HOUR;
    const base: SpecScenario = {
      name: 'p8/base',
      referenceHour: H,
      closedHourC: null,
      songs: [
        { id: 'a', lifecycle: 'ACTIVE', k: 10, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
        { id: 'b', lifecycle: 'ACTIVE', k: 10, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };
    const kRaised: SpecScenario = {
      ...base,
      name: 'p8/k-raised',
      songs: base.songs.map((s) => (s.id === 'a' ? { ...s, k: 99999 } : s)),
    };

    const before = canonicalFromReference(runReference(base));
    const after = canonicalFromReference(runReference(kRaised));

    const aBefore = before.rows.find((r) => r.songId === 'a')!;
    const aAfter = after.rows.find((r) => r.songId === 'a')!;

    // The score is untouched by K.
    expect(aAfter.boraScore).toBe(aBefore.boraScore);
    // But the rank may legitimately move, because K IS tie-break #2.
    const bAfter = after.rows.find((r) => r.songId === 'b')!;
    expect(aAfter.rank!).toBeLessThan(bAfter.rank!);

    // And the engine agrees that K never enters the score.
    const engine = canonicalFromEngine(runEngine(kRaised), kMap(kRaised.songs));
    const engineA = engine.rows.find((r) => r.songId === 'a')!;
    expect(engineA.boraScore).toBeCloseTo(aAfter.boraScore, 12);
  });
});

// =============================================================================
// P9 - IDLE PLATFORM
// Phase 6: an idle platform yields 0 points and its weight is not redistributed.
// =============================================================================

describe('P9 idle platform', () => {
  it('zero platform activity produces zero points on that platform', () => {
    const H = CORPUS_HOUR;
    const spec: SpecScenario = {
      name: 'p9/idle',
      referenceHour: H,
      closedHourC: null,
      songs: [
        { id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [{ hour: H, value: 10 }],
          spotify: [], boomplay: [] },
        { id: 'b', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };

    const chart = runReference(spec);
    for (const entry of chart.ranked) {
      expect(entry.sp).toBe(0);
      expect(entry.bp).toBe(0);
    }
    // The chart totals 30, not 50. The idle platforms simply earn nothing.
    const total = chart.ranked.reduce((s, e) => s + e.platformTotal, 0);
    expect(total).toBeCloseTo(30, 9);
    expect(chart.platformTotals.spotify).toBe(0);
    expect(chart.platformTotals.boomplay).toBe(0);

    const engine = canonicalFromEngine(runEngine(spec), kMap(spec.songs));
    expect(engine.rows.reduce((s, r) => s + r.platformTotal, 0)).toBeCloseTo(30, 9);
  });
});

// =============================================================================
// P10 - DETERMINISTIC RANKING
// Contract 7: identical input always yields identical ordering.
// =============================================================================

describe('P10 deterministic ranking', () => {
  it('repeated evaluation of the same input yields the same ordering', () => {
    for (const spec of [...CORPUS, ...buildRandomCorpus(909090, 25)]) {
      const runs = Array.from({ length: 3 }, () =>
        runEngine(spec).ranked.map((e) => e.songId).join(','),
      );
      expect(runs[1]).toBe(runs[0]);
      expect(runs[2]).toBe(runs[0]);
    }
  });

  it('ordering is independent of the order the songs were supplied in', () => {
    for (const spec of MULTI) {
      const forward = runEngine(spec).ranked.map((e) => e.songId).join(',');
      const reversed = runEngine({ ...spec, songs: [...spec.songs].reverse() })
        .ranked.map((e) => e.songId).join(',');
      expect(reversed).toBe(forward);
    }
  });
});

// =============================================================================
// P11 - VAULT ISOLATION
// Phase 13: a Vaulted song does not participate in active C distribution.
// =============================================================================

describe('P11 vault isolation', () => {
  it('a Vaulted song does not dilute T_C and receives no Kura', () => {
    const H = CORPUS_HOUR;
    const activeOnly: SpecScenario = {
      name: 'p11/active-only',
      referenceHour: H,
      closedHourC: null,
      songs: [
        { id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };
    const withVaulted: SpecScenario = {
      ...activeOnly,
      name: 'p11/with-vaulted',
      songs: [
        ...activeOnly.songs,
        { id: 'dormant', lifecycle: 'VAULT', k: 0, persistentKura: 999,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };

    const without = runReference(activeOnly);
    const with_ = runReference(withVaulted);

    // The vaulted song's C is excluded entirely, so T_C is unchanged.
    expect(with_.tC).toBe(without.tC);
    // And the active song keeps the whole Kura block.
    expect(with_.ranked[0]!.freshKura).toBeCloseTo(50, 9);
    expect(with_.ranked[0]!.xp).toBeCloseTo(1, 9);

    const engine = canonicalFromEngine(runEngine(withVaulted), kMap(withVaulted.songs));
    expect(engine.tC).toBeCloseTo(canonicalFromEngine(runEngine(activeOnly), kMap(activeOnly.songs)).tC, 9);
    expect(engine.excludedVaulted).toEqual(['dormant']);
  });

  it('a Vaulted song is excluded even when it would otherwise rank first', () => {
    const H = CORPUS_HOUR;
    const spec: SpecScenario = {
      name: 'p11/vault-would-win',
      referenceHour: H,
      closedHourC: null,
      songs: [
        { id: 'active-small', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [{ hour: H, up: 1, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
        { id: 'vaulted-huge', lifecycle: 'VAULT', k: 0, persistentKura: 100000,
          buckets: [{ hour: H, up: 5, down: 0 }],
          seed: [], youtube: [], spotify: [], boomplay: [] },
      ],
    };
    const chart = runReference(spec);
    expect(chart.ranked).toHaveLength(1);
    expect(chart.ranked[0]!.songId).toBe('active-small');
    expect(chart.excludedVaulted).toEqual(['vaulted-huge']);
  });
});

// =============================================================================
// P12 - RESTORE RESET
// A8: restore rewinds active score but never history.
// =============================================================================

describe('P12 restore reset', () => {
  it('restore zeroes persistent Kura while retaining K and history', () => {
    const H = CORPUS_HOUR;
    const original: SpecSong = {
      id: 'a', lifecycle: 'ACTIVE', k: 777, persistentKura: 250,
      buckets: [{ hour: H, up: 5, down: 0 }],
      seed: [{ hour: H, c: 1, source: 'SEED', archived: false }],
      youtube: [{ hour: H, value: 5 }], spotify: [], boomplay: [],
    };

    const vaulted = refVault(original);
    expect(vaulted.lifecycle).toBe('VAULT');
    // Vault is exclusion, not reset: the dormant balance is preserved.
    expect(vaulted.persistentKura).toBe(250);
    expect(vaulted.k).toBe(777);

    const restored = refRestore(vaulted);
    expect(restored.lifecycle).toBe('ACTIVE');
    expect(restored.persistentKura).toBe(0);
    expect(restored.k).toBe(777);
    expect(restored.buckets).toEqual(original.buckets);
    // Restore never manufactures a seed; the timeline is untouched.
    expect(restored.seed).toEqual(original.seed);

    // And the restored song scores from a clean Kura balance.
    const spec: SpecScenario = {
      name: 'p12/restored', referenceHour: H, closedHourC: null, songs: [restored],
    };
    const chart = runReference(spec);
    expect(chart.ranked[0]!.persistentKuraBefore).toBe(0);
    expect(chart.ranked[0]!.boraScore).toBeCloseTo(chart.ranked[0]!.platformTotal, 12);
  });

  it('repeated vault/restore never accumulates or leaks persistent Kura', () => {
    const H = CORPUS_HOUR;
    let current: SpecSong = {
      id: 'a', lifecycle: 'ACTIVE', k: 5, persistentKura: 40,
      buckets: [{ hour: H, up: 5, down: 0 }],
      seed: [], youtube: [], spotify: [], boomplay: [],
    };
    for (let i = 0; i < 8; i++) {
      current = refVault(current);
      current = refRestore(current);
      expect(current.persistentKura).toBe(0);
      expect(current.k).toBe(5);
    }
    expect(current.buckets).toHaveLength(1);
  });
});

// =============================================================================
// PHASE 22 - SEED DOMAIN METAMORPHIC PROPERTIES
// =============================================================================
//
// Each property is a REQUIREMENT from the D-001 ruling, not an observation
// about current behaviour. A property that merely describes what the code
// happens to do is not a test.

describe('P13 seed domain acceptance is monotone at the boundaries', () => {
  /** Does the engine accept a single-hour seed of this value? */
  function accepts(c: number): boolean {
    try {
      runEngine({
        name: `p13/${String(c)}`,
        referenceHour: CORPUS_HOUR,
        closedHourC: null,
        songs: [{
          id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [],
          seed: [{ hour: CORPUS_HOUR, c, source: 'SEED', archived: false }],
          youtube: [], spotify: [], boomplay: [],
        }],
      });
      return true;
    } catch {
      return false;
    }
  }

  it('accepts 0, epsilon, 0.5, 1, 1.5 and 2', () => {
    for (const c of [0, 1e-12, 0.5, 1, 1.5, 2]) {
      expect(accepts(c), `c=${c} must be accepted`).toBe(true);
    }
  });

  it('rejects everything strictly above C_MAX', () => {
    expect(accepts(2 + 2 * Number.EPSILON)).toBe(false);
  });

  it('acceptance is a prefix: once rejected, larger values stay rejected', () => {
    // The domain is a closed interval, so the accept/reject boundary is
    // monotone. A non-monotone boundary would mean the rule depends on
    // something other than magnitude.
    const samples = [
      0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 1.9999, 2,
      2.0000001, 2.5, 7.5, 1e6, Number.MAX_VALUE,
    ];
    let sawRejection = false;
    for (const c of samples) {
      if (!accepts(c)) sawRejection = true;
      else expect(sawRejection, `c=${c} accepted after a rejection â€” not monotone`).toBe(false);
    }
    expect(sawRejection).toBe(true);
  });

  it('upper-bound semantics: 1.99 -> 2.0 stays valid, 2.0 -> nextUp stays valid->invalid', () => {
    expect(accepts(1.99)).toBe(true);
    expect(accepts(2)).toBe(true);
    // The smallest double strictly above C_MAX. `2 + Number.EPSILON === 2` is
    // NOT a valid probe: EPSILON is the ulp of [1,2) and 2.0 opens [2,4), so
    // that expression is an exact half-ulp tie that rounds back down to 2.
    expect(accepts(2 + Number.EPSILON)).toBe(true);
    expect(accepts(2 + 2 * Number.EPSILON)).toBe(false);
  });
});

describe('P14 seed domain is consistent across all three judges', () => {
  it('chart evaluation, rollover and the reference model never disagree', () => {
    const values = [
      0, Number.MIN_VALUE, 1e-12, 0.5, 1, 1.25, 1.5, 1.9999, 2,
      2 + 2 * Number.EPSILON, 2.0000001, 7.5, Number.MAX_VALUE,
      -Number.MIN_VALUE, -1e-12, -2,
      Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
    ];

    for (const c of values) {
      const spec: SpecScenario = {
        name: `p14/${String(c)}`,
        referenceHour: CORPUS_HOUR,
        closedHourC: null,
        songs: [{
          id: 'a', lifecycle: 'ACTIVE', k: 0, persistentKura: 0,
          buckets: [],
          seed: [{ hour: CORPUS_HOUR, c, source: 'SEED', archived: false }],
          youtube: [], spotify: [], boomplay: [],
        }],
      };

      let evaluation: boolean;
      try {
        runEngine(spec);
        evaluation = true;
      } catch {
        evaluation = false;
      }

      let rollover: boolean;
      try {
        runEngineRollover(spec);
        rollover = true;
      } catch {
        rollover = false;
      }

      const reference = refSeededHourlyCAccepts(c);

      expect(evaluation, `evaluation vs reference at c=${String(c)}`).toBe(reference);
      expect(rollover, `rollover vs reference at c=${String(c)}`).toBe(reference);
    }
  });
});

describe('P15 decay safety', () => {
  it('no accepted seed produces a negative decay rate', () => {
    // D_h = 0.0025 * (1 - C_h / 2) turns negative for C_h > 2. The ruling
    // exists so that "decay" can never become "growth". This is the invariant
    // the whole phase protects.
    const rng = makeRng(424242);
    for (let i = 0; i <= 500; i++) {
      // Uniform over [0, 2]: the exact domain the ruling permits.
      const c = (i / 500) * 2;
      expect(refSeededHourlyCAccepts(c)).toBe(true);
      expect(refDecayRate(c), `D_h at c=${c}`).toBeGreaterThanOrEqual(0);
      expect(refDecayRate(c), `D_h at c=${c}`).toBeLessThanOrEqual(0.0025);
    }
    // Deterministic jitter inside the domain, to sample non-lattice values.
    for (let i = 0; i < 500; i++) {
      const c = rng() * 2;
      expect(refSeededHourlyCAccepts(c)).toBe(true);
      expect(refDecayRate(c), `D_h at c=${c}`).toBeGreaterThanOrEqual(0);
      expect(refDecayRate(c), `D_h at c=${c}`).toBeLessThanOrEqual(0.0025);
    }
  });

  it('decay is monotonically decreasing in C over the whole domain', () => {
    let previous = refDecayRate(0);
    for (let i = 1; i <= 500; i++) {
      const current = refDecayRate((i / 500) * 2);
      expect(current, `D_h must not increase at step ${i}`).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });
});
