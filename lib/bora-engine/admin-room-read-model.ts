import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBoraEnginePersistenceFromEnv } from './persistence';
import type {
  BoraEngineReadiness,
} from './persistence';
import {
  getCurrentPlatformSourceAssessments,
} from './source-readiness';
import { getConfiguredPlatformSourceAssessments } from './platform-source-configuration';

const COVERAGE_INPUTS = [
  'VOTES',
  'SEED',
  'YOUTUBE',
  'SPOTIFY',
  'BOOMPLAY',
] as const;

const CURRENTNESS_STATES = [
  'current',
  'fresh',
  'stale',
  'invalidated',
  'unresolved',
] as const;

export interface EngineRoomRun {
  readonly closedHour: number;
  readonly status: string;
  readonly attemptCount: number;
  readonly completedAt: string | null;
  readonly lastErrorCode: string | null;
}

export interface EngineRoomPublication {
  readonly id: string;
  readonly referenceHour: number;
  readonly publishedAt: string;
  readonly totalActiveC: string;
  readonly platformTotalYouTube: string;
  readonly platformTotalSpotify: string;
  readonly platformTotalBoomplay: string;
}

export interface EngineRoomCoverageCounts {
  readonly inputType: (typeof COVERAGE_INPUTS)[number];
  readonly current: number;
  readonly fresh: number;
  readonly unavailable: number;
  readonly failed: number;
  readonly stale: number;
  readonly invalidated: number;
  readonly unresolved: number;
}

export interface EngineRoomCoverageRow {
  readonly songId: string;
  readonly inputType: string;
  readonly hourIndex: number;
  readonly status: string;
  readonly currentness: string;
  readonly sourceIdentity: string | null;
  readonly evidenceId: string | null;
  readonly assessedAt: string | null;
  readonly checkedAt: string;
  readonly reason: string | null;
}

export interface EngineRoomPublicationEntry {
  readonly songId: string;
  readonly lifecycle: string;
  readonly rank: number | null;
  readonly boraScore: string | null;
}

export interface EngineRoomOperationsSnapshot {
  readonly status: 'ready' | 'unavailable';
  readonly reason?: 'configuration-unavailable' | 'database-read-failed';
  readonly generatedAt: string;
  readonly songCount: number;
  readonly stateHead: {
    readonly referenceHour: number;
    readonly revision: number;
  } | null;
  readonly readiness: BoraEngineReadiness | null;
  readonly sourceAssessments: ReturnType<
    typeof getCurrentPlatformSourceAssessments
  >;
  readonly coverage: readonly EngineRoomCoverageCounts[];
  readonly recentCoverage: readonly EngineRoomCoverageRow[];
  readonly runs: readonly EngineRoomRun[];
  readonly publications: readonly EngineRoomPublication[];
  readonly currentPublicationEntries: readonly EngineRoomPublicationEntry[];
  readonly currentPublicationId: string | null;
}

function unavailable(
  reason: NonNullable<EngineRoomOperationsSnapshot['reason']>,
): EngineRoomOperationsSnapshot {
  return {
    status: 'unavailable',
    reason,
    generatedAt: new Date().toISOString(),
    songCount: 0,
    stateHead: null,
    readiness: null,
    sourceAssessments: getCurrentPlatformSourceAssessments(
      new Date().toISOString(),
    ),
    coverage: [],
    recentCoverage: [],
    runs: [],
    publications: [],
    currentPublicationEntries: [],
    currentPublicationId: null,
  };
}

