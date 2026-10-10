/**
 * BORA Engine — whole-engine evaluation tests (Phase 14)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   E-B  basic composition across all phases
 *   E-V  Vault isolation (exclusion, never reset)
 *   E-H  historical retention
 *   E-R  restore eligibility
 *   E-C  composition correctness vs direct module calls
 *   E-Z  zero active C (Phase 8 contract)
 *   E-S  seeded actual-vs-seed seam
 *   E-P  determinism, immutability, property tests
 *   E-G  structural: orchestration, not duplicated mathematics
 */

import { describe, it, expect } from 'vitest';
import { evaluateChart, resolveHourlyC } from './chart';
import { emptyBucket } from '../bucket';
import { getActiveWindow } from '../window/hours';
import { evaluateActiveDistribution } from '../kura/distribution';
import { updatePersistentKura } from '../kura/persistent';
import { evaluatePlatformPoints } from '../platform/points';
import { calculateBoraScore } from '../score/boraScore';
import { rankSongs } from '../ranking/ranking';
import { createActiveSong, vaultSong, restoreSong } from '../lifecycle/lifecycle';
import { KURA_TOTAL, C_WINDOW_HOURS, PLATFORM_WEIGHTS } from '../constants';
import type { EngineInput, EngineSong, ChartEvaluationResult } from './chart';
import type { VoteBucket, HourIndex, SongLifecycle, HourlyCRecord } from '../types';

const H = 5000 as HourIndex;
const hour = (n: number) => n as HourIndex;

/** n buckets ending at H, each with the given raw upvotes (5 ⇒ C 2). */
function buckets(hours: number, votes: number): VoteBucket[] {
  const out: VoteBucket[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    out.push({ ...emptyBucket(hour(H - i)), upvotes: votes });
  }
  return out;
}

function obsAt(
  platform: 'youtube' | 'spotify' | 'boomplay',
  value: number,
) {
  return {
    hourIndex: H,
    platform,
    value,
    source: 'IN_CHART' as const,
    lifecycle: 'ACTIVE' as const,
    version: 0,
  };
}

/**
 * Build explicit hour-indexed SEED records.
 *
 * D1 repair: a seed belongs to the exact clock hours it is placed on. Tests
 * therefore construct the coverage they mean instead of passing a scalar that
 * the engine would have had to guess the coverage of.
 */
function seedRecords(
  fromHour: number,
  hours: number,
  c: number,
  lifecycle: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE',
): HourlyCRecord[] {
  const out: HourlyCRecord[] = [];
  for (let i = 0; i < hours; i++) {
    out.push({
      hourIndex: (fromHour + i) as HourIndex,
      c,
      source: 'SEED',
      lifecycle,
      version: 0,
    });
  }
  return out;
}

function songAt(
  songId: string,
  opts: {
    lifecycle?: SongLifecycle;
    k?: number;
    persistentKura?: number;
    hours?: number;
    votes?: number;
    seedHours?: readonly HourlyCRecord[];
    platform?: { youtube?: number; spotify?: number; boomplay?: number };
  } = {},
): EngineSong {
  const p = opts.platform ?? {};
  return {
    songId,
    lifecycle: opts.lifecycle ?? 'ACTIVE',
    k: opts.k ?? 0,
    persistentKura: opts.persistentKura ?? 0,
    buckets: buckets(opts.hours ?? 5, opts.votes ?? 5),
    seedHours: opts.seedHours ?? [],
    platform: {
      youtube: [obsAt('youtube', p.youtube ?? 0)],
      spotify: [obsAt('spotify', p.spotify ?? 0)],
      boomplay: [obsAt('boomplay', p.boomplay ?? 0)],
    },
  };
}

