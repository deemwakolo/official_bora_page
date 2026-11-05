'use server';

import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authorizeBoraAdministrator } from '@/lib/administrator-authorization';
import { createClient } from '@/lib/supabase/server';
import type {
  DailyPlatformRankActionResult,
  DailyPlatformRankInput,
  DailyPlatformRankSnapshotResult,
  ManualPlatformActionResult,
  ManualPlatformBaselineInput,
  ManualPlatformHistoryItem,
  ManualPlatformHistoryResult,
  ManualPlatformHourInput,
  ManualPlatformMappingInput,
  SyntheticDailyPlatformRankDatesResult,
} from './manual-platform-types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PLATFORMS = ['youtube', 'spotify', 'boomplay'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function validCommonInput(input: {
  readonly requestId: string;
  readonly songId: string;
  readonly platform: string;
  readonly platformIdentity: string;
  readonly sourceDisplayName: string;
  readonly authorizationConfirmed: true;
}): boolean {
  return (
    UUID_PATTERN.test(input.requestId) &&
    UUID_PATTERN.test(input.songId) &&
    PLATFORMS.includes(input.platform as (typeof PLATFORMS)[number]) &&
    input.platformIdentity.trim().length > 0 &&
    input.platformIdentity.trim().length <= 300 &&
    input.sourceDisplayName.trim().length > 0 &&
    input.sourceDisplayName.trim().length <= 200 &&
    input.authorizationConfirmed === true
  );
}

async function getAuthorizedActor(): Promise<
  | { readonly status: 'authorized'; readonly userId: string }
  | { readonly status: 'unauthorized' | 'configuration-unavailable' }
> {
  const authorization = await authorizeBoraAdministrator();
  if (authorization.status !== 'authorized') {
    return {
      status:
        authorization.status === 'authorization-unavailable'
          ? 'configuration-unavailable'
          : 'unauthorized',
    };
  }

  try {
    const session = await createClient();
    const { data, error } = await session.auth.getUser();
    if (error || !data.user?.id || !UUID_PATTERN.test(data.user.id)) {
      return { status: 'configuration-unavailable' };
    }
    return { status: 'authorized', userId: data.user.id };
  } catch {
    return { status: 'configuration-unavailable' };
  }
}

function getServiceClient():
  | { readonly status: 'available'; readonly client: SupabaseClient }
  | { readonly status: 'configuration-unavailable' } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 'configuration-unavailable' };
  return {
    status: 'available',
    client: createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }),
  };
}

function normalizeRpcResult(
  value: unknown,
  error: { readonly code?: string | null } | null,
): ManualPlatformActionResult {
  if (error) {
    console.error(
      '[bora-engine-manual-platform-intake] RPC failed:',
      error.code ?? 'unknown',
    );
    return { status: 'persistence-failed' };
  }
  if (!isRecord(value) || typeof value.status !== 'string') {
    return { status: 'persistence-failed' };
  }
  const statuses: readonly ManualPlatformActionResult['status'][] = [
    'saved',
    'already-saved',
    'recorded',
    'already-recorded',
    'invalid-input',
    'idempotency-conflict',
    'mapping-or-input-invalid',
    'platform-identity-in-use',
    'correction-required',
    'stale-correction',
  ];
  if (!statuses.includes(value.status as ManualPlatformActionResult['status'])) {
    return { status: 'persistence-failed' };
  }
  return {
    status: value.status as ManualPlatformActionResult['status'],
    ...(typeof value.evidenceId === 'string'
      ? { evidenceId: value.evidenceId }
      : {}),
  };
}

