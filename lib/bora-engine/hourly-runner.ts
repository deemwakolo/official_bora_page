import { rolloverHour } from '../../engine/src/engine/rollover/rollover';
import type {
  EngineState,
  RolloverStep,
} from '../../engine/src/engine/rollover/rollover';
import {
  HOUR_MS,
  TRANSITION_MS,
} from '../../engine/src/engine/constants';
import type { EngineErrorCode, HourIndex } from '../../engine/src/engine/types';
import {
  assessCoverageEvidence,
  isCoverageEvidenceAuthority,
  isCoverageEvidenceRecord,
  type CoverageEvidenceRecord,
  type CoverageEvidenceAuthority,
  type CoverageInputKind,
  type CoverageEvidenceReason,
} from './coverage-evidence';

export type HourlyCoverageInput =
  | 'VOTES'
  | 'SEED'
  | 'YOUTUBE'
  | 'SPOTIFY'
  | 'BOOMPLAY';

/**
 * Coverage for the rollover's exact transition hour and separate platform
 * window. It does not establish the 72-hour evaluation-history requirement.
 */
export interface HourlyInputCoverage {
  readonly songId: string;
  readonly inputType: HourlyCoverageInput;
  readonly hourIndex: number;
  readonly evidence: CoverageEvidenceRecord;
  readonly authority: CoverageEvidenceAuthority;
}

export interface LoadedHourlyRolloverInput {
  readonly status: 'loaded';
  readonly state: EngineState;
  readonly coverage: readonly HourlyInputCoverage[];
  readonly stateRevision: number;
}

export type HourClaimResult =
  | { readonly status: 'claimed'; readonly leaseToken: string }
  | { readonly status: 'already-claimed' }
  | { readonly status: 'already-completed' }
  | { readonly status: 'not-eligible'; readonly eligibleAtMs: number };

export type HourlyRolloverLoadResult =
  | LoadedHourlyRolloverInput
  | {
      readonly status: 'not-ready';
      readonly gaps: readonly HourlyCoverageGap[];
    };

export interface HourlyRolloverCommit {
  readonly closedHour: HourIndex;
  readonly expectedState: EngineState;
  readonly expectedStateRevision: number;
  readonly expectedCoverage: readonly HourlyInputCoverage[];
  readonly nextState: EngineState;
  readonly steps: readonly RolloverStep[];
}

export type HourlyCommitResult =
  | { readonly status: 'completed' }
  | { readonly status: 'already-completed' }
  | { readonly status: 'stale-lease' }
  | { readonly status: 'stale-state' };

/**
 * Persistence requirements for a production runner.
 *
 * claimHour must atomically create/lock the unique hour run, reject completed
 * or unexpired claims, and reclaim failed/expired leases. commitHour must
 * atomically verify lease ownership and unchanged state, verify each active
 * song has not already decayed for this hour, persist the next state and
 * closure trace, then mark the run completed. Migration 0014 proposes these
 * operations, but no applied schema or trusted application adapter exists.
 */
export interface HourlyRolloverPersistence {
  claimHour(input: {
    readonly closedHour: HourIndex;
    /** Stable across retries of this claim request. */
    readonly claimRequestId: string;
    readonly leaseDurationMs: number;
  }): Promise<HourClaimResult>;

  loadRolloverInput(input: {
    readonly closedHour: HourIndex;
    readonly leaseToken: string;
  }): Promise<HourlyRolloverLoadResult>;

  releaseNotReady(input: {
    readonly closedHour: HourIndex;
    readonly leaseToken: string;
  }): Promise<boolean>;

  recordRetryableFailure(input: {
    readonly closedHour: HourIndex;
    readonly leaseToken: string;
    readonly errorCode: string;
  }): Promise<boolean>;

  /** State, closure rows, and completed run MUST commit in one DB transaction. */
  commitHour(input: {
    readonly leaseToken: string;
    readonly commit: HourlyRolloverCommit;
  }): Promise<HourlyCommitResult>;
}

export type HourlyCoverageGap = {
  readonly songId?: string;
  readonly inputType?: HourlyCoverageInput;
  readonly hourIndex?: number;
  readonly reason:
    | 'missing'
    | 'unavailable'
    | 'failed'
    | 'incomplete'
    | 'duplicate'
    | 'invalid'
    | 'unresolved'
    | 'stale'
    | 'source-mismatch'
    | 'revision-mismatch'
    | 'state-hour-mismatch'
    | 'empty-state'
    | 'invalid-state';
};

