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
  HourlyInputCoverage,
  HourClaimResult,
  HourlyCommitResult,
  HourlyRolloverLoadResult,
  HourlyRolloverPersistence,
  LoadedHourlyRolloverInput,
} from './hourly-runner';
import type { HourIndex } from '../../engine/src/engine/types';
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

export type YouTubeSnapshotPersistenceInput = {
  readonly songId: string;
  readonly videoId: string;
  readonly value: string; // Exact integer cumulative views as string
  readonly retrievedAt: string;
  readonly sourceSystem: string;
  readonly sourceObservationId: string;
  readonly hourIndex: number;
};

export type YouTubeSnapshotPersistenceResult =
  | { readonly status: 'success'; readonly observationValue: number }
  | { readonly status: 'error'; readonly reason: string };

export interface BoraEnginePersistence extends HourlyRolloverPersistence {
  checkBootstrap(closedHour: HourIndex): Promise<
    | { readonly status: 'ready' }
    | { readonly status: 'missing' }
    | { readonly status: 'not-ready' }
    | { readonly status: 'reference-hour-mismatch' }
    | { readonly status: 'already-completed' }
  >;
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
  /**
   * Persists a fetched YouTube cumulative snapshot, computes the hourly delta,
   * updates the platform observation projection, and marks input coverage as COMPLETE.
   */
  persistYouTubeSnapshot(
    input: YouTubeSnapshotPersistenceInput,
  ): Promise<YouTubeSnapshotPersistenceResult>;
}

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
  readonly reason?: 'no-reference-hour' | 'reference-hour-mismatch' | 'vote-events-invalidated-in-window' | 'readiness-incomplete';
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

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
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
  const historyCheck = (
    check: BoraEngineReadinessCheck,
    inputName: 'vote' | 'seed',
  ): BoraEngineReadinessCheck =>
    check.status === 'ready'
      ? {
          status: 'unresolved',
          ...(Number.isSafeInteger(songCount * 72)
            ? { expected: songCount * 72, missing: songCount * 72 }
            : {}),
          detail:
            `Migration 0016 readiness establishes only the requested hour; ` +
            `it does not return attributable, current coverage for all 72 ` +
            `${inputName} hours per active song.`,
        }
      : check;
  const voteHistory = historyCheck(checks.voteHistory, 'vote');
  const seedHours = historyCheck(checks.seedHours, 'seed');
  return {
    status:
      value.status === 'ready' &&
      (voteHistory.status !== 'ready' || seedHours.status !== 'ready')
        ? 'not-ready'
        : value.status,
    closedHour: value.closedHour as number | null,
    checks: {
      trustedPersistence: { status: 'ready' },
      initialState: {
        status: stateCheck.status,
        records: songCount,
        ...(referenceHour === null ? {} : { referenceHour }),
      },
      voteHistory,
      seedHours,
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
  constructor(private readonly client: SupabaseClient) {}

  async checkBootstrap(closedHour: HourIndex) {
    const { data, error } = await this.client.rpc('bora_engine_check_hour', {
      p_closed_hour: closedHour,
    });
    if (error) throw new Error('BORA_ENGINE_BOOTSTRAP_CHECK_FAILED');
    if (!isRecord(data)) throw new Error('BORA_ENGINE_INVALID_SNAPSHOT');
    if (data.status === 'ready') return { status: 'ready' as const };
    if (data.status === 'bootstrap-required') {
      return { status: 'missing' as const };
    }
    if (data.status === 'reference-hour-mismatch') {
      return { status: 'reference-hour-mismatch' as const };
    }
    if (data.status === 'already-completed') {
      return { status: 'already-completed' as const };
    }
    if (data.status === 'not-ready') {
      return { status: 'not-ready' as const };
    }
    throw new Error('BORA_ENGINE_INVALID_SNAPSHOT');
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
          p_source_system: event.sourceSystem,
          p_source_event_id: event.sourceEventId,
          p_song_id: event.songId,
          p_vote_type: event.voteType,
          p_occurred_at: event.occurredAt,
          p_voter_ref: event.voterRef,
          p_identity_method: event.identityMethod,
          p_identity_version: event.identityVersion,
          p_idempotency_key: event.idempotencyKey,
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

  /**
   * Persists a fetched YouTube cumulative snapshot, computes the hourly delta safely,
   * updates the platform observation projection, appends to the observation history ledger,
   * and marks input coverage as COMPLETE with evidence metadata.
   */
  /**
   * Persists a fetched YouTube cumulative snapshot, computes the hourly delta safely using BigInt,
   * updates the platform observation projection, appends to the observation history ledger,
   * and marks input coverage as COMPLETE with evidence metadata.
   */
  async persistYouTubeSnapshot(
    input: YouTubeSnapshotPersistenceInput,
  ): Promise<YouTubeSnapshotPersistenceResult> {
    const supabase = this.client;

    // 1. Verify song exists and matches the registered youtube_id mapping
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, youtube_id')
      .eq('id', input.songId)
      .single();

    if (songError || !song) {
      return {
        status: 'error',
        reason: `song-not-found: ${input.songId}`,
      };
    }

    if (song.youtube_id !== input.videoId) {
      return {
        status: 'error',
        reason: `youtube-id-mismatch: expected ${song.youtube_id}, got ${input.videoId}`,
      };
    }

    // 2. Validate cumulative views using BigInt
    if (!/^\d+$/.test(input.value)) {
      return { status: 'error', reason: 'invalid-view-count-format' };
    }
    const currentCumulative = BigInt(input.value);

    // 3. Fetch previous snapshot for baseline calculation
    const { data: prevSnapshot } = await supabase
      .from('bora_engine_youtube_snapshot_history')
      .select('view_count, hour_index')
      .eq('song_id', input.songId)
      .eq('video_id', input.videoId)
      .order('hour_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Insert current cumulative snapshot into history
    const { error: snapInsertError } = await supabase
      .from('bora_engine_youtube_snapshot_history')
      .insert({
        song_id: input.songId,
        video_id: input.videoId,
        provider: 'youtube-data-api-v3',
        metric: 'cumulative_views',
        unit: 'views_total',
        source_status: 'OBSERVED',
        view_count: currentCumulative.toString(),
        retrieved_at: input.retrievedAt,
        source_system: input.sourceSystem,
        source_observation_id: input.sourceObservationId,
        version: 0,
      });

    if (snapInsertError) {
      if (snapInsertError.code === '23505') {
        return { status: 'error', reason: 'duplicate-source-observation-id' };
      }
      return {
        status: 'error',
        reason: `snapshot-insert-failed: ${snapInsertError.message}`,
      };
    }

    let hourlyDelta: bigint | null = null;
    let hasValidBaseline = false;

    if (!prevSnapshot) {
      // First snapshot: baseline recorded, activity unmeasured
      hasValidBaseline = false;
    } else {
      try {
        const prevViews = BigInt(prevSnapshot.view_count);
        if (currentCumulative < prevViews) {
          return {
            status: 'error',
            reason: 'view-count-decreased',
          };
        }
        hourlyDelta = currentCumulative - prevViews;
        hasValidBaseline = true;
      } catch {
        return {
          status: 'error',
          reason: 'invalid-previous-view-count-format',
        };
      }
    }

    // 5. If measured, record platform observation history and update projection
    if (hourlyDelta !== null && hasValidBaseline) {
      const deltaStr = hourlyDelta.toString();

      const { error: obsHistoryError } = await supabase
        .from('bora_engine_platform_observation_history')
        .insert({
          song_id: input.songId,
          platform: 'youtube',
          hour_index: input.hourIndex,
          value: deltaStr,
          source: 'EXTERNAL',
          source_system: input.sourceSystem,
          source_observation_id: input.sourceObservationId,
          observed_at: input.retrievedAt,
          version: 1,
        });

      if (obsHistoryError && obsHistoryError.code !== '23505') {
        return {
          status: 'error',
          reason: `observation-history-failed: ${obsHistoryError.message}`,
        };
      }

      // Upsert current platform observation projection
      const { error: obsProjError } = await supabase
        .from('bora_engine_platform_observations')
        .upsert({
          song_id: input.songId,
          platform: 'youtube',
          hour_index: input.hourIndex,
          value: deltaStr,
          source: 'EXTERNAL',
          lifecycle: 'ACTIVE',
          version: 1,
          source_system: input.sourceSystem,
          source_observation_id: input.sourceObservationId,
          observed_at: input.retrievedAt,
        }, { onConflict: 'song_id,platform,hour_index' });

      if (obsProjError) {
        return {
          status: 'error',
          reason: `observation-projection-failed: ${obsProjError.message}`,
        };
      }
    }

    // 6. Record strict coverage provenance
    const { error: coverageError } = await supabase
      .from('bora_engine_hourly_input_coverage')
      .upsert({
        song_id: input.songId,
        input_type: 'YOUTUBE',
        hour_index: input.hourIndex,
        status: 'COMPLETE',
        detail: hasValidBaseline ? 'snapshot-delta-computed' : 'initial-baseline-snapshot',
        currentness: input.retrievedAt,
        source_identity: input.sourceSystem,
        evidence_id: input.sourceObservationId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'song_id,input_type,hour_index' });

    if (coverageError) {
      return {
        status: 'error',
        reason: `coverage-upsert-failed: ${coverageError.message}`,
      };
    }

    return {
      status: 'success',
      observationValue: hourlyDelta !== null
        ? Number(hourlyDelta > 9007199254740991n ? 9007199254740991n : hourlyDelta)
        : 0,
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
  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
  return {
    status: 'available',
    persistence: new SupabaseBoraEnginePersistence(client),
  };
}
