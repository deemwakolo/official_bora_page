/**
 * BORA Engine — platform points tests (Phase 10)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   Q-1  the simple examples from the phase brief
 *   Q-2  proportional allocation across unequal songs
 *   Q-3  a platform with zero activity earns 0 and is NOT redistributed
 *   Q-I  cross-platform independence
 *   Q-W  the 7-day window is reused, not reimplemented
 *   Q-V  validation, determinism, immutability
 */

import { describe, it, expect } from 'vitest';
import { evaluatePlatformPoints } from './points';
import {
  PLATFORM_WEIGHTS,
  PLATFORM_TOTAL,
  PLATFORM_WINDOW_HOURS,
  EPSILON_SUM,
} from '../constants';
import type {
  HourIndex,
  PlatformId,
  PlatformObservation,
} from '../types';
import type {
  PlatformSongInput,
  PlatformPointsChart,
  PlatformPointsEntry,
} from './points';

const H = 5000 as HourIndex;
const hour = (n: number) => n as HourIndex;

/** One observation at a given hour for a platform. */
function obsAt(
  h: number,
  platform: PlatformId,
  value: number,
): PlatformObservation {
  return {
    hourIndex: hour(h),
    platform,
    value,
    source: 'IN_CHART',
    lifecycle: 'ACTIVE',
    version: 0,
  };
}

/** A song with one observation per platform, all at the reference hour. */
function songAt(
  id: string,
  yt: number,
  sp: number,
  bp: number,
): PlatformSongInput {
  return {
    id,
    observations: {
      youtube: yt > 0 ? [obsAt(H, 'youtube', yt)] : [],
      spotify: sp > 0 ? [obsAt(H, 'spotify', sp)] : [],
      boomplay: bp > 0 ? [obsAt(H, 'boomplay', bp)] : [],
    },
  };
}

