/**
 * BORA Engine — BORA Score tests (Phase 11)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   S-0  zero values and single-component combinations
 *   S-E  the full-component example
 *   S-B  structural bounds (no artificial cap)
 *   S-A  additivity: each component moves the score by exactly its delta
 *   S-K  K is NOT an input
 *   S-V  validation
 *   S-P  property tests
 *   S-PU determinism, immutability, no normalisation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBoraScore,
  calculateChartScores,
  MAX_PLATFORM_CONTRIBUTION,
} from './boraScore';
import { PLATFORM_WEIGHTS, PLATFORM_TOTAL, EPSILON_SUM } from '../constants';
import type { PlatformPointsEntry } from '../platform/points';

/** Build Phase 10-style platform output with the given normalised points. */
function points(
  yt: number,
  sp: number,
  bp: number,
): PlatformPointsEntry {
  return {
    songId: 'song',
    activeYouTube: 0,
    activeSpotify: 0,
    activeBoomplay: 0,
    yt,
    sp,
    bp,
    total: yt + sp + bp,
  };
}

function score(kura: number, yt: number, sp: number, bp: number): number {
  const r = calculateBoraScore(kura, points(yt, sp, bp));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function errOf(
  kura: number,
  yt: number,
  sp: number,
  bp: number,
): string {
  const r = calculateBoraScore(kura, points(yt, sp, bp));
  if (r.ok) throw new Error(`expected rejection, got ${r.value}`);
  return r.error.code;
}

// ───────────────────────────────────────────────────────────────────────────

describe('S-0: zero and single-component combinations', () => {
  it('scores exactly 0 when every component is zero', () => {
    expect(score(0, 0, 0, 0)).toBe(0);
  });

  it('scores Kura alone', () => {
    expect(score(10, 0, 0, 0)).toBe(10);
  });

  it('scores YouTube alone at its full weight', () => {
    expect(score(0, 30, 0, 0)).toBe(30);
  });

  it('scores Spotify alone at its full weight', () => {
    expect(score(0, 0, 15, 0)).toBe(15);
  });

  it('scores Boomplay alone at its full weight', () => {
    expect(score(0, 0, 0, 5)).toBe(5);
  });

  it('is additive across two components', () => {
    expect(score(10, 30, 0, 0)).toBe(40);
    expect(score(0, 30, 15, 0)).toBe(45);
    expect(score(0, 0, 15, 5)).toBe(20);
  });

  it('reaches the full 50 from platform points alone', () => {
    expect(score(0, 30, 15, 5)).toBe(PLATFORM_TOTAL);
    expect(score(0, 30, 15, 5)).toBe(50);
  });
});

describe('S-E: the full-component example', () => {
  it('computes 37.5 + 18 + 9 + 3 = 67.5 exactly', () => {
    expect(score(37.5, 18, 9, 3)).toBe(67.5);
  });

  it('matches the brief exactly (no rounding drift)', () => {
    // 67.5 is exactly representable, so this is an exact comparison.
    expect(score(37.5, 18, 9, 3)).toBe(67.5);
  });
});

describe('S-B: structural bounds, with no artificial cap', () => {
  it('is never below persistent Kura', () => {
    expect(score(20, 0, 0, 0)).toBeGreaterThanOrEqual(20);
    expect(score(20, 1, 2, 3)).toBeGreaterThanOrEqual(20);
  });

  it('is never more than 50 above persistent Kura', () => {
    expect(MAX_PLATFORM_CONTRIBUTION).toBe(PLATFORM_TOTAL);
    expect(MAX_PLATFORM_CONTRIBUTION).toBe(50);
    expect(score(20, 30, 15, 5)).toBe(70);
    expect(score(20, 30, 15, 5) - 20).toBe(MAX_PLATFORM_CONTRIBUTION);
  });

  it('does NOT cap a large persistent Kura at 100', () => {
    // Persistent Kura accumulates across hourly cycles with no ceiling, so a
    // score may legitimately exceed 100. A Math.min(score, 100) would hide it.
    expect(score(500, 30, 15, 5)).toBe(550);
    expect(score(500, 30, 15, 5)).toBeGreaterThan(100);
  });

  it('lets persistent Kura grow without limit', () => {
    expect(score(1_000_000, 0, 0, 0)).toBe(1_000_000);
  });
});

describe('S-A: additivity — each component moves the score by its delta', () => {
  it('adds exactly its delta to persistent Kura', () => {
    expect(score(10 + 5, 0, 0, 0) - score(10, 0, 0, 0)).toBe(5);
  });

  it('adds exactly its delta to YouTube points', () => {
    expect(score(10, 18 + 3, 9, 3) - score(10, 18, 9, 3)).toBe(3);
  });

  it('adds exactly its delta to Spotify points', () => {
    expect(score(10, 18, 9 + 2, 3) - score(10, 18, 9, 3)).toBe(2);
  });

  it('adds exactly its delta to Boomplay points', () => {
    expect(score(10, 18, 9, 3 + 1) - score(10, 18, 9, 3)).toBe(1);
  });

  it('applies every delta simultaneously and independently', () => {
    const before = score(100, 20, 10, 5);
    const after = score(100 + 5, 20 + 3, 10 + 2, 5 + 1);
    expect(after - before).toBe(5 + 3 + 2 + 1);
    expect(after - before).toBe(11);
  });

  it('does not let one component alter another coefficient', () => {
    // Adding a large Kura must not change the marginal value of a platform
    // point, and vice versa.
    for (const kura of [0, 1, 50, 10_000]) {
      const marginal = score(kura, 20, 10, 5) - score(kura, 17, 10, 5);
      expect(marginal, `kura=${kura}`).toBe(3);
    }
    for (const bp of [0, 1, 5]) {
      const marginal = score(40, 20, 10, bp) - score(40, 20, 10, 0);
      expect(marginal, `bp=${bp}`).toBe(bp);
    }
  });
});

describe('S-K: K is NOT part of BORA Score', () => {
  it('has no K parameter in the function signature', () => {
    // arity is 2: (persistentKura, platformPoints). No K anywhere.
    expect(calculateBoraScore.length).toBe(2);
  });

  it('ignores the songId carried on the platform entry', () => {
    const a = calculateBoraScore(10, { ...points(1, 1, 1), songId: 'A' });
    const b = calculateBoraScore(10, { ...points(1, 1, 1), songId: 'B' });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.value).toBe(b.value);
  });

  it('ignores the raw activity fields, which are not scores', () => {
    // Phase 10 already applied the weights, so raw activity must not leak in.
    const low = calculateBoraScore(10, {
      ...points(2, 1, 0),
      activeYouTube: 1,
      activeSpotify: 1,
      activeBoomplay: 1,
    });
    const high = calculateBoraScore(10, {
      ...points(2, 1, 0),
      activeYouTube: 999_999,
      activeSpotify: 888_888,
      activeBoomplay: 777_777,
    });
    expect(low.ok && high.ok).toBe(true);
    if (low.ok && high.ok) {
      expect(high.value).toBe(low.value);
      expect(high.value).toBe(13);
    }
  });

  it('contains no K term in the module source', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./boraScore.ts', import.meta.url)),
      'utf8',
    );
    // Comments stripped, so documentation about K cannot trip the scan.
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    // No K accumulator is read or added: only kura + yt + sp + bp.
    expect(body).not.toMatch(/[\s(,]k[,\s)]/);
    expect(body).not.toMatch(/historicalK|songK\b/);
  });
});

