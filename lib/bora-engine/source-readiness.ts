import {
  C_WINDOW_HOURS,
  HOUR_MS,
  PLATFORM_WINDOW_HOURS,
  TRANSITION_MS,
} from '../../engine/src/engine/constants';
import type { PlatformId } from '../../engine/src/engine/types';
import {
  assessVoteSeedHistoryCoverage,
  type VoteSeedCoverageAuthority,
  type VoteSeedHourCoverage,
} from './vote-event-ingestion';
import {
  assessCoverageEvidence,
  isCoverageEvidenceAuthority,
  isCoverageEvidenceRecord,
  type CoverageEvidenceRecord,
  type CoverageEvidenceAuthority,
} from './coverage-evidence';

export type SourceReadinessStatus =
  | 'available'
  | 'temporarily-unavailable'
  | 'not-authorized'
  | 'not-configured'
  | 'unsupported'
  | 'invalid-data'
  | 'unknown';

export type SourceReadinessReason =
  | 'authorized-source-operational'
  | 'authorized-source-temporarily-unavailable'
  | 'measurement-use-not-authorized'
  | 'credentials-or-trusted-mapping-not-configured'
  | 'measurement-interface-not-established'
  | 'provider-returned-invalid-measurement'
  | 'source-status-not-established'
  | 'trusted-hourly-mapping-and-observation-pipeline-not-established'
  | 'listenership-metrics-permission-not-established'
  | 'authorized-track-level-measurement-interface-not-established';

export interface PlatformSourceAssessment {
  readonly platform: PlatformId;
  readonly measurementType: 'video_views' | 'track_streams';
  readonly unit: 'views_per_hour' | 'streams_per_hour';
  /** Null means there is no established source identity for this assessment. */
  readonly sourceIdentity: string | null;
  readonly assessedAt: string;
  readonly status: SourceReadinessStatus;
  readonly reason: SourceReadinessReason;
}

export type PlatformHourCoverage =
  | {
      readonly songId: string;
      readonly platform: PlatformId;
      readonly hourIndex: number;
      readonly sourceIdentity: string;
      readonly status: 'complete';
      readonly result: 'positive';
      readonly value: number;
      readonly evidence: CoverageEvidenceRecord;
    }
  | {
      readonly songId: string;
      readonly platform: PlatformId;
      readonly hourIndex: number;
      readonly sourceIdentity: string;
      readonly status: 'complete';
      readonly result: 'zero';
      readonly value: 0;
      readonly evidence: CoverageEvidenceRecord;
    }
  | {
      readonly songId: string;
      readonly platform: PlatformId;
      readonly hourIndex: number;
      readonly sourceIdentity: string;
      readonly status: 'complete';
      readonly result: 'no-observation';
      readonly value: null;
      readonly evidence: CoverageEvidenceRecord;
    }
  | {
      readonly songId: string;
      readonly platform: PlatformId;
      readonly hourIndex: number;
      readonly sourceIdentity: string | null;
      readonly status: 'incomplete' | 'unavailable' | 'invalid' | 'unauthorized';
      readonly evidence: CoverageEvidenceRecord;
    };

export type RequiredHourlyInputCoverage = CoverageEvidenceRecord & {
  readonly kind: 'vote-history' | 'seed-history';
  readonly songId: string;
  readonly period: { readonly kind: 'hour'; readonly hourIndex: number };
};

export type RequiredHourlyCoverageAuthority = VoteSeedCoverageAuthority;

export interface RequiredPlatformCoverageAuthority
  extends CoverageEvidenceAuthority {
  readonly songId: string;
  readonly platform: PlatformId;
  readonly hourIndex: number;
}

export type EngineStateEligibility =
  | { readonly status: 'ready'; readonly referenceHour: number }
  | { readonly status: 'missing' | 'invalid' | 'unavailable' };