function chart(population: PlatformSongInput[]): PlatformPointsChart {
  const r = evaluatePlatformPoints(population, H);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function entryOf(c: PlatformPointsChart, id: string): PlatformPointsEntry {
  const e = c.entries.find((x) => x.songId === id);
  if (!e) throw new Error(`no entry for ${id}`);
  return e;
}

function sumOf(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

// ───────────────────────────────────────────────────────────────────────────

describe('Q-1: one song with activity on every platform', () => {
  it('receives the full 30 / 15 / 5 allocation', () => {
    const c = chart([songAt('solo', 1000, 500, 100)]);
    const e = c.entries[0];
    expect(e.yt).toBe(PLATFORM_WEIGHTS.youtube);
    expect(e.sp).toBe(PLATFORM_WEIGHTS.spotify);
    expect(e.bp).toBe(PLATFORM_WEIGHTS.boomplay);
    expect(e.total).toBe(PLATFORM_TOTAL);
    expect(e.total).toBe(50);
  });

  it('reports the raw active activity alongside the points', () => {
    const c = chart([songAt('solo', 1000, 500, 100)]);
    const e = c.entries[0];
    expect(e.activeYouTube).toBe(1000);
    expect(e.activeSpotify).toBe(500);
    expect(e.activeBoomplay).toBe(100);
    expect(c.activityTotals.youtube).toBe(1000);
  });

  it('allocates exactly the full weight when activity magnitudes differ', () => {
    // Different magnitudes per platform must still each take their full weight:
    // a single active song owns 100% of its platform's activity.
    const c = chart([songAt('solo', 7, 999999, 42)]);
    expect(c.allocatedTotals.youtube).toBe(30);
    expect(c.allocatedTotals.spotify).toBe(15);
    expect(c.allocatedTotals.boomplay).toBe(5);
  });
});

describe('Q-2: two songs split each platform proportionally', () => {
  it('splits YouTube 300:100 into 22.5 / 7.5', () => {
    const c = chart([songAt('A', 300, 300, 300), songAt('B', 100, 100, 100)]);
    expect(entryOf(c, 'A').yt).toBeCloseTo((300 / 400) * 30, 12);
    expect(entryOf(c, 'B').yt).toBeCloseTo((100 / 400) * 30, 12);
    expect(entryOf(c, 'A').yt).toBeCloseTo(22.5, 12);
    expect(entryOf(c, 'B').yt).toBeCloseTo(7.5, 12);
  });

  it('splits Spotify and Boomplay by their own ratios', () => {
    const c = chart([songAt('A', 300, 300, 300), songAt('B', 100, 100, 100)]);
    expect(entryOf(c, 'A').sp).toBeCloseTo(22.5 / 2, 12); // 15 weight
    expect(entryOf(c, 'B').sp).toBeCloseTo(7.5 / 2, 12);
    expect(entryOf(c, 'A').bp).toBeCloseTo(22.5 / 6, 12); // 5 weight
    expect(entryOf(c, 'B').bp).toBeCloseTo(7.5 / 6, 12);
  });

  it('allocates each platform weight in full across the pair', () => {
    const c = chart([songAt('A', 300, 300, 300), songAt('B', 100, 100, 100)]);
    expect(Math.abs(sumOf(c.entries.map((e) => e.yt)) - 30)).toBeLessThanOrEqual(EPSILON_SUM);
    expect(Math.abs(sumOf(c.entries.map((e) => e.sp)) - 15)).toBeLessThanOrEqual(EPSILON_SUM);
    expect(Math.abs(sumOf(c.entries.map((e) => e.bp)) - 5)).toBeLessThanOrEqual(EPSILON_SUM);
    expect(Math.abs(sumOf(c.entries.map((e) => e.total)) - 50)).toBeLessThanOrEqual(EPSILON_SUM);
  });

  it('splits each platform by ITS OWN ratio when ratios differ per platform', () => {
    // A dominates YT; B dominates SP; equal on BP.
    const c = chart([songAt('A', 900, 100, 50), songAt('B', 100, 900, 50)]);
    expect(entryOf(c, 'A').yt).toBeCloseTo((900 / 1000) * 30, 12);
    expect(entryOf(c, 'B').sp).toBeCloseTo((900 / 1000) * 15, 12);
    expect(entryOf(c, 'A').bp).toBeCloseTo((50 / 100) * 5, 12);
    expect(entryOf(c, 'B').bp).toBeCloseTo((50 / 100) * 5, 12);
  });
});

describe('Q-3: a platform with zero activity earns nothing', () => {
  it('gives YouTube 0 when only Spotify and Boomplay are active', () => {
    const c = chart([songAt('A', 0, 400, 400), songAt('B', 0, 100, 100)]);
    expect(entryOf(c, 'A').yt).toBe(0);
    expect(entryOf(c, 'B').yt).toBe(0);
    expect(c.allocatedTotals.youtube).toBe(0);
    // Spotify and Boomplay are unaffected.
    expect(entryOf(c, 'A').sp).toBeCloseTo(12, 12);
    expect(entryOf(c, 'B').sp).toBeCloseTo(3, 12);
  });

  it('does NOT redistribute the unused YouTube 30 points', () => {
    const c = chart([songAt('A', 0, 400, 400), songAt('B', 0, 100, 100)]);
    // Spotify stays at exactly 15, not 45.
    expect(c.allocatedTotals.spotify).toBeCloseTo(15, 12);
    expect(c.allocatedTotals.boomplay).toBeCloseTo(5, 12);
    // The chart total is 20, NOT 50. That is correct behaviour, not a defect.
    expect(sumOf(c.entries.map((e) => e.total))).toBeCloseTo(20, 12);
    expect(sumOf(c.entries.map((e) => e.total))).toBeLessThan(PLATFORM_TOTAL);
  });

  it('gives every song zero when the whole chart is idle', () => {
    const c = chart([songAt('A', 0, 0, 0), songAt('B', 0, 0, 0)]);
    for (const e of c.entries) {
      expect(e.yt).toBe(0);
      expect(e.sp).toBe(0);
      expect(e.bp).toBe(0);
      expect(e.total).toBe(0);
    }
    expect(c.allocatedTotals.youtube).toBe(0);
    expect(c.allocatedTotals.spotify).toBe(0);
    expect(c.allocatedTotals.boomplay).toBe(0);
  });

  it('yields no NaN or Infinity for a fully idle chart', () => {
    const c = chart([songAt('A', 0, 0, 0)]);
    for (const e of c.entries) {
      for (const v of [e.yt, e.sp, e.bp, e.total]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Number.isNaN(v)).toBe(false);
      }
    }
  });

  it('handles an empty population without error', () => {
    const r = evaluatePlatformPoints([], H);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.entries).toHaveLength(0);
      expect(r.value.allocatedTotals.youtube).toBe(0);
    }
  });
});