export type HourlyRolloverResult =
  | {
      readonly status: 'completed';
      readonly closedHour: number;
      readonly nextHour: number;
      readonly processedActiveSongCount: number;
    }
  | {
      readonly status: 'not-ready';
      readonly closedHour: number;
      readonly gaps: readonly HourlyCoverageGap[];
    }
  | {
      readonly status: 'not-eligible';
      readonly closedHour: number;
      readonly eligibleAtMs: number;
    }
  | { readonly status: 'already-claimed'; readonly closedHour: number }
  | { readonly status: 'already-completed'; readonly closedHour: number }
  | {
      readonly status: 'retryable-failure';
      readonly closedHour: number;
      readonly reason:
        | 'claim-failed'
        | 'load-failed'
        | 'failure-record-failed'
        | 'not-ready-release-failed'
        | 'engine-failed'
        | 'commit-outcome-unknown'
        | 'lease-lost'
        | 'state-changed';
      readonly engineErrorCode?: EngineErrorCode;
    }
  | {
      readonly status: 'blocked-by-missing-persistence';
      readonly closedHour: number;
    };

export interface RunHourlyRolloverOptions {
  /** Explicit UTC epoch-hour identity; never re-derived while processing. */
  readonly closedHour: number;
  /** Stable, unpredictable UUID retained by the caller across claim retries. */
  readonly claimRequestId: string;
  /** Explicit clock value for deterministic eligibility and lease timing. */
  readonly nowMs: number;
  readonly leaseDurationMs: number;
  readonly persistence: HourlyRolloverPersistence | null;
}

const PLATFORM_INPUTS = [
  'YOUTUBE',
  'SPOTIFY',
  'BOOMPLAY',
] as const;
const PLATFORM_WINDOW_HOURS = 168;

function coverageEvidenceKind(
  inputType: HourlyCoverageInput,
): CoverageInputKind {
  return inputType === 'VOTES'
    ? 'vote-history'
    : inputType === 'SEED'
      ? 'seed-history'
      : 'platform-observation-history';
}

function isSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function buildCoverageGaps(
  input: LoadedHourlyRolloverInput,
  closedHour: number,
): HourlyCoverageGap[] {
  const activeSongIds = input.state.songs
    .filter((song) => song.lifecycle === 'ACTIVE')
    .map((song) => song.songId);
  const knownSongIds = new Set(input.state.songs.map((song) => song.songId));
  const entries = new Map<string, HourlyInputCoverage>();
  const gaps: HourlyCoverageGap[] = [];

  for (const candidate of input.coverage) {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    ) {
      gaps.push({ hourIndex: closedHour, reason: 'invalid' });
      continue;
    }
    const item = candidate;
    if (
      !knownSongIds.has(item.songId) ||
      !isSafeInteger(item.hourIndex) ||
      !(
        item.inputType === 'VOTES' ||
        item.inputType === 'SEED' ||
        item.inputType === 'YOUTUBE' ||
        item.inputType === 'SPOTIFY' ||
        item.inputType === 'BOOMPLAY'
      ) ||
      !isCoverageEvidenceRecord(item.evidence) ||
      item.evidence.kind !== coverageEvidenceKind(item.inputType) ||
      item.evidence.songId !== item.songId ||
      item.evidence.period.kind !== 'hour' ||
      item.evidence.period.hourIndex !== item.hourIndex
    ) {
      gaps.push({
        songId: typeof item.songId === 'string' ? item.songId : '',
        ...(item.inputType ? { inputType: item.inputType } : {}),
        hourIndex: closedHour,
        reason: 'invalid',
      });
      continue;
    }
    if (!isCoverageEvidenceAuthority(item.authority)) {
      gaps.push({
        songId: item.songId,
        inputType: item.inputType,
        hourIndex: item.hourIndex,
        reason: 'unresolved',
      });
      continue;
    }

    const key = `${item.songId}:${item.inputType}:${item.hourIndex}`;
    if (entries.has(key)) {
      gaps.push({
        songId: item.songId,
        inputType: item.inputType,
        hourIndex: item.hourIndex,
        reason: 'duplicate',
      });
      continue;
    }
    entries.set(key, item);
  }

  const firstPlatformHour = closedHour - (PLATFORM_WINDOW_HOURS - 1);
  for (const songId of activeSongIds) {
    for (const inputType of ['VOTES', 'SEED'] as const) {
      appendCoverageGap(
        entries,
        gaps,
        songId,
        inputType,
        closedHour,
      );
    }
    for (
      let hourIndex = firstPlatformHour;
      hourIndex <= closedHour;
      hourIndex++
    ) {
      for (const inputType of PLATFORM_INPUTS) {
        appendCoverageGap(entries, gaps, songId, inputType, hourIndex);
      }
    }
  }

  return gaps;
}