export async function saveManualPlatformMapping(
  input: ManualPlatformMappingInput,
): Promise<ManualPlatformActionResult> {
  if (
    !input ||
    !validCommonInput(input) ||
    !input.authorizationReference.trim() ||
    typeof input.hourlyEvidenceConfirmed !== 'boolean'
  ) {
    return { status: 'invalid-input' };
  }
  const actor = await getAuthorizedActor();
  if (actor.status !== 'authorized') return actor;
  const setup = getServiceClient();
  if (setup.status !== 'available') return setup;

  try {
    const { data, error } = await setup.client.rpc(
      'bora_engine_admin_save_platform_mapping',
      {
        p_request: {
          ...input,
          songId: input.songId.toLowerCase(),
          actorUserId: actor.userId,
        },
      },
    );
    return normalizeRpcResult(data, error);
  } catch (error) {
    console.error(
      '[bora-engine-manual-platform-intake] mapping action failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'persistence-failed' };
  }
}

export async function submitManualPlatformBaseline(
  input: ManualPlatformBaselineInput,
): Promise<ManualPlatformActionResult> {
  if (
    !input ||
    !validCommonInput(input) ||
    !input.sourceEvidenceReference.trim() ||
    !input.metric.trim() ||
    input.metric.trim().length > 100 ||
    !input.unit.trim() ||
    input.unit.trim().length > 50 ||
    input.sourceEvidenceReference.trim().length > 2000 ||
    (input.recordType !== 'baseline' && input.recordType !== 'snapshot') ||
    !/^\d+(?:\.\d+)?$/.test(input.value) ||
    !isUtcTimestamp(input.observedAt) ||
    !input.authorizationConfirmed
  ) {
    return { status: 'invalid-input' };
  }
  const actor = await getAuthorizedActor();
  if (actor.status !== 'authorized') return actor;
  const setup = getServiceClient();
  if (setup.status !== 'available') return setup;

  try {
    const { data, error } = await setup.client.rpc(
      'bora_engine_admin_submit_platform_baseline',
      {
        p_request: {
          ...input,
          songId: input.songId.toLowerCase(),
          actorUserId: actor.userId,
          value: input.value,
        },
      },
    );
    return normalizeRpcResult(data, error);
  } catch (error) {
    console.error(
      '[bora-engine-manual-platform-intake] baseline action failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'persistence-failed' };
  }
}

export async function submitManualPlatformHour(
  input: ManualPlatformHourInput,
): Promise<ManualPlatformActionResult> {
  const expectedMetric =
    input?.platform === 'youtube' ? 'video_views' : 'track_streams';
  const expectedUnit =
    input?.platform === 'youtube' ? 'views_per_hour' : 'streams_per_hour';
  if (
    !input ||
    !validCommonInput(input) ||
    !input.sourceEvidenceReference.trim() ||
    input.metric !== expectedMetric ||
    input.unit !== expectedUnit ||
    !/^\d+$/.test(input.value) ||
    !Number.isSafeInteger(Number(input.value)) ||
    !Number.isSafeInteger(input.hourIndex) ||
    input.hourIndex < 0 ||
    !isUtcTimestamp(input.periodStart) ||
    !isUtcTimestamp(input.periodEnd) ||
    !isUtcTimestamp(input.observedAt) ||
    Date.parse(input.periodEnd) - Date.parse(input.periodStart) !== 3_600_000 ||
    Math.floor(Date.parse(input.periodStart) / 3_600_000) !== input.hourIndex ||
    Math.floor(Date.parse(input.observedAt) / 3_600_000) !== input.hourIndex ||
    Date.parse(input.periodStart) % 3_600_000 !== 0 ||
    Date.parse(input.observedAt) < Date.parse(input.periodStart) ||
    Date.parse(input.observedAt) >= Date.parse(input.periodEnd) ||
    (input.supersedesObservationId !== undefined &&
      !UUID_PATTERN.test(input.supersedesObservationId))
  ) {
    return { status: 'invalid-input' };
  }

  const actor = await getAuthorizedActor();
  if (actor.status !== 'authorized') return actor;
  const setup = getServiceClient();
  if (setup.status !== 'available') return setup;

  try {
    const { data, error } = await setup.client.rpc(
      'bora_engine_admin_submit_platform_hour',
      {
        p_request: {
          ...input,
          songId: input.songId.toLowerCase(),
          actorUserId: actor.userId,
          value: input.value,
        },
      },
    );
    return normalizeRpcResult(data, error);
  } catch (error) {
    console.error(
      '[bora-engine-manual-platform-intake] hourly action failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'persistence-failed' };
  }
}

export async function submitDailyPlatformRanks(
  input: DailyPlatformRankInput,
): Promise<DailyPlatformRankActionResult> {
  if (
    !input ||
    !UUID_PATTERN.test(input.requestId) ||
    (input.effectiveDate !== undefined &&
      !isDateOnly(input.effectiveDate)) ||
    (input.supersedesSnapshotId !== undefined &&
      !UUID_PATTERN.test(input.supersedesSnapshotId)) ||
    !Array.isArray(input.entries) ||
    input.entries.length === 0 ||
    !input.evidenceReferences ||
    !PLATFORMS.every(
      (platform) =>
        typeof input.evidenceReferences[platform] === 'string' &&
        input.evidenceReferences[platform].trim().length > 0 &&
        input.evidenceReferences[platform].trim().length <= 2000,
    )
  ) {
    return { status: 'invalid-input' };
  }

  const songPlatformKeys = new Set<string>();
  const rankKeys = new Set<string>();
  for (const entry of input.entries) {
    if (
      !entry ||
      !UUID_PATTERN.test(entry.songId) ||
      !PLATFORMS.includes(entry.platform) ||
      !Number.isSafeInteger(entry.rank) ||
      entry.rank < 1 ||
      entry.rank > 2_147_483_647
    ) {
      return { status: 'invalid-input' };
    }
    const songPlatformKey = `${entry.songId}:${entry.platform}`;
    const rankKey = `${entry.platform}:${entry.rank}`;
    if (songPlatformKeys.has(songPlatformKey) || rankKeys.has(rankKey)) {
      return { status: 'invalid-input' };
    }
    songPlatformKeys.add(songPlatformKey);
    rankKeys.add(rankKey);
  }

  const actor = await getAuthorizedActor();
  if (actor.status !== 'authorized') return actor;
  const setup = getServiceClient();
  if (setup.status !== 'available') return setup;

  try {
    const { data, error } = await setup.client.rpc(
      'bora_engine_admin_submit_daily_platform_ranks',
      {
        p_request: {
          ...input,
          requestId: input.requestId.toLowerCase(),
          actorUserId: actor.userId,
          supersedesSnapshotId: input.supersedesSnapshotId ?? '',
          entries: input.entries.map((entry) => ({
            ...entry,
            songId: entry.songId.toLowerCase(),
          })),
        },
      },
    );
    if (error) {
      console.error(
        '[bora-engine-daily-platform-ranks] RPC failed:',
        error.code ?? 'unknown',
      );
      return { status: 'persistence-failed' };
    }
    if (!isRecord(data) || typeof data.status !== 'string') {
      return { status: 'persistence-failed' };
    }
    if (
      data.status === 'recorded' ||
      data.status === 'already-recorded'
    ) {
      if (
        !isUuid(data.snapshotId) ||
        typeof data.effectiveDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.effectiveDate) ||
        typeof data.revision !== 'number' ||
        !Number.isSafeInteger(data.revision)
      ) {
        return { status: 'persistence-failed' };
      }
      return {
        status: data.status,
        snapshotId: data.snapshotId,
        effectiveDate: data.effectiveDate,
        revision: data.revision,
      };
    }

    const statuses = [
      'unauthorized',
      'configuration-unavailable',
      'invalid-input',
      'idempotency-conflict',
      'invalid-or-incomplete-ranks',
      'mapping-required',
      'correction-required',
      'correction-not-allowed',
      'rank-slot-conflict',
      'no-songs',
      'persistence-failed',
    ] as const;
    if (statuses.some((status) => status === data.status)) {
      return {
        status: data.status as (typeof statuses)[number],
      };
    }
    return { status: 'persistence-failed' };
  } catch (error) {
    console.error(
      '[bora-engine-daily-platform-ranks] action failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'persistence-failed' };
  }
}

export async function getDailyPlatformRankSnapshot(
  requestedEffectiveDate?: string,
): Promise<DailyPlatformRankSnapshotResult> {
  const actor = await getAuthorizedActor();
  if (actor.status === 'unauthorized') return { status: 'unauthorized' };
  if (actor.status !== 'authorized') return { status: 'unavailable' };
  const setup = getServiceClient();
  if (setup.status !== 'available') return { status: 'unavailable' };

  let effectiveDate = requestedEffectiveDate;
  if (effectiveDate && !isDateOnly(effectiveDate)) return { status: 'unavailable' };
  if (!effectiveDate) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
    );
    const today = `${values.year}-${values.month}-${values.day}`;
    const effective = new Date(`${today}T00:00:00.000Z`);
    if (!Number.isFinite(effective.getTime())) return { status: 'unavailable' };
    effective.setUTCDate(effective.getUTCDate() + 1);
    effectiveDate = effective.toISOString().slice(0, 10);
  }

  try {
    const { data: snapshot, error: snapshotError } = await setup.client
      .from('bora_engine_daily_platform_rank_snapshots')
      .select('id, effective_date, revision, is_synthetic')
      .eq('effective_date', effectiveDate)
      .order('revision', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapshotError) throw snapshotError;
    if (!snapshot) return { status: 'none' };
    if (
      !isUuid(snapshot.id) ||
      snapshot.effective_date !== effectiveDate ||
      typeof snapshot.revision !== 'number' ||
      !Number.isSafeInteger(snapshot.revision) ||
      typeof snapshot.is_synthetic !== 'boolean'
    ) {
      throw new Error('BORA_ENGINE_INVALID_DAILY_RANK_SNAPSHOT');
    }
    if (requestedEffectiveDate && !snapshot.is_synthetic) {
      return { status: 'not-correctable' };
    }

    const { data: rows, error: entriesError } = await setup.client
      .from('bora_engine_daily_platform_rank_entries')
      .select('song_id, platform, rank')
      .eq('snapshot_id', snapshot.id);
    if (entriesError) throw entriesError;
    if (!Array.isArray(rows)) {
      throw new Error('BORA_ENGINE_INVALID_DAILY_RANK_ENTRIES');
    }
    const entries: {
      readonly songId: string;
      readonly platform: (typeof PLATFORMS)[number];
      readonly rank: number;
    }[] = [];
    for (const row of rows) {
      if (
        !isRecord(row) ||
        !isUuid(row.song_id) ||
        !PLATFORMS.includes(row.platform as (typeof PLATFORMS)[number]) ||
        typeof row.rank !== 'number' ||
        !Number.isSafeInteger(row.rank) ||
        row.rank < 1
      ) {
        throw new Error('BORA_ENGINE_INVALID_DAILY_RANK_ENTRIES');
      }
      entries.push({
        songId: row.song_id,
        platform: row.platform as (typeof PLATFORMS)[number],
        rank: row.rank,
      });
    }

    return {
      status: 'ready',
      snapshotId: snapshot.id,
      effectiveDate,
      revision: snapshot.revision,
      isSynthetic: snapshot.is_synthetic,
      entries,
    };
  } catch (error) {
    console.error(
      '[bora-engine-daily-platform-ranks] snapshot read failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'unavailable' };
  }
}

export async function getSyntheticDailyPlatformRankDates(): Promise<SyntheticDailyPlatformRankDatesResult> {
  const actor = await getAuthorizedActor();
  if (actor.status === 'unauthorized') return { status: 'unauthorized' };
  if (actor.status !== 'authorized') return { status: 'unavailable' };
  const setup = getServiceClient();
  if (setup.status !== 'available') return { status: 'unavailable' };

  try {
    const { data, error } = await setup.client
      .from('bora_engine_daily_platform_rank_snapshots')
      .select('effective_date, revision, is_synthetic')
      .order('effective_date', { ascending: false })
      .order('revision', { ascending: false });
    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error('BORA_ENGINE_INVALID_DAILY_RANK_DATE_LIST');
    }

    const seenDates = new Set<string>();
    const dates: string[] = [];
    for (const row of data) {
      if (
        !isRecord(row) ||
        typeof row.effective_date !== 'string' ||
        !isDateOnly(row.effective_date) ||
        typeof row.revision !== 'number' ||
        !Number.isSafeInteger(row.revision) ||
        typeof row.is_synthetic !== 'boolean'
      ) {
        throw new Error('BORA_ENGINE_INVALID_DAILY_RANK_DATE_LIST');
      }
      if (seenDates.has(row.effective_date)) continue;
      seenDates.add(row.effective_date);
      if (row.is_synthetic) dates.push(row.effective_date);
    }
    return { status: 'ready', dates };
  } catch (error) {
    console.error(
      '[bora-engine-daily-platform-ranks] synthetic date read failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'unavailable' };
  }
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeHistoryReference(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (
    /https?:\/\//i.test(normalized) ||
    /bearer|api[_-]?key|access[_-]?token|secret|password/i.test(normalized) ||
    /[?&#]/.test(normalized)
  ) {
    return '[reference withheld]';
  }
  return normalized.slice(0, 120);
}

export async function getManualPlatformHistory(
  songId: string,
  platform: ManualPlatformMappingInput['platform'],
): Promise<ManualPlatformHistoryResult> {
  if (!UUID_PATTERN.test(songId) || !PLATFORMS.includes(platform)) {
    return { status: 'unavailable' };
  }

  const actor = await getAuthorizedActor();
  if (actor.status !== 'authorized') {
    return {
      status: actor.status === 'unauthorized' ? 'unauthorized' : 'unavailable',
    };
  }
  const setup = getServiceClient();
  if (setup.status !== 'available') return { status: 'unavailable' };

  try {
    const [mappings, references, observations] = await Promise.all([
      setup.client
        .from('bora_engine_platform_source_mapping_history')
        .select(
          'id, platform_identity, source_display_name, authorization_reference, hourly_evidence_confirmed, changed_by, created_at',
        )
        .eq('song_id', songId)
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(30),
      setup.client
        .from('bora_engine_platform_baseline_history')
        .select(
          'id, record_type, platform_identity, source_display_name, source_evidence_reference, metric, unit, value, observed_at, submitted_by',
        )
        .eq('song_id', songId)
        .eq('platform', platform)
        .order('observed_at', { ascending: false })
        .limit(30),
      setup.client
        .from('bora_engine_platform_observation_history')
        .select(
          'id, platform_identity, source_display_name, provider_reference, metric, unit, value, hour_index, period_start, period_end, observed_at, submitted_by, version, supersedes_observation_id',
        )
        .eq('song_id', songId)
        .eq('platform', platform)
        .eq('source_system', 'manual-admin-v1')
        .order('observed_at', { ascending: false })
        .limit(50),
    ]);

    const failed = [mappings, references, observations].find(
      (result) => result.error,
    );
    if (failed?.error) throw failed.error;

    const items: ManualPlatformHistoryItem[] = [
      ...(mappings.data ?? []).map((item) => ({
        id: item.id,
        kind: 'mapping' as const,
        platformIdentity: item.platform_identity,
        sourceDisplayName: item.source_display_name,
        sourceEvidenceReference: safeHistoryReference(
          item.authorization_reference,
        ),
        metric: null,
        unit: null,
        value: null,
        observedAt: item.created_at,
        periodStart: null,
        periodEnd: null,
        hourIndex: null,
        submittedBy: item.changed_by,
        version: null,
        supersedesObservationId: null,
        hourlyEvidenceConfirmed: item.hourly_evidence_confirmed,
      })),
      ...(references.data ?? []).flatMap((item) => {
        if (item.record_type !== 'baseline' && item.record_type !== 'snapshot') {
          return [];
        }
        return [{
          id: item.id,
          kind: item.record_type,
          platformIdentity: item.platform_identity,
          sourceDisplayName: item.source_display_name,
          sourceEvidenceReference: safeHistoryReference(
            item.source_evidence_reference,
          ),
          metric: item.metric,
          unit: item.unit,
          value: String(item.value),
          observedAt: item.observed_at,
          periodStart: null,
          periodEnd: null,
          hourIndex: null,
          submittedBy: item.submitted_by,
          version: null,
          supersedesObservationId: null,
          hourlyEvidenceConfirmed: null,
        }];
      }),
      ...(observations.data ?? []).map((item) => ({
        id: item.id,
        kind: 'hourly' as const,
        platformIdentity: item.platform_identity ?? 'Identity not recorded',
        sourceDisplayName: item.source_display_name ?? 'Source not recorded',
        sourceEvidenceReference: safeHistoryReference(item.provider_reference),
        metric: item.metric,
        unit: item.unit,
        value: String(item.value),
        observedAt: item.observed_at,
        periodStart: item.period_start,
        periodEnd: item.period_end,
        hourIndex: Number(item.hour_index),
        submittedBy: item.submitted_by,
        version: Number(item.version),
        supersedesObservationId: item.supersedes_observation_id,
        hourlyEvidenceConfirmed: null,
      })),
    ];

    return {
      status: 'ready',
      items: items.sort(
        (left, right) =>
          Date.parse(right.observedAt) - Date.parse(left.observedAt),
      ),
    };
  } catch (error) {
    console.error(
      '[bora-engine-manual-platform-intake] history read failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return { status: 'unavailable' };
  }
}
