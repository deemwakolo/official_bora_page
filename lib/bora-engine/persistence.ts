import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEngineInputFromBackendRows,
  type EngineSongLike,
} from './adapter';
import type {
  EngineState,
  RolloverSong,
} from '../../engine/src/engine/rollover/rollover';
import type {
  HourlyCoverageGap,
  HourlyCoverageInput,
  HourlyCoverageReconciliationResult,
  HourlyInputCoverage,
  HourClaimResult,
  HourlyCommitResult,
  HourlyRolloverLoadResult,
  HourlyRolloverPersistence,
  LoadedHourlyRolloverInput,
} from './hourly-runner';
import type { HourIndex } from '../../engine/src/engine/types';
import type { DailyPlatformRankSnapshot } from '../../engine/src/engine/platform/daily-platform-activity';
import {
  isCoverageEvidenceAuthority,
  isCoverageEvidenceRecord,
} from './coverage-evidence';
import type { CanonicalAcceptedVoteEvent } from '../supabase/vote-event';
import {
  SECURE_VOTE_SOURCE_COLUMNS,
  toCanonicalSecureVoteEvent,
  type SecureVoteSourceRow,
} from '../supabase/secure-vote-source';
import {
  assessVoteEventIngestionRetry,
  classifyVoteEventIngestionRpcResult,
  validateVoteEventIngestionRequest,
  type VoteEventIngestionOutcome,
} from './vote-event-ingestion';
import {
  unknownPublicationCommit,
  validatePublicationRequest,
  type BoraEnginePublishedChart,
  type ExpectedCurrentPublication,
  type PublicationNotReadyReason,
  type PublicationRequestProblem,
  type PublicationTransactionOutcome,
  type PublicationTransactionRequest,
} from './publication-transaction';

type JsonRecord = Record<string, unknown>;

export type BoraEnginePersistenceSetup =
  | {
      readonly status: 'available';
      readonly persistence: BoraEnginePersistence;
    }
  | {
      readonly status: 'configuration-unavailable';
      readonly missing: 'NEXT_PUBLIC_SUPABASE_URL' | 'BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY';
    };

/**
 * One rediscovery page: source rows scanned (canonical `public.vote_events`,
 * append-only), the subset not yet present in the Engine ledger, and whether
 * the source contained more rows beyond this page. Completeness derives from
 * the ledger anti-join predicate, never from a durable cursor ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â unfinished
 * work simply remains in the source set for the next scan.
 */
export interface PendingSecureVoteEventBatch {
  readonly events: readonly CanonicalAcceptedVoteEvent[];
  readonly scanned: number;
  readonly hasMore: boolean;
}

export interface YouTubeSnapshotPersistenceInput {
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
    readonly sourceObservationId: string;
  };
  readonly version: number;
  readonly supersedesSnapshotId: string | null;
}

export type YouTubeSnapshotPersistenceResult =
  | {
      readonly status: 'recorded' | 'already-recorded';
      readonly sourceObservationId: string;
    }
  | {
      readonly status: 'error';
      readonly reason:
        | 'invalid-snapshot'
        | 'song-read-failed'
        | 'song-not-found'
        | 'mapping-mismatch'
        | 'snapshot-read-failed'
        | 'conflicting-source-identity'
        | 'snapshot-insert-failed';
      readonly errorCode?: string;
    };

export interface BoraEnginePersistence extends HourlyRolloverPersistence {
  loadLiveVoteEngineInputSnapshot(): Promise<LiveVoteEngineInputSnapshotResult>;
  readiness(closedHour: number | null): Promise<BoraEngineReadiness>;
  /**
   * Phase 4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Publication readiness RPC. Determines whether a closed hour's
   * vote data satisfies the full-window readiness predicate (648 slots per
   * active song) and has no invalidated vote events in the publication
   * window. Delegates to bora_engine_readiness for the core predicate and
   * adds publication-specific validity checks at the database level.
   */
  publishEligibility(closedHour: HourIndex): Promise<BoraEnginePublishEligibility>;
  bootstrap(input: EngineBootstrapInput): Promise<EngineBootstrapResult>;
  /**
   * Phase 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â durable ingestion of one committed, accepted secure-vote event
   * through the single atomic `bora_engine_ingest_vote_event` transaction.
   * Deduplication, bucket counting, and coverage invalidation remain the
   * database's authority; this method never issues a standalone bucket
   * increment and returns the normalized application contract only.
   */
  ingestVoteEvent(
    event: CanonicalAcceptedVoteEvent,
  ): Promise<VoteEventIngestionOutcome>;
  /**
   * Phase 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â cursor-free rediscovery: canonical source rows not yet present
   * in `bora_engine_vote_events` under the stable identity
   * `(source_system, source_event_id)`, ordered by (created_at, id) and
   * bounded by (offset, limit) for one invocation.
   */
  findPendingSecureVoteEvents(options: {
    readonly cutoverIso: string;
    readonly offset: number;
    readonly limit: number;
  }): Promise<PendingSecureVoteEventBatch>;
  /** Persists cumulative evidence only; it does not assert hourly coverage. */
  persistYouTubeSnapshot(
    input: YouTubeSnapshotPersistenceInput,
  ): Promise<YouTubeSnapshotPersistenceResult>;
  loadPublicationInputSnapshot(): Promise<BoraEnginePublicationInputSnapshotResult>;
  publishChart(
    request: PublicationTransactionRequest,
  ): Promise<PublicationTransactionOutcome>;
  readCurrentPublication(): Promise<BoraEnginePublishedChart | null>;
}

export type BoraEnginePublicationInputSnapshotResult =
  | {
      readonly status: 'ready';
      readonly referenceHour: number;
      readonly stateRevision: number;
      readonly sourceRevision: number;
      readonly expectedCurrentPublication: ExpectedCurrentPublication;
      readonly songs: readonly unknown[];
      readonly isSyntheticDemo: boolean;
      readonly dailyPlatformRankSnapshots: Readonly<
        Record<
          'youtube' | 'spotify' | 'boomplay',
          readonly DailyPlatformRankSnapshot[]
        >
      >;
    }
  | { readonly status: 'not-ready'; readonly reason: string }
  | {
      readonly status: 'unavailable';
      readonly reason: 'rpc-failed' | 'invalid-response';
      readonly errorCode?: string;
    };

export type LiveVoteEngineInputSnapshotResult =
  | {
      readonly status: 'ready';
      readonly referenceHour: number;
      readonly songs: readonly {
        readonly songId: string;
        readonly lifecycle: 'ACTIVE' | 'VAULT';
      }[];
      readonly votes: readonly {
        readonly songId: string;
        readonly hourIndex: number;
        readonly voteType: 'up' | 'down';
      }[];
    }
  | {
      readonly status: 'unavailable';
      readonly reason:
        | 'state-read-failed'
        | 'vote-read-failed'
        | 'state-changed-during-read'
        | 'invalid-response';
      readonly errorCode?: string;
    };

export type BoraEngineReadinessCheck = {
  readonly status:
    | 'ready'
    | 'missing'
    | 'incomplete'
    | 'unavailable'
    | 'unresolved';
  readonly detail?: string;
  readonly expected?: number;
  readonly complete?: number;
  readonly missing?: number;
  readonly unavailable?: number;
  readonly failed?: number;
  readonly records?: number;
  readonly zeroRecords?: number;
  readonly duplicates?: number;
  readonly acceptedEvents?: number;
  readonly referenceHour?: number;
}