describe('Q-I: cross-platform independence', () => {
  it('changing YouTube activity does not alter Spotify or Boomplay points', () => {
    const base = chart([songAt('A', 100, 500, 200), songAt('B', 400, 500, 800)]);
    const moreYt = chart([songAt('A', 999999, 500, 200), songAt('B', 400, 500, 800)]);

    for (const id of ['A', 'B']) {
      expect(entryOf(moreYt, id).sp).toBe(entryOf(base, id).sp);
      expect(entryOf(moreYt, id).bp).toBe(entryOf(base, id).bp);
    }
  });

  it('changing Spotify does not alter YouTube or Boomplay points', () => {
    const base = chart([songAt('A', 500, 100, 300), songAt('B', 500, 400, 100)]);
    const moreSp = chart([songAt('A', 500, 999999, 300), songAt('B', 500, 400, 100)]);
    for (const id of ['A', 'B']) {
      expect(entryOf(moreSp, id).yt).toBe(entryOf(base, id).yt);
      expect(entryOf(moreSp, id).bp).toBe(entryOf(base, id).bp);
    }
  });

  it('changing Boomplay does not alter YouTube or Spotify points', () => {
    const base = chart([songAt('A', 300, 700, 100), songAt('B', 200, 300, 400)]);
    const moreBp = chart([songAt('A', 300, 700, 999999), songAt('B', 200, 300, 400)]);
    for (const id of ['A', 'B']) {
      expect(entryOf(moreBp, id).yt).toBe(entryOf(base, id).yt);
      expect(entryOf(moreBp, id).sp).toBe(entryOf(base, id).sp);
    }
  });

  it('uses a per-platform denominator, not one combined total', () => {
    // If a single grand denominator (YT+SP+BP) were used, making Spotify
    // enormous would change the YouTube split. It must not.
    const before = chart([songAt('A', 300, 10, 10), songAt('B', 100, 10, 10)]);
    const after = chart([songAt('A', 300, 999999, 10), songAt('B', 100, 10, 10)]);
    expect(entryOf(after, 'A').yt).toBeCloseTo(entryOf(before, 'A').yt, 12);
    expect(entryOf(after, 'B').yt).toBeCloseTo(entryOf(before, 'B').yt, 12);
  });

  it('keeps every platform allocation at exactly its own weight', () => {
    const c = chart([songAt('A', 5, 900, 3), songAt('B', 700, 20, 400), songAt('C', 1, 1, 1)]);
    expect(Math.abs(c.allocatedTotals.youtube - 30)).toBeLessThanOrEqual(EPSILON_SUM);
    expect(Math.abs(c.allocatedTotals.spotify - 15)).toBeLessThanOrEqual(EPSILON_SUM);
    expect(Math.abs(c.allocatedTotals.boomplay - 5)).toBeLessThanOrEqual(EPSILON_SUM);
  });
});

describe('Q-W: the 7-day window is reused, not reimplemented', () => {
  const OLDEST_ACTIVE = H - (PLATFORM_WINDOW_HOURS - 1); // H-167
  const FIRST_EXPIRED = H - PLATFORM_WINDOW_HOURS; // H-168

  function songSpanning(id: string): PlatformSongInput {
    return {
      id,
      observations: {
        youtube: [
          obsAt(OLDEST_ACTIVE, 'youtube', 1),
          obsAt(FIRST_EXPIRED, 'youtube', 100),
          obsAt(H + 1, 'youtube', 100),
        ],
        spotify: [],
        boomplay: [],
      },
    };
  }

  it('includes activity at the oldest active boundary and excludes older', () => {
    const c = chart([songSpanning('s')]);
    // Only the H-167 observation counts; H-168 and H+1 are outside.
    expect(entryOf(c, 's').activeYouTube).toBe(1);
  });

  it('excludes activity just outside the window', () => {
    const onlyExpired: PlatformSongInput = {
      id: 'old',
      observations: {
        youtube: [obsAt(FIRST_EXPIRED, 'youtube', 500)],
        spotify: [],
        boomplay: [],
      },
    };
    const c = chart([onlyExpired]);
    expect(entryOf(c, 'old').activeYouTube).toBe(0);
    expect(entryOf(c, 'old').yt).toBe(0);
  });

  it('aggregates many in-window observations', () => {
    const many: PlatformSongInput = {
      id: 'busy',
      observations: {
        youtube: Array.from({ length: 50 }, (_, i) =>
          obsAt(H - i * 3, 'youtube', 2),
        ),
        spotify: [],
        boomplay: [],
      },
    };
    expect(entryOf(chart([many]), 'busy').activeYouTube).toBe(100);
  });

  it('is unaffected by observation order', () => {
    const ordered: PlatformSongInput = {
      id: 's',
      observations: {
        youtube: [obsAt(H - 30, 'youtube', 10), obsAt(H - 5, 'youtube', 20)],
        spotify: [],
        boomplay: [],
      },
    };
    const shuffled: PlatformSongInput = {
      id: 's',
      observations: {
        youtube: [...ordered.observations.youtube].reverse(),
        spotify: [],
        boomplay: [],
      },
    };
    expect(entryOf(chart([shuffled]), 's').activeYouTube).toBe(
      entryOf(chart([ordered]), 's').activeYouTube,
    );
  });

  it('expires old observations as the reference hour advances', () => {
    const data: PlatformSongInput = {
      id: 's',
      observations: {
        youtube: [
          obsAt(H - 167, 'youtube', 1),
          obsAt(H - 168, 'youtube', 10),
          obsAt(H - 169, 'youtube', 100),
        ],
        spotify: [],
        boomplay: [],
      },
    };
    const atH = evaluatePlatformPoints([data], H);
    if (!atH.ok) throw new Error('unexpected rejection');
    // At H the window is H-167 … H: only the H-167 observation is active.
    expect(atH.value.entries[0].activeYouTube).toBe(1);

    // At H+1 the window is H-166 … H+1, so even H-167 has now expired.
    const atH1 = evaluatePlatformPoints([data], hour(H + 1));
    if (!atH1.ok) throw new Error('unexpected rejection');
    expect(atH1.value.entries[0].activeYouTube).toBe(0);
  });

  it('admits a future observation only once the reference hour reaches it', () => {
    const data: PlatformSongInput = {
      id: 's',
      observations: {
        youtube: [obsAt(H + 1, 'youtube', 25)],
        spotify: [],
        boomplay: [],
      },
    };
    const atH = evaluatePlatformPoints([data], H);
    if (!atH.ok) throw new Error('unexpected rejection');
    expect(atH.value.entries[0].activeYouTube).toBe(0); // future, excluded

    const atH1 = evaluatePlatformPoints([data], hour(H + 1));
    if (!atH1.ok) throw new Error('unexpected rejection');
    expect(atH1.value.entries[0].activeYouTube).toBe(25); // now active
  });
});

