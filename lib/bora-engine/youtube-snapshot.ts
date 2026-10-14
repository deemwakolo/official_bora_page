import 'server-only';

import type { YouTubeDataApiResult } from './youtube-data-api';

export interface YouTubeSongVideoMapping {
  readonly songId: string;
  readonly videoId: string;
}

export interface YouTubeCumulativeSnapshot {
  readonly songId: string;
  readonly videoId: string;
  readonly metric: 'cumulative_views';
  readonly unit: 'views_total';
  readonly value: string;
  readonly retrievedAt: string;
  readonly provider: 'youtube-data-api-v3';
  readonly sourceStatus: 'observed';
  readonly snapshotIdentity: {
    readonly sourceSystem: 'youtube-data-api-v3';
    /** Stable capture ID: reuse it when retrying persistence of this snapshot. */
    readonly sourceObservationId: string;
  };
  readonly version: number;
  readonly supersedesSnapshotId: string | null;
}

export type YouTubeSnapshotResult =
  | { readonly status: 'observed'; readonly snapshot: YouTubeCumulativeSnapshot }
  | { readonly status: 'missing'; readonly videoId: string }
  | {
      readonly status: 'unavailable';
      readonly reason: 'api-key-not-configured' | 'provider-unreachable';
    }
  | {
      readonly status: 'failed';
      readonly errorCode:
        | 'invalid-mapping'
        | 'invalid-capture-id'
        | 'invalid-revision'
        | 'provider-api-error'
        | 'malformed-response'
        | 'invalid-measurement';
    };

export type YouTubeSnapshotDerivation =
  | { readonly status: 'unavailable-snapshot' }
  | {
      readonly status: 'invalid-pair';
      readonly reason:
        | 'identity-mismatch'
        | 'same-snapshot'
        | 'not-chronological'
        | 'invalid-snapshot'
        | 'invalid-count'
        | 'negative-difference';
    }
  | {
      readonly status: 'non-hourly-measurement';
      readonly reason: 'interval-not-one-hour' | 'boundaries-not-utc-hour-aligned';
      readonly startAt: string;
      readonly endAt: string;
      readonly elapsedMs: number;
      readonly difference: string;
    }
  | {
      readonly status: 'hourly-measurement-candidate';
      readonly songId: string;
      readonly videoId: string;
      readonly difference: string;
      readonly periodStart: string;
      readonly periodEnd: string;
      readonly elapsedMs: number;
      readonly startSnapshotId: string;
      readonly endSnapshotId: string;
      /** The current Engine contract cannot honestly encode an end-boundary delta. */
      readonly engineObservation: null;
      readonly engineIncompatibility: 'end-snapshot-is-exclusive-period-end';
    };

const SONG_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const HOUR_MS = 3_600_000;

function normalizeUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) {
    return null;
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const normalized = new Date(milliseconds).toISOString();
  return normalized.slice(0, 19) === value.slice(0, 19) ? normalized : null;
}

function normalizeCount(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return value.replace(/^0+(?=\d)/, '');
}

function compareCounts(left: string, right: string): number {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  return left === right ? 0 : left < right ? -1 : 1;
}

