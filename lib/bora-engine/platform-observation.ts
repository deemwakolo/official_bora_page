import { HOUR_MS } from '../../engine/src/engine/constants';
import type { PlatformId, PlatformSource } from '../../engine/src/engine/types';

/** Values must describe activity in the supplied one-hour period, not lifetime totals. */
export type PlatformMetric = 'video_views' | 'track_streams';
export type PlatformMetricUnit = 'views_per_hour' | 'streams_per_hour';

export type PlatformObservationInput = {
  readonly songId: string;
  readonly platform: PlatformId;
  readonly observedAt: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly metric: PlatformMetric;
  readonly unit: PlatformMetricUnit;
  readonly value: number;
  readonly source: PlatformSource;
  readonly sourceSystem: string;
  /** Stable across retries; new corrections use a new ID and supersede the old row. */
  readonly sourceObservationId: string;
  readonly providerReference?: string;
  readonly supersedesObservationId?: string | null;
};

export interface PreparedPlatformObservation
  extends Omit<PlatformObservationInput, 'observedAt' | 'periodStart' | 'periodEnd'> {
  readonly observedAt: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly hourIndex: number;
}

interface CollectionTarget {
  readonly songId: string;
  readonly platform: PlatformId;
  readonly hourIndex: number;
  readonly sourceSystem: string;
}

export type PlatformCollectionResult =
  | {
      readonly status: 'observed';
      readonly observation: PreparedPlatformObservation;
    }
  | (CollectionTarget & {
      /** Collection completed successfully and found no observation. */
      readonly status: 'missing';
      readonly detail?: string;
    })
  | (CollectionTarget & {
      readonly status: 'unavailable';
      readonly detail: string;
    })
  | (CollectionTarget & {
      readonly status: 'failed';
      readonly errorCode: string;
      readonly errorMessage: string;
    });

export type PlatformObservationPreparation =
  | { readonly ok: true; readonly value: PlatformCollectionResult }
  | {
      readonly ok: false;
      readonly reason:
        | 'invalid-result'
        | 'invalid-song-id'
        | 'unsupported-platform'
        | 'invalid-hour'
        | 'invalid-source'
        | 'invalid-status'
        | 'invalid-observation'
        | 'unsupported-metric'
        | 'invalid-value'
        | 'invalid-timestamp'
        | 'invalid-source-identity'
        | 'invalid-correction-reference';
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;
const PLATFORMS: readonly PlatformId[] = [
  'youtube',
  'spotify',
  'boomplay',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseTimestamp(value: unknown): { utc: string; epochMs: number } | null {
  if (typeof value !== 'string') return null;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, , zone] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  const secondNumber = Number(second);
  const leapYear =
    yearNumber % 4 === 0 &&
    (yearNumber % 100 !== 0 || yearNumber % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][monthNumber - 1];

  if (
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > daysInMonth ||
    hourNumber > 23 ||
    minuteNumber > 59 ||
    secondNumber > 59
  ) {
    return null;
  }

  let offsetMs = 0;
  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
    const direction = zone[0] === '+' ? 1 : -1;
    offsetMs = direction * (offsetHour * 60 + offsetMinute) * 60_000;
  }

  const localDate = new Date(0);
  localDate.setUTCFullYear(yearNumber, monthNumber - 1, dayNumber);
  localDate.setUTCHours(hourNumber, minuteNumber, secondNumber, 0);
  const epochMs = localDate.getTime() - offsetMs;
  if (!Number.isFinite(epochMs)) return null;

  const fraction = match[7] ?? '';
  const fractionalMs = Number((fraction + '000').slice(0, 3));
  const normalizedEpochMs = epochMs + fractionalMs;
  return {
    utc: new Date(normalizedEpochMs).toISOString(),
    epochMs: normalizedEpochMs,
  };
}

function isPlatform(value: unknown): value is PlatformId {
  return typeof value === 'string' &&
    PLATFORMS.includes(value as PlatformId);
}

function isMetricForPlatform(
  platform: PlatformId,
  metric: unknown,
  unit: unknown,
): metric is PlatformMetric {
  if (platform === 'youtube') {
    return metric === 'video_views' && unit === 'views_per_hour';
  }
  return metric === 'track_streams' && unit === 'streams_per_hour';
}

function validTarget(
  value: Record<string, unknown>,
): value is Record<string, unknown> & CollectionTarget {
  return (
    typeof value.songId === 'string' &&
    UUID_PATTERN.test(value.songId) &&
    isPlatform(value.platform) &&
    typeof value.hourIndex === 'number' &&
    Number.isSafeInteger(value.hourIndex) &&
    isNonEmptyString(value.sourceSystem)
  );
}

/**
 * Validate and normalize one provider collection result. This function is
 * pure: it does not persist data, fill missed hours, or call a provider.
 */
