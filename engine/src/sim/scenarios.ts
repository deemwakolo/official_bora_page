/**
 * BORA Engine — deterministic simulation: scenario fixtures
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 16 (continued). The required laboratory scenarios, A through J.
 *
 * Every scenario is explicit data: no randomness, no clock, no environment.
 * Each returns a fresh `SimulationScenario`, so a test may run one twice and
 * obtain byte-identical inputs.
 *
 * NOTHING HERE COMPUTES ENGINE MATHEMATICS. Vote counts are chosen so the
 * engine's own threshold table produces a known C — 5 upvotes yields C 2 — but
 * the mapping is never applied locally.
 *
 * PURE: no clock, no randomness, no I/O.
 */

import { createSeedRunway } from '../engine/rollover/rollover';
import type { SimulationScenario, SimulationEvent } from './scenario';
import type { EngineState, RolloverSong } from '../engine/rollover/rollover';
import type { HourIndex, PlatformSeries } from '../engine/types';

const NO_PLATFORM: PlatformSeries = { youtube: [], spotify: [], boomplay: [] };
const hour = (n: number) => n as HourIndex;

/** A song with no history, no seed, and no platform activity. */
export function plainSong(
  songId: string,
  overrides: Partial<RolloverSong> = {},
): RolloverSong {
  return {
    songId,
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura: 0,
    buckets: [],
    seedHours: [],
    platform: NO_PLATFORM,
    ...overrides,
  };
}

/** Wrap songs into a state at an explicit reference hour. */
export function stateAt(
  referenceHour: number,
  songs: RolloverSong[],
): EngineState {
  return { referenceHour: hour(referenceHour), songs };
}

/** A BUCKET the engine's thresholds turn into C 2. */
export function votes(songId: string, h: number): SimulationEvent {
  return { kind: 'BUCKET', songId, hour: hour(h), upvotes: 5, downvotes: 0 };
}

/** A BUCKET the engine turns into C 1 (a single upvote). */
export function lowVotes(songId: string, h: number): SimulationEvent {
  return { kind: 'BUCKET', songId, hour: hour(h), upvotes: 1, downvotes: 0 };
}

/**
 * A real bucket whose effective C is 0.
 *
 * It is still an ACTUAL bucket, so the engine must treat it as real activity
 * that SUPPRESSES any seed for that hour.
 */
export function zeroBucket(songId: string, h: number): SimulationEvent {
  return { kind: 'BUCKET', songId, hour: hour(h), upvotes: 0, downvotes: 0 };
}

/** A fresh, seeded runway of 72 hours starting at `startHour`. */
export function runwayFrom(startHour: number): RolloverSong['seedHours'] {
  const runway = createSeedRunway(72, hour(startHour));
  if (!runway.ok) throw new Error(runway.error.message);
  return runway.value;
}

// ───────────────────────────────────────────────────────────────────────────
// A — Empty chart
// ───────────────────────────────────────────────────────────────────────────

export function scenarioAEmptyChart(): SimulationScenario {
  return { name: 'A-empty-chart', initialState: stateAt(1000, []), hours: 5, events: [] };
}

// ───────────────────────────────────────────────────────────────────────────
// B — Single active song, C = 2 every hour
// ───────────────────────────────────────────────────────────────────────────