export type EvaluationEligibilityRequirement =
  | {
      readonly code:
        | 'invalid-song-id'
        | 'invalid-evaluation-hour'
        | 'invalid-clock';
    }
  | {
      readonly code: 'engine-state-not-ready' | 'state-hour-mismatch';
      readonly stateStatus?: EngineStateEligibility['status'];
    }
  | {
      readonly code: 'rollover-grace-period-open';
      readonly eligibleAtMs: number;
    }
  | {
      readonly code:
        | 'invalid-source-assessment'
        | 'duplicate-source-assessment'
        | 'missing-source-assessment';
      readonly platform?: PlatformId;
    }
  | {
      readonly code: 'source-not-available';
      readonly platform: PlatformId;
      readonly sourceStatus: SourceReadinessStatus;
      readonly reason: SourceReadinessReason;
    }
  | {
      readonly code:
        | 'invalid-coverage'
        | 'duplicate-coverage'
        | 'missing-coverage';
      readonly platform?: PlatformId;
      readonly inputType?: 'votes' | 'seed';
      readonly hourIndex?: number;
    }
  | {
      readonly code:
        | 'coverage-incomplete'
        | 'coverage-unavailable'
        | 'coverage-invalid'
        | 'coverage-unauthorized'
        | 'coverage-source-mismatch'
        | 'coverage-evidence-unresolved'
        | 'coverage-value-invalid';
      readonly platform: PlatformId;
      readonly hourIndex: number;
      readonly evidenceReason?: string;
    }
  | {
      readonly code:
        | 'required-input-incomplete'
        | 'required-input-duplicate'
        | 'required-input-unavailable'
        | 'required-input-invalid'
        | 'required-input-unauthorized'
        | 'required-input-source-missing'
        | 'required-input-source-mismatch'
        | 'required-input-missing'
        | 'required-input-failed'
        | 'required-input-revision-unavailable'
        | 'required-input-revision-mismatch'
        | 'required-input-freshness-unresolved'
        | 'required-input-stale'
        | 'required-input-unresolved';
      readonly inputType: 'votes' | 'seed';
      readonly hourIndex: number;
    }
  | { readonly code: 'empty-active-population'; readonly songId?: string };

export type SongEvaluationEligibility =
  | {
      readonly status: 'eligible';
      readonly songId: string;
      readonly evaluationHour: number;
      readonly platformWindow: {
        readonly firstHour: number;
        readonly lastHour: number;
        readonly hours: typeof PLATFORM_WINDOW_HOURS;
      };
      readonly voteSeedWindow: {
        readonly firstHour: number;
        readonly lastHour: number;
        readonly hours: typeof C_WINDOW_HOURS;
      };
    }
  | {
      readonly status: 'not-ready';
      readonly songId?: string;
      readonly evaluationHour?: number;
      readonly requirements: readonly EvaluationEligibilityRequirement[];
    };

export type ChartEvaluationEligibility =
  | {
      readonly status: 'eligible';
      readonly evaluationHour: number;
      readonly songs: readonly SongEvaluationEligibility[];
    }
  | {
      readonly status: 'not-ready';
      readonly evaluationHour?: number;
      readonly songs: readonly SongEvaluationEligibility[];
      readonly requirements: readonly (EvaluationEligibilityRequirement & {
        readonly songId?: string;
      })[];
    };

const PLATFORMS: readonly PlatformId[] = [
  'youtube',
  'spotify',
  'boomplay',
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SOURCE_REASONS: readonly SourceReadinessReason[] = [
  'authorized-source-operational',
  'authorized-source-temporarily-unavailable',
  'measurement-use-not-authorized',
  'credentials-or-trusted-mapping-not-configured',
  'measurement-interface-not-established',
  'provider-returned-invalid-measurement',
  'source-status-not-established',
  'trusted-hourly-mapping-and-observation-pipeline-not-established',
  'listenership-metrics-permission-not-established',
  'authorized-track-level-measurement-interface-not-established',
];

function isPlatform(value: unknown): value is PlatformId {
  return typeof value === 'string' && PLATFORMS.includes(value as PlatformId);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString() === value
  );
}

function isReasonConsistentWithStatus(
  status: SourceReadinessStatus,
  reason: SourceReadinessReason,
): boolean {
  switch (status) {
    case 'available':
      return reason === 'authorized-source-operational';
    case 'temporarily-unavailable':
      return reason === 'authorized-source-temporarily-unavailable';
    case 'not-authorized':
      return (
        reason === 'measurement-use-not-authorized' ||
        reason === 'listenership-metrics-permission-not-established'
      );
    case 'not-configured':
      return (
        reason === 'credentials-or-trusted-mapping-not-configured' ||
        reason ===
          'trusted-hourly-mapping-and-observation-pipeline-not-established'
      );
    case 'unsupported':
      return (
        reason === 'measurement-interface-not-established' ||
        reason ===
          'authorized-track-level-measurement-interface-not-established'
      );
    case 'invalid-data':
      return reason === 'provider-returned-invalid-measurement';
    case 'unknown':
      return reason === 'source-status-not-established';
  }
}