describe('Q-V: validation', () => {
  it('rejects a negative observation value', () => {
    const bad: PlatformSongInput = {
      id: 's',
      observations: {
        youtube: [obsAt(H, 'youtube', -5)],
        spotify: [],
        boomplay: [],
      },
    };
    const r = evaluatePlatformPoints([bad], H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
  });

  it('rejects a non-finite observation value', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const song: PlatformSongInput = {
        id: 's',
        observations: {
          youtube: [obsAt(H, 'youtube', bad)],
          spotify: [],
          boomplay: [],
        },
      };
      expect(evaluatePlatformPoints([song], H).ok).toBe(false);
    }
  });

  it('rejects a duplicate observation hour for one platform', () => {
    const dupes: PlatformSongInput = {
      id: 's',
      observations: {
        youtube: [obsAt(H, 'youtube', 5), obsAt(H, 'youtube', 9)],
        spotify: [],
        boomplay: [],
      },
    };
    const r = evaluatePlatformPoints([dupes], H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('rejects an invalid reference hour', () => {
    expect(evaluatePlatformPoints([], Number.NaN as HourIndex).ok).toBe(false);
  });

  it('tolerates a missing platform list rather than inventing one', () => {
    const partial = {
      id: 's',
      observations: { youtube: [obsAt(H, 'youtube', 10)] },
    } as unknown as PlatformSongInput;
    const r = evaluatePlatformPoints([partial], H);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.entries[0].activeYouTube).toBe(10);
      expect(r.value.entries[0].activeSpotify).toBe(0);
    }
  });

  it('supports exactly the three contract platforms', () => {
    // Weights are fixed; no future-platform scaffolding exists.
    expect(Object.keys(PLATFORM_WEIGHTS).sort()).toEqual([
      'boomplay',
      'spotify',
      'youtube',
    ]);
    expect(PLATFORM_WEIGHTS.youtube).toBe(30);
    expect(PLATFORM_WEIGHTS.spotify).toBe(15);
    expect(PLATFORM_WEIGHTS.boomplay).toBe(5);
  });
});