function appendCoverageGap(
  coverage: ReadonlyMap<string, HourlyInputCoverage>,
  gaps: HourlyCoverageGap[],
  songId: string,
  inputType: HourlyCoverageInput,
  hourIndex: number,
): void {
  const item = coverage.get(`${songId}:${inputType}:${hourIndex}`);
  if (!item) {
    gaps.push({ songId, inputType, hourIndex, reason: 'missing' });
    return;
  }
  const evidence = assessCoverageEvidence(item.evidence, {
    kind: coverageEvidenceKind(inputType),
    songId,
    period: { kind: 'hour', hourIndex },
    sourceIdentity: item.authority.sourceIdentity,
    revision: item.authority.revision,
    evidenceId: item.authority.evidenceId,
  });
  if (evidence.status === 'unresolved') {
    const reason = coverageEvidenceGapReason(evidence.reason);
    gaps.push({ songId, inputType, hourIndex, reason });
  }
}

function coverageEvidenceGapReason(
  reason: CoverageEvidenceReason,
): HourlyCoverageGap['reason'] {
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
    case 'source-identity-missing':
      return 'source-mismatch';
    case 'revision-mismatch':
    case 'evidence-identity-missing':
      return 'revision-mismatch';
    case 'assessment-time-invalid':
    case 'freshness-unverified':
    case 'coverage-unattributable':
    case 'other':
      return 'unresolved';
  }
}

async function recordFailure(
  persistence: HourlyRolloverPersistence,
  closedHour: HourIndex,
  leaseToken: string,
  errorCode: string,
  reason: Extract<
    HourlyRolloverResult,
    { status: 'retryable-failure' }
  >['reason'],
): Promise<HourlyRolloverResult> {
  try {
    const recorded = await persistence.recordRetryableFailure({
      closedHour,
      leaseToken,
      errorCode,
    });
    return {
      status: 'retryable-failure',
      closedHour,
      reason: recorded ? reason : 'lease-lost',
    };
  } catch {
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'failure-record-failed',
    };
  }
}

/**
 * Run one explicitly identified rollover when a real atomic persistence
 * adapter is provided. This module deliberately ships without such an adapter.
 */