export function getCurrentPlatformSourceAssessments(
  assessedAt: string,
): readonly PlatformSourceAssessment[] {
  return [
    {
      platform: 'youtube',
      measurementType: 'video_views',
      unit: 'views_per_hour',
      sourceIdentity: 'youtube-data-api-v3',
      assessedAt,
      status: 'not-configured',
      reason:
        'trusted-hourly-mapping-and-observation-pipeline-not-established',
    },
    {
      platform: 'spotify',
      measurementType: 'track_streams',
      unit: 'streams_per_hour',
      sourceIdentity: 'spotify-web-api',
      assessedAt,
      status: 'not-authorized',
      reason: 'listenership-metrics-permission-not-established',
    },
    {
      platform: 'boomplay',
      measurementType: 'track_streams',
      unit: 'streams_per_hour',
      sourceIdentity: null,
      assessedAt,
      status: 'unsupported',
      reason:
        'authorized-track-level-measurement-interface-not-established',
    },
  ];
}

function isValidAssessment(value: unknown): value is PlatformSourceAssessment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const assessment = value as Partial<PlatformSourceAssessment>;
  return (
    isPlatform(assessment.platform) &&
    ((assessment.platform === 'youtube' &&
      assessment.measurementType === 'video_views' &&
      assessment.unit === 'views_per_hour') ||
      (assessment.platform !== 'youtube' &&
        assessment.measurementType === 'track_streams' &&
        assessment.unit === 'streams_per_hour')) &&
    (assessment.sourceIdentity === null ||
      isNonEmptyString(assessment.sourceIdentity)) &&
    isUtcTimestamp(assessment.assessedAt) &&
    (assessment.status === 'available' ||
      assessment.status === 'temporarily-unavailable' ||
      assessment.status === 'not-authorized' ||
      assessment.status === 'not-configured' ||
      assessment.status === 'unsupported' ||
      assessment.status === 'invalid-data' ||
      assessment.status === 'unknown') &&
    typeof assessment.reason === 'string' &&
    SOURCE_REASONS.includes(assessment.reason as SourceReadinessReason) &&
    isReasonConsistentWithStatus(
      assessment.status as SourceReadinessStatus,
      assessment.reason as SourceReadinessReason,
    )
  );
}

function platformCoverageKey(
  coverage: PlatformHourCoverage,
): string {
  return `${coverage.platform}:${coverage.hourIndex}`;
}

function isValidPlatformCoverage(value: unknown): value is PlatformHourCoverage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const coverage = value as Partial<PlatformHourCoverage>;
  if (
    typeof coverage.songId !== 'string' ||
    !UUID_PATTERN.test(coverage.songId) ||
    !isPlatform(coverage.platform) ||
    !Number.isSafeInteger(coverage.hourIndex)
  ) {
    return false;
  }
  if (
    !isCoverageEvidenceRecord(coverage.evidence) ||
    coverage.evidence.kind !== 'platform-observation-history' ||
    coverage.evidence.songId !== coverage.songId ||
    coverage.evidence.period.kind !== 'hour' ||
    coverage.evidence.period.hourIndex !== coverage.hourIndex
  ) {
    return false;
  }
  if (coverage.status !== 'complete') {
    const expectedOutcome = {
      incomplete: 'incomplete',
      unavailable: 'unavailable',
      invalid: 'invalid',
      unauthorized: 'unresolved',
    } as const;
    return (
      (coverage.status === 'incomplete' ||
        coverage.status === 'unavailable' ||
        coverage.status === 'invalid' ||
        coverage.status === 'unauthorized') &&
      coverage.evidence.outcome === expectedOutcome[coverage.status] &&
      (coverage.sourceIdentity === null ||
        isNonEmptyString(coverage.sourceIdentity))
    );
  }
  if (!isNonEmptyString(coverage.sourceIdentity)) return false;
  if (coverage.evidence.sourceIdentity !== coverage.sourceIdentity) return false;
  if (coverage.result === 'positive') {
    return coverage.evidence.outcome === 'complete' &&
      typeof coverage.value === 'number' &&
      Number.isFinite(coverage.value) &&
      coverage.value > 0;
  }
  if (coverage.result === 'zero') {
    return coverage.evidence.outcome === 'complete' && coverage.value === 0;
  }
  return (
    coverage.result === 'no-observation' &&
    coverage.evidence.outcome === 'checked-empty' &&
    coverage.value === null
  );
}

