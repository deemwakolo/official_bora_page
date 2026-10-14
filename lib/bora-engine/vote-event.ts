import { HOUR_MS } from '../../engine/src/engine/constants';
import { applyVote, emptyBucket } from '../../engine/src/engine/bucket';
import type {
  HourIndex,
  HourPhase,
  VoteBucket,
} from '../../engine/src/engine/types';
import type { CanonicalAcceptedVoteEvent } from '../supabase/vote-event';

export interface EngineHourlyVoteInput {
  readonly sourceEvent: CanonicalAcceptedVoteEvent;
  readonly hourIndex: HourIndex;
  readonly occurredAtMs: number;
  readonly bucket: VoteBucket;
}

export type EngineHourlyVoteMapResult =
  | { readonly ok: true; readonly value: EngineHourlyVoteInput }
  | {
      readonly ok: false;
      readonly reason:
        | 'invalid-event'
        | 'invalid-phase'
        | 'invalid-timestamp'
        | 'invalid-hour'
        | 'invalid-bucket'
        | 'bucket-hour-mismatch';
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCanonicalAcceptedVoteEvent(
  value: unknown,
): value is CanonicalAcceptedVoteEvent {
  if (!isRecord(value)) return false;

  return (
    value.sourceSystem === 'secure_vote_events' &&
    typeof value.sourceEventId === 'string' &&
    UUID_PATTERN.test(value.sourceEventId) &&
    typeof value.songId === 'string' &&
    UUID_PATTERN.test(value.songId) &&
    (value.voteType === 'up' || value.voteType === 'down') &&
    typeof value.occurredAt === 'string' &&
    typeof value.voterRef === 'string' &&
    UUID_PATTERN.test(value.voterRef) &&
    (value.identityMethod === 'guest' || value.identityMethod === 'account') &&
    typeof value.identityVersion === 'number' &&
    Number.isInteger(value.identityVersion) &&
    value.identityVersion > 0 &&
    typeof value.idempotencyKey === 'string' &&
    UUID_PATTERN.test(value.idempotencyKey)
  );
}

function parseEventTime(value: string): number | null {
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, zone] = match;
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

  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
  }

  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

/**
 * Map one committed secure-vote event to one Engine bucket mutation.
 *
 * The caller supplies the authoritative bucket phase and existing bucket, if
 * any. This function never deduplicates events; ingestion must first enforce
 * uniqueness on (sourceSystem, sourceEventId).
 */
export function mapAcceptedVoteEventToEngineInput(
  event: unknown,
  options: {
    readonly phase: HourPhase;
    readonly existingBucket?: VoteBucket;
  },
): EngineHourlyVoteMapResult {
  if (!isCanonicalAcceptedVoteEvent(event)) {
    return { ok: false, reason: 'invalid-event' };
  }
  if (
    options.phase !== 'OPEN' &&
    options.phase !== 'TRANSITION' &&
    options.phase !== 'CLOSED'
  ) {
    return { ok: false, reason: 'invalid-phase' };
  }

  const occurredAtMs = parseEventTime(event.occurredAt);
  if (occurredAtMs === null) {
    return { ok: false, reason: 'invalid-timestamp' };
  }

  const rawHourIndex = Math.floor(occurredAtMs / HOUR_MS);
  if (!Number.isFinite(rawHourIndex) || !Number.isInteger(rawHourIndex)) {
    return { ok: false, reason: 'invalid-hour' };
  }
  const hourIndex = rawHourIndex as HourIndex;

  const baseBucket =
    options.existingBucket ?? emptyBucket(hourIndex, options.phase);
  if (
    !Number.isInteger(baseBucket.hourIndex) ||
    baseBucket.hourIndex !== hourIndex
  ) {
    return { ok: false, reason: 'bucket-hour-mismatch' };
  }
  if (baseBucket.phase !== options.phase) {
    return { ok: false, reason: 'invalid-bucket' };
  }

  const applied = applyVote(
    baseBucket,
    event.voteType === 'up' ? 'UP' : 'DOWN',
    1,
  );
  if (!applied.ok) {
    return { ok: false, reason: 'invalid-bucket' };
  }

  return {
    ok: true,
    value: {
      sourceEvent: event,
      hourIndex,
      occurredAtMs,
      bucket: applied.value,
    },
  };
}
