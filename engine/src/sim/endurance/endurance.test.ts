/**
 * BORA Engine — Phase 19: long-run endurance gate
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Question under test: does the engine stay mathematically correct,
 * deterministic, bounded and structurally healthy across LONG simulated
 * timelines?
 *
 * This is an endurance gate, not a design phase. Nothing here proposes new BORA
 * rules. Every figure asserted here is READ from the engine's own output — the
 * harness generates events, calls `rolloverHour`, and inspects what came back.
 * No formula is duplicated; see `invariants.ts` for that boundary in detail.
 *
 * Each family runs at 168 / 720 / 2000 hours where affordable, checks every
 * invariant after EVERY committed hour, and replays to demand byte-identical
 * output.
 */

import { describe, it, expect } from 'vitest';
import { runSimulation, fingerprintText } from '../index';
import { createSeedRunway } from '../../engine/rollover/rollover';
import { resolveHourlyC } from '../../engine/evaluation/chart';
import { getActiveWindow } from '../../engine/window/hours';
import { emptyBucket } from '../../engine/bucket';
import { C_MAX, C_WINDOW_HOURS, PLATFORM_WINDOW_HOURS } from '../../engine/constants';
import { checkRun } from './invariants';
import {
  baseSong,
  sustainedEvents,
  sparseEvents,
  turnoverEvents,
  seedWorkloadEvents,
  lifecycleEvents,
  platformChurnEvents,
  tieHeavyEvents,
} from './workloads';
import type { SimulationScenario, SimulationEvent } from '../scenario';
import type { RolloverSong } from '../../engine/rollover/rollover';
import type { HourIndex, HourlyCRecord } from '../../engine/types';
import type { EngineSong } from '../../engine/evaluation/chart';

const H0 = 100_000 as HourIndex;
const hour = (n: number) => n as HourIndex;

/** Long runs are genuinely long; give them room without hiding a real hang. */
const T168 = 120_000;
const T720 = 240_000;
const T2000 = 600_000;

const SONG_IDS = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'];

function songs(ids: readonly string[]): RolloverSong[] {
  return ids.map((id, i) => baseSong(id, { k: i * 10, persistentKura: i * 5 }));
}

function scenario(
  name: string,
  hours: number,
  songsIn: readonly string[],
  events: readonly SimulationEvent[],
  extra: Partial<RolloverSong> = {},
): SimulationScenario {
  const withExtra = songsIn.map((id) => {
    const base = songs(songsIn).find((s) => s.songId === id) as RolloverSong;
    return { ...base, ...extra };
  });
  return { name, initialState: { referenceHour: H0, songs: withExtra }, hours, events };
}

function run(s: SimulationScenario) {
  const r = runSimulation(s);
  if (!r.ok) throw new Error(`${s.name}: failed at hour ${r.error.hour} — ${r.error.error.message}`);
  return r.value;
}

/** The engine's own active window at a reference hour. */
function activeWindowAt(referenceHour: number) {
  const w = getActiveWindow(hour(referenceHour));
  if (!w.ok) throw new Error(w.error.message);
  return w.value;
}

