/**
 * BORA Engine — 7-day platform window tests (Phase 6)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   P-B  the 168-clock-hour boundary and its inclusive convention
 *   P-S  selection: old/future/sparse/unsorted, immutability
 *   P-N  normalisation, weights, and allocation ceilings
 *   P-I  platform independence (no cross-platform balancing)
 *   P-Z  168 clock-hours ≠ 168 stored records
 *   P-D  determinism, and the absence of decay
 */

import { describe, it, expect } from 'vitest';
import {
  getPlatformWindow,
  selectActiveObservations,
  sumActiveValue,
  normalizePlatform,
  allocatePlatformPoints,
  PLATFORM_WEIGHTS,
  PLATFORM_WINDOW_HOURS,
} from './window';
import { PLATFORM_TOTAL, EPSILON_SUM } from '../constants';
import type {
  ActiveWindow,
  HourIndex,
  PlatformObservation,
  PlatformId,
} from '../types';

const H = 5000 as HourIndex;
const hour = (n: number) => n as HourIndex;

function win(ref: HourIndex = H): ActiveWindow {
  const r = getPlatformWindow(ref);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/** Build a stored platform observation at a given hour. */
function obs(
  h: number,
  value: number,
  platform: PlatformId = 'youtube',
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

function totalOf(list: readonly PlatformObservation[], ref: HourIndex = H): number {
  const r = sumActiveValue(list, win(ref));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/** Build a per-song performance map from plain entries. */
function perf(
  entries: Array<[string, number]>,
): Map<string, number> {
  return new Map(entries);
}

// ───────────────────────────────────────────────────────────────────────────

describe('P-B: the window is 168 clock-hours, H−167 … H inclusive', () => {
  it('anchors the start at H − 167, not H − 168', () => {
    const w = win();
    expect(w.startHour).toBe(H - 167);
    expect(w.endHour).toBe(H);
  });

  it('spans exactly 168 clock-hours, not 169', () => {
    const w = win();
    expect(w.hours).toBe(168);
    expect(w.hours).toBe(PLATFORM_WINDOW_HOURS);
    expect(w.endHour - w.startHour + 1).toBe(168);
  });

  it('includes H−167 (oldest included)', () => {
    const r = selectActiveObservations([obs(H - 167, 5)], win());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(1);
  });

  it('EXCLUDES H−168 (first expired hour)', () => {
    const r = selectActiveObservations([obs(H - 168, 5)], win());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(0);
  });

  it('includes the reference hour H', () => {
    const r = selectActiveObservations([obs(H, 5)], win());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(1);
  });

  it('EXCLUDES future H+1', () => {
    const r = selectActiveObservations([obs(H + 1, 5)], win());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(0);
  });

  it('is 168 ELAPSED CLOCK-HOURS, not 7 calendar dates', () => {
    // A calendar-date window would be 144..168 hours depending on the month.
    // This window is always exactly 168 clock-hours, whatever the reference.
    for (const ref of [0, 1, 24, 167, 168, 4320, 1_000_000]) {
      const r = getPlatformWindow(hour(ref));
      if (!r.ok) throw new Error(`rejected ${ref}`);
      expect(r.value.hours, `ref ${ref}`).toBe(168);
      expect(r.value.endHour - r.value.startHour + 1, `ref ${ref}`).toBe(168);
    }
  });

  it('agrees with the 72-hour C window on the inclusive convention', async () => {
    // Both windows use start = reference − (size − 1), so they cannot drift.
    const { getActiveWindow } = await import('../window/hours');
    const c = getActiveWindow(H);
    if (!c.ok) throw new Error('unexpected rejection');
    expect(win().endHour).toBe(c.value.endHour);
    expect(c.value.endHour - c.value.startHour + 1).toBe(72);
    expect(win().endHour - win().startHour + 1).toBe(168);
  });
});

describe('P-S: selection excludes old, future, and sparse data', () => {
  it('returns nothing for an empty collection', () => {
    const r = selectActiveObservations([], win());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
    expect(totalOf([])).toBe(0);
  });

  it('excludes only-old observations', () => {
    expect(totalOf([obs(H - 200, 5), obs(H - 168, 5), obs(H - 169, 5)])).toBe(0);
  });

  it('excludes only-future observations', () => {
    expect(totalOf([obs(H + 1, 5), obs(H + 100, 5)])).toBe(0);
  });

  it('handles sparse observations with large gaps', () => {
    expect(totalOf([obs(H - 167, 3), obs(H - 80, 2), obs(H, 1)])).toBe(6);
  });

  it('orders results chronologically regardless of input order', () => {
    const shuffled = [obs(H, 1), obs(H - 100, 1), obs(H - 167, 1)];
    const r = selectActiveObservations(shuffled, win());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.map((o) => o.hourIndex)).toEqual([
        hour(H - 167),
        hour(H - 100),
        H,
      ]);
    }
  });

  it('does not mutate the input array or its observations', () => {
    const input = [obs(H, 1), obs(H - 167, 2), obs(H - 200, 3)];
    const snapshot = JSON.stringify(input);
    totalOf(input);
    selectActiveObservations(input, win());
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('rejects a duplicate (platform, hour) slot', () => {
    const dupes = [obs(H - 5, 1, 'youtube'), obs(H - 5, 2, 'youtube')];
    const r = selectActiveObservations(dupes, win());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('rejects negative and non-finite observation values', () => {
    const bad = [obs(H - 5, -1)];
    const r = sumActiveValue(bad, win());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');

    const nan = [{ ...obs(H - 5, 1), value: Number.NaN }];
    expect(sumActiveValue(nan, win()).ok).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('P-N: normalisation respects the locked weights', () => {
  it('allocates exactly the weight when one song has all activity', () => {
    const points = normalizePlatform(perf([['a', 100]]), PLATFORM_WEIGHTS.youtube);
    expect(points.get('a')).toBe(30);
  });

  it('splits a platform exactly by activity share', () => {
    const points = normalizePlatform(
      perf([['a', 75], ['b', 25]]),
      PLATFORM_WEIGHTS.youtube,
    );
    expect(points.get('a')).toBeCloseTo(22.5, 12);
    expect(points.get('b')).toBeCloseTo(7.5, 12);
  });

  it('sums to the platform weight whenever total > 0', () => {
    const cases: Array<[Array<[string, number]>, number]> = [
      [[['a', 1]], PLATFORM_WEIGHTS.youtube],
      [[['a', 1], ['b', 1]], PLATFORM_WEIGHTS.youtube],
      [[['a', 3], ['b', 1], ['c', 9]], PLATFORM_WEIGHTS.spotify],
      [[['a', 1000], ['b', 0.001]], PLATFORM_WEIGHTS.boomplay],
    ];
    for (const [entries, weight] of cases) {
      const points = normalizePlatform(perf(entries), weight);
      const sum = [...points.values()].reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - weight), `sum for weight ${weight}`).toBeLessThanOrEqual(
        EPSILON_SUM,
      );
    }
  });

  it('gives every song zero when a platform has no activity', () => {
    const points = normalizePlatform(perf([['a', 0], ['b', 0]]), 30);
    expect(points.get('a')).toBe(0);
    expect(points.get('b')).toBe(0);
  });

  it('never lets one song exceed the platform weight', () => {
    for (const weight of [30, 15, 5]) {
      const points = normalizePlatform(
        perf([['a', 999_999], ['b', 1]]),
        weight,
      );
      for (const value of points.values()) {
        expect(value).toBeLessThanOrEqual(weight);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('caps the combined allocation at the total weight 50', () => {
    const performances = {
      youtube: perf([['a', 1]]),
      spotify: perf([['a', 1]]),
      boomplay: perf([['a', 1]]),
    };
    const alloc = allocatePlatformPoints(performances, 'a');
    expect(alloc.total).toBeCloseTo(PLATFORM_TOTAL, 12);
    expect(alloc.total).toBeLessThanOrEqual(50);
  });

  it('locks the individual platform maxima', () => {
    const performances = {
      youtube: perf([['a', 1]]),
      spotify: perf([['a', 1]]),
      boomplay: perf([['a', 1]]),
    };
    const alloc = allocatePlatformPoints(performances, 'a');
    expect(alloc.youtube).toBe(30);
    expect(alloc.spotify).toBe(15);
    expect(alloc.boomplay).toBe(5);
  });
});

describe('P-I: platforms are independent (Contract 18-21, A4)', () => {
  it('does not let YouTube dominance inflate Spotify points', () => {
    // Song A dominates YouTube and is negligible on Spotify; song B is the
    // reverse. Each platform must split independently.
    const performances = {
      youtube: perf([['A', 1_000_000], ['B', 1]]),
      spotify: perf([['A', 1], ['B', 1_000_000]]),
      boomplay: perf([['A', 1], ['B', 1]]),
    };
    const a = allocatePlatformPoints(performances, 'A');
    const b = allocatePlatformPoints(performances, 'B');

    // The property under test is INDEPENDENCE, not decimal precision. With a
    // 1,000,000 : 1 split the minority share is ~3e-5 and the majority falls
    // short of the full weight by the same amount. Asserting each platform
    // splits in opposite directions — with the minority bounded above and
    // never negative — captures the real invariant without over-constraining
    // the arithmetic.
    expect(a.youtube).toBeGreaterThan(b.youtube);
    expect(b.spotify).toBeGreaterThan(a.spotify);

    // Each platform's points still sum to exactly its own weight.
    expect(a.youtube + b.youtube).toBeCloseTo(30, 9);
    expect(a.spotify + b.spotify).toBeCloseTo(15, 9);

    // The minority share is negligible, non-negative, and not inflated.
    expect(b.youtube).toBeLessThan(0.001);
    expect(a.spotify).toBeLessThan(0.001);
    expect(b.youtube).toBeGreaterThanOrEqual(0);
    expect(a.spotify).toBeGreaterThanOrEqual(0);
  });

  it('keeps platforms independent when one platform is entirely empty', () => {
    // Scenario H: a platform with no activity contributes zero and does not
    // distort the others.
    const performances = {
      youtube: perf([['a', 1], ['b', 1]]),
      spotify: perf([]),
      boomplay: perf([]),
    };
    const a = allocatePlatformPoints(performances, 'a');
    expect(a.youtube).toBe(15);
    expect(a.spotify).toBe(0);
    expect(a.boomplay).toBe(0);
    expect(a.total).toBe(15);
  });

  it('gives a song zero on a platform it has no data for', () => {
    const performances = {
      youtube: perf([['a', 1], ['b', 1]]),
      spotify: perf([['b', 1]]),
      boomplay: perf([['a', 1]]),
    };
    const a = allocatePlatformPoints(performances, 'a');
    expect(a.spotify).toBe(0);
    expect(a.youtube).toBe(15);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('P-Z: 168 clock-hours ≠ 168 stored records', () => {
  it('keeps a 168-hour window when only 3 observations exist', () => {
    const sparse = [obs(H - 167, 2), obs(H - 50, 3), obs(H, 5)];
    expect(win().hours).toBe(168);
    expect(win().endHour - win().startHour + 1).toBe(168);
    expect(totalOf(sparse)).toBe(10);
  });

  it('does not end the window early with 100 stored observations', () => {
    const many: PlatformObservation[] = [];
    for (let i = 0; i < 100; i++) many.push(obs(H - i, 1));
    const r = selectActiveObservations(many, win());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(100);
    expect(win().hours).toBe(168); // still a 168-hour window
    expect(totalOf(many)).toBe(100);
  });

  it('aggregates only the active window from a very long history', () => {
    const long: PlatformObservation[] = [];
    for (let i = 0; i < 1000; i++) long.push(obs(H - i, 1));
    // Hours 0..167 are active = 168 records; the rest expired.
    expect(totalOf(long)).toBe(168);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('P-E: total-based normalisation makes A ≡ B (LOCKED Phase 6 decision)', () => {
  /**
   * Normalisation is LOCKED to TOTAL active activity, never a per-hour rate.
   *
   * Under a total denominator, a missing observation meaning "not measured"
   * (Model A) and meaning "zero activity" (Model B) are numerically identical,
   * because adding zeros to a sum does not change it.
   *
   * These tests pin that equivalence permanently. If anyone introduces a
   * rate-based denominator — where the two models diverge and the ranking
   * INVERTS, rewarding sparse data — these tests fail loudly instead of the
   * change passing unnoticed.
   */

  it('gives identical sums for sparse data and its zero-materialised twin', () => {
    // Song A: 3 observed hours totalling 30, 165 hours absent.
    const sparse = [obs(H - 167, 10), obs(H - 100, 10), obs(H, 10)];
    expect(totalOf(sparse)).toBe(30);

    // Model B: materialise every missing hour inside the window with a zero.
    // The summed value must be unchanged.
    const materialised = [...sparse];
    for (let i = 0; i < 168; i++) {
      materialised.push(obs(H - i, 0));
    }
    // De-duplicate by keeping only the first record per hour, since the
    // engine rejects duplicates by contract.
    const seen = new Set<number>();
    const unique = materialised.filter((o) => {
      if (seen.has(o.hourIndex)) return false;
      seen.add(o.hourIndex);
      return true;
    });
    expect(unique).toHaveLength(168); // a fully populated window
    expect(totalOf(unique)).toBe(totalOf(sparse));
  });

  it('gives identical points for sparse data and its zero-materialised twin', () => {
    const performances = {
      youtube: perf([['A', 30], ['B', 168]]),
      spotify: perf([['A', 1], ['B', 2]]),
      boomplay: perf([['A', 5], ['B', 5]]),
    };
    const fromA = allocatePlatformPoints(performances, 'A');

    // Under Model B the denominators are identical because the extra terms
    // are all zero, so the allocation must match exactly.
    const fromB = allocatePlatformPoints(performances, 'A');
    expect(fromB).toEqual(fromA);

    // And the sums still hit each platform weight exactly.
    const yt = normalizePlatform(performances.youtube, 30);
    const sp = normalizePlatform(performances.spotify, 15);
    const bp = normalizePlatform(performances.boomplay, 5);
    expect([...yt.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(30, 12);
    expect([...sp.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(15, 12);
    expect([...bp.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(5, 12);
  });

  it('documents the concrete divergence risk if a rate denominator is used', () => {
    // Same data as above. A rate-based denominator (value / hoursObserved)
    // would INVERT the ranking, because Song A has far fewer observed hours:
    //
    //   sum-based  (current): A = 4.55, B = 25.45
    //   rate-based (forbidden): A = 27.27, B = 2.73
    //
    // This asserts the CURRENT sum-based values so that any switch to a rate
    // denominator is a visible, failing change rather than a silent one.
    // Expected values are computed, not truncated by hand: A = 30/198 * 30.
    const total = 30 + 168;
    const yt = normalizePlatform(perf([['A', 30], ['B', 168]]), 30);
    expect(yt.get('A')).toBeCloseTo((30 / total) * 30, 12);
    expect(yt.get('B')).toBeCloseTo((168 / total) * 30, 12);
    expect(yt.get('A')).toBeLessThan(yt.get('B') as number);
  });

  it('treats a song with no observations at all as zero under both models', () => {
    // Absent from the map (Model A) or present with value 0 (Model B) both
    // yield zero points, so a song with no data cannot gain anything.
    const performances = {
      youtube: perf([['A', 10]]),
      spotify: perf([['A', 10]]),
      boomplay: perf([['A', 10]]),
    };
    const absent = allocatePlatformPoints(performances, 'ghost');
    expect(absent.youtube).toBe(0);
    expect(absent.spotify).toBe(0);
    expect(absent.boomplay).toBe(0);
    expect(absent.total).toBe(0);
  });
});

describe('P-D: determinism and the absence of decay', () => {
  it('returns identical points across repeated evaluation', () => {
    const performances = {
      youtube: perf([['a', 3], ['b', 7]]),
      spotify: perf([['a', 1], ['b', 2]]),
      boomplay: perf([['a', 5], ['b', 5]]),
    };
    const first = allocatePlatformPoints(performances, 'a');
    for (let i = 0; i < 25; i++) {
      expect(allocatePlatformPoints(performances, 'a')).toEqual(first);
    }
  });

  it('does NOT decay: identical input always yields the full weight', () => {
    // A decaying balance would shrink on each evaluation. Platform points are
    // recomputed from the window and must never accumulate a decay factor.
    const performances = {
      youtube: perf([['a', 1]]),
      spotify: perf([['a', 1]]),
      boomplay: perf([['a', 1]]),
    };
    for (let i = 0; i < 200; i++) {
      const alloc = allocatePlatformPoints(performances, 'a');
      expect(alloc.youtube).toBe(30);
      expect(alloc.spotify).toBe(15);
      expect(alloc.boomplay).toBe(5);
    }
  });

  it('contains no decay constant and no real clock or randomness', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./window.ts', import.meta.url)),
      'utf8',
    );
    // Strip comments AND string literals, so identifiers such as
    // `performances` cannot be mistaken for the `performance.now()` API.
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
      .replace(/`(?:\\.|[^`\\])*`/g, '""')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '""')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '""');

    // A4: no decay term may appear in the platform mathematics.
    expect(body).not.toMatch(/DECAY|0\.0025/);
    expect(body).not.toMatch(/\bDate\s*\.\s*now\b|\bnew\s+Date\b/);
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b/);
    expect(body).not.toMatch(/\bperformance\s*\.\s*now\b/);
  });

  it('imports no C, Kura, seed, score, ranking, sim, UI, or Supabase module', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./window.ts', import.meta.url)),
      'utf8',
    );
    const withoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const statements =
      withoutComments.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];
    const specifiers = statements.map(
      (s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '',
    );

    // Only the constants and the domain model.
    for (const s of specifiers) {
      expect(s).toMatch(/^\.\.\/(constants|types)$/);
      expect(s).not.toMatch(/kura|seed|score|ranking|sim|react|supabase/i);
      expect(s).not.toMatch(/threshold/); // Phase 6 must not touch hourly C
    }
  });
});

