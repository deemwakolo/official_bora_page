/**
 * BORA Engine <-> Backend adapter — pure mapping and readiness checks.
 *
 * Backend rows are not Engine inputs by default. Every Engine field must be
 * present and valid; explicit empty histories are valid, missing histories are
 * not. No chart-facing metric is used as a substitute for Engine state.
 */

type EngineLifecycle = 'ACTIVE' | 'VAULT';
type HourPhase = 'OPEN' | 'TRANSITION' | 'CLOSED';
type RecordLifecycle = 'ACTIVE' | 'ARCHIVED';
type RecordSource = 'ACTUAL' | 'SEED';
type PlatformSource = 'IN_CHART' | 'EXTERNAL';
type PlatformId = 'youtube' | 'spotify' | 'boomplay';

interface PlatformObservationLike {
  readonly hourIndex: number;
  readonly platform: PlatformId;
  readonly value: number;
  readonly source: PlatformSource;
  readonly lifecycle: RecordLifecycle;
  readonly version: number;
}

export interface EngineSongLike {
  readonly songId: string;
  readonly lifecycle: EngineLifecycle;
  readonly k: number;
  readonly persistentKura: number;
  readonly buckets: readonly {
    readonly hourIndex: number;
    readonly upvotes: number;
    readonly downvotes: number;
    readonly phase: HourPhase;
    readonly version: number;
  }[];
  readonly seedHours: readonly {
    readonly hourIndex: number;
    readonly c: number;
    readonly source: RecordSource;
    readonly lifecycle: RecordLifecycle;
    readonly version: number;
    readonly originEventId?: string;
  }[];
  readonly platform: Readonly<
    Record<PlatformId, readonly PlatformObservationLike[]>
  >;
}

export interface BackendSongRow {
  readonly id?: unknown;
  readonly k?: unknown;
  readonly persistent_kura?: unknown;
  readonly persistentKura?: unknown;
  readonly lifecycle?: unknown;
  readonly status?: unknown;
  readonly buckets?: unknown;
  readonly seedHours?: unknown;
  readonly platform?: unknown;
}

export type EngineGapField =
  | 'songs'
  | 'songId'
  | 'k'
  | 'persistentKura'
  | 'lifecycle'
  | 'buckets'
  | 'seedHours'
  | 'youtubeObservations'
  | 'spotifyObservations'
  | 'boomplayObservations'
  | 'referenceHour'
  | 'closedHourC';

export interface EngineDataGap {
  readonly field: EngineGapField;
  readonly songId?: string;
  readonly availability: 'unavailable' | 'invalid';
  readonly reason: string;
  readonly blocking: boolean;
}

export interface SkippedBackendRow {
  readonly index: number;
  readonly songId: string | null;
  readonly reason: string;
}

export interface BackendEngineMapResult {
  readonly songs: EngineSongLike[];
  readonly gaps: EngineDataGap[];
  readonly skipped: SkippedBackendRow[];
}

export interface BuiltInputLike {
  readonly songs: EngineSongLike[];
  readonly referenceHour: number;
  readonly closedHourC: number | null;
}

export interface BuildEngineInputOptions {
  readonly closedHourC?: number | null;
}