describe('Q-P: property tests over generated charts', () => {
  /** Deterministic generator — no Math.random in the suite. */
  function makeRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }

  function randomChart(seed: number, size: number): PlatformPointsChart {
    const rng = makeRng(seed);
    const population: PlatformSongInput[] = [];
    for (let i = 0; i < size; i++) {
      const yt = rng() < 0.25 ? 0 : rng() * 100_000;
      const sp = rng() < 0.25 ? 0 : rng() * 50_000;
      const bp = rng() < 0.25 ? 0 : rng() * 10_000;
      population.push(songAt(`s${i}`, yt, sp, bp));
    }
    const r = evaluatePlatformPoints(population, H);
    if (!r.ok) throw new Error(r.error.message);
    return r.value;
  }

  it('keeps every song within its own platform weight', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const c = randomChart(seed * 7919, 1 + (seed % 12));
      for (const e of c.entries) {
        expect(e.yt, `yt ${seed}`).toBeGreaterThanOrEqual(0);
        expect(e.yt, `yt ${seed}`).toBeLessThanOrEqual(PLATFORM_WEIGHTS.youtube);
        expect(e.sp, `sp ${seed}`).toBeGreaterThanOrEqual(0);
        expect(e.sp, `sp ${seed}`).toBeLessThanOrEqual(PLATFORM_WEIGHTS.spotify);
        expect(e.bp, `bp ${seed}`).toBeGreaterThanOrEqual(0);
        expect(e.bp, `bp ${seed}`).toBeLessThanOrEqual(PLATFORM_WEIGHTS.boomplay);
      }
    }
  });

  it('allocates each platform weight exactly when that platform is active', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const c = randomChart(seed * 104729, 1 + (seed % 12));
      for (const platform of ['youtube', 'spotify', 'boomplay'] as const) {
        const weight = PLATFORM_WEIGHTS[platform];
        if (c.activityTotals[platform] > 0) {
          expect(
            Math.abs(c.allocatedTotals[platform] - weight),
            `${platform} seed ${seed}`,
          ).toBeLessThanOrEqual(EPSILON_SUM);
        } else {
          // No activity ⇒ zero points, NOT a forced weight.
          expect(c.allocatedTotals[platform], `${platform} seed ${seed}`).toBe(0);
        }
      }
    }
  });

  it('never totals 50 when a platform is idle', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const c = randomChart(seed * 15485863, 1 + (seed % 12));
      const anyIdle = (['youtube', 'spotify', 'boomplay'] as const).some(
        (p) => c.activityTotals[p] === 0,
      );
      const total = sumOf(c.entries.map((e) => e.total));
      if (anyIdle) {
        expect(total, `seed ${seed}`).toBeLessThan(PLATFORM_TOTAL);
      } else {
        expect(Math.abs(total - PLATFORM_TOTAL), `seed ${seed}`).toBeLessThanOrEqual(
          EPSILON_SUM,
        );
      }
    }
  });

  it('keeps every value finite and the per-song total in range', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const c = randomChart(seed * 32452843, 1 + (seed % 10));
      for (const e of c.entries) {
        for (const v of [e.yt, e.sp, e.bp, e.total]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        expect(e.total).toBeGreaterThanOrEqual(0);
        expect(e.total).toBeLessThanOrEqual(PLATFORM_TOTAL + EPSILON_SUM);
      }
    }
  });
});

describe('Q-D: determinism and immutability', () => {
  const population = [songAt('A', 300, 100, 50), songAt('B', 100, 900, 250)];

  it('returns identical results across repeated evaluation', () => {
    const first = chart(population);
    for (let i = 0; i < 20; i++) {
      expect(chart(population)).toEqual(first);
    }
  });

  it('does not mutate the song input or its observations', () => {
    const snapshot = JSON.stringify(population);
    evaluatePlatformPoints(population, H);
    expect(JSON.stringify(population)).toBe(snapshot);
  });

  it('preserves population order in the output', () => {
    expect(chart(population).entries.map((e) => e.songId)).toEqual(['A', 'B']);
    expect(chart([...population].reverse()).entries.map((e) => e.songId)).toEqual([
      'B',
      'A',
    ]);
  });

  it('contains no decay, Kura, score, ranking, seed, or simulation logic', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./points.ts', import.meta.url)),
      'utf8',
    );
    // Comments removed so documentation cannot trip the scan.
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    expect(body).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(/);
    expect(body).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    // A4: no decay. And no out-of-scope subsystems.
    expect(body).not.toMatch(/DECAY|decayRate|kura|boraScore|rank|seedC|Vault/i);
  });

  it('reuses the Phase 6 window, weights, and normaliser', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./points.ts', import.meta.url)),
      'utf8',
    );
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    // Composes the Phase 6 pieces…
    expect(body).toMatch(/from '\.\/window'/);
    expect(body).toMatch(/\bgetPlatformWindow\b/);
    expect(body).toMatch(/\bsumActiveValue\b/);
    expect(body).toMatch(/\bnormalizePlatform\b/);
    expect(body).toMatch(/\bPLATFORM_WEIGHTS\b/);
    // …and redefines neither the window size nor the weights.
    expect(body).not.toMatch(/168|=\s*30\b|=\s*15\b|=\s*5\b/);
    // No second song or observation model.
    expect(body).not.toMatch(/interface\s+Song\b|interface\s+PlatformObservation\b/);
  });
});