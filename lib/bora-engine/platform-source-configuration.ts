import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  getCurrentPlatformSourceAssessments,
  type PlatformSourceAssessment,
} from './source-readiness';

type Platform = PlatformSourceAssessment['platform'];

function unresolvedAssessments(
  assessedAt: string,
): readonly PlatformSourceAssessment[] {
  return getCurrentPlatformSourceAssessments(assessedAt).map((assessment) => ({
    ...assessment,
    sourceIdentity: null,
    status: 'unknown',
    reason: 'source-status-not-established',
  }));
}

export async function getConfiguredPlatformSourceAssessments(
  assessedAt: string,
): Promise<readonly PlatformSourceAssessment[]> {
  const fallback = getCurrentPlatformSourceAssessments(assessedAt);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fallback;

  const client = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const [songsResult, stateResult, mappingsResult] = await Promise.all([
      client.from('songs').select('id').limit(1000),
      client
        .from('bora_engine_song_state')
        .select('song_id')
        .eq('lifecycle', 'ACTIVE')
        .limit(1000),
      client
        .from('bora_engine_platform_source_mappings')
        .select('song_id, platform, authorization_confirmed, hourly_evidence_confirmed')
        .limit(3000),
    ]);

    const failed = [songsResult, stateResult, mappingsResult].find(
      (result) => result.error,
    );
    if (failed?.error) {
      console.error(
        '[bora-engine-platform-source-config] configuration read failed:',
        failed.error.code ?? failed.error.message,
      );
      return unresolvedAssessments(assessedAt);
    }

    const songIds = (songsResult.data ?? []).map((song) => song.id);
    const activeIds = (stateResult.data ?? []).map((song) => song.song_id);
    const expectedSongIds = activeIds.length > 0 ? activeIds : songIds;
    if (expectedSongIds.length === 0) return fallback;

    const mappings = new Set(
      (mappingsResult.data ?? [])
        .filter(
          (mapping) =>
            mapping.authorization_confirmed === true &&
            mapping.hourly_evidence_confirmed === true,
        )
        .map((mapping) => `${mapping.platform}:${mapping.song_id}`),
    );

    const allPlatforms: readonly Platform[] = [
      'youtube',
      'spotify',
      'boomplay',
    ];
    return allPlatforms.map((platform) => {
      const configured = expectedSongIds.every((songId) =>
        mappings.has(`${platform}:${songId}`),
      );
      const existing = fallback.find(
        (assessment) => assessment.platform === platform,
      );
      if (!existing) {
        return {
          platform,
          measurementType: platform === 'youtube' ? 'video_views' : 'track_streams',
          unit: platform === 'youtube' ? 'views_per_hour' : 'streams_per_hour',
          sourceIdentity: configured ? 'manual-admin-v1' : null,
          assessedAt,
          status: configured ? 'available' : 'not-configured',
          reason: configured
            ? 'authorized-source-operational'
            : 'credentials-or-trusted-mapping-not-configured',
        };
      }
      return {
        ...existing,
        sourceIdentity: configured ? 'manual-admin-v1' : null,
        assessedAt,
        status: configured ? 'available' : 'not-configured',
        reason: configured
          ? 'authorized-source-operational'
          : 'credentials-or-trusted-mapping-not-configured',
      };
    });
  } catch (error) {
    console.error(
      '[bora-engine-platform-source-config] configuration read failed:',
      error instanceof Error ? error.message : 'unknown',
    );
    return unresolvedAssessments(assessedAt);
  }
}
