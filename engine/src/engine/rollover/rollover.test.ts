/**
 * BORA Engine — hourly rollover tests (Phase 15)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   R-O  one-hour rollover, order of operations
 *   R-K  persistent Kura commitment and decay
 *   R-S  finite, hour-indexed seed runway
 *   R-A  actual-vs-seed resolution at the closed hour
 *   R-V  Vault isolation across a rollover
 *   R-H  historical retention
 *   R-D  determinism, immutability, purity
 *   R-X  structural: composition, not duplicated mathematics
 */

import { describe, it, expect } from 'vitest';
import { rolloverHour, createSeedRunway } from './rollover';
import { emptyBucket } from '../bucket';
import { updatePersistentKura, updatePersistentKuraWithTrace } from '../kura/persistent';
import { C_WINDOW_HOURS, SEED_RUNWAY_HOURS, C_MAX } from '../constants';
import type { EngineState, RolloverSong, RolloverOutcome } from './rollover';
import type { HourIndex, HourlyCRecord, VoteBucket, PlatformSeries } from '../types';

const H = 5000 as HourIndex;
const hour = (n: number) => n as HourIndex;

/** An empty platform series, so platform maths contributes nothing. */
const NO_PLATFORM: PlatformSeries = { youtube: [], spotify: [], boomplay: [] };

/** n buckets ending at `endHour`, each with the given raw upvotes (5 ⇒ C 2). */
function bucketsEndingAt(endHour: number, hours: number, votes: number): VoteBucket[] {
  const out: VoteBucket[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    out.push({ ...emptyBucket(hour(endHour - i)), upvotes: votes });
  }
  return out;
}

/** A single bucket at exactly one hour, with the given raw votes. */
function bucketAt(at: number, votes: number): VoteBucket {
  return { ...emptyBucket(hour(at)), upvotes: votes };
}

/** A runway of `count` seeded hours starting at `startHour`, each worth `c`. */
function seedRunway(
  startHour: number,
  count: number,
  c: number,
  lifecycle: HourlyCRecord['lifecycle'] = 'ACTIVE',
): HourlyCRecord[] {
  const out: HourlyCRecord[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      hourIndex: hour(startHour + i),
      c,
      source: 'SEED',
      lifecycle,
      version: 0,
    });
  }
  return out;
}

function song(partial: Partial<RolloverSong> & { songId: string }): RolloverSong {
  return {
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura: 0,
    buckets: [],
    seedHours: [],
    platform: NO_PLATFORM,
    ...partial,
  };
}

function stateAt(referenceHour: number, songs: RolloverSong[]): EngineState {
  return { referenceHour: hour(referenceHour), songs };
}

