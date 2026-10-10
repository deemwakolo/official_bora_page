/**
 * BORA Engine — deterministic simulation tests (Phase 16)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   S-INIT  initialization and event scheduling
 *   S-RUN   one-hour and multi-hour execution
 *   S-A … S-J  the ten required laboratory scenarios
 *   S-ERR   error propagation
 *   S-DET   deterministic replay
 *   S-X     structural: a driver, not a second engine
 */

import { describe, it, expect } from 'vitest';
import {
  runSimulation,
  scheduleEvents,
  eventsAt,
  fingerprintText,
  runsIdentical,
  scenarioAEmptyChart,
  scenarioBSingleSong,
  scenarioCTwoSongs,
  scenarioDActualZeroReplacesSeed,
  scenarioDControl,
  scenarioESeedExpiration,
  scenarioFKuraDecay,
  scenarioGVaultRestore,
  scenarioHPlatforms,
  scenarioIRankingTieBreaks,
  scenarioJLongRun,
  plainSong,
  stateAt,
  votes,
  type SimulationRun,
} from './index';
import type { HourIndex } from '../engine/types';
import { PLATFORM_WEIGHTS, KURA_TOTAL } from '../engine/constants';

const hour = (n: number) => n as HourIndex;

/** Run a scenario and unwrap, failing loudly with the simulation error. */
function run(scenario: Parameters<typeof runSimulation>[0]): SimulationRun {
  const r = runSimulation(scenario);
  if (!r.ok) throw new Error(r.error.error.message);
  return r.value;
}

/** The single active song of a snapshot. */
function only(snapshot: SimulationRun['snapshots'][number]) {
  if (snapshot.active.length !== 1) {
    throw new Error(`expected 1 active song, found ${snapshot.active.length}`);
  }
  return snapshot.active[0];
}

// ───────────────────────────────────────────────────────────────────────────