export interface BoraEngineReadiness {
  readonly status: 'ready' | 'not-ready' | 'unavailable';
  readonly closedHour: number | null;
  readonly checks: {
    readonly trustedPersistence: BoraEngineReadinessCheck;
    readonly initialState: BoraEngineReadinessCheck;
    readonly voteHistory: BoraEngineReadinessCheck;
    readonly seedHours: BoraEngineReadinessCheck;
    readonly youtube: BoraEngineReadinessCheck;
    readonly spotify: BoraEngineReadinessCheck;
    readonly boomplay: BoraEngineReadinessCheck;
    readonly databaseContract: BoraEngineReadinessCheck;
  };
}

export interface BoraEnginePublishEligibility {
  readonly status: 'eligible' | 'not-eligible';
  readonly closedHour: number;
  readonly reason?: 'no-reference-hour' | 'reference-hour-mismatch' | 'vote-events-invalidated-in-window' | 'readiness-incomplete' | 'coverage-evidence-incomplete';
  readonly referenceHour?: number;
  readonly readiness?: BoraEngineReadiness;
}

export interface EngineBootstrapInput {
  readonly approvalId: string;
  readonly approvedBy: string;
  readonly approvalReason: string;
  readonly state: EngineState;
  readonly coverage: readonly HourlyInputCoverage[];
}

export type EngineBootstrapResult =
  | { readonly status: 'initialized'; readonly referenceHour: number }
  | { readonly status: 'already-initialized' }
  | { readonly status: 'not-ready' }
  | { readonly status: 'invalid-input' }
  | { readonly status: 'configuration-unavailable' }
  | { readonly status: 'persistence-failure' };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidYouTubeSnapshotPersistenceInput(
  value: unknown,
): value is YouTubeSnapshotPersistenceInput {
  if (!isRecord(value) || !isRecord(value.snapshotIdentity)) return false;

  const parsedAt =
    typeof value.retrievedAt === 'string'
      ? Date.parse(value.retrievedAt)
      : Number.NaN;
  const captureId = value.snapshotIdentity.sourceObservationId;
  const parentId = value.supersedesSnapshotId;
  const version = value.version;
  const isUuid = (candidate: unknown): candidate is string =>
    typeof candidate === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      candidate,
    );

  return (
    typeof value.songId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.songId,
    ) &&
    typeof value.videoId === 'string' &&
    /^[A-Za-z0-9_-]{11}$/.test(value.videoId) &&
    value.metric === 'cumulative_views' &&
    value.unit === 'views_total' &&
    typeof value.value === 'string' &&
    /^\d+$/.test(value.value) &&
    Number.isFinite(parsedAt) &&
    new Date(parsedAt).toISOString() === value.retrievedAt &&
    value.provider === 'youtube-data-api-v3' &&
    value.sourceStatus === 'observed' &&
    value.snapshotIdentity.sourceSystem === 'youtube-data-api-v3' &&
    isUuid(captureId) &&
    typeof version === 'number' &&
    Number.isSafeInteger(version) &&
    version >= 0 &&
    ((version === 0 && parentId === null) ||
      (typeof parentId === 'string' && isUuid(parentId) && version > 0))
  );
}

function relatedRecord(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    return value.length === 1 && isRecord(value[0]) ? value[0] : null;
  }
  return isRecord(value) ? value : null;
}

