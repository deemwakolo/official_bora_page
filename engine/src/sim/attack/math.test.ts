/**
 * BORA Engine — Phase 17: mathematical edge attacks
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every locked boundary is attacked directly against the engine. Nothing here
 * reimplements an engine formula: expected values are read from the modules
 * that own them, and properties are asserted from their OUTPUT.
 *
 * This file may fail. Its job is to find out whether the engine keeps its
 * promises, not to agree with them.
 */

import { describe, it, expect } from 'vitest';
import { calculateHourlyC } from '../../engine/votes/threshold';
import { emptyBucket } from '../../engine/bucket';
import { addUpvotes, addDownvotes } from '../../engine/k';
import { getActiveWindow, selectActive, sumActiveC, isHourInWindow } from '../../engine/window/hours';
import { evaluatePlatformPoints } from '../../engine/platform/points';
import { seedCPerHour, seedHourlyRunway, MAX_SEED_FIXTURE_TOTAL } from '../../engine/seed/seed';
import { externalStrength } from '../../engine/seed/external';
import { createSeedRunway, rolloverHour } from '../../engine/rollover/rollover';
import {
  C_MAX,
  C_WINDOW_HOURS,
  PLATFORM_WINDOW_HOURS,
} from '../../engine/constants';
import type { HourIndex, VoteBucket, PlatformObservation } from '../../engine/types';
import type { EngineState } from '../../engine/rollover/rollover';

const H = 9000 as HourIndex;
const hour = (n: number) => n as HourIndex;

function bucketAt(at: number, upvotes: number, downvotes = 0): VoteBucket {
  return { ...emptyBucket(hour(at)), upvotes, downvotes };
}

