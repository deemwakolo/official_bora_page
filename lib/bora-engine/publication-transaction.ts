import type { PlatformId } from '../../engine/src/engine/types';

export interface ActivePublicationEntry {
  readonly position: number;
  readonly songId: string;
  readonly lifecycle: 'ACTIVE';
  readonly rank: number;
  readonly activeC: number;
  readonly xp: number;
  readonly kuraFresh: number;
  readonly persistentKuraBefore: number;
  readonly persistentKuraNext: number | null;
  readonly platformPerformance: Readonly<Record<PlatformId, number>>;
  readonly boraScore: number;
}

export interface VaultPublicationEntry {
  readonly position: number;
  readonly songId: string;
  readonly lifecycle: 'VAULT';
  readonly rank: null;
  readonly activeC: null;
  readonly xp: null;
  readonly kuraFresh: null;
  readonly persistentKuraBefore: null;
  readonly persistentKuraNext: null;
  readonly platformPerformance: Readonly<Record<PlatformId, null>>;
  readonly boraScore: null;
}

export type PublicationCandidateEntry =
  | ActivePublicationEntry
  | VaultPublicationEntry;

export type ExpectedCurrentPublication =
  | { readonly status: 'initial' }
  | { readonly status: 'published'; readonly publicationId: string };

export type SourceSnapshotIdentity =
  | { readonly kind: 'revision'; readonly revision: number }
  | { readonly kind: 'identity'; readonly identity: string };

export interface PublicationTransactionRequest {
  /** Caller-supplied stable UUID; never generated or replaced by this module. */
  readonly requestId: string;
  readonly evaluationReferenceHour: number;
  readonly expectedState: {
    readonly revision: number;
    readonly referenceHour: number;
  };
  readonly expectedCurrentPublication: ExpectedCurrentPublication;
  readonly sourceSnapshot: SourceSnapshotIdentity;
  readonly evaluation: {
    readonly resultIdentity: string;
    readonly validationStatus: 'validated';
    readonly referenceHour: number;
    readonly activeSongIds: readonly string[];
    readonly excludedVaultedSongIds: readonly string[];
    readonly totalActiveC: number;
    readonly platformTotals: Readonly<Record<PlatformId, number>>;
  };
  /**
   * Active entries must be in rank order, followed by Vault entries in
   * ascending song-id order. Positions are contiguous and zero-based.
   */
  readonly entries: readonly PublicationCandidateEntry[];
}

export type PublicationRequestProblem =
  | 'invalid-request-id'
  | 'invalid-reference-hour'
  | 'invalid-state-revision'
  | 'state-reference-hour-mismatch'
  | 'invalid-current-publication'
  | 'invalid-source-snapshot'
  | 'invalid-evaluation-identity'
  | 'invalid-evaluation-validation'
  | 'invalid-evaluation-totals'
  | 'empty-candidate'
  | 'invalid-entry'
  | 'duplicate-song'
  | 'invalid-entry-order'
  | 'idempotency-key-reused'
  | 'request-record-mismatch'
  | 'incomplete-active-ranks'
  | 'missing-or-invalid-entry-values';

export type PublicationNotReadyReason =
  | 'source-readiness-changed'
  | 'coverage-incomplete'
  | 'source-unavailable'
  | 'source-unauthorized'
  | 'evaluation-not-eligible';

export type PublicationRequestValidation =
  | {
      readonly status: 'valid';
      readonly request: PublicationTransactionRequest;
    }
  | {
      readonly status: 'invalid-publication';
      readonly reasons: readonly PublicationRequestProblem[];
    };

export type PublicationTransactionOutcome =
  | {
      readonly status: 'published';
      readonly requestId: string;
      readonly publicationId: string;
    }
  | {
      readonly status: 'already-published';
      readonly requestId: string;
      readonly publicationId: string;
    }
  | {
      readonly status: 'not-ready';
      readonly requestId: string;
      readonly reasons: readonly PublicationNotReadyReason[];
    }
  | {
      readonly status: 'stale-state';
      readonly requestId: string;
      readonly reason:
        | 'state-revision-changed'
        | 'reference-hour-changed'
        | 'current-publication-changed'
        | 'source-snapshot-changed';
    }
  | {
      readonly status: 'lease-conflict';
      readonly requestId: string;
    }
  | {
      readonly status: 'invalid-publication';
      readonly requestId?: string;
      readonly reasons: readonly PublicationRequestProblem[];
    }
  | {
      readonly status: 'failed';
      readonly requestId: string;
      readonly errorCode: string;
    }
  | {
      readonly status: 'commit-unknown';
      readonly requestId: string;
    };

