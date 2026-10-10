/**
 * BORA Engine — D1 repair regression suite
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seed coverage is HOURLY. For every requested hour the locked precedence is:
 *
 *   1. an ACTUAL record exists for this EXACT hour → use it, including C = 0
 *   2. else a SEED record exists for this EXACT hour → use that value
 *   3. else                                           → 0
 *
 * These tests pin each clause of that contract, including the specific failure
 * that motivated the repair: a one-hour runway must contribute to ONE hour, not
 * to all 72.
 *
 * The D1 defect was found in Phase 17 as `totalActiveC === 73` where 2 was
 * expected. That exact observation is preserved below as a regression guard.
 */

import { describe, it, expect } from 'vitest';
import { evaluateChart, resolveHourlyC } from '../engine/evaluation/chart';
import { rolloverHour, createSeedRunway } from '../engine/rollover/rollover';
import { emptyBucket } from '../engine/bucket';
import { getActiveWindow } from '../engine/window/hours';
import { C_WINDOW_HOURS, C_MAX } from '../engine/constants';
import type { HourIndex, VoteBucket, HourlyCRecord } from '../engine/types';
import type { EngineSong } from '../engine/evaluation/chart';
import type { EngineState, RolloverSong } from '../engine/rollover/rollover';

const H = 9000 as HourIndex;
const hour = (n: number) => n as HourIndex;

/** The active window at H is H-71 … H inclusive. */
const WINDOW_START = H - (C_WINDOW_HOURS - 1);

