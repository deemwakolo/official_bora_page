import { C_WINDOW_HOURS, HOUR_MS } from '../../engine/src/engine/constants';
import {
  assessCoverageEvidence,
  getCoverageWindow,
  isCoverageEvidenceAuthority,
  isCoverageEvidenceRecord,
  type CoverageEvidenceAuthority,
  type CoverageEvidenceRecord,
  type CoverageInputKind,
  type CoverageEvidenceReason,
} from './coverage-evidence';

export type VoteIngestionDirection = 'up' | 'down';
export type VoteIngestionIdentityMethod = 'guest' | 'account';

export interface VoteEventIngestionRequest {
  readonly sourceSystem: 'secure_vote_events';
  readonly sourceEventId: string;
  readonly songId: string;
  readonly voteType: VoteIngestionDirection;
  /** Original committed database timestamp. It is never regenerated on retry. */
  readonly occurredAt: string;
  readonly voterRef?: string | null;
  readonly identityMethod?: VoteIngestionIdentityMethod | null;
  readonly identityVersion?: number | null;
  readonly idempotencyKey?: string | null;
}

export interface ValidatedVoteEventIngestionRequest {
  readonly sourceSystem: 'secure_vote_events';
  readonly sourceEventId: string;
  readonly songId: string;
  readonly voteType: VoteIngestionDirection;
  readonly occurredAt: string;
  readonly occurredAtMs: number;
  readonly hourIndex: number;
  readonly voterRef: string | null;
  readonly identityMethod: VoteIngestionIdentityMethod | null;
  readonly identityVersion: number | null;
  readonly idempotencyKey: string | null;
}

export type VoteEventIngestionValidation =
  | {
      readonly status: 'valid';
      readonly request: ValidatedVoteEventIngestionRequest;
    }
  | {
      readonly status: 'invalid-input';
      readonly reasons: readonly VoteEventIngestionInputError[];
    };

export type VoteEventIngestionInputError =
  | 'invalid-request'
  | 'unsupported-source-system'
  | 'invalid-source-event-id'
  | 'invalid-song-id'
  | 'invalid-vote-type'
  | 'invalid-committed-timestamp'
  | 'invalid-voter-reference'
  | 'invalid-identity-method'
  | 'invalid-identity-version'
  | 'incomplete-identity-provenance'
  | 'invalid-idempotency-key';

export type VoteEventIngestionOutcome =
  | {
      readonly status: 'ingested' | 'already-ingested';
      readonly sourceSystem: 'secure_vote_events';
      readonly sourceEventId: string;
    }
  | {
      readonly status: 'invalid-input';
      readonly reasons: readonly VoteEventIngestionInputError[];
    }
  | {
      readonly status: 'conflicting-identity';
      readonly conflict: 'identity-mismatch' | 'payload-mismatch';
    }
  | {
      readonly status: 'persistence-failure';
      readonly errorCode: string;
    }
  | {
      readonly status: 'commit-unknown';
      readonly sourceSystem: 'secure_vote_events';
      readonly sourceEventId: string;
    };

export type VoteEventRetryAssessment =
  | { readonly status: 'new-event' }
  | { readonly status: 'already-ingested' }
  | {
      readonly status: 'conflicting-identity';
      readonly conflict: 'identity-mismatch' | 'payload-mismatch';
    };

export type VoteSeedHourCoverage = CoverageEvidenceRecord & {
  readonly kind: 'vote-history' | 'seed-history';
  readonly songId: string;
  readonly period: { readonly kind: 'hour'; readonly hourIndex: number };
};

export interface VoteSeedCoverageAuthority extends CoverageEvidenceAuthority {
  readonly kind: 'vote-history' | 'seed-history';
  readonly songId: string;
  readonly hourIndex: number;
}

export type VoteSeedCoverageGapReason =
  | 'missing'
  | 'duplicate'
  | 'incomplete'
  | 'unavailable'
  | 'failed'
  | 'invalid'
  | 'source-identity-unavailable'
  | 'source-identity-mismatch'
  | 'revision-unavailable'
  | 'revision-mismatch'
  | 'freshness-unresolved'
  | 'stale'
  | 'unresolved';

export interface VoteSeedCoverageGap {
  readonly inputType: 'VOTES' | 'SEED';
  readonly hourIndex: number;
  readonly reason: VoteSeedCoverageGapReason;
}