function finiteNumber(value: unknown): number | null {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function parseDailyPlatformRankSnapshots(
  value: unknown,
): DailyPlatformRankSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const snapshots: DailyPlatformRankSnapshot[] = [];
  const dates = new Set<string>();

  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      typeof candidate.effectiveDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(candidate.effectiveDate) ||
      !Array.isArray(candidate.ranks)
    ) {
      return null;
    }
    const date = new Date(`${candidate.effectiveDate}T00:00:00.000Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== candidate.effectiveDate ||
      dates.has(candidate.effectiveDate)
    ) {
      return null;
    }

    const ranks: { songId: string; rank: number }[] = [];
    const songIds = new Set<string>();
    const positions = new Set<number>();
    for (const rank of candidate.ranks) {
      if (
        !isRecord(rank) ||
        !isUuid(rank.songId) ||
        !nonNegativeSafeInteger(rank.rank) ||
        rank.rank === 0 ||
        songIds.has(rank.songId) ||
        positions.has(rank.rank)
      ) {
        return null;
      }
      songIds.add(rank.songId);
      positions.add(rank.rank);
      ranks.push({ songId: rank.songId, rank: rank.rank });
    }

    dates.add(candidate.effectiveDate);
    snapshots.push({
      effectiveDate: candidate.effectiveDate,
      ranks,
    });
  }
  return snapshots;
}

function parsePublicationInputSnapshot(
  value: unknown,
): BoraEnginePublicationInputSnapshotResult {
  if (!isRecord(value)) {
    return { status: 'unavailable', reason: 'invalid-response' };
  }
  if (value.status === 'not-ready') {
    const eligibility =
      isRecord(value.eligibility) &&
      typeof value.eligibility.reason === 'string'
        ? value.eligibility.reason
        : null;
    return {
      status: 'not-ready',
      reason: [
        typeof value.reason === 'string'
          ? value.reason
          : 'publication-input-not-ready',
        ...(eligibility ? [eligibility] : []),
      ].join(':'),
    };
  }
  if (
    value.status !== 'ready' ||
    !nonNegativeSafeInteger(value.referenceHour) ||
    !nonNegativeSafeInteger(value.stateRevision) ||
    !nonNegativeSafeInteger(value.sourceRevision) ||
    !isRecord(value.engineSnapshot) ||
    value.engineSnapshot.status !== 'ready' ||
    !isRecord(value.engineSnapshot.state) ||
    value.engineSnapshot.state.referenceHour !== value.referenceHour ||
    !Array.isArray(value.engineSnapshot.state.songs) ||
    value.engineSnapshot.stateRevision !== value.stateRevision ||
    typeof value.isSyntheticDemo !== 'boolean' ||
    !isRecord(value.expectedCurrentPublication) ||
    !isRecord(value.dailyPlatformRankSnapshots)
  ) {
    return { status: 'unavailable', reason: 'invalid-response' };
  }

  let expectedCurrentPublication: ExpectedCurrentPublication;
  if (value.expectedCurrentPublication.status === 'initial') {
    expectedCurrentPublication = { status: 'initial' };
  } else if (
    value.expectedCurrentPublication.status === 'published' &&
    isUuid(value.expectedCurrentPublication.publicationId)
  ) {
    expectedCurrentPublication = {
      status: 'published',
      publicationId: value.expectedCurrentPublication.publicationId,
    };
  } else {
    return { status: 'unavailable', reason: 'invalid-response' };
  }

  const youtube = parseDailyPlatformRankSnapshots(
    value.dailyPlatformRankSnapshots.youtube,
  );
  const spotify = parseDailyPlatformRankSnapshots(
    value.dailyPlatformRankSnapshots.spotify,
  );
  const boomplay = parseDailyPlatformRankSnapshots(
    value.dailyPlatformRankSnapshots.boomplay,
  );
  if (
    youtube === null ||
    spotify === null ||
    boomplay === null ||
    youtube.length === 0 ||
    spotify.length === 0 ||
    boomplay.length === 0
  ) {
    return { status: 'unavailable', reason: 'invalid-response' };
  }

  return {
    status: 'ready',
    referenceHour: value.referenceHour,
    stateRevision: value.stateRevision,
    sourceRevision: value.sourceRevision,
    expectedCurrentPublication,
    songs: value.engineSnapshot.state.songs,
    isSyntheticDemo: value.isSyntheticDemo,
    dailyPlatformRankSnapshots: { youtube, spotify, boomplay },
  };
}

function asCoverageInput(value: unknown): value is HourlyCoverageInput {
  return (
    value === 'VOTES' ||
    value === 'SEED' ||
    value === 'YOUTUBE' ||
    value === 'SPOTIFY' ||
    value === 'BOOMPLAY'
  );
}

function parseCoverage(value: unknown): HourlyInputCoverage[] | null {
  if (!Array.isArray(value)) return null;
  const output: HourlyInputCoverage[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.songId !== 'string' ||
      item.songId.trim().length === 0 ||
      !asCoverageInput(item.inputType) ||
      !Number.isSafeInteger(item.hourIndex) ||
      item.status !== 'COMPLETE' ||
      !isCoverageEvidenceRecord(item.evidence) ||
      !isCoverageEvidenceAuthority(item.authority) ||
      item.evidence.songId !== item.songId ||
      item.evidence.period.kind !== 'hour' ||
      item.evidence.period.hourIndex !== item.hourIndex
    ) {
      return null;
    }
    const expectedKind =
      item.inputType === 'VOTES'
        ? 'vote-history'
        : item.inputType === 'SEED'
          ? 'seed-history'
          : 'platform-observation-history';
    if (item.evidence.kind !== expectedKind) return null;
    output.push({
      songId: item.songId,
      inputType: item.inputType,
      hourIndex: item.hourIndex as number,
      status: 'COMPLETE',
      evidence: item.evidence,
      authority: item.authority,
    });
  }
  return output;
}

function parseGaps(value: unknown): HourlyCoverageGap[] | null {
  if (!Array.isArray(value)) return null;
  const allowedReasons = new Set<HourlyCoverageGap['reason']>([
    'missing',
    'unavailable',
    'failed',
    'incomplete',
    'duplicate',
    'invalid',
    'incomplete',
    'unresolved',
    'stale',
    'source-mismatch',
    'revision-mismatch',
    'state-hour-mismatch',
    'empty-state',
    'invalid-state',
  ]);
  const output: HourlyCoverageGap[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.reason !== 'string') return null;
    if (!allowedReasons.has(item.reason as HourlyCoverageGap['reason'])) {
      return null;
    }
    output.push({
      ...(typeof item.songId === 'string' ? { songId: item.songId } : {}),
      ...(asCoverageInput(item.inputType)
        ? { inputType: item.inputType }
        : {}),
      ...(Number.isSafeInteger(item.hourIndex)
        ? { hourIndex: item.hourIndex as number }
        : {}),
      reason: item.reason as HourlyCoverageGap['reason'],
    });
  }
  return output;
}

function parseReadinessCount(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }
  return value;
}

function parseCoverageReadiness(
  value: unknown,
): BoraEngineReadinessCheck | null {
  if (
    !isRecord(value) ||
    typeof value.status !== 'string' ||
    (value.status !== 'ready' &&
      value.status !== 'missing' &&
      value.status !== 'incomplete')
  ) {
    return null;
  }

  const expected = parseReadinessCount(value.expected);
  const complete = parseReadinessCount(value.complete);
  const missing = parseReadinessCount(value.missing);
  const unavailable = parseReadinessCount(value.unavailable);
  const failed = parseReadinessCount(value.failed);
  const records = parseReadinessCount(value.records);
  const duplicatesRaw = value.duplicates;
  const duplicatesParsed =
    duplicatesRaw === undefined
      ? undefined
      : parseReadinessCount(duplicatesRaw);
  if (duplicatesRaw !== undefined && duplicatesParsed === null) {
    return null;
  }
  const duplicates: number | undefined =
    duplicatesParsed === null ? undefined : duplicatesParsed;

  // Some live RPC responses, including vote history, omit zeroRecords.
  // If present, it must still be a valid non-negative integer.
  const zeroRecordsRaw = value.zeroRecords;
  const zeroRecordsParsed =
    zeroRecordsRaw === undefined
      ? undefined
      : parseReadinessCount(zeroRecordsRaw);

  if (zeroRecordsRaw !== undefined && zeroRecordsParsed === null) {
    return null;
  }

  const zeroRecords: number | undefined =
    zeroRecordsParsed === null ? undefined : zeroRecordsParsed;

  const acceptedEvents =
    value.acceptedEvents === undefined
      ? 0
      : parseReadinessCount(value.acceptedEvents);

  if (
    expected === null ||
    complete === null ||
    missing === null ||
    unavailable === null ||
    failed === null ||
    records === null ||
    acceptedEvents === null
  ) {
    return null;
  }

  return {
    status: value.status,
    expected,
    complete,
    missing,
    unavailable,
    failed,
    records,
    ...(zeroRecords === undefined ? {} : { zeroRecords }),
    ...(duplicates === undefined ? {} : { duplicates }),
    ...(value.acceptedEvents === undefined ? {} : { acceptedEvents }),
  };
}

function parseReadiness(value: unknown): BoraEngineReadiness | null {
  if (
    !isRecord(value) ||
    !isRecord(value.checks) ||
    (value.closedHour !== null &&
      !Number.isSafeInteger(value.closedHour))
  ) {
    return null;
  }
  const keys = [
    'voteHistory',
    'seedHours',
    'youtube',
    'spotify',
    'boomplay',
  ] as const;
  const checks = {} as Record<
    (typeof keys)[number],
    BoraEngineReadinessCheck
  >;
  for (const key of keys) {
    const parsed = parseCoverageReadiness(value.checks[key]);
    if (!parsed) return null;
    checks[key] = parsed;
  }
  const stateCheck = value.checks.initialState;
  if (
    !isRecord(stateCheck) ||
    (stateCheck.status !== 'ready' &&
      stateCheck.status !== 'missing' &&
      stateCheck.status !== 'incomplete')
  ) {
    return null;
  }
  const songCount = parseReadinessCount(stateCheck.songCount);
  const referenceHour = parseReadinessCount(stateCheck.referenceHour);
  if (songCount === null || (stateCheck.referenceHour !== null && referenceHour === null)) {
    return null;
  }
  if (
    value.status !== 'ready' &&
    value.status !== 'not-ready'
  ) {
    return null;
  }
  return {
    status: value.status,
    closedHour: value.closedHour as number | null,
    checks: {
      trustedPersistence: { status: 'ready' },
      initialState: {
        status: stateCheck.status,
        records: songCount,
        ...(referenceHour === null ? {} : { referenceHour }),
      },
      voteHistory: checks.voteHistory,
      seedHours: checks.seedHours,
      youtube: checks.youtube,
      spotify: checks.spotify,
      boomplay: checks.boomplay,
      databaseContract: { status: 'ready' },
    },
  };
}

function buildState(value: unknown): {
  readonly state: EngineState;
  readonly stateRevision: number;
} | null {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.stateRevision) ||
    (value.stateRevision as number) < 0 ||
    !isRecord(value.state) ||
    !Number.isSafeInteger(value.state.referenceHour) ||
    !Array.isArray(value.state.songs)
  ) {
    return null;
  }

  const referenceHour = value.state.referenceHour as number;
  const built = buildEngineInputFromBackendRows(value.state.songs, referenceHour, {
    closedHourC: null,
  });
  if (built.status !== 'ready') return null;

  return {
    state: {
      referenceHour: referenceHour as HourIndex,
      songs: built.value.songs.map(mapSong),
    },
    stateRevision: value.stateRevision as number,
  };
}

function normalizeBootstrapState(state: EngineState): EngineState | null {
  if (
    !state ||
    !Number.isSafeInteger(state.referenceHour) ||
    !Array.isArray(state.songs)
  ) {
    return null;
  }
  const built = buildEngineInputFromBackendRows(
    state.songs,
    state.referenceHour,
    { closedHourC: null },
  );
  if (built.status !== 'ready') return null;

  return {
    referenceHour: state.referenceHour,
    songs: built.value.songs
      .map(mapSong)
      .map((song) => ({
        ...song,
        buckets: [...song.buckets].sort((a, b) => a.hourIndex - b.hourIndex),
        seedHours: [...song.seedHours]
          .map((record) => ({
            ...record,
            ...(record.originEventId === undefined
              ? {}
              : { originEventId: record.originEventId }),
          }))
          .sort((a, b) => a.hourIndex - b.hourIndex),
        platform: {
          youtube: [...song.platform.youtube].sort(
            (a, b) => a.hourIndex - b.hourIndex,
          ),
          spotify: [...song.platform.spotify].sort(
            (a, b) => a.hourIndex - b.hourIndex,
          ),
          boomplay: [...song.platform.boomplay].sort(
            (a, b) => a.hourIndex - b.hourIndex,
          ),
        },
      }))
      .sort((a, b) => a.songId.localeCompare(b.songId)),
  };
}

function mapSong(song: EngineSongLike): RolloverSong {
  return {
    songId: song.songId,
    lifecycle: song.lifecycle,
    k: song.k,
    persistentKura: song.persistentKura,
    buckets: song.buckets.map((bucket) => ({
      ...bucket,
      hourIndex: bucket.hourIndex as HourIndex,
    })),
    seedHours: song.seedHours.map((record) => ({
      ...record,
      hourIndex: record.hourIndex as HourIndex,
    })),
    platform: {
      youtube: song.platform.youtube.map((record) => ({
        ...record,
        hourIndex: record.hourIndex as HourIndex,
      })),
      spotify: song.platform.spotify.map((record) => ({
        ...record,
        hourIndex: record.hourIndex as HourIndex,
      })),
      boomplay: song.platform.boomplay.map((record) => ({
        ...record,
        hourIndex: record.hourIndex as HourIndex,
      })),
    },
  };
}

function normalizeCoverage(
  coverage: readonly HourlyInputCoverage[],
): HourlyInputCoverage[] | null {
  const parsed = parseCoverage(coverage);
  if (!parsed) return null;
  return parsed.sort(
    (a, b) =>
      a.songId.localeCompare(b.songId) ||
      a.inputType.localeCompare(b.inputType) ||
      a.hourIndex - b.hourIndex,
  );
}

class SupabaseBoraEnginePersistence implements BoraEnginePersistence {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async loadLiveVoteEngineInputSnapshot(): Promise<LiveVoteEngineInputSnapshotResult> {
    const { data: head, error: headError } = await this.client
      .from('bora_engine_hourly_state_head')
      .select('reference_hour,revision')
      .eq('singleton', true)
      .maybeSingle();
    if (headError) {
      return {
        status: 'unavailable',
        reason: 'state-read-failed',
        ...(headError.code ? { errorCode: headError.code } : {}),
      };
    }
    if (
      !head ||
      typeof head.reference_hour !== 'number' ||
      !Number.isSafeInteger(head.reference_hour) ||
      head.reference_hour < 71 ||
      typeof head.revision !== 'number' ||
      !Number.isSafeInteger(head.revision)
    ) {
      return { status: 'unavailable', reason: 'invalid-response' };
    }

    const firstHour = head.reference_hour - 71;
    const [stateResult, voteResult] = await Promise.all([
      this.client
        .from('bora_engine_song_state')
        .select('song_id,lifecycle')
        .order('song_id', { ascending: true }),
      this.client
        .from('bora_engine_vote_events')
        .select('song_id,hour_index,vote_type')
        .gte('hour_index', firstHour)
        .lte('hour_index', head.reference_hour),
    ]);

    if (stateResult.error) {
      return {
        status: 'unavailable',
        reason: 'state-read-failed',
        ...(stateResult.error.code ? { errorCode: stateResult.error.code } : {}),
      };
    }
    if (voteResult.error) {
      return {
        status: 'unavailable',
        reason: 'vote-read-failed',
        ...(voteResult.error.code ? { errorCode: voteResult.error.code } : {}),
      };
    }

    const { data: verifiedHead, error: verifiedHeadError } = await this.client
      .from('bora_engine_hourly_state_head')
      .select('reference_hour,revision')
      .eq('singleton', true)
      .maybeSingle();
    if (verifiedHeadError) {
      return {
        status: 'unavailable',
        reason: 'state-read-failed',
        ...(verifiedHeadError.code ? { errorCode: verifiedHeadError.code } : {}),
      };
    }
    if (
      !verifiedHead ||
      verifiedHead.reference_hour !== head.reference_hour ||
      verifiedHead.revision !== head.revision
    ) {
      return { status: 'unavailable', reason: 'state-changed-during-read' };
    }

    const songs = stateResult.data;
    const votes = voteResult.data;
    if (
      !songs ||
      songs.length === 0 ||
      !songs.every(
        (song) =>
          typeof song.song_id === 'string' &&
          song.song_id.length > 0 &&
          (song.lifecycle === 'ACTIVE' || song.lifecycle === 'VAULT'),
      ) ||
      !votes ||
      !votes.every(
        (vote) =>
          typeof vote.song_id === 'string' &&
          vote.song_id.length > 0 &&
          typeof vote.hour_index === 'number' &&
          Number.isSafeInteger(vote.hour_index) &&
          vote.hour_index >= firstHour &&
          vote.hour_index <= head.reference_hour &&
          (vote.vote_type === 'up' || vote.vote_type === 'down'),
      )
    ) {
      return { status: 'unavailable', reason: 'invalid-response' };
    }

    return {
      status: 'ready',
      referenceHour: head.reference_hour,
      songs: songs.map((song) => ({
        songId: song.song_id,
        lifecycle: song.lifecycle as 'ACTIVE' | 'VAULT',
      })),
      votes: votes.map((vote) => ({
        songId: vote.song_id,
        hourIndex: vote.hour_index,
        voteType: vote.vote_type as 'up' | 'down',
      })),
    };
  }

  async loadPublicationInputSnapshot(): Promise<BoraEnginePublicationInputSnapshotResult> {
    const { data, error } = await this.client.rpc(
      'bora_engine_publication_input_snapshot',
    );
    if (error) {
      return {
        status: 'unavailable',
        reason: 'rpc-failed',
        ...(error.code ? { errorCode: error.code } : {}),
      };
    }
    return parsePublicationInputSnapshot(data);
  }

  async publishChart(
    request: PublicationTransactionRequest,
  ): Promise<PublicationTransactionOutcome> {
    const validated = validatePublicationRequest(request);
    if (validated.status !== 'valid') {
      return {
        status: 'invalid-publication',
        ...(typeof request?.requestId === 'string'
          ? { requestId: request.requestId }
          : {}),
        reasons: validated.reasons,
      };
    }

    const { data, error } = await this.client.rpc(
      'bora_engine_publish_chart',
      { p_request: validated.request },
    );
    if (error || !isRecord(data)) {
      return unknownPublicationCommit(validated.request.requestId);
    }

    if (
      (data.status === 'published' ||
        data.status === 'already-published') &&
      data.requestId === validated.request.requestId &&
      isUuid(data.publicationId)
    ) {
      return {
        status: data.status,
        requestId: validated.request.requestId,
        publicationId: data.publicationId,
      };
    }
    if (
      (data.status === 'not-ready' ||
        data.status === 'invalid-publication') &&
      Array.isArray(data.reasons) &&
      data.reasons.every((reason) => typeof reason === 'string')
    ) {
      const allowedReasons: readonly string[] =
        data.status === 'not-ready'
          ? [
              'source-readiness-changed',
              'coverage-incomplete',
              'source-unavailable',
              'source-unauthorized',
              'evaluation-not-eligible',
            ]
          : [
              'invalid-request-id',
              'invalid-reference-hour',
              'invalid-state-revision',
              'state-reference-hour-mismatch',
              'invalid-current-publication',
              'invalid-source-snapshot',
              'invalid-evaluation-identity',
              'invalid-evaluation-validation',
              'invalid-evaluation-totals',
              'empty-candidate',
              'invalid-entry',
              'duplicate-song',
              'invalid-entry-order',
              'idempotency-key-reused',
              'request-record-mismatch',
              'incomplete-active-ranks',
              'missing-or-invalid-entry-values',
            ];
      if (!data.reasons.every((reason) => allowedReasons.includes(reason))) {
        return unknownPublicationCommit(validated.request.requestId);
      }
      if (data.status === 'not-ready') {
        return {
          status: 'not-ready',
          requestId: validated.request.requestId,
          reasons: data.reasons as PublicationNotReadyReason[],
        };
      }
      return {
        status: 'invalid-publication',
        requestId: validated.request.requestId,
        reasons: data.reasons as PublicationRequestProblem[],
      };
    }
    if (
      data.status === 'stale-state' &&
      data.requestId === validated.request.requestId &&
      (data.reason === 'state-revision-changed' ||
        data.reason === 'reference-hour-changed' ||
        data.reason === 'current-publication-changed' ||
        data.reason === 'source-snapshot-changed')
    ) {
      return {
        status: 'stale-state',
        requestId: validated.request.requestId,
        reason: data.reason,
      };
    }
    if (
      data.status === 'lease-conflict' &&
      data.requestId === validated.request.requestId
    ) {
      return {
        status: 'lease-conflict',
        requestId: validated.request.requestId,
      };
    }
    if (
      data.status === 'failed' &&
      data.requestId === validated.request.requestId &&
      typeof data.errorCode === 'string'
    ) {
      return {
        status: 'failed',
        requestId: validated.request.requestId,
        errorCode: data.errorCode,
      };
    }
    return unknownPublicationCommit(validated.request.requestId);
  }

  async readCurrentPublication(): Promise<BoraEnginePublishedChart | null> {
    const { data, error } = await this.client
      .from('bora_engine_publication_head')
      .select(
        'publication_id, publication:bora_engine_publications(id, reference_hour, published_at, total_active_c, platform_total_youtube, platform_total_spotify, platform_total_boomplay, evaluation_run:bora_engine_evaluation_runs!bora_engine_publications_evaluation_run_id_fkey(publication_request), entries:bora_engine_publication_entries(song_id, lifecycle, rank, xp, persistent_kura_before, platform_youtube, platform_spotify, platform_boomplay, bora_score, song:songs(id, title, artist, cover_url, youtube_id)))',
      )
      .eq('singleton', true)
      .maybeSingle();
    if (error) throw new Error('BORA_ENGINE_PUBLICATION_READ_FAILED');
    if (!isRecord(data)) return null;
    if (data.publication_id === null) return null;

    const publication = relatedRecord(data.publication);
    if (
      !publication ||
      !isUuid(data.publication_id) ||
      data.publication_id !== publication.id ||
      !isUuid(publication.id) ||
      !Number.isSafeInteger(publication.reference_hour) ||
      typeof publication.published_at !== 'string' ||
      !Array.isArray(publication.entries)
    ) {
      throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
    }
    const evaluationRun = relatedRecord(publication.evaluation_run);
    const publicationRequest = evaluationRun?.publication_request;
    const evaluation =
      isRecord(publicationRequest) && isRecord(publicationRequest.evaluation)
        ? publicationRequest.evaluation
        : null;
    if (
      !evaluation ||
      typeof evaluation.resultIdentity !== 'string' ||
      evaluation.resultIdentity.length === 0
    ) {
      throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
    }
    const totalActiveC = finiteNumber(publication.total_active_c);
    const youtube = finiteNumber(publication.platform_total_youtube);
    const spotify = finiteNumber(publication.platform_total_spotify);
    const boomplay = finiteNumber(publication.platform_total_boomplay);
    if (
      totalActiveC === null ||
      youtube === null ||
      spotify === null ||
      boomplay === null
    ) {
      throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
    }

    const entries = publication.entries.map((raw) => {
      if (!isRecord(raw) || !isUuid(raw.song_id)) {
        throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
      }
      const song = relatedRecord(raw.song);
      if (
        !song ||
        song.id !== raw.song_id ||
        typeof song.title !== 'string' ||
        (song.artist !== null && typeof song.artist !== 'string') ||
        (song.cover_url !== null && typeof song.cover_url !== 'string') ||
        (song.youtube_id !== null && typeof song.youtube_id !== 'string')
      ) {
        throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
      }
      if (raw.lifecycle === 'VAULT' && raw.rank === null) {
        return {
          songId: raw.song_id,
          lifecycle: 'VAULT' as const,
          rank: null,
          xp: null,
          boraScore: null,
          scoreComponents: null,
          title: song.title,
          artist: typeof song.artist === 'string' ? song.artist : '',
          coverUrl: typeof song.cover_url === 'string' ? song.cover_url : '',
          youtubeId:
            typeof song.youtube_id === 'string' ? song.youtube_id : null,
        };
      }
      const xp = finiteNumber(raw.xp);
      const kura = finiteNumber(raw.persistent_kura_before);
      const platformYoutube = finiteNumber(raw.platform_youtube);
      const platformSpotify = finiteNumber(raw.platform_spotify);
      const platformBoomplay = finiteNumber(raw.platform_boomplay);
      const boraScore = finiteNumber(raw.bora_score);
      if (
        raw.lifecycle !== 'ACTIVE' ||
        !Number.isSafeInteger(raw.rank) ||
        (raw.rank as number) < 1 ||
        xp === null ||
        xp < 0 ||
        xp > 1 ||
        kura === null ||
        kura < 0 ||
        platformYoutube === null ||
        platformYoutube < 0 ||
        platformYoutube > 30 ||
        platformSpotify === null ||
        platformSpotify < 0 ||
        platformSpotify > 15 ||
        platformBoomplay === null ||
        platformBoomplay < 0 ||
        platformBoomplay > 5 ||
        boraScore === null
      ) {
        throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
      }
      return {
        songId: raw.song_id,
        lifecycle: 'ACTIVE' as const,
        rank: raw.rank as number,
        xp,
        boraScore,
        scoreComponents: {
          kura,
          youtube: platformYoutube,
          spotify: platformSpotify,
          boomplay: platformBoomplay,
        },
        title: song.title,
        artist: typeof song.artist === 'string' ? song.artist : '',
        coverUrl: typeof song.cover_url === 'string' ? song.cover_url : '',
        youtubeId:
          typeof song.youtube_id === 'string' ? song.youtube_id : null,
      };
    });

    const activeEntries = entries
      .filter((entry) => entry.lifecycle === 'ACTIVE')
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    if (
      activeEntries.length === 0 ||
      activeEntries.some((entry, index) => entry.rank !== index + 1)
    ) {
      throw new Error('BORA_ENGINE_INVALID_PUBLICATION_SNAPSHOT');
    }
    const vaultEntries = entries
      .filter((entry) => entry.lifecycle === 'VAULT')
      .sort((a, b) => a.songId.localeCompare(b.songId));

    return {
      publicationId: publication.id,
      referenceHour: publication.reference_hour as number,
      publishedAt: publication.published_at,
      isSyntheticDemo: evaluation.resultIdentity.startsWith('synthetic-demo:'),
      totalActiveC,
      platformTotals: { youtube, spotify, boomplay },
      entries: [...activeEntries, ...vaultEntries],
    };
  }

  async readHourlyReferenceHour(): Promise<number | null> {
    const { data, error } = await this.client
      .from('bora_engine_hourly_state_head')
      .select('reference_hour')
      .eq('singleton', true)
      .maybeSingle();
    if (error) throw new Error('BORA_ENGINE_STATE_HEAD_READ_FAILED');
    if (!data) return null;
    if (!Number.isSafeInteger(data.reference_hour) || data.reference_hour < 0) {
      throw new Error('BORA_ENGINE_INVALID_STATE_HEAD');
    }
    return data.reference_hour;
  }

  async reconcileHourlyCoverage(input: {
    readonly closedHour: HourIndex;
    readonly cutoverAt: string;
  }): Promise<HourlyCoverageReconciliationResult> {
    const { data, error } = await this.client.rpc(
      'bora_engine_reconcile_hour_coverage',
      {
        p_closed_hour: input.closedHour,
        p_cutover_at: input.cutoverAt,
      },
    );
    if (error) throw new Error('BORA_ENGINE_HOURLY_COVERAGE_RECONCILIATION_FAILED');
    if (!isRecord(data) || typeof data.status !== 'string') {
      throw new Error('BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION');
    }
    if (data.status === 'ready') {
      if (
        data.closedHour !== input.closedHour ||
        !Number.isSafeInteger(data.processedActiveSongCount) ||
        !Number.isSafeInteger(data.reconciledVoteEventCount)
      ) {
        throw new Error('BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION');
      }
      return {
        status: 'ready',
        processedActiveSongCount: data.processedActiveSongCount as number,
        reconciledVoteEventCount: data.reconciledVoteEventCount as number,
      };
    }
    if (data.status === 'not-ready') {
      const reasons = [
        'reference-hour-mismatch',
        'unreconciled-votes',
        'vote-bucket-mismatch',
        'no-active-songs',
      ] as const;
      if (!reasons.includes(data.reason as (typeof reasons)[number])) {
        throw new Error('BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION');
      }
      if (
        data.reason === 'reference-hour-mismatch' &&
        !Number.isSafeInteger(data.referenceHour)
      ) {
        throw new Error('BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION');
      }
      return {
        status: 'not-ready',
        reason: data.reason as (typeof reasons)[number],
        ...(Number.isSafeInteger(data.mismatchCount)
          ? { mismatchCount: data.mismatchCount as number }
          : {}),
        ...(Number.isSafeInteger(data.referenceHour)
          ? { referenceHour: data.referenceHour as number }
          : {}),
      };
    }
    throw new Error('BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION');
  }

  async readiness(closedHour: number | null): Promise<BoraEngineReadiness> {
    const { data, error } = await this.client.rpc('bora_engine_readiness', {
      p_closed_hour: closedHour,
    });
    if (error) throw new Error('BORA_ENGINE_READINESS_UNAVAILABLE');
    const result = parseReadiness(data);
    if (!result) throw new Error('BORA_ENGINE_INVALID_READINESS');
    return result;
  }

  async publishEligibility(closedHour: HourIndex): Promise<BoraEnginePublishEligibility> {
    const { data, error } = await this.client.rpc('bora_engine_publish_eligibility', {
      p_closed_hour: closedHour,
    });
    if (error) throw new Error('BORA_ENGINE_PUBLISH_ELIGIBILITY_UNAVAILABLE');
    if (!isRecord(data)) throw new Error('BORA_ENGINE_INVALID_PUBLISH_ELIGIBILITY');

    if (data.status === 'eligible') {
      return {
        status: 'eligible',
        closedHour: data.closedHour as number,
        readiness: data.readiness ? parseReadiness(data.readiness) ?? undefined : undefined,
      };
    }

    if (data.status === 'not-eligible') {
      return {
        status: 'not-eligible',
        closedHour: data.closedHour as number,
        reason: data.reason as BoraEnginePublishEligibility['reason'],
        referenceHour: data.referenceHour as number | undefined,
        readiness: data.readiness ? parseReadiness(data.readiness) ?? undefined : undefined,
      };
    }

    throw new Error('BORA_ENGINE_INVALID_PUBLISH_ELIGIBILITY');
  }

  async claimHour(input: {
    readonly closedHour: HourIndex;
    readonly claimRequestId: string;
    readonly leaseDurationMs: number;
  }): Promise<HourClaimResult> {
    const { data, error } = await this.client.rpc('bora_engine_claim_hour', {
      p_closed_hour: input.closedHour,
      p_claim_request_id: input.claimRequestId,
      p_lease_duration_ms: input.leaseDurationMs,
    });
    if (error || !isRecord(data)) {
      throw new Error('BORA_ENGINE_CLAIM_FAILED');
    }
    if (data.status === 'already-claimed') return { status: 'already-claimed' };
    if (data.status === 'already-completed') {
      return { status: 'already-completed' };
    }
    if (
      data.status === 'not-eligible' &&
      Number.isSafeInteger(data.eligibleAtMs)
    ) {
      return {
        status: 'not-eligible',
        eligibleAtMs: data.eligibleAtMs as number,
      };
    }
    if (data.status === 'claimed' && isUuid(data.leaseToken)) {
      return { status: 'claimed', leaseToken: data.leaseToken };
    }
    throw new Error('BORA_ENGINE_INVALID_CLAIM_RESULT');
  }

  async loadRolloverInput(input: {
    readonly closedHour: HourIndex;
    readonly leaseToken: string;
  }): Promise<HourlyRolloverLoadResult> {
    const { data, error } = await this.client.rpc('bora_engine_load_hour', {
      p_closed_hour: input.closedHour,
      p_lease_token: input.leaseToken,
    });
    if (error || !isRecord(data)) {
      throw new Error('BORA_ENGINE_LOAD_FAILED');
    }
    if (data.status === 'not-ready') {
      const gaps = parseGaps(data.gaps);
      if (!gaps) throw new Error('BORA_ENGINE_INVALID_GAPS');
      return { status: 'not-ready', gaps };
    }
    const mapped = buildState(data);
    const coverage = parseCoverage(data.coverage);
    if (!coverage) {
      return {
        status: 'not-ready',
        gaps: [{
          hourIndex: input.closedHour,
          reason: 'unresolved',
        }],
      };
    }
    if (!mapped) {
      throw new Error('BORA_ENGINE_INVALID_SNAPSHOT');
    }
    const result: LoadedHourlyRolloverInput = {
      status: 'loaded',
      state: mapped.state,
      stateRevision: mapped.stateRevision,
      coverage,
    };
    return result;
  }

  async releaseNotReady(input: {
    readonly closedHour: HourIndex;
    readonly leaseToken: string;
  }): Promise<boolean> {
    return this.release(input.closedHour, input.leaseToken, null, false);
  }

  async recordRetryableFailure(input: {
    readonly closedHour: HourIndex;
    readonly leaseToken: string;
    readonly errorCode: string;
  }): Promise<boolean> {
    return this.release(
      input.closedHour,
      input.leaseToken,
      input.errorCode,
      true,
    );
  }

  async commitHour(input: {
    readonly leaseToken: string;
    readonly commit: Parameters<HourlyRolloverPersistence['commitHour']>[0]['commit'];
  }): Promise<HourlyCommitResult> {
    const { commit, leaseToken } = input;
    const { data, error } = await this.client.rpc(
      'bora_engine_commit_hour',
      {
        p_closed_hour: commit.closedHour,
        p_lease_token: leaseToken,
        p_expected_state_revision: commit.expectedStateRevision,
        p_expected_state: commit.expectedState,
        p_expected_coverage: commit.expectedCoverage,
        p_next_state: commit.nextState,
        p_steps: commit.steps,
      },
    );
    if (error || !isRecord(data)) {
      throw new Error('BORA_ENGINE_COMMIT_FAILED');
    }
    if (
      data.status === 'completed' ||
      data.status === 'already-completed' ||
      data.status === 'stale-lease' ||
      data.status === 'stale-state'
    ) {
      return { status: data.status };
    }
    throw new Error('BORA_ENGINE_INVALID_COMMIT_RESULT');
  }

  async bootstrap(input: EngineBootstrapInput): Promise<EngineBootstrapResult> {
    if (
      !input ||
      typeof input !== 'object' ||
      !isUuid(input.approvalId) ||
      typeof input.approvedBy !== 'string' ||
      !input.approvedBy.trim() ||
      typeof input.approvalReason !== 'string' ||
      !input.approvalReason.trim() ||
      !input.state ||
      !Array.isArray(input.coverage) ||
      !Number.isSafeInteger(input.state.referenceHour)
    ) {
      return { status: 'invalid-input' };
    }
    const state = normalizeBootstrapState(input.state);
    const coverage = normalizeCoverage(input.coverage);
    if (!state || !coverage) return { status: 'invalid-input' };

    const { data, error } = await this.client.rpc(
      'bora_engine_bootstrap_state',
      {
        p_approval_id: input.approvalId,
        p_approved_by: input.approvedBy.trim(),
        p_approval_reason: input.approvalReason.trim(),
        p_reference_hour: state.referenceHour,
        p_initial_state: state,
        p_expected_coverage: coverage,
      },
    );
    if (error) {
      if (
        error.message?.includes('BORA_ENGINE_BOOTSTRAP_NOT_RECONCILED') ||
        error.message?.includes('BORA_ENGINE_BOOTSTRAP_STATE_INCOMPLETE') ||
        error.message?.includes('BORA_ENGINE_BOOTSTRAP_DECAY_STATE_CONFLICT') ||
        error.message?.includes('BORA_ENGINE_BOOTSTRAP_EXISTING_ROLLOVER_HISTORY')
      ) {
        return { status: 'not-ready' };
      }
      if (error.message.includes('BORA_ENGINE_BOOTSTRAP_INVALID_INPUT')) {
        return { status: 'invalid-input' };
      }
      return { status: 'persistence-failure' };
    }
    if (!isRecord(data)) {
      return { status: 'persistence-failure' };
    }
    if (data.status === 'initialized') {
      return {
        status: 'initialized',
        referenceHour: state.referenceHour,
      };
    }
    if (data.status === 'already-initialized') {
      return { status: 'already-initialized' };
    }
    if (data.status === 'not-ready') return { status: 'not-ready' };
    return { status: 'persistence-failure' };
  }

  async ingestVoteEvent(
    event: CanonicalAcceptedVoteEvent,
  ): Promise<VoteEventIngestionOutcome> {
    const validation = validateVoteEventIngestionRequest(event);
    if (validation.status !== 'valid') {
      return { status: 'invalid-input', reasons: validation.reasons };
    }
    const identity = {
      sourceSystem: 'secure_vote_events' as const,
      sourceEventId: validation.request.sourceEventId,
    };

    // Advisory committed-ledger pre-check (Ãƒâ€šÃ‚Â§3 reuse of
    // validateVoteEventIngestionRequest + assessVoteEventIngestionRetry). It
    // is authoritative ONLY when the ledger row carries complete provenance,
    // so the full canonical payload can be compared without regenerating
    // timestamps, identities, or idempotency keys. A provenance-less or
    // unreadable ledger row defers every decision to the in-transaction RPC
    // authority (corrected design Ãƒâ€šÃ‚Â§B/C/D: the unique identity, not a
    // pre-read, owns deduplication).
    const ledger = await this.readLedgerEvent(identity.sourceEventId);
    if (ledger !== null) {
      const existing = validateVoteEventIngestionRequest({
        sourceSystem: ledger.source_system,
        sourceEventId: ledger.source_event_id,
        songId: ledger.song_id,
        voteType: ledger.vote_type,
        occurredAt: ledger.occurred_at,
        voterRef: ledger.voter_ref,
        identityMethod: ledger.identity_method,
        identityVersion: ledger.identity_version,
        idempotencyKey: ledger.idempotency_key,
      });
      if (existing.status === 'valid') {
        const assessment = assessVoteEventIngestionRetry(
          validation.request,
          existing.request,
        );
        if (assessment.status === 'already-ingested') {
          return { status: 'already-ingested', ...identity };
        }
        if (assessment.status === 'conflicting-identity') {
          return {
            status: 'conflicting-identity',
            conflict: assessment.conflict,
          };
        }
      }
    }

    const maxAttempts = 3;
    let lastErrorCode = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let data: unknown = null;
      let rpcError: {
        readonly code?: string | null;
        readonly message?: string | null;
      } | null = null;
      try {
        const result = await this.client.rpc('bora_engine_ingest_vote_event', {
          p_event: {
            sourceSystem: identity.sourceSystem,
            sourceEventId: validation.request.sourceEventId,
            songId: validation.request.songId,
            voteType: validation.request.voteType,
            occurredAt: validation.request.occurredAt,
            voterRef: validation.request.voterRef,
            identityMethod: validation.request.identityMethod,
            identityVersion: validation.request.identityVersion,
            idempotencyKey: validation.request.idempotencyKey,
          },
        });
        data = result.data;
        rpcError = result.error;
      } catch (thrown) {
        rpcError = normalizeThrownRpcError(thrown);
      }

      const attemptResult = classifyVoteEventIngestionRpcResult(
        identity,
        data,
        rpcError,
      );
      if (attemptResult.status === 'settled') {
        return attemptResult.outcome;
      }
      // Whole-transaction retry only (Ãƒâ€šÃ‚Â§C.4): never retry a partial step, and
      // never retry an unknown commit in-action ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â that is reconciliation's
      // job (Ãƒâ€šÃ‚Â§D).
      lastErrorCode = attemptResult.errorCode;
      if (attempt < maxAttempts) {
        await sleepIngestionRetryBackoff(attempt);
      }
    }
    // Bounded retries exhausted against a server-reported clean rollback:
    // a known non-commit (persistence-failure), not commit-unknown.
    return { status: 'persistence-failure', errorCode: lastErrorCode };
  }

  async findPendingSecureVoteEvents(options: {
    readonly cutoverIso: string;
    readonly offset: number;
    readonly limit: number;
  }): Promise<PendingSecureVoteEventBatch> {
    const limit = clampReconciliationPageSize(options.limit);
    const offset = Number.isFinite(options.offset)
      ? Math.max(0, Math.trunc(options.offset))
      : 0;

    const { data, error } = await this.client
      .from('vote_events')
      .select(SECURE_VOTE_SOURCE_COLUMNS)
      .gte('created_at', options.cutoverIso)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) {
      throw new Error('SECURE_VOTE_SOURCE_PAGE_READ_FAILED');
    }
    const sourceRows = (data ?? []) as unknown as readonly SecureVoteSourceRow[];
    if (sourceRows.length === 0) {
      return { events: [], scanned: 0, hasMore: false };
    }

    const sourceIds = sourceRows.map((row) => row.id);
    const { data: ledgerRows, error: ledgerError } = await this.client
      .from('bora_engine_vote_events')
      .select('source_event_id')
      .eq('source_system', 'secure_vote_events')
      .in('source_event_id', sourceIds);
    if (ledgerError) {
      throw new Error('BORA_ENGINE_LEDGER_PAGE_READ_FAILED');
    }
    const ledgeredIds = new Set(
      ((ledgerRows ?? []) as readonly { readonly source_event_id: unknown }[])
        .map((row) => String(row.source_event_id)),
    );
    const events = sourceRows
      .filter((row) => !ledgeredIds.has(row.id))
      .map((row) => toCanonicalSecureVoteEvent(row));
    return {
      events,
      scanned: sourceRows.length,
      hasMore: sourceRows.length >= limit,
    };
  }

  /** Persists one immutable cumulative snapshot without asserting hourly coverage. */
  async persistYouTubeSnapshot(
    input: YouTubeSnapshotPersistenceInput,
  ): Promise<YouTubeSnapshotPersistenceResult> {
    if (!isValidYouTubeSnapshotPersistenceInput(input)) {
      return { status: 'error', reason: 'invalid-snapshot' };
    }
    const snapshot = input;

    const { data: song, error: songError } = await this.client
      .from('songs')
      .select('id, youtube_id')
      .eq('id', snapshot.songId)
      .maybeSingle();

    if (songError) {
      return {
        status: 'error',
        reason: 'song-read-failed',
        errorCode: songError.code,
      };
    }
    if (!song) {
      return { status: 'error', reason: 'song-not-found' };
    }
    if (song.youtube_id !== snapshot.videoId) {
      return { status: 'error', reason: 'mapping-mismatch' };
    }

    const readExistingSnapshot = () =>
      this.client
        .from('bora_engine_youtube_snapshot_history')
        .select(
          'song_id, video_id, provider, metric, unit, source_status, view_count, retrieved_at, source_observation_id, version, supersedes_snapshot_id',
        )
        .eq('source_system', snapshot.snapshotIdentity.sourceSystem)
        .eq(
          'source_observation_id',
          snapshot.snapshotIdentity.sourceObservationId,
        )
        .maybeSingle();

    const matchesSnapshot = (existing: unknown): boolean => {
      if (!isRecord(existing)) return false;
      const existingValue =
        typeof existing.view_count === 'string' ||
        (typeof existing.view_count === 'number' &&
          Number.isSafeInteger(existing.view_count))
          ? String(existing.view_count)
          : '';
      if (!/^\d+$/.test(existingValue)) return false;
      const retrievedAt =
        typeof existing.retrieved_at === 'string'
          ? Date.parse(existing.retrieved_at)
          : Number.NaN;
      const existingParent =
        typeof existing.supersedes_snapshot_id === 'string'
          ? existing.supersedes_snapshot_id.toLowerCase()
          : null;
      const expectedParent =
        snapshot.supersedesSnapshotId?.toLowerCase() ?? null;

      return (
        existing.song_id === snapshot.songId &&
        existing.video_id === snapshot.videoId &&
        existing.provider === snapshot.provider &&
        existing.metric === snapshot.metric &&
        existing.unit === snapshot.unit &&
        existing.source_status === 'OBSERVED' &&
        BigInt(existingValue) === BigInt(snapshot.value) &&
        retrievedAt === Date.parse(snapshot.retrievedAt) &&
        existing.source_observation_id ===
          snapshot.snapshotIdentity.sourceObservationId &&
        existing.version === snapshot.version &&
        existingParent === expectedParent
      );
    };

    const existing = await readExistingSnapshot();
    if (existing.error) {
      return {
        status: 'error',
        reason: 'snapshot-read-failed',
        errorCode: existing.error.code,
      };
    }
    if (existing.data) {
      return matchesSnapshot(existing.data)
        ? {
            status: 'already-recorded',
            sourceObservationId:
              snapshot.snapshotIdentity.sourceObservationId,
          }
        : { status: 'error', reason: 'conflicting-source-identity' };
    }

    const { error } = await this.client
      .from('bora_engine_youtube_snapshot_history')
      .insert({
        song_id: snapshot.songId,
        video_id: snapshot.videoId,
        provider: snapshot.provider,
        metric: snapshot.metric,
        unit: snapshot.unit,
        source_status: 'OBSERVED',
        view_count: snapshot.value,
        retrieved_at: snapshot.retrievedAt,
        source_system: snapshot.snapshotIdentity.sourceSystem,
        source_observation_id:
          snapshot.snapshotIdentity.sourceObservationId,
        version: snapshot.version,
        supersedes_snapshot_id: snapshot.supersedesSnapshotId,
      });

    if (error?.code === '23505') {
      const duplicate = await readExistingSnapshot();
      if (duplicate.error) {
        return {
          status: 'error',
          reason: 'snapshot-read-failed',
          errorCode: duplicate.error.code,
        };
      }
      if (matchesSnapshot(duplicate.data)) {
        return {
          status: 'already-recorded',
          sourceObservationId:
            snapshot.snapshotIdentity.sourceObservationId,
        };
      }
      return { status: 'error', reason: 'conflicting-source-identity' };
    }
    if (error) {
      return {
        status: 'error',
        reason: 'snapshot-insert-failed',
        errorCode: error.code,
      };
    }

    return {
      status: 'recorded',
      sourceObservationId: snapshot.snapshotIdentity.sourceObservationId,
    };
  }

  private async readLedgerEvent(
    sourceEventId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.client
      .from('bora_engine_vote_events')
      .select(
        'source_system, source_event_id, song_id, vote_type, occurred_at, voter_ref, identity_method, identity_version, idempotency_key',
      )
      .eq('source_system', 'secure_vote_events')
      .eq('source_event_id', sourceEventId)
      .maybeSingle();

    if (error) {
      throw new Error('BORA_ENGINE_VOTE_LEDGER_READ_FAILED');
    }

    return (data ?? null) as Record<string, unknown> | null;
  }

  private async release(
    closedHour: HourIndex,
    leaseToken: string,
    errorCode: string | null,
    retryable: boolean,
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc(
      'bora_engine_release_hour',
      {
        p_closed_hour: closedHour,
        p_lease_token: leaseToken,
        p_error_code: errorCode,
        p_retryable: retryable,
      },
    );

    if (error || typeof data !== 'boolean') {
      throw new Error('BORA_ENGINE_RELEASE_FAILED');
    }

    return data;
  }

}

function clampReconciliationPageSize(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 100;
  return Math.min(1000, Math.trunc(limit));
}

function normalizeThrownRpcError(thrown: unknown): { readonly code: string; readonly message: string } {
  if (isRecord(thrown)) {
    return {
      code: typeof thrown.code === 'string' ? thrown.code : 'UNKNOWN',
      message: typeof thrown.message === 'string' ? thrown.message : String(thrown),
    };
  }
  return { code: 'UNKNOWN', message: String(thrown) };
}

async function sleepIngestionRetryBackoff(attempt: number): Promise<void> {
  const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function getBoraEngineReadiness(
  closedHour: number | null = null,
): Promise<BoraEngineReadiness> {
  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status === 'configuration-unavailable') {
    return {
      status: 'unavailable',
      closedHour,
      checks: {
        trustedPersistence: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        initialState: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        voteHistory: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        seedHours: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        youtube: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        spotify: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        boomplay: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
        databaseContract: {
          status: 'unavailable',
          detail: 'BORA engine persistence is not configured',
        },
      },
    };
  }

  return setup.persistence.readiness(closedHour);
}

export function createBoraEnginePersistence(
  client: SupabaseClient,
): BoraEnginePersistence {
  return new SupabaseBoraEnginePersistence(client);
}

export function createBoraEnginePersistenceFromEnv(): BoraEnginePersistenceSetup {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      status: 'configuration-unavailable',
      missing: !url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY',
    };
  }
  const noStoreFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, cache: 'no-store' });
  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  });
  return {
    status: 'available',
    persistence: new SupabaseBoraEnginePersistence(client),
  };
}