/** Run a rollover and unwrap, failing loudly. */
function roll(state: EngineState, closedHour: number): RolloverOutcome {
  const r = rolloverHour(state, hour(closedHour));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function songIn(state: EngineState, songId: string): RolloverSong {
  const s = state.songs.find((x) => x.songId === songId);
  if (!s) throw new Error(`missing song ${songId}`);
  return s;
}

function stepFor(outcome: RolloverOutcome, songId: string) {
  const s = outcome.steps.find((x) => x.songId === songId);
  if (!s) throw new Error(`missing step ${songId}`);
  return s;
}

function entryOf(chart: RolloverOutcome['chartAtClosedHour'], songId: string) {
  const e = chart.active.find((x) => x.songId === songId);
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

describe('R-O: one-hour rollover, order of operations', () => {
  it('advances the reference hour by exactly one', () => {
    const out = roll(stateAt(H, [song({ songId: 'a', buckets: bucketsEndingAt(H, 5, 5) })]), H);
    expect(out.fromHour).toBe(H);
    expect(out.toHour).toBe(H + 1);
    expect(out.state.referenceHour).toBe(H + 1);
  });

  it('rejects a closed hour that is not the state reference hour', () => {
    const state = stateAt(H, [song({ songId: 'a' })]);
    for (const bad of [H + 1, H - 1, H + 3]) {
      const r = rolloverHour(state, hour(bad));
      expect(r.ok, `closedHour=${bad}`).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
    }
  });

  it('scores the H chart from the PRE-rollover persistent Kura', () => {
    // The H evaluation must see the balance committed at H, not the one this
    // rollover is about to commit. Q2: score uses persistentKuraBefore.
    const out = roll(
      stateAt(H, [song({ songId: 'a', persistentKura: 40, buckets: bucketsEndingAt(H, 5, 5) })]),
      H,
    );
    expect(entryOf(out.chartAtClosedHour, 'a').persistentKuraBefore).toBe(40);
    // And the H chart is NOT using the freshly committed value.
    expect(entryOf(out.chartAtClosedHour, 'a').persistentKuraBefore).toBeLessThan(
      songIn(out.state, 'a').persistentKura,
    );
  });

  it('sees the newly committed Kura in the H+1 chart', () => {
    const out = roll(
      stateAt(H, [song({ songId: 'a', persistentKura: 40, buckets: bucketsEndingAt(H, 5, 5) })]),
      H,
    );
    const committed = songIn(out.state, 'a').persistentKura;
    expect(entryOf(out.chartAtNextHour, 'a').persistentKuraBefore).toBe(committed);
    expect(entryOf(out.chartAtNextHour, 'a').boraScore).toBeGreaterThanOrEqual(committed);
  });

  it('makes the H+1 BORA Score reflect the committed Kura', () => {
    const out = roll(
      stateAt(H, [song({ songId: 'a', persistentKura: 40, buckets: bucketsEndingAt(H, 5, 5) })]),
      H,
    );
    const committed = songIn(out.state, 'a').persistentKura;
    const atNext = entryOf(out.chartAtNextHour, 'a');
    // Platform points are zero here, so the score IS the committed Kura.
    expect(atNext.boraScore).toBeCloseTo(committed, 12);
    expect(atNext.boraScore).not.toBeCloseTo(40, 6);
  });

  it('never commits before evaluating H', () => {
    const before = stateAt(H, [song({ songId: 'a', persistentKura: 10 })]);
    const out = roll(before, H);
    // The input state is untouched by the whole transition.
    expect(before.songs[0].persistentKura).toBe(10);
    expect(out.chartAtClosedHour.active[0].persistentKuraBefore).toBe(10);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-K: persistent Kura commitment and decay', () => {
  it('commits persistent Kura exactly once per closed hour', () => {
    const state = stateAt(H, [song({ songId: 'a', persistentKura: 20, buckets: bucketsEndingAt(H, 5, 5) })]);
    const out = roll(state, H);
    const step = stepFor(out, 'a');
    const committed = songIn(out.state, 'a').persistentKura;

    expect(committed).toBe(step.persistentAfter);
    expect(committed).toBeCloseTo(
      (step.persistentBefore + step.freshInjected) * (1 - step.decayRate),
      12,
    );
  });

  it('decays using the C of the hour that JUST CLOSED', () => {
    // The closed hour H holds 5 upvotes ⇒ C 2, the maximum, so D_H is 0.
    const out = roll(
      stateAt(H, [song({ songId: 'a', persistentKura: 100, buckets: [bucketAt(H, 5)] })]),
      H,
    );
    const step = stepFor(out, 'a');
    expect(step.closedHourC).toBe(C_MAX);
    expect(step.decayRate).toBeCloseTo(0, 12);
    expect(step.persistentAfter).toBeCloseTo(100 + step.freshInjected, 12);
  });

  it('applies full decay when the closed hour had no activity', () => {
    // No bucket and no seed at H ⇒ C_H = 0 ⇒ the maximum decay rate.
    const out = roll(
      stateAt(H, [song({ songId: 'a', persistentKura: 100, buckets: [bucketAt(H - 5, 5)] })]),
      H,
    );
    const step = stepFor(out, 'a');
    expect(step.closedHourC).toBe(0);
    const expected = updatePersistentKura(100, step.freshInjected, 0);
    if (!expected.ok) throw new Error(expected.error.message);
    expect(step.persistentAfter).toBeCloseTo(expected.value, 12);
  });

  it('injects fresh Kura BEFORE decay, so fresh is itself decayed', () => {
    // The closed hour must have sub-maximum C, otherwise D_H = 0 and decay is
    // unobservable. Hour H carries a single upvote ⇒ C 1, so D_H > 0.
    const out = roll(
      stateAt(H, [
        song({ songId: 'a', persistentKura: 0, buckets: [bucketAt(H, 1), bucketAt(H - 1, 5)] }),
      ]),
      H,
    );
    const step = stepFor(out, 'a');
    expect(step.closedHourC).toBe(1);
    expect(step.freshInjected).toBeGreaterThan(0);
    expect(step.decayRate).toBeGreaterThan(0);
    // Ordering proof: decay was applied to (before + fresh), not to `before`
    // alone. If fresh bypassed decay, persistentAfter would equal before+fresh.
    expect(step.persistentAfter).toBeLessThan(step.persistentBefore + step.freshInjected);
  });

  it('removes exactly the amount Phase 9 removes', () => {
    // Same non-maximum closed hour, cross-checked against Phase 9 directly.
    const out = roll(
      stateAt(H, [
        song({ songId: 'a', persistentKura: 12, buckets: [bucketAt(H, 1), bucketAt(H - 1, 5)] }),
      ]),
      H,
    );
    const step = stepFor(out, 'a');
    const trace = updatePersistentKuraWithTrace(12, step.freshInjected, 1);
    if (!trace.ok) throw new Error(trace.error.message);
    // decayRate is the D_h coefficient, exactly as Phase 9 computed it —
    // within [0, 0.0025], never the amount removed.
    expect(step.decayRate).toBeCloseTo(trace.value.decayRate, 12);
    expect(step.decayRate).toBeGreaterThan(0);
    expect(step.decayRate).toBeLessThanOrEqual(0.0025);
    // The amount removed is a separate quantity, derived from the balances.
    expect(12 + step.freshInjected - step.persistentAfter).toBeCloseTo(
      trace.value.decayed,
      12,
    );
    expect(step.persistentAfter).toBeCloseTo(trace.value.persistentAfter, 12);
  });

  it('matches Phase 9 exactly for the committed value', () => {
    const state = stateAt(H, [
      song({ songId: 'a', persistentKura: 33.5, buckets: bucketsEndingAt(H, 7, 5) }),
    ]);
    const out = roll(state, H);
    const step = stepFor(out, 'a');
    const direct = updatePersistentKura(33.5, step.freshInjected, step.closedHourC);
    if (!direct.ok) throw new Error(direct.error.message);
    expect(step.persistentAfter).toBeCloseTo(direct.value, 12);
  });

  it('does not apply decay to a song twice within one rollover', () => {
    const state = stateAt(H, [song({ songId: 'a', persistentKura: 10, buckets: bucketsEndingAt(H, 5, 5) })]);
    const out = roll(state, H);
    expect(out.steps).toHaveLength(1);
    expect(out.steps.filter((s) => s.songId === 'a')).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-S: the seed runway is finite and hour-indexed', () => {
  it('places exactly 72 seeded hours starting at the creation hour', () => {
    const r = createSeedRunway(72, hour(H));
    if (!r.ok) throw new Error(r.error.message);
    expect(r.value).toHaveLength(SEED_RUNWAY_HOURS);
    expect(r.value).toHaveLength(C_WINDOW_HOURS);
    expect(r.value[0].hourIndex).toBe(H);
    expect(r.value[SEED_RUNWAY_HOURS - 1].hourIndex).toBe(H + SEED_RUNWAY_HOURS - 1);
  });

  it('marks every placed record as SEED and ACTIVE', () => {
    const r = createSeedRunway(72, hour(H));
    if (!r.ok) throw new Error(r.error.message);
    for (const rec of r.value) {
      expect(rec.source).toBe('SEED');
      expect(rec.lifecycle).toBe('ACTIVE');
    }
  });

  it('gives H+71 a seed and H+72 none', () => {
    const last = seedRunway(H, SEED_RUNWAY_HOURS, 1);
    const state = stateAt(H + 71, [song({ songId: 's', seedHours: last })]);
    const atLast = entryOf(roll(state, H + 71).chartAtClosedHour, 's');

    // At H+72 the runway is spent: no seed record names that hour.
    const spent = stateAt(H + 72, [song({ songId: 's', seedHours: last })]);
    const out = roll(spent, H + 72);
    expect(stepFor(out, 's').closedHourC).toBe(0);
    expect(atLast.activeC).toBeGreaterThan(0);
  });

  it('rejects a corrupt seed total', () => {
    for (const bad of [-1, Number.NaN]) {
      const r = createSeedRunway(bad, hour(H));
      expect(r.ok, `seedC=${bad}`).toBe(false);
    }
  });

  it('never regenerates or extends the runway across rollovers', () => {
    const runway = seedRunway(H, SEED_RUNWAY_HOURS, 1);
    const state = stateAt(H, [song({ songId: 's', seedHours: runway })]);
    const out = roll(state, H);

    // Exactly the same records come out: nothing added, nothing recalculated.
    expect(songIn(out.state, 's').seedHours).toHaveLength(SEED_RUNWAY_HOURS);
    expect(JSON.stringify(songIn(out.state, 's').seedHours)).toBe(JSON.stringify(runway));
  });

  it('lets an archived seed record stop counting', () => {
    const archived = seedRunway(H, SEED_RUNWAY_HOURS, 1, 'ARCHIVED');
    const state = stateAt(H, [song({ songId: 's', seedHours: archived })]);
    expect(stepFor(roll(state, H), 's').closedHourC).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-A: actual-versus-seed at the closed hour', () => {
  it('uses actual C when a bucket exists at the closed hour', () => {
    const state = stateAt(H, [
      song({ songId: 's', buckets: [bucketAt(H, 5)], seedHours: seedRunway(H, 72, 1) }),
    ]);
    expect(stepFor(roll(state, H), 's').closedHourC).toBe(2);
  });

  it('lets an actual C = 0 bucket REPLACE the seed', () => {
    // Locked Q4: bucket EXISTENCE wins, not bucket value. The seed is
    // suppressed, so the resolved C is 0 and not the seeded 1.
    const state = stateAt(H, [
      song({ songId: 's', buckets: [bucketAt(H, 0)], seedHours: seedRunway(H, 72, 1) }),
    ]);
    expect(stepFor(roll(state, H), 's').closedHourC).toBe(0);
  });

  it('falls back to the seed when no bucket exists at the closed hour', () => {
    const state = stateAt(H, [
      song({ songId: 's', buckets: [bucketAt(H - 3, 5)], seedHours: seedRunway(H, 72, 1) }),
    ]);
    expect(stepFor(roll(state, H), 's').closedHourC).toBe(1);
  });

  it('resolves to zero when neither actual nor seed exists', () => {
    const state = stateAt(H, [song({ songId: 's', buckets: [bucketAt(H - 3, 5)] })]);
    expect(stepFor(roll(state, H), 's').closedHourC).toBe(0);
  });

  it('never adds actual and seed for the same hour', () => {
    const state = stateAt(H, [
      song({ songId: 's', buckets: [bucketAt(H, 5)], seedHours: seedRunway(H, 72, 1) }),
    ]);
    // C 2 actual + C 1 seed would be 3, above the per-hour ceiling.
    expect(stepFor(roll(state, H), 's').closedHourC).toBeLessThanOrEqual(C_MAX);
    expect(stepFor(roll(state, H), 's').closedHourC).toBe(2);
  });

  it('counts seeded hours inside the same active-C total as actual hours', () => {
    // The runway must actually COVER the window for all 72 seeded hours to
    // count. A runway placed at H covers H…H+71, of which only H falls inside
    // the window at H — so the runway starts at H-71 here (D1: seed coverage is
    // per exact hour).
    const out = roll(
      stateAt(H, [
        song({ songId: 's', seedHours: seedRunway(H - 71, SEED_RUNWAY_HOURS, 1) }),
      ]),
      H,
    );
    // 72 seeded hours × C 1 all sit inside the single shared T_C.
    expect(entryOf(out.chartAtClosedHour, 's').activeC).toBe(72);
    expect(out.chartAtClosedHour.totalActiveC).toBe(72);
  });

  it('counts only the in-window hours of a runway that starts late', () => {
    // The same runway shape, but placed so that just ONE hour overlaps the
    // window. T_C is that one hour — never 72.
    const out = roll(
      stateAt(H, [song({ songId: 's', seedHours: seedRunway(H, SEED_RUNWAY_HOURS, 1) })]),
      H,
    );
    expect(out.chartAtClosedHour.totalActiveC).toBe(1);
  });

  it('rejects a duplicate hour index rather than silently double counting', () => {
    const state = stateAt(H, [
      song({ songId: 's', buckets: [bucketAt(H, 5), bucketAt(H, 5)] }),
    ]);
    const r = rolloverHour(state, hour(H));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-V: Vault isolation across a rollover', () => {
  it('excludes a Vaulted song from the rollover steps', () => {
    const out = roll(
      stateAt(H, [
        song({ songId: 'live', buckets: bucketsEndingAt(H, 5, 5) }),
        song({ songId: 'dead', lifecycle: 'VAULT', persistentKura: 1_000_000 }),
      ]),
      H,
    );
    expect(out.steps.map((s) => s.songId)).toEqual(['live']);
    expect(out.chartAtClosedHour.active.map((e) => e.songId)).toEqual(['live']);
    expect(out.chartAtClosedHour.excludedVaulted).toEqual(['dead']);
  });

  it('leaves a Vaulted song’s persistent Kura completely unchanged', () => {
    const state = stateAt(H, [
      song({ songId: 'dead', lifecycle: 'VAULT', persistentKura: 1_000_000 }),
    ]);
    expect(songIn(roll(state, H).state, 'dead').persistentKura).toBe(1_000_000);
  });

  it('retains K and history on a Vaulted song', () => {
    const buckets = [bucketAt(H - 100, 5), bucketAt(H - 3, 5)];
    const state = stateAt(H, [
      song({ songId: 'dead', lifecycle: 'VAULT', k: 77, persistentKura: 5, buckets }),
    ]);
    const after = songIn(roll(state, H).state, 'dead');
    expect(after.k).toBe(77);
    expect(after.buckets).toHaveLength(2);
  });

  it('treats an entirely Vaulted chart as empty, not an error', () => {
    const out = roll(
      stateAt(H, [
        song({ songId: 'x', lifecycle: 'VAULT' }),
        song({ songId: 'y', lifecycle: 'VAULT' }),
      ]),
      H,
    );
    expect(out.chartAtClosedHour.active).toHaveLength(0);
    expect(out.chartAtClosedHour.totalActiveC).toBe(0);
    expect(out.steps).toHaveLength(0);
  });

  it('keeps a Vaulted song out of both charts', () => {
    const out = roll(
      stateAt(H, [
        song({ songId: 'live', buckets: bucketsEndingAt(H, 5, 5) }),
        song({ songId: 'dead', lifecycle: 'VAULT', persistentKura: 1_000_000 }),
      ]),
      H,
    );
    expect(out.chartAtNextHour.active.find((e) => e.songId === 'dead')).toBeUndefined();
    expect(out.chartAtNextHour.ranked.find((e) => e.songId === 'dead')).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-H: historical retention', () => {
  it('never deletes an expired bucket', () => {
    // A bucket far outside the 72-hour window must survive the rollover.
    const old = bucketAt(H - 500, 5);
    const state = stateAt(H, [song({ songId: 'a', buckets: [old, bucketAt(H, 5)] })]);
    const after = songIn(roll(state, H).state, 'a');
    expect(after.buckets).toHaveLength(2);
    expect(after.buckets.some((b) => b.hourIndex === H - 500)).toBe(true);
  });

  it('keeps a future bucket stored but excluded until its hour arrives', () => {
    const future = bucketAt(H + 10, 5);
    const state = stateAt(H, [song({ songId: 'a', buckets: [bucketAt(H, 5), future] })]);
    const out = roll(state, H);

    // Stored…
    expect(songIn(out.state, 'a').buckets.some((b) => b.hourIndex === H + 10)).toBe(true);
    // …but it does not contribute to the H or H+1 window.
    expect(entryOf(out.chartAtClosedHour, 'a').activeC).toBe(2);
    expect(entryOf(out.chartAtNextHour, 'a').activeC).toBe(2);
  });

  it('carries every seed record forward untouched', () => {
    const runway = seedRunway(H, SEED_RUNWAY_HOURS, 0.5);
    const state = stateAt(H, [song({ songId: 'a', seedHours: runway })]);
    const after = songIn(roll(state, H).state, 'a');
    expect(after.seedHours).toHaveLength(SEED_RUNWAY_HOURS);
    expect(JSON.stringify(after.seedHours)).toBe(JSON.stringify(runway));
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-D: determinism, immutability, purity', () => {
  it('is deterministic for identical input', () => {
    const state = stateAt(H, [
      song({ songId: 'a', persistentKura: 5, buckets: bucketsEndingAt(H, 5, 5) }),
      song({ songId: 'b', persistentKura: 1, buckets: bucketsEndingAt(H, 3, 1) }),
    ]);
    const first = roll(state, H);
    for (let i = 0; i < 5; i++) {
      expect(JSON.stringify(roll(state, H))).toBe(JSON.stringify(first));
    }
  });

  it('does not mutate the input state', () => {
    const state = stateAt(H, [
      song({ songId: 'a', persistentKura: 10, k: 5, buckets: bucketsEndingAt(H, 5, 5) }),
    ]);
    const snapshot = JSON.stringify(state);
    roll(state, H);
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(state.songs[0].persistentKura).toBe(10);
  });

  it('returns a NEW state object rather than the same reference', () => {
    const state = stateAt(H, [song({ songId: 'a', persistentKura: 10 })]);
    const out = roll(state, H);
    expect(out.state).not.toBe(state);
    expect(out.state.songs[0]).not.toBe(state.songs[0]);
  });

  it('handles a zero-total active C rollover without error', () => {
    const out = roll(stateAt(H, [song({ songId: 'a', persistentKura: 10 })]), H);
    expect(entryOf(out.chartAtClosedHour, 'a').xp).toBe(0);
    expect(entryOf(out.chartAtClosedHour, 'a').kuraFresh).toBe(0);
    // Only decay acts on a cold chart.
    const expected = updatePersistentKura(10, 0, 0);
    if (!expected.ok) throw new Error(expected.error.message);
    expect(songIn(out.state, 'a').persistentKura).toBeCloseTo(expected.value, 12);
  });

  it('treats an empty chart as a valid rollover', () => {
    const out = roll(stateAt(H, []), H);
    expect(out.state.songs).toHaveLength(0);
    expect(out.chartAtClosedHour.totalActiveC).toBe(0);
  });

  it('compounds correctly across repeated rollovers', () => {
    let state = stateAt(H, [
      song({ songId: 'a', persistentKura: 10, buckets: bucketsEndingAt(H, 5, 5) }),
    ]);
    const first = songIn(state, 'a').persistentKura;
    state = roll(state, H).state;
    const second = songIn(state, 'a').persistentKura;
    state = roll(state, H + 1).state;
    const third = songIn(state, 'a').persistentKura;

    // Each hour injects then decays, so the balance moves every hour and never
    // collapses back to the original.
    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(third).toBeGreaterThan(0);
  });

  it('decays once per elapsed hour rather than once per rollover call', () => {
    // Three consecutive hours ⇒ three decay applications, not one.
    const base = 100;
    let expected = base;
    let state = stateAt(H, [
      song({ songId: 'a', persistentKura: base, buckets: bucketsEndingAt(H, 5, 5) }),
    ]);

    for (let h = H; h < H + 3; h++) {
      const out = roll(state, h);
      const step = stepFor(out, 'a');
      const fresh = entryOf(out.chartAtClosedHour, 'a').kuraFresh;
      const direct = updatePersistentKura(expected, fresh, step.closedHourC);
      if (!direct.ok) throw new Error(direct.error.message);
      expect(step.persistentAfter).toBeCloseTo(direct.value, 12);
      expected = direct.value;
      state = out.state;
    }
  });

  it('holds the core invariants across generated charts', () => {
    const rng = makeRng(909090);

    for (let chart = 0; chart < 60; chart++) {
      const size = 1 + Math.floor(rng() * 8);
      const songs: RolloverSong[] = [];

      for (let i = 0; i < size; i++) {
        const start = H - Math.floor(rng() * 40);
        songs.push(
          song({
            songId: `s${i}`,
            lifecycle: rng() < 0.3 ? 'VAULT' : 'ACTIVE',
            k: Math.floor(rng() * 500),
            persistentKura: Math.floor(rng() * 100),
            buckets: bucketsEndingAt(H, Math.floor(rng() * 12), Math.floor(rng() * 8)),
            seedHours: rng() < 0.4 ? seedRunway(start, SEED_RUNWAY_HOURS, 0.5) : [],
          }),
        );
      }

      const snapshot = JSON.stringify(songs);
      const out = roll(stateAt(H, songs), H);

      // Input untouched, and advanced exactly one hour.
      expect(JSON.stringify(songs)).toBe(snapshot);
      expect(out.state.referenceHour).toBe(H + 1);

      // Only ACTIVE songs take a step, each exactly once.
      const activeIds = songs.filter((s) => s.lifecycle === 'ACTIVE').map((s) => s.songId);
      expect([...out.steps.map((s) => s.songId)].sort()).toEqual([...activeIds].sort());

      for (const step of out.steps) {
        expect(step.decayRate).toBeGreaterThanOrEqual(0);
        expect(step.decayRate).toBeLessThanOrEqual(0.0025);
        expect(step.persistentAfter).toBeGreaterThanOrEqual(0);
        expect(step.hourClosed).toBe(H);
        expect(step.closedHourC).toBeLessThanOrEqual(C_MAX);
      }

      // Every song survives, Vaulted or not.
      expect(out.state.songs).toHaveLength(songs.length);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('R-X: structural — composition, not duplicated mathematics', () => {
  /** Executable source: comments stripped so documentation cannot trip scans. */
  async function bodyOf(file: string): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  }

  it('calls the upstream modules rather than redefining them', async () => {
    const body = await bodyOf('./rollover.ts');
    for (const fn of [
      'evaluateChart(',
      'updatePersistentKuraWithTrace(',
      'seedHourlyRunway(',
      'calculateHourlyC(',
      'getActiveWindow(',
    ]) {
      expect(body, `missing call ${fn}`).toContain(fn);
    }
  });

  it('contains no duplicated threshold, window, seed, or decay formula', async () => {
    const body = await bodyOf('./rollover.ts');
    // All of these live upstream and must be CALLED, not rewritten.
    expect(body).not.toMatch(/upvoteContribution|downvoteContribution/);
    expect(body).not.toMatch(/UPVOTE_TIER|DOWNVOTE_TIER|C_TIER|C_DOWN_TIER/);
    expect(body).not.toMatch(/0\.0025|DECAY_BASE_RATE/);
    expect(body).not.toMatch(/C_WINDOW_HOURS\s*[-*]|SEED_RUNWAY_HOURS\s*[-*]/);
    // No XP / fresh-Kura / score / platform / ranking maths.
    expect(body).not.toMatch(/PLATFORM_WEIGHT|boraScore\s*=|\.sort\(|localeCompare/);
  });

  it('never multiplies a seed by the runway length', async () => {
    // Phase 14 needed `seedCPerHour(v * 72)` to validate a per-hour value.
    // Phase 15 places real hour indices instead, so that round trip is gone.
    const body = await bodyOf('./rollover.ts');
    expect(body).not.toMatch(/SEED_RUNWAY_HOURS\s*\*/);
  });

  it('contains no clock, randomness, storage, network, or filesystem access', async () => {
    const body = await bodyOf('./rollover.ts');
    expect(body).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(|XMLHttpRequest/);
    expect(body).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
  });

  it('imports no simulator, Supabase, or React module', async () => {
    const body = await bodyOf('./rollover.ts');
    expect(body).not.toMatch(/from '.*\/sim|supabase|react/i);
  });

  it('exposes only the transition and the seed placement — no engine loop', async () => {
    const body = await bodyOf('./rollover.ts');
    const exported = body
      .split('\n')
      .filter((l) => /^export function/.test(l))
      .map((l) => /export function (\w+)/.exec(l)?.[1] ?? '')
      .sort();
    expect(exported).toEqual(['createSeedRunway', 'rolloverHour']);
  });

  it('commits persistent Kura only by building a new song object', async () => {
    const body = await bodyOf('./rollover.ts');
    // The commit is a spread into a fresh object; the input is never assigned to.
    expect(body).toMatch(/\.\.\.song,\s*persistentKura:/);
    expect(body).not.toMatch(/song\.persistentKura\s*=[^=]/);
    expect(body).not.toMatch(/state\.songs\[[^\]]+\]\s*\.[a-zA-Z]+\s*=[^=]/);
  });
});