export type VoteSeedHistoryCoverageAssessment =
  | {
      readonly status: 'invalid-reference-hour';
    }
  | {
      readonly status: 'not-ready';
      readonly startHour: number;
      readonly endHour: number;
      readonly gaps: readonly VoteSeedCoverageGap[];
    }
  | {
      readonly status: 'complete';
      readonly startHour: number;
      readonly endHour: number;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseCommittedTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, zone] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const hh = Number(hour);
  const mm = Number(minute);
  const ss = Number(second);
  const leapYear = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
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
  ][m - 1];

  if (
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > daysInMonth ||
    hh > 23 ||
    mm > 59 ||
    ss > 59
  ) {
    return null;
  }

  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
  }

  const timestampMs = Date.parse(value);
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): { readonly valid: boolean; readonly value: string | null } {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    return { valid: true, value: null };
  }
  const value = record[key];
  if (value === null || typeof value === 'string') {
    return { valid: true, value };
  }
  return { valid: false, value: null };
}

function canonicalPayloadMatches(
  left: ValidatedVoteEventIngestionRequest,
  right: ValidatedVoteEventIngestionRequest,
): boolean {
  return (
    left.sourceSystem === right.sourceSystem &&
    left.sourceEventId === right.sourceEventId &&
    left.songId === right.songId &&
    left.voteType === right.voteType &&
    left.occurredAt === right.occurredAt &&
    left.voterRef === right.voterRef &&
    left.identityMethod === right.identityMethod &&
    left.identityVersion === right.identityVersion &&
    left.idempotencyKey === right.idempotencyKey
  );
}

/** Validate a row-derived event without inventing identity or event time. */
export function validateVoteEventIngestionRequest(
  value: unknown,
): VoteEventIngestionValidation {
  if (!isRecord(value)) {
    return { status: 'invalid-input', reasons: ['invalid-request'] };
  }

  const reasons: VoteEventIngestionInputError[] = [];
  const sourceEventId = isUuid(value.sourceEventId)
    ? value.sourceEventId
    : null;
  const songId = isUuid(value.songId) ? value.songId : null;
  const voteType =
    value.voteType === 'up' || value.voteType === 'down'
      ? value.voteType
      : null;
  const occurredAt =
    typeof value.occurredAt === 'string' ? value.occurredAt : null;
  if (value.sourceSystem !== 'secure_vote_events') {
    reasons.push('unsupported-source-system');
  }
  if (sourceEventId === null) reasons.push('invalid-source-event-id');
  if (songId === null) reasons.push('invalid-song-id');
  if (voteType === null) reasons.push('invalid-vote-type');

  const occurredAtMs = parseCommittedTimestamp(occurredAt);
  if (occurredAtMs === null) reasons.push('invalid-committed-timestamp');

  const voterRef = readOptionalString(value, 'voterRef');
  if (
    !voterRef.valid ||
    voterRef.value === null ||
    !isUuid(voterRef.value)
  ) {
    // secure_vote_events must carry complete canonical provenance: a missing
    // or null voter reference is rejected, never silently normalized.
    reasons.push('invalid-voter-reference');
  }

  const identityMethod = readOptionalString(value, 'identityMethod');
  if (
    !identityMethod.valid ||
    (identityMethod.value !== null &&
      identityMethod.value !== 'guest' &&
      identityMethod.value !== 'account')
  ) {
    reasons.push('invalid-identity-method');
  }

  const rawIdentityVersion = value.identityVersion;
  const identityVersion =
    rawIdentityVersion === undefined || rawIdentityVersion === null
      ? null
      : typeof rawIdentityVersion === 'number'
        ? rawIdentityVersion
        : null;
  if (
    rawIdentityVersion !== undefined &&
    rawIdentityVersion !== null &&
    (typeof rawIdentityVersion !== 'number' ||
      !Number.isSafeInteger(rawIdentityVersion) ||
      rawIdentityVersion < 1)
  ) {
    reasons.push('invalid-identity-version');
  }
  const hasIdentityMethod =
    identityMethod.valid && identityMethod.value !== null;
  const hasIdentityVersion = identityVersion !== null;
  if (!hasIdentityMethod || !hasIdentityVersion) {
    // Both halves of identity provenance are mandatory for canonical
    // secure_vote_events; partial or entirely absent provenance is rejected.
    reasons.push('incomplete-identity-provenance');
  }

  const idempotencyKey = readOptionalString(value, 'idempotencyKey');
  if (
    !idempotencyKey.valid ||
    idempotencyKey.value === null ||
    idempotencyKey.value.trim() === ''
  ) {
    // The original idempotency key is required provenance; retries must
    // compare it, never regenerate or drop it.
    reasons.push('invalid-idempotency-key');
  }

  if (reasons.length > 0) {
    return { status: 'invalid-input', reasons };
  }
  if (
    sourceEventId === null ||
    songId === null ||
    voteType === null ||
    occurredAt === null ||
    occurredAtMs === null
  ) {
    return { status: 'invalid-input', reasons: ['invalid-request'] };
  }

  const hourIndex = Math.floor(occurredAtMs / HOUR_MS);
  if (!Number.isSafeInteger(hourIndex)) {
    return {
      status: 'invalid-input',
      reasons: ['invalid-committed-timestamp'],
    };
  }

  return {
    status: 'valid',
    request: {
      sourceSystem: 'secure_vote_events',
      sourceEventId,
      songId,
      voteType,
      occurredAt,
      occurredAtMs,
      hourIndex,
      voterRef: voterRef.value,
      identityMethod:
        identityMethod.value === 'guest' || identityMethod.value === 'account'
          ? identityMethod.value
          : null,
      identityVersion,
      idempotencyKey: idempotencyKey.value,
    },
  };
}