function isValidRequiredCoverage(
  value: unknown,
): value is RequiredHourlyInputCoverage {
  return (
    isCoverageEvidenceRecord(value) &&
    (value.kind === 'vote-history' || value.kind === 'seed-history') &&
    typeof value.songId === 'string' &&
    UUID_PATTERN.test(value.songId) &&
    value.period.kind === 'hour' &&
    Number.isSafeInteger(value.period.hourIndex)
  );
}

function sourceStatusRequirement(
  platform: PlatformId,
  assessment: PlatformSourceAssessment,
): EvaluationEligibilityRequirement {
  return {
    code: 'source-not-available',
    platform,
    sourceStatus: assessment.status,
    reason: assessment.reason,
  };
}

export function assessSongEvaluationEligibility(input: {
  readonly songId: string;
  /** Closed UTC epoch-hour, matching the runner's explicit hour identity. */
  readonly evaluationHour: number;
  readonly nowMs: number;
  readonly engineState: EngineStateEligibility;
  readonly sourceAssessments: readonly PlatformSourceAssessment[];
  /** Coverage entries for this song and the required platform/hour window. */
  readonly platformCoverage: readonly PlatformHourCoverage[];
  /** Vote and seed coverage for the complete 72-hour C window. */
  readonly requiredCoverage: readonly RequiredHourlyInputCoverage[];
  /** Authoritative identities/revisions supplied with the same input snapshot. */
  readonly requiredCoverageAuthority?: readonly RequiredHourlyCoverageAuthority[];
  /** Per-platform/hour authority; absent entries leave coverage unresolved. */
  readonly platformCoverageAuthority?: readonly RequiredPlatformCoverageAuthority[];
}): SongEvaluationEligibility {
  const requirements: EvaluationEligibilityRequirement[] = [];
  if (typeof input.songId !== 'string' || !UUID_PATTERN.test(input.songId)) {
    requirements.push({ code: 'invalid-song-id' });
  }
  if (
    !Number.isSafeInteger(input.evaluationHour) ||
    input.evaluationHour < 0
  ) {
    requirements.push({ code: 'invalid-evaluation-hour' });
  }
  if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0) {
    requirements.push({ code: 'invalid-clock' });
  }
  if (requirements.length > 0) {
    return { status: 'not-ready', requirements };
  }

  if (input.engineState.status !== 'ready') {
    requirements.push({
      code: 'engine-state-not-ready',
      stateStatus: input.engineState.status,
    });
  } else if (
    !Number.isSafeInteger(input.engineState.referenceHour) ||
    input.engineState.referenceHour !== input.evaluationHour
  ) {
    requirements.push({ code: 'state-hour-mismatch' });
  }

  const eligibleAtMs =
    (input.evaluationHour + 1) * HOUR_MS + TRANSITION_MS;
  if (!Number.isSafeInteger(eligibleAtMs)) {
    return {
      status: 'not-ready',
      requirements: [{ code: 'invalid-evaluation-hour' }],
    };
  }
  if (input.nowMs < eligibleAtMs) {
    requirements.push({
      code: 'rollover-grace-period-open',
      eligibleAtMs,
    });
  }

  const assessments = new Map<PlatformId, PlatformSourceAssessment>();
  for (const candidate of input.sourceAssessments) {
    if (!isValidAssessment(candidate)) {
      requirements.push({ code: 'invalid-source-assessment' });
      continue;
    }
    if (assessments.has(candidate.platform)) {
      requirements.push({
        code: 'duplicate-source-assessment',
        platform: candidate.platform,
      });
      continue;
    }
    assessments.set(candidate.platform, candidate);
  }

  for (const platform of PLATFORMS) {
    const assessment = assessments.get(platform);
    if (!assessment) {
      requirements.push({
        code: 'missing-source-assessment',
        platform,
      });
    } else if (
      assessment.status !== 'available' ||
      !assessment.sourceIdentity
    ) {
      requirements.push(sourceStatusRequirement(platform, assessment));
    }
  }

  const platformCoverage = new Map<string, PlatformHourCoverage>();
  const platformAuthorities = new Map<string, RequiredPlatformCoverageAuthority>();
  const duplicatePlatformAuthorities = new Set<string>();
  for (const authority of input.platformCoverageAuthority ?? []) {
    if (
      authority &&
      typeof authority === 'object' &&
      !Array.isArray(authority) &&
      typeof authority.songId === 'string' &&
      authority.songId !== input.songId
    ) {
      continue;
    }
    if (
      !authority ||
      typeof authority !== 'object' ||
      Array.isArray(authority) ||
      authority.songId !== input.songId ||
      !isPlatform(authority.platform) ||
      !Number.isSafeInteger(authority.hourIndex) ||
      !isCoverageEvidenceAuthority(authority)
    ) {
      requirements.push({ code: 'invalid-coverage' });
      continue;
    }
    const key = `${authority.platform}:${authority.hourIndex}`;
    if (platformAuthorities.has(key)) {
      duplicatePlatformAuthorities.add(key);
      requirements.push({
        code: 'duplicate-coverage',
        platform: authority.platform,
        hourIndex: authority.hourIndex,
      });
      continue;
    }
    platformAuthorities.set(key, authority);
  }
  const duplicatePlatformCoverage = new Set<string>();
  for (const candidate of input.platformCoverage) {
    if (
      !isValidPlatformCoverage(candidate) ||
      candidate.songId !== input.songId
    ) {
      requirements.push({ code: 'invalid-coverage' });
      continue;
    }
    const key = platformCoverageKey(candidate);
    if (platformCoverage.has(key)) {
      duplicatePlatformCoverage.add(key);
      requirements.push({
        code: 'duplicate-coverage',
        platform: candidate.platform,
        hourIndex: candidate.hourIndex,
      });
      continue;
    }
    platformCoverage.set(key, candidate);
  }

  const firstPlatformHour =
    input.evaluationHour - (PLATFORM_WINDOW_HOURS - 1);
  for (const platform of PLATFORMS) {
    const assessment = assessments.get(platform);
    for (
      let hourIndex = firstPlatformHour;
      hourIndex <= input.evaluationHour;
      hourIndex += 1
    ) {
      const key = `${platform}:${hourIndex}`;
      const coverage = platformCoverage.get(key);
      if (
        duplicatePlatformCoverage.has(key) ||
        duplicatePlatformAuthorities.has(key)
      ) continue;
      if (!coverage) {
        requirements.push({
          code: 'missing-coverage',
          platform,
          hourIndex,
        });
        continue;
      }
      if (coverage.status !== 'complete') {
        const codeByStatus = {
          incomplete: 'coverage-incomplete',
          unavailable: 'coverage-unavailable',
          invalid: 'coverage-invalid',
          unauthorized: 'coverage-unauthorized',
        } as const;
        requirements.push({
          code: codeByStatus[coverage.status],
          platform,
          hourIndex,
        });
        continue;
      }
      if (
        !assessment?.sourceIdentity ||
        coverage.sourceIdentity !== assessment.sourceIdentity
      ) {
        requirements.push({
          code: 'coverage-source-mismatch',
          platform,
          hourIndex,
        });
        continue;
      }
      const authority = platformAuthorities.get(key);
      if (!authority) {
        requirements.push({
          code: 'coverage-evidence-unresolved',
          platform,
          hourIndex,
          evidenceReason: 'evidence-identity-missing',
        });
        continue;
      }
      const evidenceCheck = assessCoverageEvidence(coverage.evidence, {
        kind: 'platform-observation-history',
        songId: input.songId,
        period: { kind: 'hour', hourIndex },
        sourceIdentity: authority.sourceIdentity,
        revision: authority.revision,
        evidenceId: authority.evidenceId,
      });
      if (evidenceCheck.status !== 'usable') {
        requirements.push({
          code: 'coverage-evidence-unresolved',
          platform,
          hourIndex,
          evidenceReason: evidenceCheck.reason,
        });
      }
    }
  }

  const voteCoverage: VoteSeedHourCoverage[] = [];
  const seedCoverage: VoteSeedHourCoverage[] = [];
  for (const candidate of input.requiredCoverage) {
    if (
      !isValidRequiredCoverage(candidate) ||
      candidate.songId !== input.songId
    ) {
      requirements.push({ code: 'invalid-coverage' });
      continue;
    }
    (candidate.kind === 'vote-history' ? voteCoverage : seedCoverage).push(
      candidate,
    );
  }

  const historyCoverage = assessVoteSeedHistoryCoverage({
    referenceHour: input.evaluationHour,
    songId: input.songId,
    voteCoverage,
    seedCoverage,
    authorities: input.requiredCoverageAuthority ?? [],
  });
  if (historyCoverage.status === 'invalid-reference-hour') {
    requirements.push({ code: 'invalid-evaluation-hour' });
  } else if (historyCoverage.status === 'not-ready') {
    for (const gap of historyCoverage.gaps) {
      const inputType = gap.inputType === 'VOTES' ? 'votes' : 'seed';
      const codeByReason = {
        missing: 'required-input-missing',
        duplicate: 'required-input-duplicate',
        incomplete: 'required-input-incomplete',
        unavailable: 'required-input-unavailable',
        failed: 'required-input-failed',
        invalid: 'required-input-invalid',
        'source-identity-unavailable': 'required-input-source-missing',
        'source-identity-mismatch': 'required-input-source-mismatch',
        'revision-unavailable': 'required-input-revision-unavailable',
        'revision-mismatch': 'required-input-revision-mismatch',
        'freshness-unresolved': 'required-input-freshness-unresolved',
        stale: 'required-input-stale',
        unresolved: 'required-input-unresolved',
      } as const;
      requirements.push({
        code: codeByReason[gap.reason],
        inputType,
        hourIndex: gap.hourIndex,
      });
    }
  }

  if (requirements.length > 0) {
    return {
      status: 'not-ready',
      songId: input.songId,
      evaluationHour: input.evaluationHour,
      requirements,
    };
  }

  return {
    status: 'eligible',
    songId: input.songId,
    evaluationHour: input.evaluationHour,
    platformWindow: {
      firstHour: firstPlatformHour,
      lastHour: input.evaluationHour,
      hours: PLATFORM_WINDOW_HOURS,
    },
    voteSeedWindow: {
      firstHour: input.evaluationHour - (C_WINDOW_HOURS - 1),
      lastHour: input.evaluationHour,
      hours: C_WINDOW_HOURS,
    },
  };
}

