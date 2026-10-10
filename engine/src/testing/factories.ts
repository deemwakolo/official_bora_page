/**
 * BORA Engine — deterministic test factories
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every builder is deterministic: no Date.now(), no Math.random().
 * Times and hour indices are always supplied explicitly, so a test that fails
 * today fails identically tomorrow (Contract Phase 3, Contract Phase 45).
 */

import { HOUR_MS, MINUTE_MS, C_MAX, KURA_TOTAL } from '../engine/constants';
import type {
  SimTime,
  HourIndex,
  Song,
  SongLifecycle,
  HourlyCRecord,
  VoteBucket,
  PlatformObservation,
  PlatformSeries,
  KuraState,
  KEvent,
  ExternalEntry,
  VaultInterval,
  CHistorySource,
  RecordLifecycle,
  PlatformSource,
  PlatformId,
} from '../engine/types';

/** A fixed, arbitrary epoch. Nothing in the engine may care what it is. */
export const T0 = 1_700_000_000_000 as SimTime;

export const asTime = (ms: number): SimTime => ms as SimTime;
export const asHour = (h: number): HourIndex => h as HourIndex;

/** Hour index containing a given SimTime. */
export const hourOf = (t: SimTime): HourIndex =>
  Math.floor(t / HOUR_MS) as HourIndex;

/** Start of a given hour. */
export const hourStart = (h: HourIndex): SimTime =>
  (h * HOUR_MS) as SimTime;

export const addHours = (t: SimTime, n: number): SimTime =>
  (t + n * HOUR_MS) as SimTime;

export const addMinutes = (t: SimTime, n: number): SimTime =>
  (t + n * MINUTE_MS) as SimTime;

// ───────────────────────────────────────────────────────────────────────────
// SUB-RECORD FACTORIES
// ───────────────────────────────────────────────────────────────────────────

export function makeKuraState(over: Partial<KuraState> = {}): KuraState {
  return {
    fresh: 0,
    persistent: 0,
    decayedTotal: 0,
    cycleCount: 0,
    lastDecayHour: null,
    ...over,
  };
}

export function makeVoteBucket(
  hourIndex: HourIndex,
  over: Partial<VoteBucket> = {},
): VoteBucket {
  return {
    hourIndex,
    upvotes: 0,
    downvotes: 0,
    phase: 'CLOSED',
    version: 0,
    ...over,
  };
}

export function makeHourlyC(
  hourIndex: HourIndex,
  c: number,
  source: CHistorySource = 'ACTUAL',
  lifecycle: RecordLifecycle = 'ACTIVE',
  over: Partial<HourlyCRecord> = {},
): HourlyCRecord {
  return {
    hourIndex,
    c,
    source,
    lifecycle,
    version: 0,
    originEventId: `evt-${hourIndex}`,
    ...over,
  };
}

export function makeObservation(
  hourIndex: HourIndex,
  platform: PlatformId,
  value: number,
  source: PlatformSource = 'IN_CHART',
  lifecycle: RecordLifecycle = 'ACTIVE',
  over: Partial<PlatformObservation> = {},
): PlatformObservation {
  return {
    hourIndex,
    platform,
    value,
    source,
    lifecycle,
    version: 0,
    ...over,
  };
}

export function makePlatformSeries(
  over: Partial<PlatformSeries> = {},
): PlatformSeries {
  return {
    youtube: [],
    spotify: [],
    boomplay: [],
    ...over,
  };
}

export function makeKEvent(
  over: Partial<KEvent> = {},
): KEvent {
  return {
    eventId: 'evt-0',
    at: T0,
    hourIndex: hourOf(T0),
    deltaK: 0,
    kAfter: 0,
    ...over,
  };
}

export function makeExternalEntry(
  over: Partial<ExternalEntry> = {},
): ExternalEntry {
  return {
    enteredAt: T0,
    enteredAtHour: hourOf(T0),
    input: { youtube: 0, spotify: 0, boomplay: 0 },
    e: 0,
    p: 0,
    cSeed: 0,
    tCAtEntry: 0,
    cSeedPerHour: 0,
    seedConsumed: true,
    ...over,
  };
}

export function makeVaultInterval(
  over: Partial<VaultInterval> = {},
): VaultInterval {
  return {
    from: T0,
    fromHour: hourOf(T0),
    to: null,
    toHour: null,
    kuraAtVault: 0,
    cActiveAtVault: 0,
    ...over,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// SONG FACTORY
// ───────────────────────────────────────────────────────────────────────────

export function makeSong(over: Partial<Song> = {}): Song {
  const id = over.id ?? 'song-1';
  return {
    id,
    title: `Title ${id}`,
    artist: `Artist ${id}`,
    lifecycle: 'ACTIVE' as SongLifecycle,
    createdAt: T0,
    k: 0,
    kLog: [],
    hours: [],
    votes: [],
    platform: makePlatformSeries(),
    kura: makeKuraState(),
    vaultHistory: [],
    scoreVersion: 0,
    ...over,
  };
}

/**
 * Build a song with a flat run of ACTUAL hourly C values ending at `endHour`.
 * The most common fixture in the suite.
 */
export function makeSongWithFlatC(
  endHour: HourIndex,
  cPerHour: number,
  count: number,
  over: Partial<Song> = {},
): Song {
  const hours: HourlyCRecord[] = [];
  for (let i = count - 1; i >= 0; i--) {
    hours.push(
      makeHourlyC((endHour - i) as HourIndex, Math.min(cPerHour, C_MAX), 'ACTUAL'),
    );
  }
  const cActive = hours.reduce((a, r) => a + r.c, 0);
  return makeSong({
    ...over,
    hours,
    kura: makeKuraState({ fresh: cActive > 0 ? KURA_TOTAL : 0 }),
  });
}