/**
 * Compare a unique-key lookup result with the candidate before any bucket
 * update. Durable callers must perform this comparison inside the transaction.
 */
export function assessVoteEventIngestionRetry(
  candidate: ValidatedVoteEventIngestionRequest,
  existing: ValidatedVoteEventIngestionRequest | null,
): VoteEventRetryAssessment {
  if (existing === null) return { status: 'new-event' };
  if (
    candidate.sourceSystem !== existing.sourceSystem ||
    candidate.sourceEventId !== existing.sourceEventId
  ) {
    return {
      status: 'conflicting-identity',
      conflict: 'identity-mismatch',
    };
  }
  if (canonicalPayloadMatches(candidate, existing)) {
    return { status: 'already-ingested' };
  }
  return {
    status: 'conflicting-identity',
    conflict: 'payload-mismatch',
  };
}

/**
 * RAW DATABASE CONTRACT → APPLICATION CONTRACT boundary (Phase 3, §2).
 *
 * `bora_engine_ingest_vote_event` is installed on the live database outside
 * version control; its previously inspected success vocabulary is `accepted`
 * and `duplicate`. This function is the single place where that raw
 * vocabulary is translated into the application-level
 * `VoteEventIngestionOutcome` contract, so no status-compatibility logic
 * spreads across the action, component, or persistence layers:
 *
 *   raw `accepted`   → `ingested`      raw `duplicate` → `already-ingested`
 *   raw `ingested` / `already-ingested` / `invalid-input` /
 *   `conflicting-identity` (corrected-design §B spellings) map to themselves.
 *
 * Evidence rules (§5): structured database codes (SQLSTATE, 5 chars, or
 * `PGRST*`) prove a server rejection/rollback; `40001`/`40P01`/`23505` prove
 * a clean rollback that is safe to retry as a WHOLE idempotent transaction;
 * empty or non-database codes prove nothing about commit (transport loss →
 * `commit-unknown`); documented raise markers resolve to their distinct
 * typed outcomes; and an unknown or malformed response is NEVER success —
 * its effect cannot be established, so it resolves to `commit-unknown`,
 * recoverable only by replaying the complete idempotent transaction.
 */
export type VoteEventIngestionRpcAttempt =
  | { readonly status: 'settled'; readonly outcome: VoteEventIngestionOutcome }
  | { readonly status: 'retry-transaction'; readonly errorCode: string };