function subtractCounts(end: string, start: string): string {
  let borrow = 0;
  let output = '';
  for (let index = end.length - 1; index >= 0; index -= 1) {
    let digit = Number(end[index]) - borrow -
      (index >= end.length - start.length
        ? Number(start[index - (end.length - start.length)])
        : 0);
    if (digit < 0) {
      digit += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
    output = `${digit}${output}`;
  }
  return output.replace(/^0+(?=\d)/, '');
}

export function createYouTubeCumulativeSnapshot(input: {
  readonly mapping: YouTubeSongVideoMapping;
  readonly captureId: string;
  readonly providerResult: YouTubeDataApiResult;
  readonly version?: number;
  readonly supersedesSnapshotId?: string | null;
}): YouTubeSnapshotResult {
  if (!input || typeof input !== 'object') {
    return { status: 'failed', errorCode: 'invalid-mapping' };
  }
  const { mapping, captureId, providerResult } = input;
  if (
    !mapping ||
    !SONG_ID_PATTERN.test(mapping.songId) ||
    !VIDEO_ID_PATTERN.test(mapping.videoId)
  ) {
    return { status: 'failed', errorCode: 'invalid-mapping' };
  }
  if (!UUID_PATTERN.test(captureId)) {
    return { status: 'failed', errorCode: 'invalid-capture-id' };
  }
  if (
    !providerResult ||
    typeof providerResult !== 'object' ||
    !('status' in providerResult)
  ) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }

  if (providerResult.status === 'missing') {
    return { status: 'missing', videoId: providerResult.videoId };
  }
  if (providerResult.status === 'unavailable') {
    return providerResult;
  }
  if (providerResult.status === 'failed') {
    return providerResult.errorCode === 'invalid-video-id'
      ? { status: 'failed', errorCode: 'invalid-mapping' }
      : { status: 'failed', errorCode: providerResult.errorCode };
  }
  if (providerResult.measurement.videoId !== mapping.videoId) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }

  const value = normalizeCount(providerResult.measurement.value);
  const retrievedAt = normalizeUtcTimestamp(
    providerResult.measurement.retrievedAt,
  );
  const version = input.version ?? 0;
  const supersedesSnapshotId = input.supersedesSnapshotId ?? null;
  if (
    value === null ||
    providerResult.measurement.metric !== 'cumulative_views' ||
    providerResult.measurement.unit !== 'views_total'
  ) {
    return { status: 'failed', errorCode: 'invalid-measurement' };
  }
  if (!retrievedAt) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }
  if (
    !Number.isSafeInteger(version) ||
    version < 0 ||
    (version === 0 && supersedesSnapshotId !== null) ||
    (version > 0 &&
      (!supersedesSnapshotId ||
        !UUID_PATTERN.test(supersedesSnapshotId)))
  ) {
    return { status: 'failed', errorCode: 'invalid-revision' };
  }

  return validateYouTubeCumulativeSnapshot({
    songId: mapping.songId,
    videoId: mapping.videoId,
    metric: 'cumulative_views',
    unit: 'views_total',
    value,
    retrievedAt,
    provider: 'youtube-data-api-v3',
    sourceStatus: 'observed',
    snapshotIdentity: {
      sourceSystem: 'youtube-data-api-v3',
      sourceObservationId: captureId.toLowerCase(),
    },
    version,
    supersedesSnapshotId,
  });
}

export function validateYouTubeCumulativeSnapshot(
  value: unknown,
): YouTubeSnapshotResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }
  const candidate = value as Partial<YouTubeCumulativeSnapshot>;
  if (
    typeof candidate.songId !== 'string' ||
    !SONG_ID_PATTERN.test(candidate.songId) ||
    typeof candidate.videoId !== 'string' ||
    !VIDEO_ID_PATTERN.test(candidate.videoId) ||
    candidate.metric !== 'cumulative_views' ||
    candidate.unit !== 'views_total' ||
    candidate.provider !== 'youtube-data-api-v3' ||
    candidate.sourceStatus !== 'observed' ||
    !candidate.snapshotIdentity ||
    candidate.snapshotIdentity.sourceSystem !== 'youtube-data-api-v3' ||
    typeof candidate.snapshotIdentity.sourceObservationId !== 'string' ||
    !UUID_PATTERN.test(candidate.snapshotIdentity.sourceObservationId) ||
    !Number.isSafeInteger(candidate.version) ||
    (candidate.version as number) < 0 ||
    (candidate.version === 0 && candidate.supersedesSnapshotId !== null) ||
    (candidate.version !== 0 &&
      (typeof candidate.supersedesSnapshotId !== 'string' ||
        !UUID_PATTERN.test(candidate.supersedesSnapshotId)))
  ) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }
  const normalizedValue = normalizeCount(candidate.value);
  const retrievedAt = normalizeUtcTimestamp(candidate.retrievedAt);
  if (normalizedValue === null) {
    return { status: 'failed', errorCode: 'invalid-measurement' };
  }
  if (!retrievedAt) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }

  return {
    status: 'observed',
    snapshot: {
      songId: candidate.songId,
      videoId: candidate.videoId,
      metric: 'cumulative_views',
      unit: 'views_total',
      value: normalizedValue,
      retrievedAt,
      provider: 'youtube-data-api-v3',
      sourceStatus: 'observed',
      snapshotIdentity: {
        sourceSystem: 'youtube-data-api-v3',
        sourceObservationId:
          candidate.snapshotIdentity.sourceObservationId.toLowerCase(),
      },
      version: candidate.version as number,
      supersedesSnapshotId: candidate.supersedesSnapshotId ?? null,
    },
  };
}

