import { C_WINDOW_HOURS, HOUR_MS, PLATFORM_WINDOW_HOURS } from '../../engine/src/engine/constants';

export type CoverageInputKind =
  | 'vote-history'
  | 'seed-history'
  | 'platform-observation-history';

export type CoverageOutcome =
  | 'complete'
  | 'checked-empty'
  | 'unavailable'
  | 'failed'
  | 'invalid'
  | 'incomplete'
  | 'stale'
  | 'unresolved';

export type CoverageCurrentness =
  | 'current'
  | 'invalidated'
  | 'stale'
  | 'unresolved';

export type CoverageEvidenceReason =
  | 'source-unavailable'
  | 'check-failed'
  | 'data-invalid'
  | 'partial-interval'
  | 'history-changed'
  | 'source-identity-missing'
  | 'source-mismatch'
  | 'revision-mismatch'
  | 'evidence-identity-missing'
  | 'assessment-time-invalid'
  | 'freshness-unverified'
  | 'coverage-unattributable'
  | 'other';

export type CoverageEvidencePeriod =
  | {
      readonly kind: 'hour';
      /** UTC epoch-hour index, using floor(epochMilliseconds / HOUR_MS). */
      readonly hourIndex: number;
    }
  | {
      readonly kind: 'interval';
      /** UTC epoch-hour bounds, inclusive. */
      readonly startHour: number;
      readonly endHour: number;
    };

/**
 * Immutable assessment identity. A null revision is not synthesized; callers
 * need a stable evidenceId if the source cannot provide a revision.
 */
export interface CoverageEvidenceRecord {
  readonly kind: CoverageInputKind;
  readonly songId: string | null;
  readonly period: CoverageEvidencePeriod;
  readonly expectedSourceIdentity: string | null;
  readonly sourceIdentity: string | null;
  readonly evidenceId: string | null;
  readonly revision: number | null;
  readonly assessedAt: string | null;
  readonly outcome: CoverageOutcome;
  readonly currentness: CoverageCurrentness;
  readonly reason: CoverageEvidenceReason | null;
}

/** Expected identity taken from the authoritative source/snapshot being read. */
export interface CoverageEvidenceAuthority {
  readonly sourceIdentity: string | null;
  readonly revision: number | null;
  readonly evidenceId: string | null;
}

export type CoverageEvidenceUsability =
  | { readonly status: 'usable' }
  | {
      readonly status: 'unresolved';
      readonly reason: CoverageEvidenceReason;
    };

export interface CoverageWindow {
  readonly firstHour: number;
  readonly lastHour: number;
  readonly hours: number;
}