export function scenarioBSingleSong(hours = 10): SimulationScenario {
  const events: SimulationEvent[] = [];
  for (let h = 1000; h < 1000 + hours + 2; h++) {
    events.push(votes('A', h));
  }
  return {
    name: 'B-single-song',
    initialState: stateAt(1000, [plainSong('A')]),
    hours,
    events,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// C — Two-song competition: A at C 2, B at C 1
// ───────────────────────────────────────────────────────────────────────────

export function scenarioCTwoSongs(hours = 4): SimulationScenario {
  const events: SimulationEvent[] = [];
  for (let h = 1000; h < 1000 + hours + 2; h++) {
    events.push(votes('A', h));
    events.push(lowVotes('B', h));
  }
  return {
    name: 'C-two-songs',
    initialState: stateAt(1000, [plainSong('A'), plainSong('B')]),
    hours,
    events,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// D — Actual C = 0 replacing a seed
// ───────────────────────────────────────────────────────────────────────────

/**
 * A seeded song that receives a real but empty bucket at hour 1001.
 *
 * The seed covers 1000…1071, so hour 1001 would otherwise resolve to the seeded
 * value. The injected bucket has zero votes, so the engine must resolve that
 * hour to 0 — not to the seed, and not to seed plus 0.
 */
export function scenarioDActualZeroReplacesSeed(): SimulationScenario {
  return {
    name: 'D-actual-zero-replaces-seed',
    initialState: stateAt(1000, [plainSong('S', { seedHours: runwayFrom(1000) })]),
    hours: 4,
    events: [zeroBucket('S', 1001)],
  };
}

/** The same song without the zero bucket, for direct comparison. */
export function scenarioDControl(): SimulationScenario {
  return {
    name: 'D-control',
    initialState: stateAt(1000, [plainSong('S', { seedHours: runwayFrom(1000) })]),
    hours: 4,
    events: [],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// E — Seed runway expiration, crossing the 72-hour boundary
// ───────────────────────────────────────────────────────────────────────────

/**
 * A full runway created at hour 1000, simulated past its final seeded hour.
 *
 * The runway covers 1000…1071, so hour 1072 is the first hour with no seed at
 * all. That boundary is what this scenario must cross.
 */
export function scenarioESeedExpiration(hours = 76): SimulationScenario {
  return {
    name: 'E-seed-expiration',
    initialState: stateAt(1000, [plainSong('S', { seedHours: runwayFrom(1000) })]),
    hours,
    events: [],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// F — Kura accumulation and decay across varying C
// ───────────────────────────────────────────────────────────────────────────

/**
 * Five hours of stepped activity. The vote counts are chosen so the ENGINE
 * derives the locked C sequence 2, 1.5, 1, 0.5, 0 through its own thresholds.
 */
export function scenarioFKuraDecay(): SimulationScenario {
  const events: SimulationEvent[] = [
    { kind: 'BUCKET', songId: 'A', hour: hour(1000), upvotes: 5, downvotes: 0 },
    { kind: 'BUCKET', songId: 'A', hour: hour(1001), upvotes: 5, downvotes: 2 },
    { kind: 'BUCKET', songId: 'A', hour: hour(1002), upvotes: 1, downvotes: 0 },
    { kind: 'BUCKET', songId: 'A', hour: hour(1003), upvotes: 0, downvotes: 1 },
    { kind: 'BUCKET', songId: 'A', hour: hour(1004), upvotes: 0, downvotes: 5 },
  ];

  return {
    name: 'F-kura-decay',
    initialState: stateAt(1000, [plainSong('A')]),
    hours: 5,
    events,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// G — Vault, then restore
// ───────────────────────────────────────────────────────────────────────────

export function scenarioGVaultRestore(hours = 8): SimulationScenario {
  const events: SimulationEvent[] = [];

  for (let h = 1000; h < 1000 + hours; h++) {
    events.push(votes('LIVE', h));
    events.push(votes('GONE', h));
  }
  // GONE is vaulted at hour 1002 and restored at hour 1005.
  events.push({ kind: 'VAULT', songId: 'GONE', hour: hour(1002) });
  events.push({ kind: 'RESTORE', songId: 'GONE', hour: hour(1005) });

  return {
    name: 'G-vault-restore',
    initialState: stateAt(1000, [
      plainSong('LIVE', { k: 10, persistentKura: 20 }),
      plainSong('GONE', { k: 99, persistentKura: 500 }),
    ]),
    hours,
    events,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// H — Platform behaviour
// ───────────────────────────────────────────────────────────────────────────

/**
 * One song owning YouTube alone, another owning Spotify, Boomplay idle.
 *
 * With per-platform normalisation, the YouTube leader takes the whole 30 and
 * the Spotify leader the whole 15, while the idle Boomplay contributes 0 and
 * its 5 is NOT handed to anyone.
 */
export function scenarioHPlatforms(hours = 6): SimulationScenario {
  const events: SimulationEvent[] = [];

  for (let h = 1000; h < 1000 + hours + 2; h++) {
    events.push(votes('YT', h));
    events.push(lowVotes('SP', h));
    events.push({
      kind: 'PLATFORM', songId: 'YT', hour: hour(h), platform: 'youtube', value: 500,
    });
    events.push({
      kind: 'PLATFORM', songId: 'SP', hour: hour(h), platform: 'spotify', value: 300,
    });
    // Boomplay stays completely idle for the whole run.
  }

  return {
    name: 'H-platforms',
    initialState: stateAt(1000, [plainSong('YT'), plainSong('SP')]),
    hours,
    events,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// I — Ranking tie-breaks, one level at a time
// ───────────────────────────────────────────────────────────────────────────

/**
 * Each tie-break level is constructed explicitly rather than left to chance:
 * an exact tie resolved by songId, a tie resolved by K, and a tie on both
 * resolved by platform performance.
 */
export function scenarioIRankingTieBreaks(hours = 4): SimulationScenario {
  const events: SimulationEvent[] = [];

  for (let h = 1000; h < 1000 + hours + 2; h++) {
    // TIE1/TIE2 are identical on Kura, K, and platform, so only songId decides.
    events.push(votes('TIE1', h));
    events.push(votes('TIE2', h));
    // KLOW/KHIGH share Kura, and K decides.
    events.push(votes('KLOW', h));
    events.push(votes('KHIGH', h));
    // PPLOW/PPHIGH share Kura and K, and platform performance decides.
    events.push(votes('PPLOW', h));
    events.push(votes('PPHIGH', h));

    events.push({
      kind: 'PLATFORM', songId: 'PPHIGH', hour: hour(h), platform: 'youtube', value: 900,
    });
    events.push({
      kind: 'PLATFORM', songId: 'PPLOW', hour: hour(h), platform: 'youtube', value: 100,
    });
  }

  return {
    name: 'I-ranking-tie-breaks',
    initialState: stateAt(1000, [
      plainSong('TIE1', { k: 5 }),
      plainSong('TIE2', { k: 5 }),
      plainSong('KLOW', { k: 1 }),
      plainSong('KHIGH', { k: 50 }),
      plainSong('PPLOW', { k: 0 }),
      plainSong('PPHIGH', { k: 0 }),
    ]),
    hours,
    events,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// J — A 168-hour controlled run (7 days)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Seven days mixing every behaviour the laboratory supports.
 *
 * The pattern is fixed arithmetic, not randomness: each song follows a
 * repeating six-hour cycle, so the whole week is predictable while still
 * changing C, ranking, and platform totals many times over.
 */
export function scenarioJLongRun(hours = 168): SimulationScenario {
  const events: SimulationEvent[] = [];

  for (let h = 1000; h < 1000 + hours; h++) {
    const phase = h % 6;

    // ALPHA is always active; its volume cycles between C 2 and C 1.
    events.push(
      phase < 3
        ? { kind: 'BUCKET', songId: 'ALPHA', hour: hour(h), upvotes: 5, downvotes: 0 }
        : { kind: 'BUCKET', songId: 'ALPHA', hour: hour(h), upvotes: 1, downvotes: 0 },
    );

    // BETA joins on the second day and cycles the other way.
    if (h >= 1010) {
      events.push(
        phase === 0
          ? { kind: 'BUCKET', songId: 'BETA', hour: hour(h), upvotes: 5, downvotes: 0 }
          : { kind: 'BUCKET', songId: 'BETA', hour: hour(h), upvotes: 1, downvotes: 1 },
      );
    }

    // GAMMA is seeded, and also receives real buckets at some hours, so the
    // actual-over-seed seam is exercised inside the long run.
    if (phase === 2) {
      events.push(votes('GAMMA', h));
    } else if (phase === 3) {
      events.push(zeroBucket('GAMMA', h));
    }

    // DELTA is present the whole week, vaulted mid-run and restored near the end.
    events.push(lowVotes('DELTA', h));

    // Platform activity drifts with the same six-hour phase.
    events.push({
      kind: 'PLATFORM',
      songId: 'ALPHA',
      hour: hour(h),
      platform: 'youtube',
      value: phase * 100,
    });
    events.push({
      kind: 'PLATFORM',
      songId: 'BETA',
      hour: hour(h),
      platform: 'spotify',
      value: (5 - phase) * 50,
    });
  }

  events.push({ kind: 'VAULT', songId: 'DELTA', hour: hour(1080) });
  events.push({ kind: 'RESTORE', songId: 'DELTA', hour: hour(1150) });

  return {
    name: 'J-long-run',
    initialState: stateAt(1000, [
      plainSong('ALPHA', { k: 100, persistentKura: 10 }),
      plainSong('BETA', { k: 50 }),
      plainSong('GAMMA', { k: 25, seedHours: runwayFrom(1000) }),
      plainSong('DELTA', { k: 7, persistentKura: 300 }),
    ]),
    hours,
    events,
  };
}