export type BuildEngineInputResult =
  | {
      readonly status: 'ready';
      readonly value: BuiltInputLike;
      readonly gaps: EngineDataGap[];
      readonly skipped: SkippedBackendRow[];
    }
  | {
      readonly status: 'not-ready';
      readonly gaps: EngineDataGap[];
      readonly skipped: SkippedBackendRow[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeFinite(value) && Number.isInteger(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function makeGap(
  field: EngineGapField,
  availability: EngineDataGap['availability'],
  reason: string,
  songId?: string,
): EngineDataGap {
  return { field, availability, reason, songId, blocking: true };
}

function isBucket(
  value: unknown,
): value is EngineSongLike['buckets'][number] {
  if (!isRecord(value)) return false;
  return (
    isInteger(value.hourIndex) &&
    isNonNegativeInteger(value.upvotes) &&
    isNonNegativeInteger(value.downvotes) &&
    (value.phase === 'OPEN' ||
      value.phase === 'TRANSITION' ||
      value.phase === 'CLOSED') &&
    isNonNegativeInteger(value.version)
  );
}

function isSeedHour(
  value: unknown,
): value is EngineSongLike['seedHours'][number] {
  if (!isRecord(value)) return false;
  return (
    isInteger(value.hourIndex) &&
    isNonNegativeFinite(value.c) &&
    value.c <= 2 &&
    (value.source === 'ACTUAL' || value.source === 'SEED') &&
    (value.lifecycle === 'ACTIVE' || value.lifecycle === 'ARCHIVED') &&
    isNonNegativeInteger(value.version) &&
    (value.originEventId === undefined ||
      typeof value.originEventId === 'string')
  );
}

function isPlatformObservation(
  value: unknown,
  platform: PlatformId,
): boolean {
  if (!isRecord(value)) return false;
  return (
    isInteger(value.hourIndex) &&
    value.platform === platform &&
    isNonNegativeFinite(value.value) &&
    (value.source === 'IN_CHART' || value.source === 'EXTERNAL') &&
    (value.lifecycle === 'ACTIVE' || value.lifecycle === 'ARCHIVED') &&
    isNonNegativeInteger(value.version)
  );
}

function readArray<T>(
  row: Record<string, unknown>,
  key: string,
  field: EngineGapField,
  songId: string,
  validate: (value: unknown) => value is T,
  label: string,
  gaps: EngineDataGap[],
): T[] | null {
  const value = row[key];
  if (!Array.isArray(value)) {
    const availability = hasOwn(row, key) ? 'invalid' : 'unavailable';
    gaps.push(makeGap(
      field,
      availability,
      availability === 'unavailable'
        ? `Song ${songId}: ${label} are unavailable; provide an explicit array.`
        : `Song ${songId}: ${label} must be an array.`,
      songId,
    ));
    return null;
  }

  if (!value.every(validate)) {
    gaps.push(makeGap(
      field,
      'invalid',
      `Song ${songId}: ${label} contain an invalid Engine record.`,
      songId,
    ));
    return null;
  }
  return value;
}

export function mapBackendSongsToEngineSongs(
  rows: readonly unknown[],
): BackendEngineMapResult {
  const songs: EngineSongLike[] = [];
  const gaps: EngineDataGap[] = [];
  const skipped: SkippedBackendRow[] = [];

  rows.forEach((raw, index) => {
    if (!isRecord(raw)) {
      const reason = `Row ${index} is not a song record.`;
      gaps.push(makeGap('songId', 'invalid', reason));
      skipped.push({ index, songId: null, reason });
      return;
    }

    const songId = asNonEmptyString(raw.id);
    if (songId === null) {
      const availability = hasOwn(raw, 'id') ? 'invalid' : 'unavailable';
      const reason = `Row ${index} has ${availability === 'invalid' ? 'an invalid' : 'no'} song id.`;
      gaps.push(makeGap('songId', availability, reason));
      skipped.push({ index, songId: null, reason });
      return;
    }

    const rowGaps: EngineDataGap[] = [];
    const k = raw.k;
    if (!isNonNegativeInteger(k)) {
      const availability = hasOwn(raw, 'k') ? 'invalid' : 'unavailable';
      rowGaps.push(makeGap(
        'k',
        availability,
        availability === 'unavailable'
          ? `Song ${songId}: historical K is unavailable; momentum_score is not K.`
          : `Song ${songId}: K must be a finite, non-negative integer.`,
        songId,
      ));
    }

    const rawPersistentKura =
      raw.persistent_kura !== undefined
        ? raw.persistent_kura
        : raw.persistentKura;
    const persistentKuraFieldPresent =
      hasOwn(raw, 'persistent_kura') || hasOwn(raw, 'persistentKura');
    if (!isNonNegativeFinite(rawPersistentKura)) {
      rowGaps.push(makeGap(
        'persistentKura',
        persistentKuraFieldPresent ? 'invalid' : 'unavailable',
        persistentKuraFieldPresent
          ? `Song ${songId}: persistent Kura must be finite and non-negative.`
          : `Song ${songId}: persistent Kura is unavailable; it cannot be initialized from a missing field.`,
        songId,
      ));
    }

    const rawLifecycle =
      raw.lifecycle !== undefined ? raw.lifecycle : raw.status;
    const lifecycleFieldPresent =
      hasOwn(raw, 'lifecycle') || hasOwn(raw, 'status');
    if (rawLifecycle !== 'ACTIVE' && rawLifecycle !== 'VAULT') {
      rowGaps.push(makeGap(
        'lifecycle',
        lifecycleFieldPresent ? 'invalid' : 'unavailable',
        lifecycleFieldPresent
          ? `Song ${songId}: lifecycle must be ACTIVE or VAULT.`
          : `Song ${songId}: lifecycle is unavailable.`,
        songId,
      ));
    }

    const buckets = readArray(
      raw, 'buckets', 'buckets', songId, isBucket, 'hourly vote buckets', rowGaps,
    );
    const seedHours = readArray(
      raw, 'seedHours', 'seedHours', songId, isSeedHour, 'seed-hour records', rowGaps,
    );

    const rawPlatform = raw.platform;
    const platformRecord = isRecord(rawPlatform) ? rawPlatform : null;
    const platform: Partial<Record<PlatformId, PlatformObservationLike[]>> = {};
    for (const id of ['youtube', 'spotify', 'boomplay'] as const) {
      const field = `${id}Observations` as EngineGapField;
      if (!platformRecord) {
        const availability =
          hasOwn(raw, 'platform') ? 'invalid' : 'unavailable';
        rowGaps.push(makeGap(
          field,
          availability,
          availability === 'unavailable'
            ? `Song ${songId}: ${id} observations are unavailable; provide an explicit array.`
            : `Song ${songId}: platform observations must be an object.`,
          songId,
        ));
        continue;
      }

      const value = platformRecord[id];
      if (!Array.isArray(value)) {
        const availability = hasOwn(platformRecord, id)
          ? 'invalid'
          : 'unavailable';
        rowGaps.push(makeGap(
          field,
          availability,
          availability === 'unavailable'
            ? `Song ${songId}: ${id} observations are unavailable; provide an explicit array.`
            : `Song ${songId}: ${id} observations must be an array.`,
          songId,
        ));
        continue;
      }
      const observations = value.filter(
        (entry): entry is PlatformObservationLike =>
          isPlatformObservation(entry, id),
      );
      if (observations.length !== value.length) {
        rowGaps.push(makeGap(
          field,
          'invalid',
          `Song ${songId}: ${id} observations contain an invalid Engine record.`,
          songId,
        ));
        continue;
      }
      platform[id] = observations;
    }

    if (
      rowGaps.length > 0 ||
      buckets === null ||
      seedHours === null ||
      !isNonNegativeInteger(k) ||
      !isNonNegativeFinite(rawPersistentKura) ||
      (rawLifecycle !== 'ACTIVE' && rawLifecycle !== 'VAULT') ||
      !platform.youtube ||
      !platform.spotify ||
      !platform.boomplay
    ) {
      gaps.push(...rowGaps);
      skipped.push({
        index,
        songId,
        reason: rowGaps[0]?.reason ?? `Song ${songId} is not a complete Engine input.`,
      });
      return;
    }

    songs.push({
      songId,
      lifecycle: rawLifecycle,
      k,
      persistentKura: rawPersistentKura,
      buckets,
      seedHours,
      platform: {
        youtube: platform.youtube,
        spotify: platform.spotify,
        boomplay: platform.boomplay,
      },
    });
  });

  return { songs, gaps, skipped };
}

export function toReferenceHour(nowMs: number): number {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(
      'toReferenceHour: nowMs must be finite non-negative epoch-ms (got ' +
      String(nowMs) + ').',
    );
  }
  return Math.floor(nowMs / 3600000);
}

export function currentReferenceHour(): number {
  return toReferenceHour(Date.now());
}

export function buildEngineInputFromBackendRows(
  rows: readonly unknown[],
  referenceHour: number | undefined,
  opts: BuildEngineInputOptions = {},
): BuildEngineInputResult {
  const gaps: EngineDataGap[] = [];

  if (referenceHour === undefined) {
    gaps.push(makeGap(
      'referenceHour',
      'unavailable',
      'Evaluation reference hour is unavailable; supply it explicitly.',
    ));
  } else if (!Number.isFinite(referenceHour) || !Number.isInteger(referenceHour)) {
    gaps.push(makeGap(
      'referenceHour',
      'invalid',
      `Evaluation reference hour must be a finite integer (got ${String(referenceHour)}).`,
    ));
  }

  if (!Object.prototype.hasOwnProperty.call(opts, 'closedHourC') ||
      opts.closedHourC === undefined) {
    gaps.push(makeGap(
      'closedHourC',
      'unavailable',
      'Closed-hour C state is unavailable; pass null explicitly when no hourly cycle applies.',
    ));
  } else if (
    opts.closedHourC !== null &&
    (!Number.isFinite(opts.closedHourC) ||
      opts.closedHourC < 0 ||
      opts.closedHourC > 2)
  ) {
    gaps.push(makeGap(
      'closedHourC',
      'invalid',
      `Closed-hour C must be null or a finite value within [0, 2] (got ${String(opts.closedHourC)}).`,
    ));
  }

  const mapped = mapBackendSongsToEngineSongs(rows);
  gaps.push(...mapped.gaps);
  const allGaps = gaps;
  const skipped = mapped.skipped;
  if (allGaps.some((gap) => gap.blocking) || skipped.length > 0) {
    return { status: 'not-ready', gaps: allGaps, skipped };
  }

  return {
    status: 'ready',
    value: {
      songs: mapped.songs,
      referenceHour: referenceHour as number,
      closedHourC: opts.closedHourC as number | null,
    },
    gaps: allGaps,
    skipped,
  };
}