export interface VoteHistoryInvalidation {
  readonly sourceSystem: 'secure_vote_events';
  readonly sourceEventId: string;
  /** Derived from the original committed event timestamp, never ingest time. */
  readonly eventHour: number;
  /** Assessment is not a fabricated revision or a replacement event time. */
  readonly invalidatesEvidenceId: string | null;
  readonly invalidatesRevision: number | null;
  readonly reason: 'late-accepted-event';
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const COVERAGE_OUTCOMES: readonly CoverageOutcome[] = [
  'complete',
  'checked-empty',
  'unavailable',
  'failed',
  'invalid',
  'incomplete',
  'stale',
  'unresolved',
];
const COVERAGE_CURRENTNESS: readonly CoverageCurrentness[] = [
  'current',
  'invalidated',
  'stale',
  'unresolved',
];
const COVERAGE_REASONS: readonly CoverageEvidenceReason[] = [
  'source-unavailable',
  'check-failed',
  'data-invalid',
  'partial-interval',
  'history-changed',
  'source-identity-missing',
  'source-mismatch',
  'revision-mismatch',
  'evidence-identity-missing',
  'assessment-time-invalid',
  'freshness-unverified',
  'coverage-unattributable',
  'other',
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isCoverageEvidenceAuthority(
  value: unknown,
): value is CoverageEvidenceAuthority {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const authority = value as Partial<CoverageEvidenceAuthority>;
  return (
    (authority.sourceIdentity === null ||
      isNonEmptyString(authority.sourceIdentity)) &&
    (authority.revision === null ||
      (typeof authority.revision === 'number' &&
        Number.isSafeInteger(authority.revision) &&
        authority.revision >= 0)) &&
    (authority.evidenceId === null || isNonEmptyString(authority.evidenceId))
  );
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

export function isCoverageEvidenceRecord(
  value: unknown,
): value is CoverageEvidenceRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const evidence = value as Partial<CoverageEvidenceRecord>;
  const validSong =
    evidence.songId === null ||
    (typeof evidence.songId === 'string' && UUID_PATTERN.test(evidence.songId));
  const validPeriod =
    evidence.period?.kind === 'hour'
      ? Number.isSafeInteger(evidence.period.hourIndex)
      : evidence.period?.kind === 'interval' &&
        Number.isSafeInteger(evidence.period.startHour) &&
        Number.isSafeInteger(evidence.period.endHour) &&
        evidence.period.startHour <= evidence.period.endHour;
  const hasEvidenceRevision =
    (typeof evidence.evidenceId === 'string' &&
      evidence.evidenceId.trim().length > 0) ||
    (Number.isSafeInteger(evidence.revision) &&
      (evidence.revision as number) >= 0);
  const completeOutcome =
    evidence.outcome === 'complete' || evidence.outcome === 'checked-empty';
  const usableOutcome =
    completeOutcome && evidence.currentness === 'current';

  return (
    (evidence.kind === 'vote-history' ||
      evidence.kind === 'seed-history' ||
      evidence.kind === 'platform-observation-history') &&
    validSong &&
    validPeriod &&
    (evidence.expectedSourceIdentity === null ||
      isNonEmptyString(evidence.expectedSourceIdentity)) &&
    (evidence.sourceIdentity === null ||
      isNonEmptyString(evidence.sourceIdentity)) &&
    (evidence.evidenceId === null || isNonEmptyString(evidence.evidenceId)) &&
    (evidence.revision === null ||
      (Number.isSafeInteger(evidence.revision) &&
        (evidence.revision as number) >= 0)) &&
    (evidence.assessedAt === null || isUtcTimestamp(evidence.assessedAt)) &&
    typeof evidence.outcome === 'string' &&
    COVERAGE_OUTCOMES.includes(evidence.outcome) &&
    typeof evidence.currentness === 'string' &&
    COVERAGE_CURRENTNESS.includes(evidence.currentness) &&
    (evidence.reason === null ||
      (typeof evidence.reason === 'string' &&
        COVERAGE_REASONS.includes(evidence.reason))) &&
    (!usableOutcome ||
      (completeOutcome &&
        isNonEmptyString(evidence.expectedSourceIdentity) &&
        isNonEmptyString(evidence.sourceIdentity) &&
        hasEvidenceRevision &&
        isUtcTimestamp(evidence.assessedAt))) &&
    (usableOutcome ? evidence.reason === null : evidence.reason !== null)
  );
}

/** True only when identity, assessment time, revision/ID, and currentness agree. */
export function assessCoverageEvidence(
  evidence: CoverageEvidenceRecord,
  expected: {
    readonly kind: CoverageInputKind;
    readonly songId: string | null;
    readonly period: CoverageEvidencePeriod;
    readonly sourceIdentity: string | null;
    readonly revision: number | null;
    readonly evidenceId: string | null;
  },
): CoverageEvidenceUsability {
  if (!isCoverageEvidenceRecord(evidence)) {
    return { status: 'unresolved', reason: 'coverage-unattributable' };
  }
  if (
    evidence.kind !== expected.kind ||
    evidence.songId !== expected.songId ||
    evidence.period.kind !== expected.period.kind ||
    (evidence.period.kind === 'hour' &&
      expected.period.kind === 'hour' &&
      evidence.period.hourIndex !== expected.period.hourIndex) ||
    (evidence.period.kind === 'interval' &&
      expected.period.kind === 'interval' &&
      (evidence.period.startHour !== expected.period.startHour ||
        evidence.period.endHour !== expected.period.endHour))
  ) {
    return { status: 'unresolved', reason: 'coverage-unattributable' };
  }
  if (evidence.outcome !== 'complete' && evidence.outcome !== 'checked-empty') {
    return { status: 'unresolved', reason: evidence.reason ?? 'other' };
  }
  if (
    !expected.sourceIdentity ||
    evidence.expectedSourceIdentity !== expected.sourceIdentity ||
    evidence.sourceIdentity !== expected.sourceIdentity
  ) {
    return {
      status: 'unresolved',
      reason:
        !expected.sourceIdentity ||
        !evidence.expectedSourceIdentity ||
        !evidence.sourceIdentity
          ? 'source-identity-missing'
          : 'source-mismatch',
    };
  }
  const hasExpectedEvidenceIdentity =
    expected.revision !== null || Boolean(expected.evidenceId);
  const revisionMatches =
    expected.revision === null || evidence.revision === expected.revision;
  const evidenceIdMatches =
    !expected.evidenceId || evidence.evidenceId === expected.evidenceId;
  if (
    !hasExpectedEvidenceIdentity ||
    !revisionMatches ||
    !evidenceIdMatches
  ) {
    return {
      status: 'unresolved',
      reason:
        !hasExpectedEvidenceIdentity
          ? 'evidence-identity-missing'
          : 'revision-mismatch',
    };
  }
  if (evidence.currentness !== 'current') {
    return {
      status: 'unresolved',
      reason:
        evidence.currentness === 'invalidated' || evidence.currentness === 'stale'
          ? 'history-changed'
          : 'freshness-unverified',
    };
  }
  return { status: 'usable' };
}

export function getCoverageWindow(
  referenceHour: number,
  hours: typeof C_WINDOW_HOURS | typeof PLATFORM_WINDOW_HOURS,
): CoverageWindow | null {
  if (!Number.isSafeInteger(referenceHour) || !Number.isSafeInteger(hours) || hours <= 0) {
    return null;
  }
  const firstHour = referenceHour - (hours - 1);
  if (!Number.isSafeInteger(firstHour)) return null;
  return { firstHour, lastHour: referenceHour, hours };
}

export function doesVoteEventInvalidateCoverage(
  input: {
    readonly kind: CoverageInputKind;
    readonly period: CoverageEvidencePeriod;
  },
  eventHour: number,
): boolean {
  if (!Number.isSafeInteger(eventHour) || input.kind !== 'vote-history') {
    return false;
  }
  return input.period.kind === 'hour'
    ? input.period.hourIndex === eventHour
    : input.period.startHour <= eventHour && eventHour <= input.period.endHour;
}

export function doesVoteEventInvalidateEvaluation(
  referenceHour: number,
  eventHour: number,
): boolean {
  if (!Number.isSafeInteger(referenceHour) || !Number.isSafeInteger(eventHour)) {
    return false;
  }
  const window = getCoverageWindow(referenceHour, C_WINDOW_HOURS);
  return Boolean(
    window && eventHour >= window.firstHour && eventHour <= window.lastHour,
  );
}