export type ExistingPublicationRequest = {
  readonly request: PublicationTransactionRequest;
} & (
  | { readonly status: 'in-progress' }
  | {
      readonly status: 'published';
      readonly publicationId: string;
    }
  | { readonly status: 'commit-unknown' }
);

export type PublicationRetryDisposition =
  | { readonly status: 'new-attempt' }
  | Extract<
      PublicationTransactionOutcome,
      {
        readonly status:
          | 'already-published'
          | 'lease-conflict'
          | 'commit-unknown'
          | 'invalid-publication';
      }
    >;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLATFORMS: readonly PlatformId[] = [
  'youtube',
  'spotify',
  'boomplay',
];
const PLATFORM_LIMITS: Readonly<Record<PlatformId, number>> = {
  youtube: 30,
  spotify: 15,
  boomplay: 5,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isFiniteNonNegative(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function isWithinLimit(value: unknown, maximum: number): value is number {
  return isFiniteNonNegative(value) && value <= maximum;
}

function isPlatformTotals(
  value: unknown,
): value is Readonly<Record<PlatformId, number>> {
  return (
    isRecord(value) &&
    PLATFORMS.every(
      (platform) =>
        isWithinLimit(value[platform], PLATFORM_LIMITS[platform]),
    )
  );
}

function entryProblems(
  value: unknown,
  expectedPosition: number,
  expectedActiveRank: number,
): {
  readonly problems: PublicationRequestProblem[];
  readonly active: boolean;
  readonly rank: number | null;
  readonly songId: string | null;
} {
  if (!isRecord(value)) {
    return {
      problems: ['invalid-entry'],
      active: false,
      rank: null,
      songId: null,
    };
  }

  const problems: PublicationRequestProblem[] = [];
  const songId =
    typeof value.songId === 'string' && UUID_PATTERN.test(value.songId)
      ? value.songId
      : null;
  if (songId === null) problems.push('invalid-entry');
  if (value.position !== expectedPosition) {
    problems.push('invalid-entry-order');
  }

  if (value.lifecycle === 'VAULT') {
    const performance = value.platformPerformance;
    if (
      value.rank !== null ||
      value.activeC !== null ||
      value.xp !== null ||
      value.kuraFresh !== null ||
      value.persistentKuraBefore !== null ||
      value.persistentKuraNext !== null ||
      !isRecord(performance) ||
      PLATFORMS.some((platform) => performance[platform] !== null) ||
      value.boraScore !== null
    ) {
      problems.push('invalid-entry');
    }
    return { problems, active: false, rank: null, songId };
  }
  if (value.lifecycle !== 'ACTIVE') {
    problems.push('invalid-entry');
    return { problems, active: false, rank: null, songId };
  }

  if (value.rank !== expectedActiveRank) {
    problems.push('incomplete-active-ranks');
  }
  const performance = value.platformPerformance;
  const validPerformance =
    isRecord(performance) &&
    PLATFORMS.every(
      (platform) =>
        isWithinLimit(performance[platform], PLATFORM_LIMITS[platform]),
    );
  if (
    !isFiniteNonNegative(value.activeC) ||
    !isFiniteNonNegative(value.xp) ||
    value.xp > 1 ||
    !isFiniteNonNegative(value.kuraFresh) ||
    !isFiniteNonNegative(value.persistentKuraBefore) ||
    (value.persistentKuraNext !== null &&
      !isFiniteNonNegative(value.persistentKuraNext)) ||
    !validPerformance ||
    !isFiniteNonNegative(value.boraScore)
  ) {
    problems.push('missing-or-invalid-entry-values');
  }
  return {
    problems,
    active: true,
    rank: isNonNegativeInteger(value.rank) ? value.rank : null,
    songId,
  };
}

/** Validate the complete request shape without creating or repairing identity. */
export function validatePublicationRequest(
  value: unknown,
): PublicationRequestValidation {
  if (!isRecord(value)) {
    return {
      status: 'invalid-publication',
      reasons: ['invalid-request-id'],
    };
  }

  const reasons: PublicationRequestProblem[] = [];
  if (typeof value.requestId !== 'string' || !UUID_PATTERN.test(value.requestId)) {
    reasons.push('invalid-request-id');
  }
  if (!isNonNegativeInteger(value.evaluationReferenceHour)) {
    reasons.push('invalid-reference-hour');
  }

  const expectedState = value.expectedState;
  if (
    !isRecord(expectedState) ||
    !isNonNegativeInteger(expectedState.revision)
  ) {
    reasons.push('invalid-state-revision');
  }
  if (
    !isRecord(expectedState) ||
    !isNonNegativeInteger(expectedState.referenceHour)
  ) {
    reasons.push('invalid-reference-hour');
  } else if (
    isNonNegativeInteger(value.evaluationReferenceHour) &&
    expectedState.referenceHour !== value.evaluationReferenceHour
  ) {
    reasons.push('state-reference-hour-mismatch');
  }

  const expectedCurrent = value.expectedCurrentPublication;
  if (
    !isRecord(expectedCurrent) ||
    (expectedCurrent.status === 'initial' &&
      Object.keys(expectedCurrent).length !== 1) ||
    (expectedCurrent.status === 'published' &&
      (typeof expectedCurrent.publicationId !== 'string' ||
        !UUID_PATTERN.test(expectedCurrent.publicationId))) ||
    (expectedCurrent.status !== 'initial' &&
      expectedCurrent.status !== 'published')
  ) {
    reasons.push('invalid-current-publication');
  }

  const sourceSnapshot = value.sourceSnapshot;
  if (
    !isRecord(sourceSnapshot) ||
    (sourceSnapshot.kind === 'revision' &&
      !isNonNegativeInteger(sourceSnapshot.revision)) ||
    (sourceSnapshot.kind === 'identity' &&
      !isNonEmptyString(sourceSnapshot.identity)) ||
    (sourceSnapshot.kind !== 'revision' &&
      sourceSnapshot.kind !== 'identity')
  ) {
    reasons.push('invalid-source-snapshot');
  }

  const evaluation = value.evaluation;
  if (
    !isRecord(evaluation) ||
    !isNonEmptyString(evaluation.resultIdentity)
  ) {
    reasons.push('invalid-evaluation-identity');
  }
  if (
    !isRecord(evaluation) ||
    evaluation.validationStatus !== 'validated'
  ) {
    reasons.push('invalid-evaluation-validation');
  }
  if (
    !isRecord(evaluation) ||
    !isNonNegativeInteger(evaluation.referenceHour) ||
    evaluation.referenceHour !== value.evaluationReferenceHour ||
    !Array.isArray(evaluation.activeSongIds) ||
    !Array.isArray(evaluation.excludedVaultedSongIds) ||
    !evaluation.activeSongIds.every(
      (songId) => typeof songId === 'string' && UUID_PATTERN.test(songId),
    ) ||
    !evaluation.excludedVaultedSongIds.every(
      (songId) => typeof songId === 'string' && UUID_PATTERN.test(songId),
    )
  ) {
    reasons.push('invalid-evaluation-identity');
  }
  if (
    !isRecord(evaluation) ||
    !isFiniteNonNegative(evaluation.totalActiveC) ||
    !isPlatformTotals(evaluation.platformTotals)
  ) {
    reasons.push('invalid-evaluation-totals');
  }

  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    reasons.push('empty-candidate');
  } else {
    let activeRank = 0;
    let sawVault = false;
    let previousVaultSongId = '';
    const seenSongs = new Set<string>();
    const entryLifecycleBySong = new Map<string, 'ACTIVE' | 'VAULT'>();
    value.entries.forEach((entry, position) => {
      const parsed = entryProblems(entry, position, activeRank + 1);
      reasons.push(...parsed.problems);
      if (parsed.songId !== null) {
        if (seenSongs.has(parsed.songId)) reasons.push('duplicate-song');
        seenSongs.add(parsed.songId);
        entryLifecycleBySong.set(
          parsed.songId,
          parsed.active ? 'ACTIVE' : 'VAULT',
        );
      }
      if (parsed.active) {
        if (sawVault) reasons.push('invalid-entry-order');
        activeRank += 1;
      } else {
        sawVault = true;
        if (
          parsed.songId !== null &&
          previousVaultSongId !== '' &&
          parsed.songId <= previousVaultSongId
        ) {
          reasons.push('invalid-entry-order');
        }
        if (parsed.songId !== null) previousVaultSongId = parsed.songId;
      }
    });
    if (activeRank === 0) reasons.push('empty-candidate');
    if (
      !isRecord(evaluation) ||
      !Array.isArray(evaluation.activeSongIds) ||
      !Array.isArray(evaluation.excludedVaultedSongIds)
    ) {
      reasons.push('invalid-evaluation-identity');
    } else {
      const expectedActive = new Set(evaluation.activeSongIds);
      const expectedVaulted = new Set(evaluation.excludedVaultedSongIds);
      if (
        expectedActive.size !== evaluation.activeSongIds.length ||
        expectedVaulted.size !== evaluation.excludedVaultedSongIds.length ||
        [...expectedActive].some((songId) => expectedVaulted.has(songId)) ||
        entryLifecycleBySong.size !== expectedActive.size + expectedVaulted.size ||
        [...expectedActive].some(
          (songId) => entryLifecycleBySong.get(songId) !== 'ACTIVE',
        ) ||
        [...expectedVaulted].some(
          (songId) => entryLifecycleBySong.get(songId) !== 'VAULT',
        )
      ) {
        reasons.push('invalid-evaluation-identity');
      }
    }
  }

  if (reasons.length > 0) {
    return {
      status: 'invalid-publication',
      reasons: [...new Set(reasons)],
    };
  }

  return {
    status: 'valid',
    // All required fields and nested entries have been validated above.
    request: value as unknown as PublicationTransactionRequest,
  };
}

function canonicalCandidate(
  request: PublicationTransactionRequest,
): string {
  const current =
    request.expectedCurrentPublication.status === 'initial'
      ? ['initial']
      : ['published', request.expectedCurrentPublication.publicationId];
  const source =
    request.sourceSnapshot.kind === 'revision'
      ? ['revision', request.sourceSnapshot.revision]
      : ['identity', request.sourceSnapshot.identity];
  const entries = request.entries.map((entry) =>
    entry.lifecycle === 'ACTIVE'
      ? [
          entry.position,
          entry.songId,
          entry.lifecycle,
          entry.rank,
          entry.activeC,
          entry.xp,
          entry.kuraFresh,
          entry.persistentKuraBefore,
          entry.persistentKuraNext,
          entry.platformPerformance.youtube,
          entry.platformPerformance.spotify,
          entry.platformPerformance.boomplay,
          entry.boraScore,
        ]
      : [entry.position, entry.songId, entry.lifecycle, entry.rank],
  );
  return JSON.stringify([
    request.evaluationReferenceHour,
    request.expectedState.revision,
    request.expectedState.referenceHour,
    current,
    source,
    request.evaluation.resultIdentity,
    request.evaluation.validationStatus,
    request.evaluation.referenceHour,
    request.evaluation.activeSongIds,
    request.evaluation.excludedVaultedSongIds,
    request.evaluation.totalActiveC,
    request.evaluation.platformTotals.youtube,
    request.evaluation.platformTotals.spotify,
    request.evaluation.platformTotals.boomplay,
    entries,
  ]);
}

/**
 * Compare a retry with the authoritative request record. This is a pure
 * disposition helper; the database must perform the lookup/claim atomically.
 */
export function assessPublicationRetry(
  requestValue: unknown,
  existing: ExistingPublicationRequest | null,
): PublicationRetryDisposition {
  const validated = validatePublicationRequest(requestValue);
  if (validated.status !== 'valid') {
    return {
      status: 'invalid-publication',
      ...(isRecord(requestValue) && typeof requestValue.requestId === 'string'
        ? { requestId: requestValue.requestId }
        : {}),
      reasons: validated.reasons,
    };
  }
  if (existing === null) return { status: 'new-attempt' };

  const prior = validatePublicationRequest(existing.request);
  if (prior.status !== 'valid') {
    return {
      status: 'invalid-publication',
      requestId: validated.request.requestId,
      reasons: ['request-record-mismatch'],
    };
  }
  if (existing.request.requestId !== validated.request.requestId) {
    return {
      status: 'invalid-publication',
      requestId: validated.request.requestId,
      reasons: ['request-record-mismatch'],
    };
  }
  if (
    canonicalCandidate(existing.request) !==
    canonicalCandidate(validated.request)
  ) {
    return {
      status: 'invalid-publication',
      requestId: validated.request.requestId,
      reasons: ['idempotency-key-reused'],
    };
  }
  if (existing.status === 'published') {
    if (!UUID_PATTERN.test(existing.publicationId)) {
      return {
        status: 'invalid-publication',
        requestId: validated.request.requestId,
        reasons: ['invalid-current-publication'],
      };
    }
    return {
      status: 'already-published',
      requestId: validated.request.requestId,
      publicationId: existing.publicationId,
    };
  }
  if (existing.status === 'commit-unknown') {
    return {
      status: 'commit-unknown',
      requestId: validated.request.requestId,
    };
  }
  return {
    status: 'lease-conflict',
    requestId: validated.request.requestId,
  };
}

/** Use after a transport failure where the database may have committed. */
export function unknownPublicationCommit(
  requestId: string,
): PublicationTransactionOutcome {
  if (!UUID_PATTERN.test(requestId)) {
    return {
      status: 'invalid-publication',
      reasons: ['invalid-request-id'],
    };
  }
  return { status: 'commit-unknown', requestId };
}