export function assessChartEvaluationEligibility(input: {
  readonly songIds: readonly string[];
  readonly evaluationHour: number;
  readonly nowMs: number;
  readonly engineState: EngineStateEligibility;
  readonly sourceAssessments: readonly PlatformSourceAssessment[];
  readonly platformCoverage: readonly PlatformHourCoverage[];
  readonly requiredCoverage: readonly RequiredHourlyInputCoverage[];
  readonly requiredCoverageAuthority?: readonly RequiredHourlyCoverageAuthority[];
  readonly platformCoverageAuthority?: readonly RequiredPlatformCoverageAuthority[];
}): ChartEvaluationEligibility {
  if (input.songIds.length === 0) {
    return {
      status: 'not-ready',
      evaluationHour: input.evaluationHour,
      songs: [],
      requirements: [{ code: 'empty-active-population' }],
    };
  }

  const songs = input.songIds.map((songId) =>
    assessSongEvaluationEligibility({
      songId,
      evaluationHour: input.evaluationHour,
      nowMs: input.nowMs,
      engineState: input.engineState,
      sourceAssessments: input.sourceAssessments,
      platformCoverage: input.platformCoverage.filter(
        (coverage) =>
          Boolean(
            coverage &&
              typeof coverage === 'object' &&
              coverage.songId === songId,
          ),
      ),
      requiredCoverage: input.requiredCoverage.filter(
        (coverage) =>
          Boolean(
            coverage &&
              typeof coverage === 'object' &&
              coverage.songId === songId,
          ),
      ),
      requiredCoverageAuthority: input.requiredCoverageAuthority,
      platformCoverageAuthority: input.platformCoverageAuthority?.filter(
        (authority) =>
          Boolean(
            authority &&
              typeof authority === 'object' &&
              authority.songId === songId,
          ),
      ),
    }),
  );
  const requirements = songs.flatMap((song) =>
    song.status === 'not-ready'
      ? song.requirements.map((requirement) => ({
          ...requirement,
          ...(song.songId ? { songId: song.songId } : {}),
        }))
      : [],
  );
  if (requirements.length > 0) {
    return {
      status: 'not-ready',
      evaluationHour: input.evaluationHour,
      songs,
      requirements,
    };
  }
  return {
    status: 'eligible',
    evaluationHour: input.evaluationHour,
    songs,
  };
}