export function deriveYouTubeHourlyMeasurement(
  start: YouTubeCumulativeSnapshot | { readonly status: 'unavailable' },
  end: YouTubeCumulativeSnapshot | { readonly status: 'unavailable' },
): YouTubeSnapshotDerivation {
  if (!start || !end) {
    return { status: 'unavailable-snapshot' };
  }
  if (
    'status' in start && start.status === 'unavailable' ||
    'status' in end && end.status === 'unavailable'
  ) {
    return { status: 'unavailable-snapshot' };
  }

  const validatedStart = validateYouTubeCumulativeSnapshot(start);
  const validatedEnd = validateYouTubeCumulativeSnapshot(end);
  if (
    validatedStart.status !== 'observed' ||
    validatedEnd.status !== 'observed'
  ) {
    return { status: 'invalid-pair', reason: 'invalid-snapshot' };
  }
  const startSnapshot = validatedStart.snapshot;
  const endSnapshot = validatedEnd.snapshot;

  if (
    startSnapshot.songId !== endSnapshot.songId ||
    startSnapshot.videoId !== endSnapshot.videoId
  ) {
    return { status: 'invalid-pair', reason: 'identity-mismatch' };
  }
  if (
    startSnapshot.snapshotIdentity.sourceObservationId ===
    endSnapshot.snapshotIdentity.sourceObservationId
  ) {
    return { status: 'invalid-pair', reason: 'same-snapshot' };
  }
  const startAt = normalizeUtcTimestamp(startSnapshot.retrievedAt);
  const endAt = normalizeUtcTimestamp(endSnapshot.retrievedAt);
  const startCount = normalizeCount(startSnapshot.value);
  const endCount = normalizeCount(endSnapshot.value);
  if (!startAt || !endAt || startCount === null || endCount === null) {
    return { status: 'invalid-pair', reason: 'invalid-count' };
  }
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (endMs <= startMs) {
    return { status: 'invalid-pair', reason: 'not-chronological' };
  }
  if (compareCounts(endCount, startCount) < 0) {
    return { status: 'invalid-pair', reason: 'negative-difference' };
  }

  const difference = subtractCounts(endCount, startCount);
  const elapsedMs = endMs - startMs;
  if (elapsedMs !== HOUR_MS) {
    return {
      status: 'non-hourly-measurement',
      reason: 'interval-not-one-hour',
      startAt,
      endAt,
      elapsedMs,
      difference,
    };
  }
  if (startMs % HOUR_MS !== 0 || endMs % HOUR_MS !== 0) {
    return {
      status: 'non-hourly-measurement',
      reason: 'boundaries-not-utc-hour-aligned',
      startAt,
      endAt,
      elapsedMs,
      difference,
    };
  }

  return {
    status: 'hourly-measurement-candidate',
    songId: startSnapshot.songId,
    videoId: startSnapshot.videoId,
    difference,
    periodStart: startAt,
    periodEnd: endAt,
    elapsedMs,
    startSnapshotId: startSnapshot.snapshotIdentity.sourceObservationId,
    endSnapshotId: endSnapshot.snapshotIdentity.sourceObservationId,
    engineObservation: null,
    engineIncompatibility: 'end-snapshot-is-exclusive-period-end',
  };
}