function unwrap<T>(
  r: { ok: true; value: T } | { ok: false; error: { message: string } },
): T {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/** One SEED record on an exact clock hour. */
function seed(
  at: number,
  c: number,
  lifecycle: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE',
): HourlyCRecord {
  return { hourIndex: hour(at), c, source: 'SEED', lifecycle, version: 0 };
}

/** An ACTUAL record on an exact clock hour, expressed as a vote bucket. */
function actual(at: number, upvotes: number): VoteBucket {
  return { ...emptyBucket(hour(at)), upvotes };
}

function engineSong(
  buckets: readonly VoteBucket[],
  seedHours: readonly HourlyCRecord[],
): EngineSong {
  return {
    songId: 'S',
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura: 0,
    buckets,
    seedHours,
    platform: { youtube: [], spotify: [], boomplay: [] },
  };
}

/** Resolve every hour of the active window at H for one song. */
function resolve(song: EngineSong) {
  return unwrap(resolveHourlyC(song, unwrap(getActiveWindow(H))));
}

/** Sum resolved C across the window — the same sum the evaluator performs. */
function totalC(song: EngineSong): number {
  return resolve(song).reduce((acc, h) => acc + (h.actualC ?? h.seedC ?? 0), 0);
}

// ── D1-A ───────────────────────────────────────────────────────────────────

describe('D1-A: one seed hour inside a 72-hour window', () => {
  it('contributes only that exact hour', () => {
    const song = engineSong([], [seed(H, 1.5)]);
    expect(totalC(song)).toBe(1.5);

    const seeded = resolve(song).filter((h) => h.source === 'SEED');
    expect(seeded).toHaveLength(1);
    expect(seeded[0].hourIndex).toBe(H);
    expect(seeded[0].seedC).toBe(1.5);
  });
});

// ── D1-B ───────────────────────────────────────────────────────────────────

describe('D1-B: two non-contiguous seed hours', () => {
  it('contributes exactly those two hours', () => {
    const song = engineSong([], [seed(H - 10, 2), seed(H - 40, 0.5)]);
    expect(totalC(song)).toBe(2.5);

    const seeded = resolve(song).filter((h) => h.source === 'SEED');
    expect(seeded.map((h) => h.hourIndex)).toEqual([H - 40, H - 10]);
    // Every other hour in the window is explicitly NONE.
    expect(resolve(song).filter((h) => h.source === 'NONE')).toHaveLength(C_WINDOW_HOURS - 2);
  });
});

// ── D1-C ───────────────────────────────────────────────────────────────────

describe('D1-C: runway begins before the active window', () => {
  it('contributes only the intersection with the window', () => {
    // 100 seeded hours starting before the window; only 72 can possibly count.
    const start = WINDOW_START - 28;
    const all = Array.from({ length: 100 }, (_, i) => seed(start + i, 1));

    const song = engineSong([], all);
    expect(totalC(song)).toBe(C_WINDOW_HOURS);
    expect(resolve(song).filter((h) => h.source === 'SEED')).toHaveLength(C_WINDOW_HOURS);
  });
});

// ── D1-D ───────────────────────────────────────────────────────────────────

describe('D1-D: runway ends before the active window ends', () => {
  it('contributes zero after the runway, unless actual data exists', () => {
    // Only the first 3 hours of the window are seeded.
    const song = engineSong(
      [actual(H - 68, 5)], // an ACTUAL hour where the runway has ended
      [seed(WINDOW_START, 1), seed(WINDOW_START + 1, 1), seed(WINDOW_START + 2, 1)],
    );

    // 3 seeded hours × 1 + 1 actual hour × C 2, and nothing after.
    expect(totalC(song)).toBe(3 + 2);

    expect(resolve(song).filter((h) => h.source === 'SEED')).toHaveLength(3);
    // The runway's end does NOT stretch — the rest of the window is NONE.
    expect(resolve(song).filter((h) => h.source === 'NONE')).toHaveLength(C_WINDOW_HOURS - 4);
  });
});

// ── D1-E / D1-F ────────────────────────────────────────────────────────────

describe('D1-E: actual C = 0 where a seed exists', () => {
  it('suppresses the seed for that exact hour', () => {
    // A zero-vote bucket is a REAL measurement of zero, not an absence.
    const song = engineSong([actual(H, 0)], [seed(H, 2)]);

    const atH = resolve(song).find((h) => h.hourIndex === H);
    expect(atH?.actualC).toBe(0);
    expect(atH?.seedC).toBeNull();
    expect(atH?.source).toBe('ACTUAL');
    expect(totalC(song)).toBe(0);
  });
});

describe('D1-F: actual C > 0 where a seed exists', () => {
  it('replaces the seed for that exact hour, never adds to it', () => {
    const song = engineSong([actual(H, 5)], [seed(H, 1)]);

    const atH = resolve(song).find((h) => h.hourIndex === H);
    expect(atH?.actualC).toBe(C_MAX);
    expect(atH?.seedC).toBeNull();
    // C 2, never C 2 + 1.
    expect(totalC(song)).toBe(C_MAX);
  });
});

// ── D1-G / D1-H ────────────────────────────────────────────────────────────

describe('D1-G: neither actual nor seed', () => {
  it('resolves to zero with source NONE', () => {
    const song = engineSong([], []);
    const hours = resolve(song);
    expect(hours).toHaveLength(C_WINDOW_HOURS);
    for (const h of hours) {
      expect(h.actualC).toBeNull();
      expect(h.seedC).toBeNull();
      expect(h.source).toBe('NONE');
    }
    expect(totalC(song)).toBe(0);
  });
});

describe('D1-H: a full 72-hour runway', () => {
  it('contributes all 72 explicitly represented hours', () => {
    const runway = unwrap(createSeedRunway(72, hour(WINDOW_START)));
    expect(runway).toHaveLength(72);

    const song = engineSong([], runway);
    const hours = resolve(song);
    expect(hours.filter((h) => h.source === 'SEED')).toHaveLength(72);
    expect(hours.filter((h) => h.source === 'NONE')).toHaveLength(0);
    // Every one of the 72 hours is individually represented.
    expect(new Set(hours.map((h) => h.hourIndex)).size).toBe(72);
  });
});

// ── D1-I ───────────────────────────────────────────────────────────────────

describe('D1-I: a one-hour runway', () => {
  it('with C = 2 contributes exactly 2 — not 72 × 1, not an overlay', () => {
    const song = engineSong([], [seed(H, 2)]);

    // THE REGRESSION GUARD. Before the repair this evaluated to 72, because the
    // scalar was applied to every unresolved hour. The contract says: one hour.
    expect(totalC(song)).toBe(2);

    // Explicitly not the old failure modes:
    expect(totalC(song)).not.toBe(C_WINDOW_HOURS * 1);
    expect(totalC(song)).not.toBe(C_WINDOW_HOURS * 2);
    expect(resolve(song).filter((h) => h.source === 'SEED')).toHaveLength(1);
  });

  it('THE PHASE 17 OBSERVATION: totalActiveC is 2, not 73', () => {
    // Reproduces the original D1 scenario end-to-end: a runway created at H
    // whose only in-window hour (H) already has a real bucket.
    const base = (over: Partial<RolloverSong> = {}): RolloverSong => ({
      songId: 'S',
      lifecycle: 'ACTIVE',
      k: 0,
      persistentKura: 0,
      buckets: [],
      seedHours: [],
      platform: { youtube: [], spotify: [], boomplay: [] },
      ...over,
    });

    const state: EngineState = {
      referenceHour: H,
      songs: [
        base({ seedHours: unwrap(createSeedRunway(72, H)), buckets: [actual(H, 5)] }),
      ],
    };

    const rolled = unwrap(rolloverHour(state, H));

    // BEFORE the repair: 73  ( = 71 unresolved hours × 1 + C 2 actual )
    // AFTER  the repair: 2   ( = the actual hour only; the seed adds nothing )
    expect(rolled.chartAtClosedHour.totalActiveC).toBe(2);
    expect(rolled.chartAtClosedHour.totalActiveC).not.toBe(73);
  });
});

// ── D1-J: deterministic provenance ─────────────────────────────────────────

describe('D1-J: provenance is preserved, never inferred from the value', () => {
  it('keeps ACTUAL-0, SEED-0 and NONE mutually distinguishable', () => {
    const song = engineSong([actual(H, 0)], [seed(H - 1, 0)]);
    const hours = resolve(song);

    const actualZero = hours.find((h) => h.hourIndex === H);
    const seedZero = hours.find((h) => h.hourIndex === H - 1);
    const none = hours.find((h) => h.hourIndex === H - 2);

    // All three resolve to a numeric C of 0, but provenance separates them.
    expect(actualZero?.actualC).toBe(0);
    expect(actualZero?.seedC).toBeNull();
    expect(actualZero?.source).toBe('ACTUAL');

    expect(seedZero?.actualC).toBeNull();
    expect(seedZero?.seedC).toBe(0);
    expect(seedZero?.source).toBe('SEED');

    expect(none?.actualC).toBeNull();
    expect(none?.seedC).toBeNull();
    expect(none?.source).toBe('NONE');
  });

  it('rejects a duplicated seed hour rather than double counting it', () => {
    const song = engineSong([], [seed(H, 1), seed(H, 1)]);
    expect(resolveHourlyC(song, unwrap(getActiveWindow(H))).ok).toBe(false);
  });

  it('ignores an ARCHIVED seed record while retaining it in the timeline', () => {
    const song = engineSong([], [seed(H, 5, 'ARCHIVED')]);

    // An archived record has left the timeline, so it contributes nothing…
    expect(totalC(song)).toBe(0);
    // …but it is still present and was never deleted (Contract 11).
    expect(song.seedHours).toHaveLength(1);
    expect(song.seedHours[0].lifecycle).toBe('ARCHIVED');
  });

  it('evaluates a chart whose seed coverage is a strict subset of the window', () => {
    const song = engineSong([], [seed(H - 5, 1.5), seed(H, 0.5)]);
    const chart = unwrap(evaluateChart({ songs: [song], referenceHour: H, closedHourC: null }));
    expect(chart.totalActiveC).toBe(2);
    expect(chart.active[0].activeC).toBe(2);
  });

  it('never rejects a non-uniform runway as unrepresentable', () => {
    // Before the repair, a runway whose in-window values differed could not be
    // expressed as Phase 14's scalar and was REJECTED as INVALID_MEASUREMENT.
    // That was valid data being refused; it must now evaluate normally.
    const song = engineSong([], [seed(H - 1, 0.5), seed(H, 2)]);
    const chart = unwrap(evaluateChart({ songs: [song], referenceHour: H, closedHourC: null }));
    expect(chart.totalActiveC).toBe(2.5);
  });
});