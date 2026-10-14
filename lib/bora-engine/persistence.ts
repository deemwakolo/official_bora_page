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

export interface BoraEnginePersistence extends HourlyRolloverPersistence {
  checkBootstrap(closedHour: HourIndex): Promise<
    | { readonly status: 'ready' }
    | { readonly status: 'missing' }
    | { readonly status: 'reference-hour-mismatch' }
    | { readonly status: 'already-completed' }
  >;
  readiness(closedHour: number | null): Promise<BoraEngineReadiness>;
  bootstrap(input: EngineBootstrapInput): Promise<EngineBootstrapResult>;
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
  const zeroRecords = parseReadinessCount(value.zeroRecords);
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
    zeroRecords === null ||
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
    zeroRecords,
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

export function createBoraEnginePersistence(): BoraEnginePersistenceSetup {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let validUrl = false;
  if (url) {
    try {
      const parsed = new URL(url);
      validUrl = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      validUrl = false;
    }
  }
  if (!url || !validUrl) {
    return {
      status: 'configuration-unavailable',
      missing: 'NEXT_PUBLIC_SUPABASE_URL',
    };
  }
  const serviceRoleKey = process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || !serviceRoleKey.trim()) {
    return {
      status: 'configuration-unavailable',
      missing: 'BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  const client = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return {
    status: 'available',
    persistence: new SupabaseBoraEnginePersistence(client),
  };
}

export async function getBoraEngineReadiness(
  closedHour: number | null = null,
): Promise<BoraEngineReadiness> {
  if (
    closedHour !== null &&
    (!Number.isSafeInteger(closedHour) || closedHour < 0)
  ) {
    return {
      status: 'not-ready',
      closedHour: null,
      checks: {
        trustedPersistence: {
          status: 'unavailable',
          detail: 'The requested closed hour must be a non-negative integer.',
        },
        initialState: { status: 'unavailable' },
        voteHistory: { status: 'unavailable' },
        seedHours: { status: 'unavailable' },
        youtube: { status: 'unavailable' },
        spotify: { status: 'unavailable' },
        boomplay: { status: 'unavailable' },
        databaseContract: { status: 'unavailable' },
      },
    };
  }
  const setup = createBoraEnginePersistence();
  if (setup.status === 'configuration-unavailable') {
    return {
      status: 'unavailable',
      closedHour,
      checks: {
        trustedPersistence: {
          status: 'missing',
          detail: setup.missing,
        },
        initialState: { status: 'unavailable' },
        voteHistory: { status: 'unavailable' },
        seedHours: { status: 'unavailable' },
        youtube: { status: 'unavailable' },
        spotify: { status: 'unavailable' },
        boomplay: { status: 'unavailable' },
        databaseContract: { status: 'unavailable' },
      },
    };
  }
  try {
    return await setup.persistence.readiness(closedHour);
  } catch {
    return {
      status: 'unavailable',
      closedHour,
      checks: {
        trustedPersistence: { status: 'ready' },
        initialState: { status: 'unavailable' },
        voteHistory: { status: 'unavailable' },
        seedHours: { status: 'unavailable' },
        youtube: { status: 'unavailable' },
        spotify: { status: 'unavailable' },
        boomplay: { status: 'unavailable' },
        databaseContract: {
          status: 'unavailable',
          detail: 'The readiness RPC could not be called; migration 0016 may be unapplied or unavailable to the configured role.',
        },
      },
    };
  }
}

export async function bootstrapBoraEngineState(
  input: EngineBootstrapInput,
): Promise<EngineBootstrapResult> {
  const setup = createBoraEnginePersistence();
  if (setup.status === 'configuration-unavailable') {
    return { status: 'configuration-unavailable' };
  }
  try {
    return await setup.persistence.bootstrap(input);
  } catch {
    return { status: 'persistence-failure' };
  }
}