function unwrap<T>(
  r: { ok: true; value: T } | { ok: false; error: { message: string } },
): T {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

// ═══════════════════════════════════════════════════════════════════════════
// 17.1 — C BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.1: C boundaries', () => {
  const UPVOTE_ATTACKS = [0, 1, 2, 3, 4, 5, 6, 50, 1000, 1e6, 2 ** 31];
  const DOWNVOTE_ATTACKS = [0, 1, 2, 3, 4, 5, 6, 50, 1000, 2 ** 31];

  it('never produces a negative or over-maximum C for any vote pair', () => {
    for (const up of UPVOTE_ATTACKS) {
      for (const down of DOWNVOTE_ATTACKS) {
        const c = unwrap(calculateHourlyC(bucketAt(H, up, down)));
        expect(Number.isFinite(c), `up=${up} down=${down}`).toBe(true);
        expect(c, `up=${up} down=${down}`).toBeGreaterThanOrEqual(0);
        expect(c, `up=${up} down=${down}`).toBeLessThanOrEqual(C_MAX);
      }
    }
  });

  it('reaches the full lattice {0, 0.5, 1, 1.5, 2} and nothing else', () => {
    const seen = new Set<number>();
    for (const up of UPVOTE_ATTACKS) {
      for (const down of DOWNVOTE_ATTACKS) {
        seen.add(unwrap(calculateHourlyC(bucketAt(H, up, down))));
      }
    }
    for (const c of seen) {
      expect([0, 0.5, 1, 1.5, 2]).toContain(c);
    }
    // Every lattice point is actually reachable, so none is dead.
    for (const c of [0, 0.5, 1, 1.5, 2]) {
      expect(seen.has(c), `lattice point ${c} unreachable`).toBe(true);
    }
  });

  it('floors at zero rather than going negative under heavy downvoting', () => {
    // 0 upvotes with 5 downvotes would be C -1 without the contractual floor.
    expect(unwrap(calculateHourlyC(bucketAt(H, 0, 5)))).toBe(0);
    expect(unwrap(calculateHourlyC(bucketAt(H, 0, 2 ** 31)))).toBe(0);
  });

  it('is unaffected by any additional above-threshold volume', () => {
    // The tiers are flat: 5 and 5 000 upvotes are the same C.
    const base = unwrap(calculateHourlyC(bucketAt(H, 5, 0)));
    for (const up of [6, 7, 100, 1e6, 2 ** 31]) {
      expect(unwrap(calculateHourlyC(bucketAt(H, up, 0)))).toBe(base);
    }
  });

  it('rejects a corrupt bucket instead of coercing it', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      const r = calculateHourlyC(bucketAt(H, bad, 0));
      expect(r.ok, `upvotes=${bad}`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.2 — K ATTACKS
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.2: K attacks', () => {
  it('accumulates across many additions', () => {
    let k = 0;
    for (let i = 0; i < 1000; i++) {
      k = unwrap(addUpvotes(k, 3));
    }
    expect(k).toBe(3000);
  });

  it('never lets a downvote reduce K', () => {
    const k = unwrap(addUpvotes(500, 0));
    const after = unwrap(addDownvotes(k, 10_000));
    expect(after).toBe(k);
  });

  it('accepts zero K and preserves it', () => {
    expect(unwrap(addUpvotes(0, 0))).toBe(0);
  });

  it('handles large but valid values', () => {
    expect(unwrap(addUpvotes(1, 2 ** 40))).toBe(2 ** 40 + 1);
  });

  it('rejects a negative or fractional K rather than clamping it', () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = addUpvotes(bad, 1);
      expect(r.ok, `k=${bad}`).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_K');
    }
  });

  it('rejects a negative or fractional vote count', () => {
    for (const bad of [-1, 2.5, Number.NaN]) {
      expect(addUpvotes(0, bad).ok, `n=${bad}`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.3 — 72-HOUR WINDOW BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.3: 72-hour window boundaries', () => {
  const w = unwrap(getActiveWindow(H));

  it('includes H-71 and H, and excludes H-72 and H+1', () => {
    expect(isHourInWindow(hour(H - 71), w)).toBe(true);
    expect(isHourInWindow(hour(H), w)).toBe(true);
    expect(isHourInWindow(hour(H - 72), w)).toBe(false);
    expect(isHourInWindow(hour(H + 1), w)).toBe(false);
  });

  it('spans exactly 72 clock hours regardless of how many records exist', () => {
    expect(w.hours).toBe(C_WINDOW_HOURS);
    expect(w.startHour).toBe(hour(H - 71));
    expect(w.endHour).toBe(H);

    // A single stored record still yields a 72-hour window.
    expect(unwrap(selectActive([bucketAt(H, 5)], w))).toHaveLength(1);
    expect(w.hours).toBe(72);
  });

  it('treats missing hours as zero activity', () => {
    // Only hour H has a record; the other 71 hours contribute nothing.
    expect(unwrap(sumActiveC([bucketAt(H, 5)], H))).toBe(2);
  });

  it('ignores expired, ancient, and future records alike', () => {
    const buckets = [
      bucketAt(H - 72, 5), // expired
      bucketAt(H - 500, 5), // ancient
      bucketAt(H + 1, 5), // future
      bucketAt(H, 5), // the only active hour
    ];
    expect(unwrap(sumActiveC(buckets, H))).toBe(2);
  });

  it('accepts records in any order and still selects the same set', () => {
    const buckets = [bucketAt(H - 3, 5), bucketAt(H, 5), bucketAt(H - 10, 1)];
    const forward = unwrap(selectActive(buckets, w)).map((b) => b.hourIndex);
    const reversed = unwrap(selectActive([...buckets].reverse(), w)).map((b) => b.hourIndex);
    expect(reversed).toEqual(forward);
    // And they come back chronologically.
    expect(forward).toEqual([...forward].sort((a, b) => a - b));
  });

  it('rejects a duplicate hour index rather than double counting it', () => {
    const r = selectActive([bucketAt(H, 5), bucketAt(H, 5)], w);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('does not delete an expired record when it falls out of the window', () => {
    const state = {
      referenceHour: H,
      songs: [
        {
          songId: 'A',
          lifecycle: 'ACTIVE' as const,
          k: 0,
          persistentKura: 0,
          buckets: [bucketAt(H - 500, 5), bucketAt(H, 5)],
          seedHours: [],
          platform: { youtube: [], spotify: [], boomplay: [] },
        },
      ],
    };
    const rolled = unwrap(rolloverHour(state, H));
    // The ancient record survives the transition untouched.
    expect(rolled.state.songs[0].buckets).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.4 — PLATFORM WINDOW AND WEIGHT BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.4: platform boundaries', () => {
  function obs(at: number, platform: PlatformObservation['platform'], value: number): PlatformObservation {
    return { hourIndex: hour(at), platform, value, source: 'IN_CHART', lifecycle: 'ACTIVE', version: 0 };
  }

  function chart(series: Record<string, PlatformObservation[]>) {
    return unwrap(
      evaluatePlatformPoints(
        Object.keys(series).map((id) => ({
          id,
          observations: {
            youtube: series[id] ?? [],
            spotify: [],
            boomplay: [],
          },
        })),
        H,
      ),
    );
  }

  it('spans exactly 168 clock hours', () => {
    // The 7-day window boundary is what decides inclusion.
    const inside = chart({ a: [obs(H - PLATFORM_WINDOW_HOURS + 1, 'youtube', 100)] });
    const outside = chart({ a: [obs(H - PLATFORM_WINDOW_HOURS, 'youtube', 100)] });

    expect(inside.allocatedTotals.youtube).toBe(30);
    // Exactly 168 hours back is the first EXCLUDED hour.
    expect(outside.allocatedTotals.youtube).toBe(0);
  });

  it('awards the whole YouTube weight to a sole active platform', () => {
    const c = chart({ a: [obs(H, 'youtube', 1)] });
    expect(c.allocatedTotals.youtube).toBe(30);
  });

  it('splits a platform between competitors in proportion to activity', () => {
    const c = chart({
      a: [obs(H, 'youtube', 300)],
      b: [obs(H, 'youtube', 100)],
    });
    const a = c.entries.find((e) => e.songId === 'a');
    const b = c.entries.find((e) => e.songId === 'b');
    if (!a || !b) throw new Error('missing entry');
    expect(a.yt + b.yt).toBeCloseTo(30, 9);
    expect(a.yt).toBeGreaterThan(b.yt);
    // A song with no activity on a platform earns exactly zero there.
    expect(b.activeYouTube).toBe(100);
  });

  it('gives an entirely idle platform zero and never redistributes its weight', () => {
    const c = chart({ a: [obs(H, 'youtube', 500)] });
    expect(c.allocatedTotals.spotify).toBe(0);
    expect(c.allocatedTotals.boomplay).toBe(0);
    // The unused 15 + 5 are simply not awarded to anyone.
    expect(c.allocatedTotals.youtube + c.allocatedTotals.spotify + c.allocatedTotals.boomplay)
      .toBe(30);
  });

  it('survives extreme imbalance without producing a non-finite point', () => {
    const c = chart({
      a: [obs(H, 'youtube', 1e12)],
      b: [obs(H, 'youtube', 1)],
    });
    for (const e of c.entries) {
      expect(Number.isFinite(e.yt)).toBe(true);
      expect(e.yt).toBeGreaterThanOrEqual(0);
      expect(e.yt).toBeLessThanOrEqual(30);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.5 — SEED ATTACKS
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.5: seed attacks', () => {
  it('rejects a negative or non-finite seeded hour value', () => {
    // Phase 20R: `seedC(p, T_C)` was removed, so this suite now attacks the
    // remaining fixture primitive — the per-hour validity gate.
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = seedCPerHour(bad);
      expect(r.ok, `seed=${bad}`).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
    }
  });

  it('manufactures no activity from a zero seed', () => {
    expect(unwrap(seedCPerHour(0))).toBe(0);
    const runway = unwrap(seedHourlyRunway(0));
    for (const value of runway) expect(value).toBe(0);
  });

  it('handles a tiny and a large valid seed without overflowing', () => {
    // Phase 22: the fixture TOTAL is bounded at MAX_SEED_FIXTURE_TOTAL = 72 * 2 =
    // 144, which is exactly the condition under which every per-hour share lands
    // inside the canonical seed domain [0, C_MAX]. 1e12 was accepted under the old
    // unbounded "finite and non-negative" domain; it is now out of domain, which
    // is the ruling working as intended rather than a regression.
    expect(Number.isFinite(unwrap(seedCPerHour(1e-9)))).toBe(true);
    expect(Number.isFinite(unwrap(seedCPerHour(MAX_SEED_FIXTURE_TOTAL)))).toBe(true);
    expect(seedCPerHour(MAX_SEED_FIXTURE_TOTAL + 1).ok).toBe(false);
  });

  it('produces exactly 72 equal hourly values', () => {
    const runway = unwrap(seedHourlyRunway(72));
    expect(runway).toHaveLength(72);
    const first = runway[0];
    for (const value of runway) {
      expect(value).toBe(first);
    }
    // And the per-hour value is the total spread across the runway.
    expect(first * 72).toBeCloseTo(72, 9);
  });

  it('rejects a corrupt seed total before spreading it', () => {
    for (const bad of [-1, Number.NaN]) {
      expect(seedCPerHour(bad).ok, `seedC=${bad}`).toBe(false);
      expect(seedHourlyRunway(bad).ok, `seedC=${bad}`).toBe(false);
    }
  });

  it('places 72 explicitly indexed hours, and nothing beyond them', () => {
    const runway = unwrap(createSeedRunway(72, H));
    expect(runway).toHaveLength(72);

    const hours = runway.map((r) => r.hourIndex as number);
    expect(hours[0]).toBe(H);
    expect(hours[71]).toBe(H + 71);
    // Contiguous, ascending, and hour 73 does not exist.
    for (let i = 1; i < hours.length; i++) {
      expect(hours[i]).toBe(hours[i - 1] + 1);
    }
    expect(hours).not.toContain(H + 72);

    for (const record of runway) {
      expect(record.source).toBe('SEED');
      expect(Number.isFinite(record.c)).toBe(true);
      expect(record.c).toBeGreaterThanOrEqual(0);
    }
  });

  it('computes E = 0 for an all-zero external input and rejects E >= 1', () => {
    expect(unwrap(externalStrength({ youtube: 0, spotify: 0, boomplay: 0 }))).toBe(0);

    for (const bad of [{ youtube: 1, spotify: 0, boomplay: 0 }]) {
      const r = externalStrength(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_EXTERNAL_INPUT');
    }
  });

  it('rejects an external input outside [0, 1)', () => {
    for (const bad of [-0.1, 1, 1.5, Number.NaN]) {
      const r = externalStrength({ youtube: bad, spotify: 0, boomplay: 0 });
      expect(r.ok, `youtube=${bad}`).toBe(false);
    }
  });

  it('CONFIRMS: a partially-covering runway contributes only its own hours', () => {
    // D1 REPAIR. This test originally CHARACTERISED the defect and asserted
    // totalActiveC === 73. It now pins the repaired contract.
    //
    // A runway created at H covers H…H+71, but the active window at H is
    // H-71…H. Only hour H of the runway is inside that window, and an actual
    // bucket already speaks for H.
    //
    // Locked D1 precedence therefore yields exactly the actual hour:
    //   1. ACTUAL record at H → C 2, seed suppressed
    //   2. every other window hour has no seed record → 0
    const runway = unwrap(createSeedRunway(72, H));
    const state: EngineState = {
      referenceHour: H,
      songs: [
        {
          songId: 'S',
          lifecycle: 'ACTIVE',
          k: 0,
          persistentKura: 0,
          buckets: [bucketAt(H, 5)], // actual C 2 at the one seeded hour
          seedHours: runway,
          platform: { youtube: [], spotify: [], boomplay: [] },
        },
      ],
    };
    const rolled = unwrap(rolloverHour(state, H));

    // Exactly C 2 — NOT 73, and NOT 72 (the pre-repair scalar overlay).
    expect(rolled.chartAtClosedHour.totalActiveC).toBe(2);
    expect(rolled.chartAtClosedHour.totalActiveC).not.toBe(73);
    expect(rolled.chartAtClosedHour.totalActiveC).not.toBe(72);
  });

  it('CONFIRMS: a runway covering the whole window does not over-apply', () => {
    // Control case. A runway placed so that it fills the ENTIRE window is
    // projected correctly, because every window hour genuinely has a record.
    const start = hour(H - 71);
    const runway = unwrap(createSeedRunway(72, start as HourIndex));
    const state: EngineState = {
      referenceHour: H,
      songs: [
        {
          songId: 'S',
          lifecycle: 'ACTIVE',
          k: 0,
          persistentKura: 0,
          buckets: [],
          seedHours: runway,
          platform: { youtube: [], spotify: [], boomplay: [] },
        },
      ],
    };
    const rolled = unwrap(rolloverHour(state, H));
    // 72 seeded hours × C 1, and no hour is overstated.
    expect(rolled.chartAtClosedHour.totalActiveC).toBe(72);
  });

  it('CONFIRMS: actual-over-seed still prevents addition at the same hour', () => {
    // Independent of the projection finding above, the locked precedence rule
    // itself holds: an actual hour is C 2, never C 2 + C 1.
    const runway = unwrap(createSeedRunway(72, hour(H - 71)));
    const state: EngineState = {
      referenceHour: H,
      songs: [
        {
          songId: 'S',
          lifecycle: 'ACTIVE',
          k: 0,
          persistentKura: 0,
          buckets: [bucketAt(H, 5)],
          seedHours: runway,
          platform: { youtube: [], spotify: [], boomplay: [] },
        },
      ],
    };
    const rolled = unwrap(rolloverHour(state, H));

    // 71 seeded hours × 1 plus C 2 at the hour that has a bucket.
    // The absence of any C 3 proves the seed was suppressed, not added.
    expect(rolled.chartAtClosedHour.totalActiveC).toBe(71 + 2);
    expect(rolled.chartAtClosedHour.totalActiveC).toBeLessThan(72 + 2);
  });

  it('does not regenerate or extend a runway across rollovers', () => {
    const runway = unwrap(createSeedRunway(72, H));
    let state: EngineState = {
      referenceHour: H,
      songs: [
        {
          songId: 'S',
          lifecycle: 'ACTIVE',
          k: 0,
          persistentKura: 0,
          buckets: [],
          seedHours: runway,
          platform: { youtube: [], spotify: [], boomplay: [] },
        },
      ],
    };

    for (let h = H; h < H + 5; h++) {
      const rolled = unwrap(rolloverHour(state, h));
      // Exactly the records that went in, unchanged.
      expect(JSON.stringify(rolled.state.songs[0].seedHours)).toBe(JSON.stringify(runway));
      state = rolled.state;
    }
  });
});