export async function runHourlyRollover(
  options: RunHourlyRolloverOptions,
): Promise<HourlyRolloverResult> {
  const { closedHour, nowMs, leaseDurationMs, persistence } = options;
  if (
    !isSafeInteger(closedHour) ||
    !isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !isUuid(options.claimRequestId) ||
    !Number.isSafeInteger(leaseDurationMs) ||
    leaseDurationMs <= 0
  ) {
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'claim-failed',
    };
  }
  // This is an early UX guard only. The atomic database claim independently
  // checks eligibility and lease timing against database time.
  const eligibleAtMs = (closedHour + 1) * HOUR_MS + TRANSITION_MS;
  if (!Number.isSafeInteger(eligibleAtMs) || nowMs < eligibleAtMs) {
    return {
      status: 'not-eligible',
      closedHour,
      eligibleAtMs,
    };
  }
  if (!persistence) {
    return { status: 'blocked-by-missing-persistence', closedHour };
  }

  const targetHour = closedHour as HourIndex;
  let claim: HourClaimResult;
  try {
    claim = await persistence.claimHour({
      closedHour: targetHour,
      claimRequestId: options.claimRequestId,
      leaseDurationMs,
    });
  } catch {
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'claim-failed',
    };
  }

  if (!claim || typeof claim !== 'object') {
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'claim-failed',
    };
  }
  if (claim.status === 'already-claimed') {
    return { status: 'already-claimed', closedHour };
  }
  if (claim.status === 'already-completed') {
    return { status: 'already-completed', closedHour };
  }
  if (claim.status === 'not-eligible') {
    if (!Number.isSafeInteger(claim.eligibleAtMs)) {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'claim-failed',
      };
    }
    return {
      status: 'not-eligible',
      closedHour,
      eligibleAtMs: claim.eligibleAtMs,
    };
  }
  if (claim.status !== 'claimed') {
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'claim-failed',
    };
  }
  if (
    typeof claim.leaseToken !== 'string' ||
    !isUuid(claim.leaseToken)
  ) {
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'claim-failed',
    };
  }

  let loaded: HourlyRolloverLoadResult;
  try {
    loaded = await persistence.loadRolloverInput({
      closedHour: targetHour,
      leaseToken: claim.leaseToken,
    });
  } catch {
    return recordFailure(
      persistence,
      targetHour,
      claim.leaseToken,
      'input-load-failed',
      'load-failed',
    );
  }

  if (!loaded || typeof loaded !== 'object') {
    return recordFailure(
      persistence,
      targetHour,
      claim.leaseToken,
      'invalid-loaded-input',
      'load-failed',
    );
  }

  if (loaded.status === 'not-ready') {
    try {
      const released = await persistence.releaseNotReady({
        closedHour: targetHour,
        leaseToken: claim.leaseToken,
      });
      return released
        ? { status: 'not-ready', closedHour, gaps: loaded.gaps }
        : { status: 'retryable-failure', closedHour, reason: 'lease-lost' };
    } catch {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'not-ready-release-failed',
      };
    }
  }

  if (
    loaded.status !== 'loaded' ||
    !loaded.state ||
    typeof loaded.state !== 'object' ||
    !Array.isArray(loaded.state.songs) ||
    !Array.isArray(loaded.coverage) ||
    !Number.isSafeInteger(loaded.stateRevision) ||
    loaded.stateRevision < 0
  ) {
    return recordFailure(
      persistence,
      targetHour,
      claim.leaseToken,
      'invalid-loaded-input',
      'load-failed',
    );
  }

  if (
    !loaded.state.songs.every(
      (song) =>
        song !== null &&
        typeof song === 'object' &&
        typeof song.songId === 'string' &&
        song.songId.trim().length > 0 &&
        (song.lifecycle === 'ACTIVE' || song.lifecycle === 'VAULT'),
    ) ||
    new Set(loaded.state.songs.map((song) => song.songId)).size !==
      loaded.state.songs.length
  ) {
    const gaps: HourlyCoverageGap[] = [
      { hourIndex: closedHour, reason: 'invalid-state' },
    ];
    try {
      const released = await persistence.releaseNotReady({
        closedHour: targetHour,
        leaseToken: claim.leaseToken,
      });
      return released
        ? { status: 'not-ready', closedHour, gaps }
        : { status: 'retryable-failure', closedHour, reason: 'lease-lost' };
    } catch {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'not-ready-release-failed',
      };
    }
  }

  if (
    loaded.state.referenceHour !== targetHour ||
    loaded.state.songs.length === 0
  ) {
    const gaps: HourlyCoverageGap[] =
      loaded.state.referenceHour !== targetHour
      ? [{ hourIndex: closedHour, reason: 'state-hour-mismatch' }]
      : [{ hourIndex: closedHour, reason: 'empty-state' }];
    try {
      const released = await persistence.releaseNotReady({
        closedHour: targetHour,
        leaseToken: claim.leaseToken,
      });
      return released
        ? { status: 'not-ready', closedHour, gaps }
        : { status: 'retryable-failure', closedHour, reason: 'lease-lost' };
    } catch {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'not-ready-release-failed',
      };
    }
  }

  const gaps = buildCoverageGaps(loaded, closedHour);
  if (gaps.length > 0) {
    try {
      const released = await persistence.releaseNotReady({
        closedHour: targetHour,
        leaseToken: claim.leaseToken,
      });
      return released
        ? { status: 'not-ready', closedHour, gaps }
        : { status: 'retryable-failure', closedHour, reason: 'lease-lost' };
    } catch {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'not-ready-release-failed',
      };
    }
  }

  let rolled: ReturnType<typeof rolloverHour>;
  try {
    rolled = rolloverHour(loaded.state, targetHour);
  } catch {
    return recordFailure(
      persistence,
      targetHour,
      claim.leaseToken,
      'engine-threw',
      'engine-failed',
    );
  }
  if (!rolled.ok) {
    const failed = await recordFailure(
      persistence,
      targetHour,
      claim.leaseToken,
      rolled.error.code,
      'engine-failed',
    );
    return {
      ...failed,
      ...(failed.status === 'retryable-failure' &&
      failed.reason === 'engine-failed'
        ? { engineErrorCode: rolled.error.code }
        : {}),
    };
  }

  try {
    const commitResult = await persistence.commitHour({
      leaseToken: claim.leaseToken,
      commit: {
        closedHour: targetHour,
        expectedState: loaded.state,
        expectedStateRevision: loaded.stateRevision,
        expectedCoverage: loaded.coverage,
        nextState: rolled.value.state,
        steps: rolled.value.steps,
      },
    });
    if (
      !commitResult ||
      typeof commitResult !== 'object' ||
      !('status' in commitResult)
    ) {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'commit-outcome-unknown',
      };
    }
    if (commitResult.status === 'already-completed') {
      return { status: 'already-completed', closedHour };
    }
    if (commitResult.status === 'stale-lease') {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'lease-lost',
      };
    }
    if (commitResult.status === 'stale-state') {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'state-changed',
      };
    }
    if (commitResult.status !== 'completed') {
      return {
        status: 'retryable-failure',
        closedHour,
        reason: 'commit-outcome-unknown',
      };
    }
  } catch {
    // A failed response can be ambiguous: the DB may have committed before
    // the connection failed. Retry by claiming/probing this same hour.
    return {
      status: 'retryable-failure',
      closedHour,
      reason: 'commit-outcome-unknown',
    };
  }

  return {
    status: 'completed',
    closedHour,
    nextHour: rolled.value.toHour,
    processedActiveSongCount: rolled.value.steps.length,
  };
}