const RETRYABLE_INGESTION_SQLSTATE: ReadonlySet<string> = new Set([
  '40001',
  '40P01',
  '23505',
]);
const INGESTION_IDENTITY_CONFLICT_MARKER = 'BORA_ENGINE_EVENT_IDENTITY_CONFLICT';
const INGESTION_WORKER_REQUIRED_MARKER = 'BORA_ENGINE_WORKER_REQUIRED';
const INGESTION_INPUT_ERRORS: ReadonlySet<string> = new Set([
  'invalid-request',
  'unsupported-source-system',
  'invalid-source-event-id',
  'invalid-song-id',
  'invalid-vote-type',
  'invalid-committed-timestamp',
  'invalid-voter-reference',
  'invalid-identity-method',
  'invalid-identity-version',
  'incomplete-identity-provenance',
  'invalid-idempotency-key',
]);

function isStructuredDatabaseErrorCode(code: string): boolean {
  return code.startsWith('PGRST') || /^[0-9A-Z]{5}$/.test(code);
}

function readIngestionInputErrors(
  value: unknown,
): readonly VoteEventIngestionInputError[] {
  if (!Array.isArray(value)) return ['invalid-request'];
  const reasons = value.filter(
    (entry): entry is VoteEventIngestionInputError =>
      typeof entry === 'string' && INGESTION_INPUT_ERRORS.has(entry),
  );
  return reasons.length > 0 ? reasons : ['invalid-request'];
}

export function classifyVoteEventIngestionRpcResult(
  identity: {
    readonly sourceSystem: 'secure_vote_events';
    readonly sourceEventId: string;
  },
  data: unknown,
  error: {
    readonly code?: string | null;
    readonly message?: string | null;
  } | null,
): VoteEventIngestionRpcAttempt {
  if (error) {
    const code = typeof error.code === 'string' ? error.code.trim() : '';
    const message = typeof error.message === 'string' ? error.message : '';

    if (message.includes(INGESTION_IDENTITY_CONFLICT_MARKER)) {
      return {
        status: 'settled',
        outcome: { status: 'conflicting-identity', conflict: 'payload-mismatch' },
      };
    }
    if (message.includes(INGESTION_WORKER_REQUIRED_MARKER)) {
      return {
        status: 'settled',
        outcome: {
          status: 'persistence-failure',
          errorCode: code
            ? `${code}:BORA_ENGINE_WORKER_REQUIRED`
            : INGESTION_WORKER_REQUIRED_MARKER,
        },
      };
    }
    if (code && isStructuredDatabaseErrorCode(code)) {
      if (RETRYABLE_INGESTION_SQLSTATE.has(code)) {
        return { status: 'retry-transaction', errorCode: code };
      }
      return {
        status: 'settled',
        outcome: { status: 'persistence-failure', errorCode: code },
      };
    }
    // Transport-level failure: the commit outcome cannot be established.
    return {
      status: 'settled',
      outcome: { status: 'commit-unknown', ...identity },
    };
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      status: 'settled',
      outcome: { status: 'commit-unknown', ...identity },
    };
  }

  const status = (data as { readonly status?: unknown }).status;
  switch (status) {
    case 'accepted':
    case 'ingested':
      return { status: 'settled', outcome: { status: 'ingested', ...identity } };
    case 'duplicate':
    case 'already-ingested':
      return {
        status: 'settled',
        outcome: { status: 'already-ingested', ...identity },
      };
    case 'invalid-input':
      return {
        status: 'settled',
        outcome: {
          status: 'invalid-input',
          reasons: readIngestionInputErrors(
            (data as { readonly reasons?: unknown }).reasons,
          ),
        },
      };
    case 'conflicting-identity':
      return {
        status: 'settled',
        outcome: {
          status: 'conflicting-identity',
          conflict:
            (data as { readonly conflict?: unknown }).conflict ===
            'identity-mismatch'
              ? 'identity-mismatch'
              : 'payload-mismatch',
        },
      };
    default:
      // Unknown or malformed response: never success; effect unestablished.
      return {
        status: 'settled',
        outcome: { status: 'commit-unknown', ...identity },
      };
  }
}