function safeEvidenceReference(value: string | null): string | null {
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

export async function getEngineRoomOperationsSnapshot(): Promise<EngineRoomOperationsSnapshot> {
  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status !== 'available') {
    return unavailable('configuration-unavailable');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return unavailable('configuration-unavailable');

  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const coverageCounts = await Promise.all(
      COVERAGE_INPUTS.map(async (inputType) => {
        const [current, unavailableCount, failedCount, ...staleCounts] =
          await Promise.all([
            client
              .from('bora_engine_hourly_input_coverage')
              .select('song_id', { count: 'exact', head: true })
              .eq('input_type', inputType)
              .eq('status', 'COMPLETE')
              .eq('currentness', 'current'),
            client
              .from('bora_engine_hourly_input_coverage')
              .select('song_id', { count: 'exact', head: true })
              .eq('input_type', inputType)
              .eq('status', 'UNAVAILABLE'),
            client
              .from('bora_engine_hourly_input_coverage')
              .select('song_id', { count: 'exact', head: true })
              .eq('input_type', inputType)
              .eq('status', 'FAILED'),
            ...CURRENTNESS_STATES.slice(1).map((currentness) =>
              client
                .from('bora_engine_hourly_input_coverage')
                .select('song_id', { count: 'exact', head: true })
                .eq('input_type', inputType)
                .eq('status', 'COMPLETE')
                .eq('currentness', currentness),
            ),
          ]);
        for (const result of [
          current,
          unavailableCount,
          failedCount,
          ...staleCounts,
        ]) {
          if (result.error) throw result.error;
        }
        return {
          inputType,
          current: current.count ?? 0,
          fresh: staleCounts[0].count ?? 0,
          unavailable: unavailableCount.count ?? 0,
          failed: failedCount.count ?? 0,
          stale: staleCounts[1].count ?? 0,
          invalidated: staleCounts[2].count ?? 0,
          unresolved: staleCounts[3].count ?? 0,
        };
      }),
    );

    const [
      readiness,
      songsResult,
      stateHeadResult,
      coverageRowsResult,
      runsResult,
      publicationsResult,
      publicationHeadResult,
      sourceAssessments,
    ] = await Promise.all([
      setup.persistence.readiness(null),
      client.from('songs').select('id', { count: 'exact', head: true }),
      client
        .from('bora_engine_hourly_state_head')
        .select('reference_hour, revision')
        .eq('singleton', true)
        .maybeSingle(),
      client
        .from('bora_engine_hourly_input_coverage')
        .select(
          'song_id, input_type, hour_index, status, currentness, source_identity, evidence_id, assessed_at, checked_at, evidence_reason',
        )
        .order('checked_at', { ascending: false })
        .limit(25),
      client
        .from('bora_engine_hourly_runs')
        .select(
          'closed_hour, status, attempt_count, completed_at, last_error_code',
        )
        .order('closed_hour', { ascending: false })
        .limit(10),
      client
        .from('bora_engine_publications')
        .select(
          'id, reference_hour, published_at, total_active_c, platform_total_youtube, platform_total_spotify, platform_total_boomplay',
        )
        .order('published_at', { ascending: false })
        .limit(10),
      client
        .from('bora_engine_publication_head')
        .select('publication_id')
        .eq('singleton', true)
        .maybeSingle(),
      getConfiguredPlatformSourceAssessments(new Date().toISOString()),
    ]);

    for (const result of [
      songsResult,
      stateHeadResult,
      coverageRowsResult,
      runsResult,
      publicationsResult,
      publicationHeadResult,
    ]) {
      if (result.error) throw result.error;
    }

    const publicationId = publicationHeadResult.data?.publication_id ?? null;
    const currentEntriesResult = publicationId
      ? await client
          .from('bora_engine_publication_entries')
          .select('song_id, lifecycle, rank, bora_score')
          .eq('publication_id', publicationId)
          .order('rank', { ascending: true })
          .limit(100)
      : { data: [], error: null };
    if (currentEntriesResult.error) throw currentEntriesResult.error;

    return {
      status: 'ready',
      generatedAt: new Date().toISOString(),
      songCount: songsResult.count ?? 0,
      stateHead: stateHeadResult.data
        ? {
            referenceHour: Number(stateHeadResult.data.reference_hour),
            revision: Number(stateHeadResult.data.revision),
          }
        : null,
      readiness,
      sourceAssessments,
      coverage: coverageCounts,
      recentCoverage: (coverageRowsResult.data ?? []).map((row) => ({
        songId: row.song_id,
        inputType: row.input_type,
        hourIndex: Number(row.hour_index),
        status: row.status,
        currentness: row.currentness,
        sourceIdentity: safeEvidenceReference(row.source_identity),
        evidenceId: safeEvidenceReference(row.evidence_id),
        assessedAt: row.assessed_at,
        checkedAt: row.checked_at,
        reason:
          row.evidence_reason ??
          (row.status === 'UNAVAILABLE'
            ? 'source-unavailable'
            : row.status === 'FAILED'
              ? 'check-failed'
              : row.currentness === 'stale' ||
                  row.currentness === 'invalidated'
                ? 'history-changed'
                : null),
      })),
      runs: (runsResult.data ?? []).map((run) => ({
        closedHour: Number(run.closed_hour),
        status: run.status,
        attemptCount: run.attempt_count,
        completedAt: run.completed_at,
        lastErrorCode: run.last_error_code,
      })),
      publications: (publicationsResult.data ?? []).map((publication) => ({
        id: publication.id,
        referenceHour: Number(publication.reference_hour),
        publishedAt: publication.published_at,
        totalActiveC: String(publication.total_active_c),
        platformTotalYouTube: String(publication.platform_total_youtube),
        platformTotalSpotify: String(publication.platform_total_spotify),
        platformTotalBoomplay: String(publication.platform_total_boomplay),
      })),
      currentPublicationEntries: (currentEntriesResult.data ?? []).map(
        (entry) => ({
          songId: entry.song_id,
          lifecycle: entry.lifecycle,
          rank: entry.rank,
          boraScore:
            entry.bora_score === null ? null : String(entry.bora_score),
        }),
      ),
      currentPublicationId: publicationId,
    };
  } catch (error) {
    console.error(
      '[bora-engine-admin-room] operations snapshot failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return unavailable('database-read-failed');
  }
}

export interface EngineRoomSong {
  readonly id: string;
  readonly slotNumber: number;
  readonly title: string;
  readonly artist: string;
  readonly youtubeId: string | null;
}

export interface EngineRoomPlatformMapping {
  readonly songId: string;
  readonly platform: 'youtube' | 'spotify' | 'boomplay';
  readonly platformIdentity: string;
  readonly sourceDisplayName: string;
  readonly authorizationReference: string;
  readonly hourlyEvidenceConfirmed: boolean;
  readonly updatedAt: string;
}

export type EngineRoomPlatformMappings =
  | {
      readonly status: 'ready';
      readonly mappings: readonly EngineRoomPlatformMapping[];
    }
  | { readonly status: 'unavailable' };

export type EngineRoomSongList =
  | { readonly status: 'ready'; readonly songs: readonly EngineRoomSong[] }
  | { readonly status: 'unavailable' };

export async function getEngineRoomPlatformMappings(): Promise<EngineRoomPlatformMappings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 'unavailable' };

  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from('bora_engine_platform_source_mappings')
    .select(
      'song_id, platform, platform_identity, source_display_name, authorization_reference, hourly_evidence_confirmed, updated_at',
    )
    .order('platform', { ascending: true })
    .limit(1000);
  if (error) {
    console.error(
      '[bora-engine-admin-room] platform mappings could not be loaded:',
      error.code ?? error.message,
    );
    return { status: 'unavailable' };
  }

  return {
    status: 'ready',
    mappings: (data ?? []).flatMap((mapping) => {
      if (
        mapping.platform !== 'youtube' &&
        mapping.platform !== 'spotify' &&
        mapping.platform !== 'boomplay'
      ) {
        return [];
      }
      return [{
        songId: mapping.song_id,
        platform: mapping.platform,
        platformIdentity: mapping.platform_identity,
        sourceDisplayName: mapping.source_display_name,
        authorizationReference: mapping.authorization_reference,
        hourlyEvidenceConfirmed: mapping.hourly_evidence_confirmed,
        updatedAt: mapping.updated_at,
      }];
    }),
  };
}

export async function getEngineRoomSongList(): Promise<EngineRoomSongList> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: 'unavailable' };

  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from('songs')
    .select('id, slot_number, title, artist, youtube_id')
    .order('title', { ascending: true })
    .limit(200);
  if (error) {
    console.error(
      '[bora-engine-admin-room] song registry read failed:',
      error.message,
    );
    return { status: 'unavailable' };
  }

  return {
    status: 'ready',
    songs: (data ?? []).map((song) => ({
      id: song.id,
      slotNumber: song.slot_number,
      title: song.title ?? '',
      artist: song.artist ?? '',
      youtubeId: song.youtube_id,
    })),
  };
}