describe('S-V: validation', () => {
  it('rejects a negative persistent Kura', () => {
    expect(errOf(-1, 0, 0, 0)).toBe('INVALID_MEASUREMENT');
  });

  it('rejects non-finite persistent Kura', () => {
    expect(errOf(Number.NaN, 0, 0, 0)).toBe('INVALID_MEASUREMENT');
    expect(errOf(Number.POSITIVE_INFINITY, 0, 0, 0)).toBe('INVALID_MEASUREMENT');
  });

  it('rejects negative platform points', () => {
    expect(errOf(10, -1, 0, 0)).toBe('INVALID_MEASUREMENT');
    expect(errOf(10, 0, -1, 0)).toBe('INVALID_MEASUREMENT');
    expect(errOf(10, 0, 0, -1)).toBe('INVALID_MEASUREMENT');
  });

  it('rejects non-finite platform points', () => {
    expect(errOf(10, Number.NaN, 0, 0)).toBe('INVALID_MEASUREMENT');
    expect(errOf(10, 0, Number.POSITIVE_INFINITY, 0)).toBe('INVALID_MEASUREMENT');
    expect(errOf(10, 0, 0, Number.NaN)).toBe('INVALID_MEASUREMENT');
  });

  it('never coerces an invalid component to zero', () => {
    const r = calculateBoraScore(10, points(-5, 0, 0));
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });

  it('names the offending field in the error context', () => {
    const r = calculateBoraScore(10, points(1, Number.NaN, 1));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.context?.['platformPoints.sp']).toBe('NaN');
    }
  });

  it('reports the first invalid song in a chart rather than dropping it', () => {
    const r = calculateChartScores([
      { songId: 'ok', persistentKura: 10, platformPoints: points(1, 1, 1) },
      { songId: 'bad', persistentKura: Number.NaN, platformPoints: points(1, 1, 1) },
    ]);
    expect(r.ok).toBe(false);
  });
});

