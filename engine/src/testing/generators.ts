/**
 * BORA Engine — Phase 18: deterministic property generators
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Property-based testing needs many inputs, but the engine and the whole test
 * suite must stay DETERMINISTIC. No `Math.random()` is used anywhere.
 *
 * A tiny linear congruential generator supplies the variation instead. It is
 * seeded explicitly, so every "random" case is reproducible from its seed: a
 * property failure can always be replayed by printing the seed.
 *
 * This file lives under `src/testing/`, alongside the existing factories and
 * comparison helpers. It is excluded from the application build and never
 * imported by `src/engine/**`.
 *
 * PURE: no clock, no environment, no global mutable state beyond the generator
 * instance itself, which is created per test and never shared.
 */

import { createSeedRunway } from '../engine/rollover/rollover';
import { emptyBucket } from '../engine/bucket';
import type { SimulationEvent } from '../sim/scenario';
import type { EngineState, RolloverSong } from '../engine/rollover/rollover';
import type { HourIndex, VoteBucket, PlatformId } from '../engine/types';

const hour = (n: number) => n as HourIndex;

/**
 * A seeded, reproducible pseudo-random source.
 *
 * The same seed always yields the same sequence, which is the property that
 * makes a generated property failure reproducible rather than a one-off.
 */
export class DeterministicRng {
  /** The seed that produced this sequence, retained for reproduction. */
  readonly seed: number;

  private state: number;

  constructor(seed: number) {
    this.seed = seed;
    // Any non-zero modulus seed keeps the LCG in its full period.
    this.state = (seed % 2147483647) || 1;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state * 48271) % 2147483647;
    return this.state / 2147483647;
  }

  /** Uniform integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Uniform element of a non-empty list. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** True with the given probability. */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/** A raw vote pair that is always VALID for the engine's thresholds. */
export function randomVotes(rng: DeterministicRng): { upvotes: number; downvotes: number } {
  return {
    upvotes: rng.int(0, 12),
    downvotes: rng.int(0, 6),
  };
}

/** A populated bucket at an explicit hour. */
export function randomBucket(rng: DeterministicRng, at: HourIndex): VoteBucket {
  const { upvotes, downvotes } = randomVotes(rng);
  return { ...emptyBucket(at), upvotes, downvotes };
}

/** A song carrying random but always-valid state. */
export function randomSong(
  rng: DeterministicRng,
  songId: string,
  referenceHour: HourIndex,
): RolloverSong {
  const span = rng.int(0, 40);
  const buckets: VoteBucket[] = [];

  for (let i = 0; i < span; i++) {
    buckets.push(randomBucket(rng, hour((referenceHour as number) - i)));
  }

  const platform = {
    youtube: maybeObservations(rng, referenceHour, 'youtube'),
    spotify: maybeObservations(rng, referenceHour, 'spotify'),
    boomplay: maybeObservations(rng, referenceHour, 'boomplay'),
  };

  return {
    songId,
    // A mix, so Vault exclusion is exercised by generated populations too.
    lifecycle: rng.chance(0.25) ? 'VAULT' : 'ACTIVE',
    k: rng.int(0, 1000),
    persistentKura: rng.int(0, 500),
    buckets,
    seedHours: rng.chance(0.3)
      ? seedRunwayOrEmpty(rng, referenceHour)
      : [],
    platform,
  };
}

/**
 * Platform observations for one platform, with DISTINCT hours.
 *
 * Uniqueness is enforced deliberately: the engine rejects two observations for
 * the same (platform, hour) slot, so a generator that produced duplicates would
 * be testing invalid input rather than the property under examination.
 */
function maybeObservations(
  rng: DeterministicRng,
  referenceHour: HourIndex,
  platform: PlatformId,
) {
  if (!rng.chance(0.6)) return [];

  const start = referenceHour as number;
  const count = rng.int(1, 6);
  // A contiguous block guarantees uniqueness without any rejection sampling.
  const offset = rng.int(0, 100);
  const out = [];

  for (let i = 0; i < count; i++) {
    out.push({
      hourIndex: hour(start - offset - i),
      platform,
      value: rng.int(0, 500),
      source: 'IN_CHART' as const,
      lifecycle: 'ACTIVE' as const,
      version: 0,
    });
  }

  return out;
}

/** A full 72-hour runway, or nothing at all. Never a partial one. */
function seedRunwayOrEmpty(rng: DeterministicRng, referenceHour: HourIndex) {
  // PHASE 22: the total is capped at SEED_RUNWAY_HOURS * C_MAX (= 144) so that
  // every per-hour share lands inside the canonical seeded-hourly-C domain
  // [0, C_MAX]. The previous range of 0..200 could emit a runway of 200/72
  // ~= 2.78 per hour, which the engine must -- and now does -- reject. A
  // harness that manufactures out-of-contract input tests a rejection path, not
  // the mathematics.
  const runway = createSeedRunway(rng.int(0, 144), referenceHour);
  return runway.ok ? runway.value : [];
}

/** A random but VALID engine state. */
export function randomState(rng: DeterministicRng, size?: number): EngineState {
  const referenceHour = hour(rng.int(0, 50_000));
  const count = size ?? rng.int(1, 8);
  const songs: RolloverSong[] = [];

  for (let i = 0; i < count; i++) {
    songs.push(randomSong(rng, `s${i}`, referenceHour));
  }

  return { referenceHour, songs };
}

/**
 * A short deterministic event list addressed at the state's own hour.
 *
 * Each (songId, hour) pair is emitted AT MOST ONCE. The driver upserts a
 * bucket per hour, so two BUCKET events for the same song and hour would
 * silently overwrite rather than duplicate — but the state can already hold a
 * bucket at that hour, so the generator starts from a known-clean offset and
 * keeps every event distinct.
 */
export function randomEvents(
  rng: DeterministicRng,
  state: EngineState,
  count: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const start = state.referenceHour as number;
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    const song = rng.pick(state.songs);
    const at = hour(start + rng.int(0, 5));
    const key = `${song.songId}@${at}`;

    // One event per (song, hour): a repeat would be a no-op, not a duplicate,
    // but keeping them distinct makes the replay intent obvious.
    if (used.has(key)) continue;
    used.add(key);

    const { upvotes, downvotes } = randomVotes(rng);
    events.push({ kind: 'BUCKET', songId: song.songId, hour: at, upvotes, downvotes });
  }

  return events;
}