export function preparePlatformCollectionResult(
  input: unknown,
): PlatformObservationPreparation {
  if (!isRecord(input)) return { ok: false, reason: 'invalid-result' };

  if (input.status !== 'observed') {
    if (!validTarget(input)) {
      if (typeof input.songId !== 'string' || !UUID_PATTERN.test(input.songId)) {
        return { ok: false, reason: 'invalid-song-id' };
      }
      if (!isPlatform(input.platform)) {
        return { ok: false, reason: 'unsupported-platform' };
      }
      if (
        typeof input.hourIndex !== 'number' ||
        !Number.isSafeInteger(input.hourIndex)
      ) {
        return { ok: false, reason: 'invalid-hour' };
      }
      return { ok: false, reason: 'invalid-source' };
    }

    if (input.status === 'missing') {
      if (
        input.detail !== undefined &&
        !isNonEmptyString(input.detail)
      ) {
        return { ok: false, reason: 'invalid-status' };
      }
      return {
        ok: true,
        value: {
          status: 'missing',
          songId: input.songId,
          platform: input.platform,
          hourIndex: input.hourIndex,
          sourceSystem: input.sourceSystem,
          ...(input.detail === undefined ? {} : { detail: input.detail }),
        },
      };
    }

    if (input.status === 'unavailable') {
      if (!isNonEmptyString(input.detail)) {
        return { ok: false, reason: 'invalid-status' };
      }
      return {
        ok: true,
        value: {
          status: 'unavailable',
          songId: input.songId,
          platform: input.platform,
          hourIndex: input.hourIndex,
          sourceSystem: input.sourceSystem,
          detail: input.detail,
        },
      };
    }

    if (input.status === 'failed') {
      if (
        !isNonEmptyString(input.errorCode) ||
        !isNonEmptyString(input.errorMessage)
      ) {
        return { ok: false, reason: 'invalid-status' };
      }
      return {
        ok: true,
        value: {
          status: 'failed',
          songId: input.songId,
          platform: input.platform,
          hourIndex: input.hourIndex,
          sourceSystem: input.sourceSystem,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
        },
      };
    }

    return { ok: false, reason: 'invalid-status' };
  }

  if (!isRecord(input.observation)) {
    return { ok: false, reason: 'invalid-observation' };
  }
  const observation = input.observation;
  if (
    typeof observation.songId !== 'string' ||
    !UUID_PATTERN.test(observation.songId)
  ) {
    return { ok: false, reason: 'invalid-song-id' };
  }
  if (!isPlatform(observation.platform)) {
    return { ok: false, reason: 'unsupported-platform' };
  }
  if (
    observation.source !== 'IN_CHART' &&
    observation.source !== 'EXTERNAL'
  ) {
    return { ok: false, reason: 'invalid-source' };
  }
  if (!isMetricForPlatform(
    observation.platform,
    observation.metric,
    observation.unit,
  )) {
    return { ok: false, reason: 'unsupported-metric' };
  }
  if (
    typeof observation.value !== 'number' ||
    !Number.isFinite(observation.value) ||
    observation.value < 0
  ) {
    return { ok: false, reason: 'invalid-value' };
  }

  const observedAt = parseTimestamp(observation.observedAt);
  const periodStart = parseTimestamp(observation.periodStart);
  const periodEnd = parseTimestamp(observation.periodEnd);
  if (!observedAt || !periodStart || !periodEnd) {
    return { ok: false, reason: 'invalid-timestamp' };
  }
  if (
    periodStart.epochMs % HOUR_MS !== 0 ||
    periodEnd.epochMs - periodStart.epochMs !== HOUR_MS ||
    observedAt.epochMs < periodStart.epochMs ||
    observedAt.epochMs >= periodEnd.epochMs
  ) {
    return { ok: false, reason: 'invalid-timestamp' };
  }

  if (
    !isNonEmptyString(observation.sourceSystem) ||
    !isNonEmptyString(observation.sourceObservationId) ||
    (observation.providerReference !== undefined &&
      !isNonEmptyString(observation.providerReference))
  ) {
    return { ok: false, reason: 'invalid-source-identity' };
  }
  if (
    observation.supersedesObservationId !== undefined &&
    observation.supersedesObservationId !== null &&
    (typeof observation.supersedesObservationId !== 'string' ||
      !UUID_PATTERN.test(observation.supersedesObservationId))
  ) {
    return { ok: false, reason: 'invalid-correction-reference' };
  }

  return {
    ok: true,
    value: {
      status: 'observed',
      observation: {
        songId: observation.songId,
        platform: observation.platform,
        observedAt: observedAt.utc,
        periodStart: periodStart.utc,
        periodEnd: periodEnd.utc,
        hourIndex: Math.floor(observedAt.epochMs / HOUR_MS),
        metric:
          observation.platform === 'youtube'
            ? 'video_views'
            : 'track_streams',
        unit:
          observation.platform === 'youtube'
            ? 'views_per_hour'
            : 'streams_per_hour',
        value: observation.value,
        source: observation.source,
        sourceSystem: observation.sourceSystem,
        sourceObservationId: observation.sourceObservationId,
        ...(observation.providerReference === undefined
          ? {}
          : { providerReference: observation.providerReference }),
        ...(observation.supersedesObservationId === undefined
          ? {}
          : { supersedesObservationId: observation.supersedesObservationId }),
      },
    },
  };
}