describe('S-P: property tests over generated components', () => {
  /** Deterministic generator — no Math.random in the suite. */
  function makeRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }

  it('is always >= 0 and >= persistent Kura', () => {
    const rng = makeRng(11);
    for (let i = 0; i < 500; i++) {
      const kura = rng() * 1000;
      const value = score(
        kura,
        rng() * PLATFORM_WEIGHTS.youtube,
        rng() * PLATFORM_WEIGHTS.spotify,
        rng() * PLATFORM_WEIGHTS.boomplay,
      );
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeGreaterThanOrEqual(kura);
    }
  });

  it('never exceeds persistent Kura + 50', () => {
    const rng = makeRng(22);
    for (let i = 0; i < 500; i++) {
      const kura = rng() * 1000;
      const value = score(
        kura,
        rng() * PLATFORM_WEIGHTS.youtube,
        rng() * PLATFORM_WEIGHTS.spotify,
        rng() * PLATFORM_WEIGHTS.boomplay,
      );
      expect(value - kura).toBeLessThanOrEqual(
        MAX_PLATFORM_CONTRIBUTION + EPSILON_SUM,
      );
    }
  });

  it('satisfies score - kura = yt + sp + bp within 1e-9', () => {
    const rng = makeRng(33);
    for (let i = 0; i < 500; i++) {
      const kura = rng() * 1000;
      const yt = rng() * 30;
      const sp = rng() * 15;
      const bp = rng() * 5;
      expect(Math.abs(score(kura, yt, sp, bp) - kura - (yt + sp + bp)), `i=${i}`)
        .toBeLessThanOrEqual(EPSILON_SUM);
    }
  });

  it('satisfies score(a + delta) = score(a) + delta for each component', () => {
    const rng = makeRng(44);
    for (let i = 0; i < 300; i++) {
      const kura = rng() * 500;
      const yt = rng() * 30;
      const sp = rng() * 15;
      const bp = rng() * 5;
      const base = score(kura, yt, sp, bp);

      expect(score(kura + 2, yt, sp, bp) - base).toBeCloseTo(2, 9);
      expect(score(kura, yt + 2, sp, bp) - base).toBeCloseTo(2, 9);
      expect(score(kura, yt, sp + 2, bp) - base).toBeCloseTo(2, 9);
      expect(score(kura, yt, sp, bp + 2) - base).toBeCloseTo(2, 9);
    }
  });

  it('never produces NaN or Infinity for valid input', () => {
    const rng = makeRng(55);
    for (let i = 0; i < 300; i++) {
      const value = score(rng() * 1e6, rng() * 30, rng() * 15, rng() * 5);
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('composes a chart of scores in population order', () => {
    const r = calculateChartScores([
      { songId: 'a', persistentKura: 0, platformPoints: points(30, 15, 5) },
      { songId: 'b', persistentKura: 10, platformPoints: points(0, 0, 0) },
      { songId: 'c', persistentKura: 5, platformPoints: points(2, 1, 1) },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.map((s) => s.songId)).toEqual(['a', 'b', 'c']);
      expect(r.value[0].boraScore).toBe(50);
      expect(r.value[1].boraScore).toBe(10);
      expect(r.value[2].boraScore).toBe(9);
    }
  });
});

describe('S-PU: determinism, immutability, and no normalisation', () => {
  it('returns identical results across repeated evaluation', () => {
    const first = score(37.5, 18, 9, 3);
    for (let i = 0; i < 20; i++) {
      expect(score(37.5, 18, 9, 3)).toBe(first);
    }
  });

  it('does not mutate the supplied platform points', () => {
    const p = points(1, 2, 3);
    const snapshot = JSON.stringify(p);
    calculateBoraScore(10, p);
    expect(JSON.stringify(p)).toBe(snapshot);
  });

  it('applies no normalisation: the score is the raw per-song sum', () => {
    // A chart-wide normaliser would make one song's score depend on the rest.
    const alone = score(10, 20, 5, 2);
    const withOthers = calculateChartScores([
      { songId: 'a', persistentKura: 999, platformPoints: points(30, 15, 5) },
      { songId: 'b', persistentKura: 10, platformPoints: points(20, 5, 2) },
    ]);
    expect(withOthers.ok).toBe(true);
    if (withOthers.ok) expect(withOthers.value[1].boraScore).toBe(alone);
  });

  it('contains no normalisation, cap, ranking, or simulation logic', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./boraScore.ts', import.meta.url)),
      'utf8',
    );
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    // No clock, randomness, or ambient state.
    expect(body).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(/);
    expect(body).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    // No normalisation and no artificial cap.
    expect(body).not.toMatch(/Math\s*\.\s*min|Math\s*\.\s*max/);
    expect(body).not.toMatch(/\/\s*(100|KURA_TOTAL)\b/);
    // No ranking, ordering, or lifecycle.
    expect(body).not.toMatch(/sort|\.rank\b|compare|Vault|restore|lifecycle/i);
    // No recomputation of upstream phases, and no reverse dependency.
    expect(body).not.toMatch(
      /calculateDecay|updatePersistentKura|sumActiveC|evaluatePlatformPoints|evaluateActiveDistribution/,
    );
    expect(body).not.toMatch(/from '\.\.\/(kura|window|votes|seed|platform\/window)/);
  });

  it('imports only constants, types, and the Phase 10 point type', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./boraScore.ts', import.meta.url)),
      'utf8',
    );
    const statements = code.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];
    const specifiers = statements.map(
      (s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '',
    );
    expect(specifiers.slice().sort()).toEqual([
      '../constants',
      '../platform/points',
      '../types',
    ]);
  });
});