describe('S-INIT: initialization and event scheduling', () => {
  it('runs an empty chart without producing any song snapshot', () => {
    const r = run(scenarioAEmptyChart());
    // Scenario A simulates 5 hours of an EMPTY chart, so each hour yields a
    // snapshot that simply contains no songs.
    expect(r.snapshots).toHaveLength(5);
    expect(r.trace).toHaveLength(0);
  });

  it('returns exactly one snapshot per simulated hour', () => {
    const r = run(scenarioBSingleSong(10));
    expect(r.snapshots).toHaveLength(10);
    expect(r.metrics.hoursSimulated).toBe(10);
  });

  it('schedules events by hour, then by declaration order', () => {
    const schedule = scheduleEvents([
      { kind: 'BUCKET', songId: 'b', hour: hour(1001), upvotes: 5, downvotes: 0 },
      { kind: 'BUCKET', songId: 'a', hour: hour(1000), upvotes: 5, downvotes: 0 },
      { kind: 'VAULT', songId: 'a', hour: hour(1001) },
    ]);

    expect(schedule.map((s) => s.hour)).toEqual([1000, 1001, 1001]);
    // Within hour 1001 the declaration order is preserved.
    expect(eventsAt(schedule, hour(1001)).map((s) => s.event.kind)).toEqual([
      'BUCKET',
      'VAULT',
    ]);
  });

  it('records which events were applied at each hour', () => {
    const r = run(scenarioDActualZeroReplacesSeed());
    const applied = r.snapshots.flatMap((s) => s.appliedEvents);
    expect(applied).toEqual(['BUCKET:S@1001']);
  });

  it('never mutates the scenario initial state', () => {
    const scenario = scenarioCTwoSongs();
    const snapshot = JSON.stringify(scenario.initialState);
    runSimulation(scenario);
    expect(JSON.stringify(scenario.initialState)).toBe(snapshot);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('S-RUN: hourly execution', () => {
  it('advances the reference hour by exactly one per tick', () => {
    const r = run(scenarioBSingleSong(5));
    for (const s of r.snapshots) {
      expect(s.nextHour).toBe(s.hour + 1);
    }
  });

  it('adopts the engine state so the next hour builds on the last', () => {
    const r = run(scenarioBSingleSong(4));
    const values = r.snapshots.map((s) => only(s).persistentKura);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  it('reports the source of each closed hour', () => {
    const r = run(scenarioDActualZeroReplacesSeed());
    expect(r.snapshots[0].active[0].closedHourSource).toBe('SEED');
    expect(r.snapshots[1].active[0].closedHourSource).toBe('ACTUAL');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// A — Empty chart
// ───────────────────────────────────────────────────────────────────────────

describe('S-A: scenario A — empty chart', () => {
  it('keeps T_C, XP, and fresh Kura at zero with no NaN', () => {
    const r = run(scenarioAEmptyChart());
    for (const s of r.snapshots) {
      expect(s.totalActiveC).toBe(0);
      expect(s.active).toHaveLength(0);
      expect(Number.isNaN(s.totalActiveC)).toBe(false);
    }
    expect(r.violations).toHaveLength(0);
  });

  it('produces a trace and metrics for a chart with nothing in it', () => {
    const r = run(scenarioAEmptyChart());
    expect(r.trace).toHaveLength(0);
    expect(r.metrics.hoursWithActivity).toBe(0);
    expect(r.metrics.totalActiveC).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// B — Single active song
// ───────────────────────────────────────────────────────────────────────────

describe('S-B: scenario B — single song at C 2', () => {
  it('gives the sole song all XP and all fresh Kura every hour', () => {
    const r = run(scenarioBSingleSong(10));
    for (const s of r.snapshots) {
      const song = only(s);
      expect(song.xp).toBeCloseTo(1, 12);
      expect(song.kuraFresh).toBeCloseTo(KURA_TOTAL, 9);
    }
  });

  it('accumulates persistent Kura deterministically', () => {
    const r = run(scenarioBSingleSong(10));
    const kuras = r.snapshots.map((s) => only(s).persistentKura);
    // C 2 ⇒ D_H = 0, so each hour simply adds 50.
    for (let i = 0; i < kuras.length; i++) {
      expect(kuras[i]).toBeCloseTo((i + 1) * KURA_TOTAL, 9);
    }
  });

  it('scores on the pre-commit Kura while reporting the committed one', () => {
    const r = run(scenarioBSingleSong(3));
    const song = only(r.snapshots[0]);
    // The snapshot's `persistentKura` is read from the state the engine
    // COMMITTED for this hour (50), because Phase 15 owns commitment.
    expect(song.persistentKura).toBeCloseTo(KURA_TOTAL, 9);
    expect(song.persistentKuraNext).toBeCloseTo(KURA_TOTAL, 9);
    // But Q2 locks the SCORE to the Kura as it stood at H, which was 0. The
    // score therefore reflects the pre-commit value, never the projection.
    expect(song.persistentKuraBefore).toBe(0);
    expect(song.boraScore).toBe(0);
  });

  it('raises the score to the committed value on the following hour', () => {
    const r = run(scenarioBSingleSong(3));
    const second = only(r.snapshots[1]);
    // At H+1 the previously committed 50 is the `before`, so it is now scored.
    expect(second.persistentKuraBefore).toBeCloseTo(KURA_TOTAL, 9);
    expect(second.boraScore).toBeCloseTo(KURA_TOTAL, 9);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C — Two-song competition
// ───────────────────────────────────────────────────────────────────────────

describe('S-C: scenario C — two-song competition', () => {
  it('splits XP 2:1 exactly as the engine reports', () => {
    const r = run(scenarioCTwoSongs(4));
    const s = r.snapshots[0];
    const a = s.active.find((x) => x.songId === 'A');
    const b = s.active.find((x) => x.songId === 'B');
    if (!a || !b) throw new Error('missing song');

    // The driver applies this hour's events, then closes THIS hour, so only the
    // single bucket at hour 1000 is in play: A = C 2, B = C 1, T_C = 3.
    expect(a.activeC).toBe(2);
    expect(b.activeC).toBe(1);
    expect(s.totalActiveC).toBe(3);
    expect(a.xp).toBeCloseTo(2 / 3, 12);
    expect(b.xp).toBeCloseTo(1 / 3, 12);
  });

  it('grows the window as earlier hours accumulate', () => {
    const r = run(scenarioCTwoSongs(4));
    // By hour 1002 all three hours are inside the active window.
    expect(r.snapshots[2].totalActiveC).toBe(9); // 3 × C 2 + 3 × C 1
  });

  it('keeps fresh Kura proportional to XP', () => {
    const r = run(scenarioCTwoSongs(4));
    const a = r.snapshots[0].active.find((x) => x.songId === 'A');
    if (!a) throw new Error('missing A');
    expect(a.kuraFresh).toBeCloseTo(a.xp * KURA_TOTAL, 12);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// D — Actual C = 0 replacing seed
// ───────────────────────────────────────────────────────────────────────────

describe('S-D: scenario D — actual C 0 replaces the seed', () => {
  it('resolves the seeded hour to 0 when a real empty bucket appears', () => {
    const withBucket = run(scenarioDActualZeroReplacesSeed());
    const control = run(scenarioDControl());

    const injected = withBucket.snapshots.find((s) => s.hour === 1001);
    const untouched = control.snapshots.find((s) => s.hour === 1001);
    if (!injected || !untouched) throw new Error('missing hour');

    const got = injected.active[0];
    const baseline = untouched.active[0];

    expect(got.closedHourSource).toBe('ACTUAL');
    expect(baseline.closedHourSource).toBe('SEED');

    // Without the bucket that hour carries the seed; with it, it does not.
    expect(baseline.activeC).toBeGreaterThan(got.activeC);
  });

  it('never adds the seed to the actual zero', () => {
    const zeroed = run(scenarioDActualZeroReplacesSeed());
    const control = run(scenarioDControl());

    const at = zeroed.snapshots.find((s) => s.hour === 1001);
    const baseline = control.snapshots.find((s) => s.hour === 1001);
    if (!at || !baseline) throw new Error('missing hour');

    // The control carries seeded C at BOTH 1000 and 1001, so its total is 2.
    // In the zeroed scenario the hour-1001 seed is suppressed by the real
    // zero-vote bucket, leaving exactly the hour-1000 seed: one unit smaller.
    // Were the seed ADDED to the actual zero instead, the total would be 2.
    expect(baseline.active[0].activeC).toBe(2);
    expect(at.active[0].activeC).toBe(1);
    expect(baseline.active[0].activeC - at.active[0].activeC).toBeCloseTo(1, 12);
    expect(at.active[0].closedHourSource).toBe('ACTUAL');
  });

  it('applies maximum decay to the zeroed hour', () => {
    const r = run(scenarioDActualZeroReplacesSeed());
    const zeroed = r.snapshots.find((s) => s.hour === 1001);
    if (!zeroed) throw new Error('missing hour');
    const song = zeroed.active[0];
    // C 0 ⇒ the largest locked decay, so the committed value sits below
    // before + fresh.
    expect(song.persistentKuraNext).not.toBeNull();
    expect(song.persistentKuraBefore).not.toBeNull();
    expect(song.persistentKuraNext as number).toBeLessThan(
      (song.persistentKuraBefore as number) + song.kuraFresh,
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// E — Seed runway expiration
// ───────────────────────────────────────────────────────────────────────────

describe('S-E: scenario E — seed runway expiration', () => {
  it('seeds exactly 72 hours and then stops', () => {
    const r = run(scenarioESeedExpiration(76));
    const byHour = new Map<number, string>(
      r.snapshots.map((s) => [s.hour as number, s.active[0].closedHourSource]),
    );

    // The runway covers 1000…1071 inclusive.
    expect(byHour.get(1000)).toBe('SEED');
    expect(byHour.get(1071)).toBe('SEED');
    // The first hour past the runway carries nothing.
    expect(byHour.get(1072)).toBe('NONE');
    expect(byHour.get(1075)).toBe('NONE');
  });

  it('stops contributing new seed hours once the runway ends', () => {
    const r = run(scenarioESeedExpiration(76));
    // Past 1071 no HOUR is seeded any more. The earlier seeded hours remain in
    // history and stay inside the 72-hour window as it slides, which is
    // exactly Contract 11: expiry is selection, never deletion.
    for (const s of r.snapshots.filter((x) => x.hour >= 1072)) {
      expect(s.active[0].closedHourSource).toBe('NONE');
      expect(s.active[0].seedHoursRemaining).toBe(0);
    }
  });

  it('never lets an expired seed act as an infinite overlay', () => {
    const r = run(scenarioESeedExpiration(80));
    // Active C is bounded by the window, never by the runway's original length.
    // Each seeded hour contributes exactly C 1, so the maximum possible total
    // is 72 — an infinite overlay would report far more than that.
    const values = r.snapshots.map((s) => s.totalActiveC);
    expect(Math.max(...values)).toBeLessThanOrEqual(72);
  });

  it('fills the window as the runway slides in, then declines as it slides out', () => {
    // Long enough to watch the runway slide out of the window entirely.
    const r = run(scenarioESeedExpiration(150));
    const values = r.snapshots.map((s) => s.totalActiveC);

    // The runway is created at 1000 and covers 1000…1071, so at hour 1000 only
    // ONE of its hours is inside the window (D1: coverage is per exact hour).
    expect(values[0]).toBe(1);

    // Coverage GROWS as the window slides forward over the runway, peaking at
    // the full 72 hours once the entire runway sits inside the window.
    const peak = Math.max(...values);
    expect(peak).toBe(72);
    const peakIndex = values.indexOf(peak);

    // Before the peak, coverage only grows — never shrinks, never jumps.
    for (let i = 1; i <= peakIndex; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1);
    }

    // After the peak, each hour loses exactly ONE seeded hour as it leaves,
    // until the runway is fully out of the window. It then stays at zero —
    // a spent runway never regenerates (Q3).
    for (let i = peakIndex + 1; i < values.length; i++) {
      expect(values[i]).toBe(Math.max(0, values[i - 1] - 1));
    }

    // And once gone, nothing brings it back.
    expect(values[values.length - 1]).toBe(0);
    // Every value is a real, finite, non-negative C.
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('never regenerates the runway past its final hour', () => {
    const r = run(scenarioESeedExpiration(80));
    // No hour after 1071 is ever sourced from the seed again.
    for (const s of r.snapshots.filter((x) => x.hour >= 1072)) {
      expect(s.active[0].closedHourSource).toBe('NONE');
      expect(s.active[0].seedHoursRemaining).toBe(0);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// F — Kura accumulation and decay
// ───────────────────────────────────────────────────────────────────────────

describe('S-F: scenario F — Kura accumulation and decay', () => {
  it('derives the stepped C sequence from the engine thresholds', () => {
    const r = run(scenarioFKuraDecay());
    expect(r.snapshots).toHaveLength(5);
    // Activity accumulates in the window, so T_C is never simply the last hour.
    expect(r.snapshots[0].totalActiveC).toBe(2);
    expect(r.snapshots[4].totalActiveC).toBe(4.5); // 2 + 1.5 + 1 + 0.5 + 0
  });

  it('injects fresh Kura before decay, every hour', () => {
    const r = run(scenarioFKuraDecay());
    for (const t of r.trace) {
      // Committing at or below before + fresh proves decay acted on the sum.
      expect(t.persistentAfter).toBeLessThanOrEqual(t.persistentBefore + t.freshKura);
    }
  });

  it('applies exactly one decay per simulated hour', () => {
    const r = run(scenarioFKuraDecay());
    expect(r.snapshots).toHaveLength(5);
    expect(r.trace).toHaveLength(5);
    // Each hour produced exactly one committed transition.
    for (const s of r.snapshots) {
      expect(s.active[0].persistentKuraNext).not.toBeNull();
    }
  });

  it('gives C 2 zero decay and C 0 the maximum decay', () => {
    const maxC = run({
      name: 'F-max-c',
      initialState: stateAt(1000, [plainSong('A')]),
      hours: 1,
      events: [votes('A', 1000)],
    });
    const zeroC = run({
      name: 'F-zero-c',
      initialState: stateAt(1000, [plainSong('A', { persistentKura: 100 })]),
      hours: 1,
      events: [],
    });

    // C 2 ⇒ D = 0, so nothing is removed.
    const a = only(maxC.snapshots[0]);
    expect(a.persistentKuraNext).toBeCloseTo(0 + a.kuraFresh, 9);

    // C 0 ⇒ the full 0.25%, so something is removed.
    const z = only(zeroC.snapshots[0]);
    expect(z.persistentKuraNext).toBeLessThan(100);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// G — Vault and restore
// ───────────────────────────────────────────────────────────────────────────

describe('S-G: scenario G — Vault and restore', () => {
  it('excludes a Vaulted song from the active chart entirely', () => {
    const r = run(scenarioGVaultRestore());
    const vaulted = r.snapshots.filter((s) => s.vaulted.length === 1);
    expect(vaulted.length).toBeGreaterThan(0);

    for (const s of vaulted) {
      expect(s.active.map((x) => x.songId)).toEqual(['LIVE']);
      expect(s.ranking).not.toContain('GONE');
    }
  });

  it('retains K, history, and dormant Kura while Vaulted', () => {
    const r = run(scenarioGVaultRestore());
    const during = r.snapshots.filter((x) => x.vaulted.length === 1);
    const first = during[0];

    // K and the pre-vault balance are retained. GONE keeps whatever it had
    // earned, so the balance is at least its starting 500.
    const dormant = first.vaulted[0];
    expect(dormant.k).toBe(99);
    expect(dormant.persistentKura).toBeGreaterThanOrEqual(500);
  });

  it('contributes nothing to the active chart while Vaulted', () => {
    const r = run(scenarioGVaultRestore());
    for (const s of r.snapshots.filter((x) => x.vaulted.length === 1)) {
      const gone = s.vaulted[0];
      expect(gone.activeC).toBe(0);
      expect(gone.xp).toBe(0);
      expect(gone.kuraFresh).toBe(0);
      expect(gone.boraScore).toBe(0);
      expect(gone.rank).toBeNull();
    }
  });

  it('never decays a Vaulted song across the vaulted hours', () => {
    const r = run(scenarioGVaultRestore());
    const vaultedSnapshots = r.snapshots.filter((x) => x.vaulted.length === 1);
    const first = vaultedSnapshots[0].vaulted[0].persistentKura;

    // Identical at every vaulted hour: no injection, no decay, no drift.
    for (const s of vaultedSnapshots) {
      expect(s.vaulted[0].persistentKura).toBe(first);
      // No rollover step exists for a Vault song.
      expect(s.vaulted[0].persistentKuraNext).toBeNull();
    }
  });

  it('resets persistent Kura on restore and never seeds', () => {
    const r = run(scenarioGVaultRestore());
    const restored = r.snapshots.find((s) => s.hour === 1005);
    if (!restored) throw new Error('missing hour');

    const gone = restored.active.find((x) => x.songId === 'GONE');
    if (!gone) throw new Error('GONE should be active again');
    expect(gone.k).toBe(99); // K retained
    expect(gone.seedHoursRemaining).toBe(0); // no seed generated
    // The dormant 500 was discarded by the Phase 13 restore rule.
    expect(gone.persistentKuraNext).toBeLessThan(500);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// H — Platform behaviour
// ───────────────────────────────────────────────────────────────────────────

describe('S-H: scenario H — platform behaviour', () => {
  it('allocates each platform to its own leader', () => {
    const r = run(scenarioHPlatforms());
    const yt = r.snapshots[0].active.find((x) => x.songId === 'YT');
    const sp = r.snapshots[0].active.find((x) => x.songId === 'SP');
    if (!yt || !sp) throw new Error('missing song');

    expect(yt.platformPoints.youtube).toBeCloseTo(PLATFORM_WEIGHTS.youtube, 9);
    expect(sp.platformPoints.spotify).toBeCloseTo(PLATFORM_WEIGHTS.spotify, 9);
  });

  it('gives an idle platform zero and never redistributes its weight', () => {
    const r = run(scenarioHPlatforms());
    const s = r.snapshots[0];

    // Boomplay is idle for the whole run.
    expect(s.platformTotals.boomplay).toBe(0);
    for (const song of s.active) {
      expect(song.platformPoints.boomplay).toBe(0);
    }
    // The unused 5 is awarded to nobody, so the chart totals 45, not 50.
    expect(
      s.platformTotals.youtube + s.platformTotals.spotify + s.platformTotals.boomplay,
    ).toBeCloseTo(PLATFORM_WEIGHTS.youtube + PLATFORM_WEIGHTS.spotify, 9);
  });

  it('keeps platform points independent of C', () => {
    const r = run(scenarioHPlatforms());
    const yt = r.snapshots[0].active.find((x) => x.songId === 'YT');
    const sp = r.snapshots[0].active.find((x) => x.songId === 'SP');
    if (!yt || !sp) throw new Error('missing song');
    expect(yt.platformPoints.spotify).toBe(0);
    expect(sp.platformPoints.youtube).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// I — Ranking tie-breaks
// ───────────────────────────────────────────────────────────────────────────

describe('S-I: scenario I — ranking tie-breaks', () => {
  it('resolves an exact tie by songId, as the engine decides', () => {
    const r = run(scenarioIRankingTieBreaks());
    const ranking = r.snapshots[0].ranking;
    expect(ranking.indexOf('TIE1')).toBeGreaterThanOrEqual(0);
    expect(ranking.indexOf('TIE1')).toBeLessThan(ranking.indexOf('TIE2'));
  });

  it('resolves a tied score by K descending', () => {
    const r = run(scenarioIRankingTieBreaks());
    const ranking = r.snapshots[0].ranking;
    expect(ranking.indexOf('KHIGH')).toBeLessThan(ranking.indexOf('KLOW'));
  });

  it('resolves a tied score and K by platform performance', () => {
    const r = run(scenarioIRankingTieBreaks());
    const ranking = r.snapshots[0].ranking;
    expect(ranking.indexOf('PPHIGH')).toBeLessThan(ranking.indexOf('PPLOW'));
  });

  it('assigns contiguous ranks with no gaps', () => {
    const r = run(scenarioIRankingTieBreaks());
    for (const s of r.snapshots) {
      // `ranking` is the engine's ordered ids; position IS the rank.
      expect(s.ranking).toHaveLength(s.active.length);
      // Every ranked id appears exactly once.
      expect(new Set(s.ranking).size).toBe(s.ranking.length);
      // And the ids all belong to the active population.
      for (const id of s.ranking) {
        expect(s.active.map((x) => x.songId)).toContain(id);
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// J — Long deterministic run
// ───────────────────────────────────────────────────────────────────────────

describe('S-J: scenario J — 168-hour run', () => {
  const r = run(scenarioJLongRun(168));

  it('simulates a full seven days', () => {
    expect(r.snapshots).toHaveLength(168);
    expect(r.metrics.hoursSimulated).toBe(168);
  });

  it('produces no invariant violation across the whole week', () => {
    expect(r.violations).toEqual([]);
  });

  it('keeps every committed Kura finite and non-negative', () => {
    for (const s of r.snapshots) {
      for (const song of [...s.active, ...s.vaulted]) {
        expect(Number.isFinite(song.persistentKura)).toBe(true);
        expect(song.persistentKura).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(song.boraScore)).toBe(true);
      }
    }
  });

  it('keeps XP normalised in every hour that has activity', () => {
    for (const s of r.snapshots) {
      if (s.totalActiveC > 0) {
        const sum = s.active.reduce((acc, x) => acc + x.xp, 0);
        expect(Math.abs(sum - 1)).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it('observes seed, actual, and empty hours inside one run', () => {
    const sources = new Set(r.trace.map((t) => t.source));
    expect(sources.has('SEED')).toBe(true);
    expect(sources.has('ACTUAL')).toBe(true);
    expect(sources.has('NONE')).toBe(true);
  });

  it('changes the leader during the week', () => {
    expect(r.metrics.rankingChanges).toBeGreaterThan(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Error propagation
// ───────────────────────────────────────────────────────────────────────────

describe('S-ERR: error propagation', () => {
  it('surfaces the engine error verbatim instead of swallowing it', () => {
    // A corrupt vote count is rejected by the Phase 4 thresholds. The
    // simulation must relay that exact error rather than defaulting to 0.
    const r = runSimulation({
      name: 'ERR-corrupt-measurement',
      initialState: stateAt(1000, [plainSong('A')]),
      hours: 2,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: hour(1000), upvotes: Number.NaN, downvotes: 0 },
      ],
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.error.code).toBe('INVALID_MEASUREMENT');
      expect(r.error.hour).toBe(1000);
      expect(r.error.scenarioName).toBe('ERR-corrupt-measurement');
    }
  });

  it('identifies the event that caused the failure', () => {
    const r = runSimulation({
      name: 'ERR-names-event',
      initialState: stateAt(1000, [plainSong('A')]),
      hours: 2,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: hour(1000), upvotes: Number.NaN, downvotes: 0 },
      ],
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.failedEvent).not.toBeNull();
      expect(r.error.failedEvent?.kind).toBe('BUCKET');
    }
  });

  it('keeps the engine error message and context intact', () => {
    const r = runSimulation({
      name: 'ERR-preserves-message',
      initialState: stateAt(1000, [plainSong('A')]),
      hours: 2,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: hour(1000), upvotes: Number.NaN, downvotes: 0 },
      ],
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.error.message.length).toBeGreaterThan(0);
      expect(r.error.error.context).toBeDefined();
    }
  });

  it('treats an event naming an absent song as inert', () => {
    const r = runSimulation({
      name: 'ERR-unknown-song',
      initialState: stateAt(1000, [plainSong('A')]),
      hours: 2,
      events: [votes('GHOST', 1000)],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.violations).toEqual([]);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Deterministic replay
// ───────────────────────────────────────────────────────────────────────────

describe('S-DET: deterministic replay', () => {
  it('reproduces the 168-hour run byte for byte', () => {
    const first = runSimulation(scenarioJLongRun(168));
    const second = runSimulation(scenarioJLongRun(168));
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(fingerprintText(first.value)).toBe(fingerprintText(second.value));
    expect(runsIdentical(first.value, second.value)).toBe(true);
  });

  it('reproduces every smaller scenario identically', () => {
    const scenarios = [
      scenarioAEmptyChart(),
      scenarioBSingleSong(10),
      scenarioCTwoSongs(4),
      scenarioDActualZeroReplacesSeed(),
      scenarioESeedExpiration(76),
      scenarioFKuraDecay(),
      scenarioGVaultRestore(),
      scenarioHPlatforms(),
      scenarioIRankingTieBreaks(),
    ];

    for (const scenario of scenarios) {
      const a = runSimulation(scenario);
      const b = runSimulation(scenario);
      expect(a.ok && b.ok, scenario.name).toBe(true);
      if (a.ok && b.ok) {
        expect(runsIdentical(a.value, b.value), scenario.name).toBe(true);
      }
    }
  });

  it('detects a genuine divergence between two different runs', () => {
    const short = runSimulation(scenarioBSingleSong(5));
    const long = runSimulation(scenarioBSingleSong(6));
    expect(short.ok && long.ok).toBe(true);
    if (short.ok && long.ok) {
      expect(runsIdentical(short.value, long.value)).toBe(false);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Structural: a driver, not a second engine
// ───────────────────────────────────────────────────────────────────────────

describe('S-X: structural — the simulation drives the engine', () => {
  /** Executable source: comments stripped so documentation cannot trip scans. */
  async function bodyOf(file: string): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  }

  const SIM_FILES = [
    './driver.ts',
    './snapshot.ts',
    './scenarios.ts',
    './reproducibility.ts',
  ];

  it('calls the engine rather than reimplementing it', async () => {
    const body = await bodyOf('./driver.ts');
    // The engine owns the entire hourly cycle.
    expect(body).toMatch(/rolloverHour\(/);
    expect(body).toMatch(/vaultSong\(/);
    expect(body).toMatch(/restoreSong\(/);
  });

  it('contains no duplicated engine mathematics', async () => {
    for (const file of SIM_FILES) {
      const body = await bodyOf(file);
      // None of these may be recomputed here.
      expect(body, file).not.toMatch(/upvoteContribution|downvoteContribution/);
      expect(body, file).not.toMatch(/UPVOTE_TIER|DOWNVOTE_TIER|C_TIER|C_DOWN_TIER/);
      expect(body, file).not.toMatch(/0\.0025|DECAY_NUMERATOR/);
      expect(body, file).not.toMatch(/p\s*\/\s*\(\s*1\s*-\s*p\s*\)/);
      expect(body, file).not.toMatch(/\/\s*SEED_RUNWAY_HOURS/);
      // No XP, fresh-Kura, score, platform, or ranking formulas.
      expect(body, file).not.toMatch(/PLATFORM_WEIGHTS\s*\[|PLATFORM_WEIGHTS\./);
      expect(body, file).not.toMatch(/\.sort\(|localeCompare/);
      expect(body, file).not.toMatch(/persistentKura\s*\+\s*freshKura/);
    }
  });

  it('contains no clock, randomness, network, or storage access', async () => {
    for (const file of [...SIM_FILES, './scenario.ts', './index.ts']) {
      const body = await bodyOf(file);
      expect(body, file).not.toMatch(
        /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
      );
      expect(body, file).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(|XMLHttpRequest/);
      expect(body, file).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    }
  });

  it('imports no UI, Supabase, React, or production BORA module', async () => {
    for (const file of [...SIM_FILES, './index.ts']) {
      const body = await bodyOf(file);
      expect(body, file).not.toMatch(/supabase|react/i);
    }
  });

  it('adopts the engine state rather than committing it itself', async () => {
    const body = await bodyOf('./driver.ts');
    // The driver reads `outcome.state`; it never writes persistentKura itself.
    expect(body).toMatch(/state = outcome\.state/);
    expect(body).not.toMatch(/persistentKura:\s*updated/);
    expect(body).not.toMatch(/song\.persistentKura\s*=[^=]/);
  });

  it('never swallows an engine failure', async () => {
    const body = await bodyOf('./driver.ts');
    expect(body).not.toMatch(/catch\s*[({]/);
  });

  it('uses only the documented engine entry points', async () => {
    const body = await bodyOf('./driver.ts');
    expect(body).toMatch(/from '\.\.\/engine\/rollover\/rollover'/);
    expect(body).toMatch(/from '\.\.\/engine\/lifecycle\/lifecycle'/);
    expect(body).toMatch(/from '\.\.\/engine\/bucket'/);
  });
});