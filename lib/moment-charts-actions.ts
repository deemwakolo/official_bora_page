'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from './supabase/server';
import {
  getLatestMomentChart,
  parseReleaseDateToISO,
  type MomentChartPeriod,
  type MomentChartEditionRow,
} from './moment-charts';

import type {
  MomentChartData,
  MomentSong,
} from '@/app/components/charts/MomentChart';

// ============================================================
// MOMENT CHARTS — SERVER ACTION
//
// Called by MomentGUI (client component) to load charts from
// Supabase on the SERVER side (getLatestMomentChart).
// No API route, no credentials reach the browser.
// ============================================================

export interface LatestMomentCharts {
  weekly: MomentChartData | null;
  monthly: MomentChartData | null;
}

export async function getLatestMomentCharts(): Promise<LatestMomentCharts> {
  const [weekly, monthly] = await Promise.all([
    getLatestMomentChart('weekly'),
    getLatestMomentChart('monthly'),
  ]);

  return { weekly, monthly };
}

export interface SaveMomentChartResult {
  success: boolean;
  error?: string;
  edition_id?: string;
}

function isValidOptionalUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function saveMomentChartEdition(
  period: MomentChartPeriod,
  songs: MomentSong[],
): Promise<SaveMomentChartResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Unauthorized: you must be signed in as an administrator to save charts.',
      };
    }

    const { data: editionData, error: editionError } = await supabase
      .from('moment_chart_editions')
      .select('id, period, chart_date, display_label, moment_chart_entries(id, song_id, rank)')
      .eq('period', period)
      .order('chart_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (editionError || !editionData) {
      return {
        success: false,
        error: `Could not find an existing ${period} edition to update.`,
      };
    }

    const edition = editionData as MomentChartEditionRow;
    const existingEntries = (edition.moment_chart_entries ?? []) as Array<{
      id: string;
      song_id: string | null;
      rank: number;
    }>;

    // EDITOR YA EDITION ILIYO KAO. HATUANDIKI EDITION MPYA.
    // Ikiwa database state ni malformed, tunasimama — hatutengenezi.
    if (existingEntries.length !== 10) {
      return {
        success: false,
        error: `Existing database edition does not contain exactly 10 entries (found ${existingEntries.length}). Nothing was changed.`,
      };
    }

    const existingRanks = existingEntries
      .map((entry) => entry.rank)
      .sort((a, b) => a - b);

    const ranksAreValid = existingRanks.every(
      (rank, index) => rank === index + 1
    );

    if (!ranksAreValid) {
      return {
        success: false,
        error: `Existing database edition has malformed ranks (expected 1-10, found ${existingRanks.join(', ')}). Nothing was changed.`,
      };
    }

    if (!Array.isArray(songs) || songs.length !== 10) {
      return {
        success: false,
        error: `Invalid chart payload: expected 10 songs, received ${songs?.length ?? 0}.`,
      };
    }

    const sortedSongs = [...songs].sort((a, b) => a.rank - b.rank);
    const ranks = sortedSongs.map((s) => s.rank);
    for (let i = 0; i < 10; i++) {
      if (ranks[i] !== i + 1) {
        return {
          success: false,
          error: `Invalid chart payload: ranks must be exactly 1 to 10 with no gaps or duplicates.`,
        };
      }
    }

    const payloadEntries = [];

    for (const song of sortedSongs) {
      const { rank, movement, metadata } = song;
      const title = metadata?.title?.trim();
      const artist = metadata?.artist?.trim();

      if (!title) {
        return { success: false, error: `Rank ${rank}: Title is required.` };
      }
      if (!artist) {
        return { success: false, error: `Rank ${rank}: Artist is required.` };
      }

      const kind = movement?.kind;
      if (kind !== 'up' && kind !== 'down' && kind !== 'same' && kind !== 'new') {
        return { success: false, error: `Rank ${rank}: Invalid movement kind "${kind}".` };
      }

      let delta: number | null = null;
      if (kind === 'up' || kind === 'down') {
        const rawDelta = movement.delta;
        if (rawDelta === null || rawDelta === undefined || Number.isNaN(rawDelta) || rawDelta < 1) {
          return {
            success: false,
            error: `Rank ${rank}: Movement delta must be a positive integer >= 1 for "${kind}".`,
          };
        }
        delta = Math.floor(Number(rawDelta));
      } else {
        delta = null;
      }

      let releaseDateIso: string | null = null;
      try {
        releaseDateIso = parseReleaseDateToISO(metadata.releaseDate);
      } catch (err: any) {
        return { success: false, error: `Rank ${rank}: ${err.message}` };
      }

      if (!isValidOptionalUrl(metadata.artwork)) {
        return { success: false, error: `Rank ${rank}: Artwork must be a valid URL or empty.` };
      }
      if (!isValidOptionalUrl(metadata.youtube)) {
        return { success: false, error: `Rank ${rank}: YouTube URL must be a valid URL or empty.` };
      }
      if (!isValidOptionalUrl(metadata.spotify)) {
        return { success: false, error: `Rank ${rank}: Spotify URL must be a valid URL or empty.` };
      }
      if (!isValidOptionalUrl(metadata.boomplay)) {
        return { success: false, error: `Rank ${rank}: Boomplay URL must be a valid URL or empty.` };
      }

      // NOTE: song_id is NOT sent to the RPC.
      // Identity is authoritative in the database; the RPC reads the
      // existing song_id for each (edition_id, rank) and preserves it.
      payloadEntries.push({
        rank,
        movement_kind: kind,
        movement_delta: delta,
        title_snapshot: title,
        artist_snapshot: artist,
        feature_snapshot: metadata.feature === '-' ? null : (metadata.feature?.trim() || null),
        producer_snapshot: metadata.producer === '-' ? null : (metadata.producer?.trim() || null),
        release_date_snapshot: releaseDateIso,
        genre_snapshot: metadata.genre?.trim() || null,
        artwork_snapshot: metadata.artwork?.trim() || null,
        youtube_url_snapshot: metadata.youtube?.trim() || null,
        spotify_url_snapshot: metadata.spotify?.trim() || null,
        boomplay_url_snapshot: metadata.boomplay?.trim() || null,
      });
    }

    const { error: rpcError } = await supabase.rpc(
      'save_moment_chart_edition',
      {
        p_edition_id: edition.id,
        p_entries: payloadEntries,
      }
    );

    if (rpcError) {
      console.error('save_moment_chart_edition RPC Error:', rpcError.message);
      return { success: false, error: rpcError.message };
    }

    revalidatePath('/');
    revalidatePath('/admin/control-room');

    return { success: true, edition_id: edition.id };
  } catch (err: any) {
    console.error('saveMomentChartEdition Exception:', err.message);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while saving the chart edition.',
    };
  }
}