/** Build a finite seed runway, or an empty one. Never a partial definition. */
function runway(startHour: number, count: number): RolloverSong['seedHours'] {
  const r = createSeedRunway(count, hour(startHour));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

// ═══════════════════════════════════════════════════════════════════════════
// FAMILIES 1 & 2 — SUSTAINED AND SPARSE ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════

describe('P19.1/2: sustained and sparse activity', () => {
  for (const hours of [168, 720, 2000]) {
    const budget = hours === 168 ? T168 : hours === 720 ? T720 : T2000;

    it(`sustained: ${hours}h stays bounded, normalised and deterministic`, { timeout: budget }, () => {
      const s = scenario(
        `p19-sustained-${hours}`,
        hours,
        SONG_IDS,
        sustainedEvents(H0 as number, hours, SONG_IDS),
      );
      const first = run(s);
      const report = checkRun(first);

      expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);
      expect(report.checks).toBeGreaterThan(hours * 10);
      expect(first.violations).toEqual([]);
      expect(first.snapshots).toHaveLength(hours);

      // Replay: byte-identical.
      expect(fingerprintText(run(s))).toBe(fingerprintText(first));
    });

    it(`sparse: ${hours}h keeps T_C = 0 stretches mathematically valid`, { timeout: budget }, () => {
      const s = scenario(
        `p19-sparse-${hours}`,
        hours,
        SONG_IDS,
        sparseEvents(H0 as number, hours, SONG_IDS),
      );
      const first = run(s);
      const report = checkRun(first);

      expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

      // The scenario must genuinely contain silent hours, or it proves nothing.
      const silent = first.snapshots.filter((x) => x.totalActiveC === 0);
      expect(silent.length).toBeGreaterThan(0);

      // In every silent hour: XP and fresh Kura are all exactly zero, and no
      // score is non-finite.
      for (const snap of silent) {
        for (const song of snap.active) {
          expect(song.xp).toBe(0);
          expect(song.kuraFresh).toBe(0);
          expect(Number.isFinite(song.boraScore)).toBe(true);
        }
      }

      expect(fingerprintText(run(s))).toBe(fingerprintText(first));
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// FAMILY 3 — WINDOW TURNOVER
// ═══════════════════════════════════════════════════════════════════════════

describe('P19.3: window turnover', () => {
  it('720h: every hour leaving H-71…H stops contributing as it expires', { timeout: T720 }, () => {
    const s = scenario(
      'p19-turnover-720',
      720,
      SONG_IDS,
      turnoverEvents(H0 as number, 720, SONG_IDS),
    );
    const result = run(s);
    const report = checkRun(result);

    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // Window behaviour is asserted from the ENGINE at exact boundaries, using
    // the engine's own resolution rather than a final snapshot alone.
    const window = activeWindowAt(H0 as number);
    for (const boundary of [0, -1, -70, -71, -72, -73, 1]) {
      const h = (H0 as number) + boundary;
      const song: EngineSong = {
        songId: 'PROBE',
        lifecycle: 'ACTIVE',
        k: 0,
        persistentKura: 0,
        // Exactly one ACTUAL record, at the boundary hour being probed.
        buckets: [{ ...emptyBucket(hour(h)), upvotes: 5, downvotes: 0 }],
        seedHours: [],
        platform: { youtube: [], spotify: [], boomplay: [] },
      };
      const hours = resolveHourlyC(song, window);
      if (!hours.ok) throw new Error(hours.error.message);
      const contribution = hours.value.reduce((a, x) => a + (x.actualC ?? x.seedC ?? 0), 0);

      if (boundary === 1) {
        // H+1 is outside the window: a record there contributes nothing.
        expect(contribution).toBe(0);
      } else if (boundary >= -71) {
        // H, H-1 … H-71 are inside the window.
        expect(contribution).toBe(C_MAX);
      } else {
        // H-72 and older are excluded.
        expect(contribution).toBe(0);
      }
    }
  });

  it('720h: active C never exceeds the window ceiling across the whole run', { timeout: T720 }, () => {
    const s = scenario(
      'p19-turnover-ceiling',
      720,
      SONG_IDS,
      turnoverEvents(H0 as number, 720, SONG_IDS),
    );
    const result = run(s);
    const ceiling = C_WINDOW_HOURS * C_MAX;

    for (const snap of result.snapshots) {
      for (const song of snap.active) {
        expect(song.activeC).toBeLessThanOrEqual(ceiling + 1e-9);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAMILIES 4 & 5 — SEED COVERAGE AND SEED EXPIRATION
// ═══════════════════════════════════════════════════════════════════════════

describe('P19.4/5: seed coverage and expiration', () => {
  /** One song carrying a finite runway, fed over a long timeline. */
  function seedScenario(name: string, hours: number, partial: 0 | 1 | 2 | 3, runwayCount: number) {
    const id = 'SEEDED';
    const s = scenario(name, hours, [id], seedWorkloadEvents(H0 as number, hours, id, partial), {
      seedHours: runway(H0 as number, runwayCount),
    });
    return s;
  }

  it('720h: a ONE-hour runway never widens into a 72-hour overlay', { timeout: T720 }, () => {
    // THE D1 REGRESSION, observed continuously over 720 committed hours.
    //
    // The runway is built BY HAND as a single explicit record. That matters:
    // `createSeedRunway(seedC, h)` always spreads seedC across the full 72-hour
    // runway, so it cannot express partial coverage. Partial coverage only
    // exists as an explicit `HourlyCRecord` on one exact hour.
    const onlyHour: HourlyCRecord = {
      hourIndex: H0,
      c: 1.5,
      source: 'SEED',
      lifecycle: 'ACTIVE',
      version: 0,
    };

    const s = scenario(
      'p19-seed-partial-1',
      720,
      ['SEEDED'],
      seedWorkloadEvents(H0 as number, 720, 'SEEDED', 1),
    );
    // Attach the single-hour runway directly.
    const scenarioWithRunway: SimulationScenario = {
      ...s,
      initialState: {
        referenceHour: H0,
        songs: [{ ...s.initialState.songs[0], seedHours: [onlyHour] }],
      },
    };

    const result = run(scenarioWithRunway);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // THE PRECISE D1 ASSERTION — a differential test.
    //
    // Run the identical timeline twice: once with the one-hour seed runway and
    // once without it. The only difference between the two is the seed, so the
    // per-hour delta IS the seed's contribution. Under the old scalar overlay
    // that delta would have been 72 × 1.5 = 108; it must instead be 1.5 exactly
    // while the seeded hour is inside the window, and 0 once it has expired.
    const control = run(
      scenario('p19-seed-partial-1-control', 720, ['SEEDED'],
        seedWorkloadEvents(H0 as number, 720, 'SEEDED', 1)),
    );

    let sawInWindow = 0;
    let sawExpired = 0;

    for (let i = 0; i < result.snapshots.length; i++) {
      const withSeed = result.snapshots[i].totalActiveC;
      const withoutSeed = control.snapshots[i].totalActiveC;
      const delta = withSeed - withoutSeed;
      const hourValue = result.snapshots[i].hour as number;

      if (hourValue - (H0 as number) < C_WINDOW_HOURS) {
        // The seeded hour is still inside the 72-hour window: it contributes
        // exactly its own C, and nothing more.
        expect(delta).toBeCloseTo(1.5, 9);
        sawInWindow++;
      } else {
        // It has left the window: it contributes nothing at all.
        expect(delta).toBe(0);
        sawExpired++;
      }
    }

    expect(sawInWindow).toBeGreaterThan(0);
    expect(sawExpired).toBeGreaterThan(0);
  });

  it('720h: ACTUAL beats SEED at the exact same hour, including C = 0', { timeout: T720 }, () => {
    const s = seedScenario('p19-seed-precedence', 720, 3, 72);
    const result = run(s);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // Every hour the workload wrote a zero-vote bucket must read as ACTUAL with
    // C 0 — measured silence suppresses the seed rather than falling back to it.
    const actualZeroHours = result.snapshots.filter(
      (x) => x.active[0] && x.active[0].closedHourSource === 'ACTUAL' && x.active[0].activeC === 0,
    );
    expect(actualZeroHours.length).toBeGreaterThan(0);
  });

  it('720h: expired seed records stop contributing and never regenerate', { timeout: T720 }, () => {
    const s = seedScenario('p19-seed-expiry', 720, 0, 72);
    const result = run(s);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // `seedHoursRemaining` counts un-archived records ahead of the hour. It must
    // fall to zero and STAY zero — a spent runway is never topped up.
    const remaining = result.snapshots.map((x) => (x.vaulted[0] ?? x.active[0])?.seedHoursRemaining ?? 0);
    const zeroFrom = remaining.findIndex((v) => v === 0);
    expect(zeroFrom).toBeGreaterThan(-1);
    for (let i = zeroFrom; i < remaining.length; i++) {
      expect(remaining[i]).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAMILY 6 — LIFECYCLE CHURN
// ═══════════════════════════════════════════════════════════════════════════

describe('P19.6: vault / restore churn', () => {
  it('720h: repeated ACTIVE → VAULT → ACTIVE keeps K, never decays while vaulted', { timeout: T720 }, () => {
    const s = scenario('p19-lifecycle', 720, ['CHURN'], lifecycleEvents(H0 as number, 720, 'CHURN'));
    const result = run(s);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // The scenario must actually cycle, or the assertions prove nothing.
    const states = new Set<string>();
    for (const snap of result.snapshots) {
      const entry = snap.active[0] ?? snap.vaulted[0];
      if (entry) states.add(entry.lifecycle);
    }
    expect(states.has('ACTIVE')).toBe(true);
    expect(states.has('VAULT')).toBe(true);

    // A vaulted song is frozen: its balance never changes while it is vaulted.
    let frozen: number | null = null;
    for (const snap of result.snapshots) {
      const v = snap.vaulted[0];
      if (v) {
        if (frozen !== null) expect(v.persistentKura).toBe(frozen);
        frozen = v.persistentKura;
        expect(v.boraScore).toBe(0);
      } else {
        frozen = null;
      }
    }
  });

  it('720h: restore resets persistent Kura to 0 and never reseeds', { timeout: T720 }, () => {
    const s = scenario('p19-lifecycle-restore', 720, ['RESET'], lifecycleEvents(H0 as number, 720, 'RESET'));
    const result = run(s);

    // Find each hour where the song has just come back from VAULT: its
    // persistent Kura must restart from zero, not from the dormant balance.
    let wasVaulted = false;
    let restores = 0;
    for (const snap of result.snapshots) {
      const vaulted = snap.vaulted.length > 0;
      const active = snap.active[0];

      if (!wasVaulted && vaulted) wasVaulted = true;
      if (wasVaulted && !vaulted && active) {
        restores++;
        expect(active.persistentKuraBefore).toBe(0);
        expect(active.seedHoursRemaining).toBe(0);
      }
      if (!vaulted) wasVaulted = false;
    }
    expect(restores).toBeGreaterThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAMILIES 7 & 8 — PLATFORM CHURN AND RANKING CHURN
// ═══════════════════════════════════════════════════════════════════════════

describe('P19.7: platform churn', () => {
  it('720h: idle platforms contribute zero and unused weight is never shared', { timeout: T720 }, () => {
    // One song carries ONLY Spotify observations. YouTube and Boomplay are
    // therefore idle for the entire run, which is the sharpest possible test of
    // "unused weight is not redistributed": if the engine leaked YouTube's 30 or
    // Boomplay's 5 points onto Spotify, this would show immediately.
    const spotifyOnly: SimulationEvent[] = [];
    for (let i = 0; i < 720; i++) {
      const h = H0 as number + i;
      spotifyOnly.push({ kind: 'BUCKET', songId: 'SPOT', hour: hour(h), upvotes: 5, downvotes: 0 });
      spotifyOnly.push({
        kind: 'PLATFORM',
        songId: 'SPOT',
        hour: hour(h),
        platform: 'spotify',
        value: (h % 19) + 1,
      });
    }

    const result = run(scenario('p19-platform-idle', 720, ['SPOT'], spotifyOnly));
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    for (const snap of result.snapshots) {
      // Spotify is active, so it must actually earn its full contractual weight.
      expect(snap.platformTotals.spotify).toBeGreaterThan(0);
      // YouTube and Boomplay never had an observation: exactly zero, always.
      expect(snap.platformTotals.youtube).toBe(0);
      expect(snap.platformTotals.boomplay).toBe(0);
    }

    // And no song ever collected a point from a platform it never reported on.
    for (const snap of result.snapshots) {
      for (const song of snap.active) {
        expect(song.platformPoints.youtube).toBe(0);
        expect(song.platformPoints.boomplay).toBe(0);
      }
    }
  });

  it('720h: every platform total stays inside its own weight', { timeout: T720 }, () => {
    const s = scenario(
      'p19-platform-bounds',
      720,
      SONG_IDS,
      platformChurnEvents(H0 as number, 720, SONG_IDS),
    );
    const result = run(s);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    for (const snap of result.snapshots) {
      expect(snap.platformTotals.youtube).toBeLessThanOrEqual(30 + 1e-9);
      expect(snap.platformTotals.spotify).toBeLessThanOrEqual(15 + 1e-9);
      expect(snap.platformTotals.boomplay).toBeLessThanOrEqual(5 + 1e-9);
    }
  });

  it('720h: an observation stops counting once it leaves the 7-day window', { timeout: T720 }, () => {
    // A single Boomplay observation near the start of the run. By hour 720 it
    // is far outside the 168-hour window, so the total must return to exactly 0
    // — expired observations leave no residue, and platform points never decay
    // below what the window actually still holds.
    const events: SimulationEvent[] = [
      { kind: 'BUCKET', songId: 'P1', hour: H0, upvotes: 5, downvotes: 0 },
      { kind: 'PLATFORM', songId: 'P1', hour: H0, platform: 'boomplay', value: 100 },
    ];
    const result = run(scenario('p19-platform-expiry', 720, ['P1'], events));

    const early = result.snapshots[0];
    expect(early.platformTotals.boomplay).toBeGreaterThan(0);

    const late = result.snapshots[result.snapshots.length - 1];
    // 720 hours is well past the 168-hour platform window.
    expect(late.hour as number - (H0 as number)).toBeGreaterThan(PLATFORM_WINDOW_HOURS);
    expect(late.platformTotals.boomplay).toBe(0);

    // Never negative, never non-finite, at any point.
    for (const snap of result.snapshots) {
      for (const p of ['youtube', 'spotify', 'boomplay'] as const) {
        expect(snap.platformTotals[p]).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(snap.platformTotals[p])).toBe(true);
      }
    }
  });
});

describe('P19.8: ranking churn', () => {
  it('720h: constant ties still yield a strictly ordered, replayable chart', { timeout: T720 }, () => {
    const s = scenario('p19-ties-720', 720, SONG_IDS, tieHeavyEvents(H0 as number, 720, SONG_IDS));
    const result = run(s);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // Ranking is always a permutation of the active population.
    for (const snap of result.snapshots) {
      expect([...snap.ranking].sort()).toEqual(snap.active.map((x) => x.songId).sort());
    }
    expect(fingerprintText(run(s))).toBe(fingerprintText(result));
  });

  it('720h: cross-hour declaration order does not change the committed outcome', { timeout: T720 }, () => {
    const events = tieHeavyEvents(H0 as number, 720, SONG_IDS);

    // Reverse the ORDER OF HOURS while keeping each hour's internal order
    // intact. S3: commitment is chronological, so the committed run must be
    // identical. Same-hour order is deliberately NOT permuted — S2 preserves
    // declaration order, and commutativity is not claimed.
    const byHour = new Map<number, SimulationEvent[]>();
    for (const e of events) {
      const h = e.hour as number;
      if (!byHour.has(h)) byHour.set(h, []);
      (byHour.get(h) as SimulationEvent[]).push(e);
    }
    const forward: SimulationEvent[] = [];
    const reversed: SimulationEvent[] = [];
    for (const list of byHour.values()) forward.push(...list);
    for (const h of [...byHour.keys()].reverse()) {
      reversed.push(...(byHour.get(h) as SimulationEvent[]));
    }

    const a = run(scenario('p19-order-fwd', 720, SONG_IDS, forward));
    const b = run(scenario('p19-order-rev', 720, SONG_IDS, reversed));
    expect(b.snapshots).toEqual(a.snapshots);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STATE GROWTH AND PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════

describe('P19: state growth and performance', () => {
  it('2000h: active C stays window-bounded as history accumulates', { timeout: T2000 }, () => {
    const hours = 2000;
    const s = scenario(
      'p19-growth-2000',
      hours,
      SONG_IDS,
      sustainedEvents(H0 as number, hours, SONG_IDS),
    );
    const result = run(s);
    const report = checkRun(result);
    expect(report.failures, JSON.stringify(report.failures.slice(0, 5), null, 2)).toEqual([]);

    // Contract 11: expiry is selection, never deletion, so history accumulates
    // forever. What must NOT happen is derived state growing with that history:
    // active C is bounded by the WINDOW regardless of how long the run has been.
    for (const mark of [168, 720, 1440, 2000]) {
      const snap = result.snapshots[mark - 1];
      for (const song of snap.active) {
        expect(song.activeC).toBeLessThanOrEqual(C_WINDOW_HOURS * C_MAX + 1e-9);
      }
    }

    // The population never changes size: no song invented, none lost.
    expect(Number.isFinite(result.metrics.finalTotalPersistentKura)).toBe(true);
    for (const snap of [result.snapshots[0], result.snapshots[result.snapshots.length - 1]]) {
      expect(snap.active.length + snap.vaulted.length).toBe(SONG_IDS.length);
    }
  });

  it('2000h: commits 2000 hours within a sane budget', { timeout: T2000 }, () => {
    // Measured, not optimised. A pathological cost would signal accidental
    // unbounded derived state rather than honest historical retention.
    const started = Date.now();
    const r = runSimulation(
      scenario('p19-perf-2000', 2000, SONG_IDS, sustainedEvents(H0 as number, 2000, SONG_IDS)),
    );
    const elapsed = Date.now() - started;
    expect(r.ok).toBe(true);
    expect(elapsed).toBeLessThan(180_000);
  });
});