/** Check vote and seed completeness independently across H-71 through H. */
export function assessVoteSeedHistoryCoverage(input: {
  readonly referenceHour: number;
  readonly songId: string;
  readonly voteCoverage: readonly VoteSeedHourCoverage[];
  readonly seedCoverage: readonly VoteSeedHourCoverage[];
  readonly authorities: readonly VoteSeedCoverageAuthority[];
}): VoteSeedHistoryCoverageAssessment {
  const { referenceHour } = input;
  if (!Number.isSafeInteger(referenceHour) || !isUuid(input.songId)) {
    return { status: 'invalid-reference-hour' };
  }

  const window = getCoverageWindow(referenceHour, C_WINDOW_HOURS);
  if (!window) {
    return { status: 'invalid-reference-hour' };
  }
  const { firstHour: startHour } = window;

  const gaps: VoteSeedCoverageGap[] = [];
  const sources = [
    {
      inputType: 'VOTES' as const,
      kind: 'vote-history' as const,
      coverage: input.voteCoverage,
    },
    {
      inputType: 'SEED' as const,
      kind: 'seed-history' as const,
      coverage: input.seedCoverage,
    },
  ];

  for (const source of sources) {
    for (let hourIndex = startHour; hourIndex <= referenceHour; hourIndex += 1) {
      const matches = source.coverage.filter(
        (item) =>
          isRecord(item) &&
          item.kind === source.kind &&
          item.songId === input.songId &&
          isRecord(item.period) &&
          item.period.kind === 'hour' &&
          item.period.hourIndex === hourIndex,
      );
      if (matches.length === 0) {
        gaps.push({ inputType: source.inputType, hourIndex, reason: 'missing' });
        continue;
      }
      if (matches.length > 1) {
        gaps.push({
          inputType: source.inputType,
          hourIndex,
          reason: 'duplicate',
        });
        continue;
      }

      const [coverage] = matches;
      if (!isCoverageEvidenceRecord(coverage)) {
        gaps.push({ inputType: source.inputType, hourIndex, reason: 'invalid' });
        continue;
      }
      const matchingAuthorities = input.authorities.filter(
        (authority) =>
          isRecord(authority) &&
          authority.kind === source.kind &&
          authority.songId === input.songId &&
          authority.hourIndex === hourIndex,
      );
      if (matchingAuthorities.length > 1) {
        gaps.push({
          inputType: source.inputType,
          hourIndex,
          reason: 'duplicate',
        });
        continue;
      }
      const authority = matchingAuthorities[0];
      if (!isCoverageEvidenceAuthority(authority)) {
        gaps.push({
          inputType: source.inputType,
          hourIndex,
          reason: 'unresolved',
        });
        continue;
      }
      if (!authority.sourceIdentity) {
        gaps.push({
          inputType: source.inputType,
          hourIndex,
          reason: 'source-identity-unavailable',
        });
        continue;
      }
      if (authority.revision === null && !authority.evidenceId) {
        gaps.push({
          inputType: source.inputType,
          hourIndex,
          reason: 'revision-unavailable',
        });
        continue;
      }
      if (!Number.isSafeInteger(coverage.period.hourIndex)) {
        gaps.push({ inputType: source.inputType, hourIndex, reason: 'invalid' });
        continue;
      }
      const usability = assessCoverageEvidence(coverage, {
        kind: source.kind,
        songId: input.songId,
        period: { kind: 'hour', hourIndex },
        sourceIdentity: authority.sourceIdentity,
        revision: authority.revision,
        evidenceId: authority.evidenceId,
      });
      if (usability.status === 'unresolved') {
        gaps.push({
          inputType: source.inputType,
          hourIndex,
          reason: coverageGapReason(usability.reason),
        });
      }
    }
  }

  return gaps.length > 0
    ? { status: 'not-ready', startHour, endHour: referenceHour, gaps }
    : { status: 'complete', startHour, endHour: referenceHour };
}

function coverageGapReason(
  reason: CoverageEvidenceReason,
): VoteSeedCoverageGapReason {
  switch (reason) {
    case 'source-unavailable':
      return 'unavailable';
    case 'check-failed':
      return 'failed';
    case 'data-invalid':
      return 'invalid';
    case 'partial-interval':
      return 'incomplete';
    case 'history-changed':
      return 'stale';
    case 'source-mismatch':
      return 'source-identity-mismatch';
    case 'source-identity-missing':
      return 'source-identity-unavailable';
    case 'revision-mismatch':
      return 'revision-mismatch';
    case 'evidence-identity-missing':
      return 'revision-unavailable';
    case 'assessment-time-invalid':
    case 'freshness-unverified':
      return 'freshness-unresolved';
    case 'coverage-unattributable':
      return 'unresolved';
    case 'other':
      return 'unresolved';
  }
}