function evaluate(input: EngineInput): ChartEvaluationResult {
  const r = evaluateChart(input);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function entryOf(result: ChartEvaluationResult, songId: string) {
  const e = result.active.find((x) => x.songId === songId);
  if (!e) throw new Error(`no entry for ${songId}`);
  return e;
}

/** Deterministic generator — no Math.random in the suite. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// ───────────────────────────────────────────────────────────────────────────

describe('E-B: basic composition', () => {
  it('evaluates a single active song', () => {
    const r = evaluate({
      songs: [songAt('a', { hours: 10, persistentKura: 20 })],
      referenceHour: H,
      closedHourC: null,
    });
    expect(r.active).toHaveLength(1);
    expect(r.ranked).toHaveLength(1);
    expect(r.totalActiveC).toBe(20); // 10 hours × C 2
  });

  it('evaluates multiple active songs and sums active C correctly', () => {
    const r = evaluate({
      songs: [songAt('a', { hours: 5 }), songAt('b', { hours: 3, votes: 1 })],
      referenceHour: H,
      closedHourC: null,
    });
    const a = entryOf(r, 'a');
    const b = entryOf(r, 'b');
    expect(a.activeC).toBe(10);
    expect(b.activeC).toBe(3); // 3 hours × C 1
    expect(r.totalActiveC).toBe(13);
    expect(r.totalActiveC).toBe(a.activeC + b.activeC);
  });

  it('uses Phase 8 for XP and fresh Kura', () => {
    const r = evaluate({
      songs: [songAt('a', { hours: 5 }), songAt('b', { hours: 5, votes: 1 })],
      referenceHour: H,
      closedHourC: null,
    });
    const a = entryOf(r, 'a');
    // 'a' = 5 hours × C 2 = 10, 'b' = 5 hours × C 1 = 5, so T_C = 15 and
    // XP_a = 10/15. The denominator is the whole ACTIVE population's C.
    expect(r.totalActiveC).toBe(15);
    expect(a.xp).toBeCloseTo(10 / 15, 12);
    expect(a.kuraFresh).toBeCloseTo((10 / 15) * KURA_TOTAL, 12);
    const sumXp = r.active.reduce((acc, e) => acc + e.xp, 0);
    expect(Math.abs(sumXp - 1)).toBeLessThanOrEqual(1e-9);
    const sumKura = r.active.reduce((acc, e) => acc + e.kuraFresh, 0);
    expect(Math.abs(sumKura - KURA_TOTAL)).toBeLessThanOrEqual(1e-9);
  });

  it('uses Phase 9 for the persistent Kura cycle when a closed hour is supplied', () => {
    const r = evaluate({
      songs: [songAt('a', { hours: 5, persistentKura: 10 })],
      referenceHour: H,
      closedHourC: 0,
    });
    const a = entryOf(r, 'a');
    expect(a.persistentKuraBefore).toBe(10);
    const expected = (10 + a.kuraFresh) * (1 - 0.0025);
    expect(a.persistentKuraNext).toBeCloseTo(expected, 12);
  });

  it('omits the Kura cycle when no closed hour is supplied', () => {
    const r = evaluate({
      songs: [songAt('a', { persistentKura: 10 })],
      referenceHour: H,
      closedHourC: null,
    });
    expect(entryOf(r, 'a').persistentKuraNext).toBeNull();
  });

  it('uses Phase 10 for platform points', () => {
    const r = evaluate({
      songs: [
        songAt('a', { platform: { youtube: 300, spotify: 100, boomplay: 50 } }),
        songAt('b', { platform: { youtube: 100, spotify: 300, boomplay: 50 } }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    expect(entryOf(r, 'a').platformPerformance.youtube).toBeCloseTo((300 / 400) * 30, 9);
    expect(entryOf(r, 'b').platformPerformance.spotify).toBeCloseTo((300 / 400) * 15, 9);
    expect(r.platformTotals.youtube).toBeCloseTo(30, 9);
    expect(r.platformTotals.spotify).toBeCloseTo(15, 9);
    expect(r.platformTotals.boomplay).toBeCloseTo(5, 9);
  });

  it('uses Phase 11 for the BORA Score (Kura + platform, never K)', () => {
    const r = evaluate({
      songs: [
        songAt('a', {
          persistentKura: 30,
          k: 9999,
          platform: { youtube: 100, spotify: 100, boomplay: 100 },
        }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    // A single song owns every platform ⇒ the full 30/15/5 = 50.
    const a = entryOf(r, 'a');
    expect(a.boraScore).toBe(30 + 50);
    // K = 9999 is deliberately enormous and must not appear anywhere.
    expect(a.boraScore).toBe(80);
  });

  it('uses Phase 12 for ranking', () => {
    const r = evaluate({
      songs: [
        songAt('low', { persistentKura: 1 }),
        songAt('high', { persistentKura: 100 }),
        songAt('mid', { persistentKura: 50 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    expect(r.ranked.map((e) => e.songId)).toEqual(['high', 'mid', 'low']);
    expect(r.ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
  });
});

describe('E-V: Vault isolation (exclusion, never reset)', () => {
  const activeOnly = () => evaluate({
    songs: [songAt('live', { hours: 5, persistentKura: 10 })],
    referenceHour: H,
    closedHourC: null,
  });

  it('excludes a Vaulted song from every active computation', () => {
    const withVaulted = evaluate({
      songs: [
        songAt('live', { hours: 5, persistentKura: 10 }),
        songAt('dead', { lifecycle: 'VAULT', hours: 50, persistentKura: 1_000_000 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });

    expect(withVaulted.active.map((e) => e.songId)).toEqual(['live']);
    expect(withVaulted.ranked.map((e) => e.songId)).toEqual(['live']);
    expect(withVaulted.excludedVaulted).toEqual(['dead']);
    // Its huge active C and Kura leave no trace.
    expect(withVaulted.totalActiveC).toBe(activeOnly().totalActiveC);
    expect(entryOf(withVaulted, 'live')).toEqual(entryOf(activeOnly(), 'live'));
  });

  it('does not let a Vaulted song with huge persistent Kura affect rankings', () => {
    const r = evaluate({
      songs: [
        songAt('a', { persistentKura: 5 }),
        songAt('b', { persistentKura: 50 }),
        songAt('whale', { lifecycle: 'VAULT', persistentKura: 1_000_000 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    // 'whale' would dominate every ranking if it were included.
    expect(r.ranked.map((e) => e.songId)).toEqual(['b', 'a']);
  });

  it('never zeroes a Vaulted song’s dormant persistent Kura', () => {
    const vaulted = songAt('dead', { lifecycle: 'VAULT', persistentKura: 1_000_000 });
    const r = evaluate({ songs: [vaulted], referenceHour: H, closedHourC: 0 });

    // Excluded entirely — no entry, and the input value is untouched.
    expect(r.active).toHaveLength(0);
    expect(r.ranked).toHaveLength(0);
    expect(vaulted.persistentKura).toBe(1_000_000);
  });

  it('keeps a Vaulted song’s K out of the active chart entirely', () => {
    const r = evaluate({
      songs: [
        songAt('a', { persistentKura: 10, k: 0 }),
        songAt('z', { lifecycle: 'VAULT', persistentKura: 0, k: 1_000_000 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    // 'z' has the larger K; if K were considered it would outrank 'a'.
    expect(r.ranked[0].songId).toBe('a');
  });

  it('treats a fully Vaulted chart as empty, not as an error', () => {
    const r = evaluate({
      songs: [
        songAt('x', { lifecycle: 'VAULT' }),
        songAt('y', { lifecycle: 'VAULT' }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    expect(r.active).toHaveLength(0);
    expect(r.totalActiveC).toBe(0);
    expect(r.excludedVaulted).toEqual(['x', 'y']);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-H: historical retention', () => {
  it('retains a Vaulted song in the engine input with K and history intact', () => {
    const vaulted: EngineSong = {
      ...songAt('dead', { lifecycle: 'VAULT', k: 123, persistentKura: 42.5 }),
      buckets: [emptyBucket(hour(H - 1))],
    };
    const snapshot = JSON.stringify(vaulted);

    const r = evaluate({ songs: [vaulted], referenceHour: H, closedHourC: null });

    // Present in input and still in the input array afterwards.
    expect(r.excludedVaulted).toEqual(['dead']);
    expect(JSON.stringify(vaulted)).toBe(snapshot);
    expect(vaulted.k).toBe(123);
    expect(vaulted.persistentKura).toBe(42.5);
    expect(vaulted.buckets).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-R: restore makes a song eligible again', () => {
  it('evaluates a restored song with K intact and persistent Kura from zero', () => {
    // Phase 13 state → restored via the real lifecycle operation.
    const created = createActiveSong('returner', 123, 42.5, [{ hour: 1 }]);
    if (!created.ok) throw new Error('setup failed');
    const vaulted = vaultSong({
      songId: created.value.songId,
      lifecycle: created.value.lifecycle,
      k: created.value.k,
      persistentKura: created.value.persistentKura,
      history: created.value.history,
    });
    if (!vaulted.ok) throw new Error('setup failed');
    const restored = restoreSong(vaulted.value.song);
    if (!restored.ok) throw new Error('setup failed');

    expect(restored.value.song.persistentKura).toBe(0);
    expect(restored.value.song.k).toBe(123);

    // Feed the restored state to the evaluator as ACTIVE.
    const asActive: EngineSong = {
      songId: restored.value.song.songId,
      lifecycle: 'ACTIVE',
      k: restored.value.song.k,
      persistentKura: restored.value.song.persistentKura,
      buckets: buckets(5, 5),
      seedHours: [],
      platform: { youtube: [], spotify: [], boomplay: [] },
    };

    const r = evaluate({ songs: [asActive], referenceHour: H, closedHourC: null });
    const e = entryOf(r, 'returner');
    expect(e.persistentKuraBefore).toBe(0);
    expect(e.activeC).toBe(10);
    expect(r.excludedVaulted).toEqual([]);
  });

  it('generates no seed for a restored song', () => {
    // Restore never seeds (Phase 13), so the evaluator receives no seed input
    // and must not manufacture one.
    const restoredSong = songAt('r', { persistentKura: 0 });
    expect(restoredSong.seedHours).toEqual([]);

    const r = evaluate({ songs: [restoredSong], referenceHour: H, closedHourC: null });
    // Active C comes purely from real votes; nothing was injected.
    expect(entryOf(r, 'r').activeC).toBe(10);
  });
});

describe('E-C: composition matches direct module calls', () => {
  it('agrees with Phase 5/8 for active C and total', () => {
    const songs = [songAt('a', { hours: 7 }), songAt('b', { hours: 4, votes: 1 })];
    const r = evaluate({ songs, referenceHour: H, closedHourC: null });

    const direct = evaluateActiveDistribution(
      songs.map((s) => ({ id: s.songId, buckets: s.buckets })),
      H,
    );
    if (!direct.ok) throw new Error(direct.error.message);

    expect(r.totalActiveC).toBe(direct.value.totalActiveC);
    expect(entryOf(r, 'a').activeC).toBe(direct.value.entries[0].activeC);
    expect(entryOf(r, 'b').activeC).toBe(direct.value.entries[1].activeC);
    expect(entryOf(r, 'a').xp).toBeCloseTo(direct.value.entries[0].xp, 12);
    expect(entryOf(r, 'a').kuraFresh).toBeCloseTo(direct.value.entries[0].kuraFresh, 12);
  });

  it('agrees with Phase 9 for the persistent Kura cycle', () => {
    const r = evaluate({
      songs: [songAt('a', { persistentKura: 25 })],
      referenceHour: H,
      closedHourC: 1.5,
    });
    const e = entryOf(r, 'a');
    const direct = updatePersistentKura(25, e.kuraFresh, 1.5);
    if (!direct.ok) throw new Error(direct.error.message);
    expect(e.persistentKuraNext).toBeCloseTo(direct.value, 12);
  });

  it('agrees with Phase 10 for platform points', () => {
    const songs = [
      songAt('a', { platform: { youtube: 300, spotify: 100, boomplay: 50 } }),
      songAt('b', { platform: { youtube: 100, spotify: 300, boomplay: 50 } }),
    ];
    const r = evaluate({ songs, referenceHour: H, closedHourC: null });

    const direct = evaluatePlatformPoints(
      songs.map((s) => ({ id: s.songId, observations: s.platform as never })),
      H,
    );
    if (!direct.ok) throw new Error(direct.error.message);

    expect(entryOf(r, 'a').platformPerformance.youtube).toBeCloseTo(
      direct.value.entries[0].yt,
      12,
    );
  });

  it('agrees with Phase 11 for the BORA Score', () => {
    const r = evaluate({
      songs: [
        songAt('a', { persistentKura: 7, platform: { youtube: 10, spotify: 5, boomplay: 2 } }),
        songAt('b', { platform: { youtube: 10, spotify: 5, boomplay: 2 } }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    const e = entryOf(r, 'a');
    const direct = calculateBoraScore(7, {
      songId: 'a',
      activeYouTube: 10,
      activeSpotify: 5,
      activeBoomplay: 2,
      yt: e.platformPerformance.youtube,
      sp: e.platformPerformance.spotify,
      bp: e.platformPerformance.boomplay,
      total: e.platformPerformance.youtube + e.platformPerformance.spotify + e.platformPerformance.boomplay,
    });
    if (!direct.ok) throw new Error(direct.error.message);
    expect(e.boraScore).toBeCloseTo(direct.value, 12);
  });

  it('agrees with Phase 12 for ranking', () => {
    const r = evaluate({
      songs: [
        songAt('a', { persistentKura: 5, k: 1 }),
        songAt('b', { persistentKura: 5, k: 9 }),
        songAt('c', { persistentKura: 9, k: 0 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    const direct = rankSongs(
      r.active.map((e) => ({
        songId: e.songId,
        boraScore: e.boraScore,
        k: e.songId === 'a' ? 1 : e.songId === 'b' ? 9 : 0,
        platformPoints: {
          youtube: e.platformPerformance.youtube,
          spotify: e.platformPerformance.spotify,
          boomplay: e.platformPerformance.boomplay,
        },
      })),
    );
    if (!direct.ok) throw new Error(direct.error.message);
    expect(r.ranked.map((e) => e.songId)).toEqual(direct.value.map((x) => x.songId));
  });

  it('does not apply platform weights twice', () => {
    const r = evaluate({
      songs: [songAt('solo', { platform: { youtube: 1000, spotify: 1000, boomplay: 1000 } })],
      referenceHour: H,
      closedHourC: null,
    });
    // A single song takes each platform's weight exactly once: 30/15/5.
    expect(entryOf(r, 'solo').platformPerformance.youtube).toBe(PLATFORM_WEIGHTS.youtube);
    expect(entryOf(r, 'solo').platformPerformance.spotify).toBe(PLATFORM_WEIGHTS.spotify);
    expect(entryOf(r, 'solo').platformPerformance.boomplay).toBe(PLATFORM_WEIGHTS.boomplay);
  });

  it('never includes K in the score', () => {
    const low = evaluate({ songs: [songAt('a', { persistentKura: 10, k: 0 })], referenceHour: H, closedHourC: null });
    const high = evaluate({ songs: [songAt('a', { persistentKura: 10, k: 999_999 })], referenceHour: H, closedHourC: null });
    // Identical persistent Kura and platform data ⇒ identical score.
    expect(entryOf(low, 'a').boraScore).toBe(entryOf(high, 'a').boraScore);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-Z: zero active C preserves the Phase 8 contract', () => {
  it('gives every active song XP = 0 and fresh Kura = 0', () => {
    const r = evaluate({
      songs: [songAt('a', { hours: 0, votes: 0 }), songAt('b', { hours: 5, votes: 0 })],
      referenceHour: H,
      closedHourC: null,
    });
    expect(r.totalActiveC).toBe(0);
    for (const e of r.active) {
      expect(e.xp).toBe(0);
      expect(e.kuraFresh).toBe(0);
      expect(Number.isNaN(e.xp)).toBe(false);
      expect(Number.isFinite(e.xp)).toBe(true);
      expect(Number.isFinite(e.kuraFresh)).toBe(true);
    }
  });

  it('still computes platform points independently', () => {
    const r = evaluate({
      songs: [songAt('a', { hours: 0, votes: 0, platform: { youtube: 10, spotify: 10, boomplay: 10 } })],
      referenceHour: H,
      closedHourC: null,
    });
    // Zero C does not suppress platform scoring (Phase 10 is independent).
    expect(r.platformTotals.youtube).toBe(30);
    expect(entryOf(r, 'a').xp).toBe(0);
  });

  // ── RATIFIED Phase 20R, R4 ──────────────────────────────────────────────────
  it('KEEPS a zero-C ACTIVE song in the population rather than dropping it', () => {
    // Population membership is decided by LIFECYCLE status, never by how much C
    // a song has accumulated. A zero-C song stays ranked, with zero
    // C-derived contribution and no artificial minimum.
    //
    // This assertion is deliberately count-based: the preceding test iterates
    // `r.active`, which would pass vacuously if zero-C songs were dropped.
    const r = evaluate({
      songs: [
        songAt('zero', { hours: 5, votes: 0 }),
        songAt('live', { hours: 5, votes: 40 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });

    expect(r.active).toHaveLength(2);

    const zero = entryOf(r, 'zero');
    expect(zero).toBeDefined();
    expect(zero.xp).toBe(0);
    expect(zero.kuraFresh).toBe(0);

    // The non-zero song still earns, so the zero song is present but last —
    // it is ranked, not removed and not given a floor.
    const live = entryOf(r, 'live');
    expect(live.xp).toBeGreaterThan(0);
  });

  it('excludes a VAULTED song regardless of C', () => {
    // The contrast that defines "active population": lifecycle decides, not C.
    // A Vaulted song with the highest C in the chart is still not evaluated.
    const r = evaluate({
      songs: [
        songAt('kept', { hours: 5, votes: 10 }),
        songAt('gone', { hours: 5, votes: 99, lifecycle: 'VAULT' }),
      ],
      referenceHour: H,
      closedHourC: null,
    });

    expect(r.active).toHaveLength(1);
    // `entryOf` throws when an entry is missing, so assert on the array itself.
    expect(r.active.map((e) => e.songId)).toEqual(['kept']);
    expect(entryOf(r, 'kept')).toBeDefined();
  });
});

describe('E-S: the actual-vs-seed seam (never actual + seed)', () => {
  it('uses actual C where votes exist and ignores the seed there', () => {
    // A full-window runway at C 1, so the ONLY variable under test is precedence.
    const song = songAt('s', {
      hours: 3,
      votes: 5,
      seedHours: seedRecords(H - C_WINDOW_HOURS + 1, C_WINDOW_HOURS, 1),
    });
    const window = getActiveWindow(H);
    if (!window.ok) throw new Error(window.error.message);

    const hours = resolveHourlyC(song, window.value);
    if (!hours.ok) throw new Error(hours.error.message);

    expect(hours.value).toHaveLength(C_WINDOW_HOURS);
    const withActual = hours.value.filter((h) => h.actualC !== null);
    expect(withActual).toHaveLength(3);
    for (const h of withActual) {
      // Actual is present AND the seed is suppressed for that same hour.
      expect(h.actualC).toBe(2);
      expect(h.seedC).toBeNull();
      expect(h.source).toBe('ACTUAL');
    }
  });

  it('applies the seed only to hours with no actual votes', () => {
    const song = songAt('s', {
      hours: 3,
      votes: 5,
      seedHours: seedRecords(H - C_WINDOW_HOURS + 1, C_WINDOW_HOURS, 1),
    });
    const window = getActiveWindow(H);
    if (!window.ok) throw new Error(window.error.message);
    const hours = resolveHourlyC(song, window.value);
    if (!hours.ok) throw new Error(hours.error.message);

    const seeded = hours.value.filter((h) => h.seedC !== null);
    expect(seeded).toHaveLength(C_WINDOW_HOURS - 3);
    for (const h of seeded) {
      expect(h.actualC).toBeNull();
      expect(h.seedC).toBe(1);
      expect(h.source).toBe('SEED');
    }
  });

  it('never sums actual and seed for the same hour', () => {
    const song = songAt('s', {
      hours: 3,
      votes: 5,
      seedHours: seedRecords(H - C_WINDOW_HOURS + 1, C_WINDOW_HOURS, 1),
    });
    const window = getActiveWindow(H);
    if (!window.ok) throw new Error(window.error.message);
    const hours = resolveHourlyC(song, window.value);
    if (!hours.ok) throw new Error(hours.error.message);

    for (const h of hours.value) {
      // Mutually exclusive by construction: never both non-null.
      expect(h.actualC !== null && h.seedC !== null).toBe(false);
      // Exactly one provenance per hour, always.
      const sources = [h.source === 'ACTUAL', h.source === 'SEED', h.source === 'NONE'];
      expect(sources.filter(Boolean)).toHaveLength(1);
    }
  });

  it('counts seeded C in the song’s active C', () => {
    // 3 actual hours (C 2 each = 6) + 69 seeded hours (C 1 each).
    const r = evaluate({
      songs: [
        songAt('s', {
          hours: 3,
          votes: 5,
          seedHours: seedRecords(H - C_WINDOW_HOURS + 1, C_WINDOW_HOURS, 1),
        }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    expect(entryOf(r, 's').activeC).toBe(6 + (C_WINDOW_HOURS - 3));
  });

  it('does not seed a song that carries no seed input', () => {
    const r = evaluate({
      songs: [songAt('s', { hours: 3, votes: 5 })],
      referenceHour: H,
      closedHourC: null,
    });
    expect(entryOf(r, 's').activeC).toBe(6);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-P: determinism, immutability, and property tests', () => {
  it('is deterministic for identical input', () => {
    const input: EngineInput = {
      songs: [songAt('a', { persistentKura: 5 }), songAt('b', { persistentKura: 1 })],
      referenceHour: H,
      closedHourC: 0,
    };
    const first = evaluate(input);
    for (let i = 0; i < 5; i++) {
      expect(evaluate(input)).toEqual(first);
    }
  });

  it('does not mutate engine input', () => {
    const songs = [songAt('a', { persistentKura: 10, k: 55 })];
    const input: EngineInput = { songs, referenceHour: H, closedHourC: 0 };
    const snapshot = JSON.stringify(input);

    evaluate(input);

    expect(JSON.stringify(input)).toBe(snapshot);
    expect(songs[0].persistentKura).toBe(10);
    expect(songs[0].k).toBe(55);
  });

  it('leaves nested hourly and platform histories unchanged', () => {
    const song = songAt('a', { hours: 10, platform: { youtube: 5, spotify: 5, boomplay: 5 } });
    const snapshot = JSON.stringify(song);
    evaluate({ songs: [song], referenceHour: H, closedHourC: 1 });
    expect(JSON.stringify(song)).toBe(snapshot);
  });

  it('does not commit the next persistent Kura back into state', () => {
    const song = songAt('a', { persistentKura: 10 });
    const r = evaluate({ songs: [song], referenceHour: H, closedHourC: 0 });
    const e = entryOf(r, 'a');
    // The next value is RETURNED, not written back.
    expect(e.persistentKuraNext).not.toBeNull();
    expect(song.persistentKura).toBe(10);
    expect(e.persistentKuraBefore).toBe(10);
  });

  it('rejects an invalid reference hour rather than inventing one', () => {
    const r = evaluateChart({
      songs: [songAt('a')],
      referenceHour: Number.NaN as HourIndex,
      closedHourC: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
  });

  it('rejects an out-of-range closedHourC', () => {
    for (const bad of [-1, 2.5, Number.NaN]) {
      const r = evaluateChart({ songs: [songAt('a')], referenceHour: H, closedHourC: bad });
      expect(r.ok, `closedHourC=${bad}`).toBe(false);
    }
  });

  it('produces identical output from permuted input', () => {
    const songs = [
      songAt('a', { persistentKura: 5 }),
      songAt('b', { persistentKura: 50 }),
      songAt('c', { lifecycle: 'VAULT', persistentKura: 999 }),
    ];
    const forward = evaluate({ songs, referenceHour: H, closedHourC: 0 });
    const reversed = evaluate({
      songs: [...songs].reverse(),
      referenceHour: H,
      closedHourC: 0,
    });
    expect(reversed.ranked.map((e) => e.songId)).toEqual(
      forward.ranked.map((e) => e.songId),
    );
  });

  it('holds the engine invariants across generated charts', () => {
    const rng = makeRng(555111);

    for (let chart = 0; chart < 100; chart++) {
      const size = 1 + Math.floor(rng() * 20);
      const songs: EngineSong[] = [];

      for (let i = 0; i < size; i++) {
        songs.push(
          songAt(`s${i}`, {
            lifecycle: rng() < 0.3 ? 'VAULT' : 'ACTIVE',
            k: Math.floor(rng() * 1000),
            persistentKura: Math.floor(rng() * 200),
            hours: Math.floor(rng() * 20),
            votes: Math.floor(rng() * 8),
            platform: {
              youtube: Math.floor(rng() * 500),
              spotify: Math.floor(rng() * 500),
              boomplay: Math.floor(rng() * 500),
            },
          }),
        );
      }

      const vaultedIds = songs
        .filter((s) => s.lifecycle === 'VAULT')
        .map((s) => s.songId);
      const snapshot = JSON.stringify(songs);
      const r = evaluate({ songs, referenceHour: H, closedHourC: rng() * 2 });

      // Active results contain EXACTLY the active population.
      expect(r.active.map((e) => e.songId)).toEqual(
        songs.filter((s) => s.lifecycle === 'ACTIVE').map((s) => s.songId),
      );
      // No Vaulted song anywhere in active or ranked output.
      for (const id of vaultedIds) {
        expect(r.active.find((e) => e.songId === id)).toBeUndefined();
        expect(r.ranked.find((e) => e.songId === id)).toBeUndefined();
      }
      expect([...r.excludedVaulted].sort()).toEqual([...vaultedIds].sort());

      expect(r.totalActiveC).toBeGreaterThanOrEqual(0);
      for (const e of r.active) {
        expect(e.activeC).toBeGreaterThanOrEqual(0);
        expect(e.xp).toBeGreaterThanOrEqual(0);
        expect(e.kuraFresh).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(e.boraScore)).toBe(true);
      }

      // Zero-total obeys the Phase 8 contract.
      if (r.totalActiveC === 0) {
        for (const e of r.active) {
          expect(e.xp).toBe(0);
          expect(e.kuraFresh).toBe(0);
        }
      } else {
        const sumXp = r.active.reduce((acc, e) => acc + e.xp, 0);
        expect(Math.abs(sumXp - 1)).toBeLessThanOrEqual(1e-9);
      }

      // Ranks contiguous in ranked order; input untouched.
      expect(r.ranked.map((e) => e.rank)).toEqual(r.ranked.map((_, i) => i + 1));
      expect(JSON.stringify(songs)).toBe(snapshot);
    }
  });
});

describe('E-G: structural — orchestration, not duplicated mathematics', () => {
  /** Executable source: comments stripped so documentation cannot trip scans. */
  async function bodyOf(file: string): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  }

  it('imports every upstream module it composes', async () => {
    const body = await bodyOf('./chart.ts');
    for (const mod of [
      '../window/hours',
      '../votes/threshold',
      '../seed/seed',
      '../kura/distribution',
      '../kura/persistent',
      '../platform/points',
      '../score/boraScore',
      '../ranking/ranking',
    ]) {
      expect(body, `missing import ${mod}`).toContain(mod);
    }
  });

  it('CALLS the upstream functions rather than redefining them', async () => {
    const body = await bodyOf('./chart.ts');
    for (const fn of [
      'calculateHourlyC(',
      'getActiveWindow(',
      'selectActive(',
      // Phase 22: the seeded-hourly-C validity gate is now `validateSeededHourlyC`,
      // the ONE authority chart evaluation and rollover both call. It replaced the
      // old `seedCPerHour(record.c * 72)` scalar round trip, which is no longer
      // part of production evaluation at all.
      'validateSeededHourlyC(',
      // Phase 8's distribution authority. Since the resolved-C primitive was
      // added, this layer supplies ALREADY-RESOLVED active C (actual C with the
      // seed standing in for unresolved hours), so `distributeActiveC` is the
      // correct entry point — `evaluateActiveDistribution` would discard the
      // seed by recomputing C from buckets alone.
      'distributeActiveC(',
      'updatePersistentKura(',
      'evaluatePlatformPoints(',
      'calculateBoraScore(',
      'rankSongs(',
    ]) {
      expect(body, `missing call ${fn}`).toContain(fn);
    }
  });

  it('does not bypass the resolved-C primitive with the bucket-only path', async () => {
    const body = await bodyOf('./chart.ts');
    // Calling `evaluateActiveDistribution` would re-derive C from vote buckets
    // and silently drop every seeded hour from the denominator.
    expect(body).not.toContain('evaluateActiveDistribution(');
  });

  it('contains no duplicated threshold, window, seed, decay, or comparator formula', async () => {
    const body = await bodyOf('./chart.ts');
    // Every one of these lives upstream; none may be reimplemented here.
    expect(body).not.toMatch(/\bupvoteContribution\(|\bdownvoteContribution\(/);
    expect(body).not.toMatch(/C_TIER|C_DOWN_TIER|UPVOTE_TIER|DOWNVOTE_TIER/);
    expect(body).not.toMatch(/0\.0025|\*\s*\(1\s*-\s*closedHourC/);
    expect(body).not.toMatch(/C_WINDOW_HOURS\s*-\s*1|PLATFORM_WINDOW_HOURS/);
    expect(body).not.toMatch(/\.sort\(|localeCompare|rank\s*-|\brank\s*\+/);
    // Platform weights are never re-applied.
    expect(body).not.toMatch(/PLATFORM_WEIGHTS\[[^\]]+\]\s*\*|\*\s*PLATFORM_WEIGHTS\./);
  });

  it('does not import simulation, UI, Supabase, React, or production BORA', async () => {
    const body = await bodyOf('./chart.ts');
    expect(body).not.toMatch(/from '.*\/sim|supabase|production/i);
    expect(body).not.toMatch(/react/i);
  });

  it('contains no clock, randomness, storage, network, or filesystem access', async () => {
    const body = await bodyOf('./chart.ts');
    expect(body).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(|XMLHttpRequest/);
    expect(body).not.toMatch(/\bglobalThis\b|\blocalStorage\b|node:/);
  });

  it('exposes only evaluation entry points — no simulator loop', async () => {
    const body = await bodyOf('./chart.ts');
    const exported = body
      .split('\n')
      .filter((l) => /^export function/.test(l))
      .map((l) => /export function (\w+)/.exec(l)?.[1] ?? '')
      .sort();
    expect(exported).toEqual(['evaluateChart', 'resolveHourlyC']);
    // No advance/tick/rollover loop exists in this layer.
    expect(body).not.toMatch(/function (advance|tick|step|rollover|simulate)\b/);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-L: locked integration behaviour', () => {
  it('counts seeded C inside the shared T_C denominator, not beside it', () => {
    // 'seeded' contributes only seeded hours; 'plain' only actual hours.
    // Both must share ONE denominator, so the seed is inside T_C.
    const r = evaluate({
      songs: [
        songAt('seeded', { hours: 0, votes: 0, seedHours: seedRecords(H - C_WINDOW_HOURS + 1, C_WINDOW_HOURS, 1) }),
        songAt('plain', { hours: 3, votes: 5 }),
      ],
      referenceHour: H,
      closedHourC: null,
    });

    const seededC = C_WINDOW_HOURS; // 72 seeded hours × C 1
    const plainC = 6; // 3 actual hours × C 2
    expect(entryOf(r, 'seeded').activeC).toBe(seededC);
    expect(entryOf(r, 'plain').activeC).toBe(plainC);
    // If the seed sat outside the denominator, T_C would be 6 alone.
    expect(r.totalActiveC).toBe(seededC + plainC);
    expect(entryOf(r, 'seeded').xp).toBeCloseTo(seededC / (seededC + plainC), 12);
  });

  it('lets a real hour replace the seed instead of adding to it', () => {
    const withSeed = evaluate({
      songs: [songAt('s', { hours: 3, votes: 5, seedHours: seedRecords(H - C_WINDOW_HOURS + 1, C_WINDOW_HOURS, 1) })],
      referenceHour: H,
      closedHourC: null,
    });
    const noSeed = evaluate({
      songs: [songAt('s', { hours: 3, votes: 5 })],
      referenceHour: H,
      closedHourC: null,
    });

    // 3 actual hours keep C 2 each; the remaining 69 hours carry the seed.
    expect(entryOf(withSeed, 's').activeC).toBe(6 + (C_WINDOW_HOURS - 3));
    // Actual C = 2 per hour, never 2 + 1 = 3.
    expect(entryOf(withSeed, 's').activeC).toBeLessThan(
      3 * 3 + (C_WINDOW_HOURS - 3),
    );
    // The actual hours are identical with or without a seed present.
    expect(entryOf(withSeed, 's').activeC).toBeGreaterThan(
      entryOf(noSeed, 's').activeC,
    );
  });

  it('gives zero to an hour with neither actual votes nor a seed', () => {
    const song = songAt('s', { hours: 0, votes: 0 }); // no buckets, no seed
    const window = getActiveWindow(H);
    if (!window.ok) throw new Error(window.error.message);

    const hours = resolveHourlyC(song, window.value);
    if (!hours.ok) throw new Error(hours.error.message);

    expect(hours.value).toHaveLength(C_WINDOW_HOURS);
    for (const h of hours.value) {
      expect(h.actualC).toBeNull();
      expect(h.seedC).toBeNull();
    }
    // And so the song earns nothing from C.
    const r = evaluate({ songs: [song], referenceHour: H, closedHourC: null });
    expect(entryOf(r, 's').activeC).toBe(0);
  });

  it('rejects a corrupt seed rather than distributing it', () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = evaluateChart({
        // A corrupt value placed on a REAL hour: rejection must come from the
        // per-hour validation, not from an hour that simply has no seed.
        songs: [songAt('s', { hours: 0, votes: 0, seedHours: seedRecords(H, 1, bad) })],
        referenceHour: H,
        closedHourC: null,
      });
      expect(r.ok, `seedC=${bad}`).toBe(false);
    }
  });

  it('rejects an unrecognised lifecycle instead of treating it as Vault', () => {
    const r = evaluateChart({
      songs: [{ ...songAt('s'), lifecycle: 'RETIRED' as never }],
      referenceHour: H,
      closedHourC: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
  });

  it('keeps a Vaulted song out of the platform denominator too', () => {
    const r = evaluate({
      songs: [
        songAt('live', { platform: { youtube: 100, spotify: 0, boomplay: 0 } }),
        songAt('gone', {
          lifecycle: 'VAULT',
          platform: { youtube: 900, spotify: 0, boomplay: 0 },
        }),
      ],
      referenceHour: H,
      closedHourC: null,
    });
    // Had the Vaulted song been counted, 'live' would have earned only a
    // fraction of YouTube's 30 points instead of all of it.
    expect(entryOf(r, 'live').platformPerformance.youtube).toBe(30);
  });

  it('scales the score and rank together through the whole pipeline', () => {
    const r = evaluate({
      songs: [
        songAt('small', { persistentKura: 1, hours: 1, votes: 1 }),
        songAt('large', { persistentKura: 40, hours: 10, votes: 5 }),
      ],
      referenceHour: H,
      closedHourC: 1,
    });

    const large = entryOf(r, 'large');
    const small = entryOf(r, 'small');
    // Ranks live on the RANKED projection; `active` keeps input order and
    // carries rank = null until Phase 12 places the song.
    expect(r.ranked.map((e) => e.songId)).toEqual(['large', 'small']);
    expect(r.ranked.map((e) => e.rank)).toEqual([1, 2]);
    expect(large.rank).toBeNull();
    expect(small.rank).toBeNull();
    expect(large.boraScore).toBeGreaterThan(small.boraScore);
    // Both received a Kura cycle, exactly once each.
    for (const e of [large, small]) {
      expect(e.persistentKuraNext).not.toBeNull();
      expect(e.persistentKuraBefore).toBeLessThan(e.persistentKuraNext as number);
    }
  });

  it('applies the Kura cycle once, not once per evaluation', () => {
    const song = songAt('a', { persistentKura: 20 });
    const input: EngineInput = { songs: [song], referenceHour: H, closedHourC: 1 };

    const first = evaluate(input);
    // Re-evaluating the SAME unmutated input must not compound decay.
    const second = evaluate(input);

    expect(entryOf(second, 'a').persistentKuraNext).toBe(
      entryOf(first, 'a').persistentKuraNext,
    );
    expect(entryOf(second, 'a').persistentKuraBefore).toBe(20);
  });

  it('evaluates an entirely empty chart without error', () => {
    const r = evaluate({ songs: [], referenceHour: H, closedHourC: null });
    expect(r.active).toHaveLength(0);
    expect(r.ranked).toHaveLength(0);
    expect(r.totalActiveC).toBe(0);
    expect(r.excludedVaulted).toEqual([]);
  });
});