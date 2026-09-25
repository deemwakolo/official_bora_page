'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from './supabase/server';
import {
  getTrending,
  TRENDING_RANK_COUNT,
  type TrendingData,
  type TrendingEntry,
  type TrendingPlatform,
} from './trending';

// ============================================================
// TRENDING — SERVER ACTIONS
//
// Kiolezo sawa na 0003 Moment Charts: validation hapa, atomic
// write kwenye SECURITY DEFINER RPC, hakuna direct table writes.
// ============================================================

export async function getTrendingData(): Promise<TrendingData> {
  return getTrending();
}

export interface SaveTrendingResult {
  success: boolean;
  error?: string;
  platform?: TrendingPlatform;
}

function toInt(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * SAVE TRENDING PLATFORM
 *
 * Ingizo: platform + rows zake tu. RPC inashughulika na platform
 * hiyo pekee — hazungusiwi wala kusitwa zile nyingine.
 *
 * song_id halitumani kutoka kwa caller. RPC inaisoma na kuihifadhi
 * kutoka database, kama 0003.
 */
export async function saveTrendingPlatform(
  platform: TrendingPlatform,
  rows: TrendingEntry[],
): Promise<SaveTrendingResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error:
          'Unauthorized: you must be signed in as an administrator to save trending.',
      };
    }

    if (
      platform !== 'youtube' &&
      platform !== 'spotify' &&
      platform !== 'artist'
    ) {
      return {
        success: false,
        error: `Invalid platform "${platform}".`,
      };
    }

    const expected = TRENDING_RANK_COUNT[platform];

    if (!Array.isArray(rows) || rows.length !== expected) {
      return {
        success: false,
        error: `Expected exactly ${expected} rows for ${platform}, received ${
          rows?.length ?? 0
        }.`,
      };
    }

    const sorted = [...rows].sort((a, b) => a.rank - b.rank);

    for (let i = 0; i < expected; i++) {
      if (sorted[i]?.rank !== i + 1) {
        return {
          success: false,
          error: `${platform} ranks must be exactly 1 to ${expected} with no gaps or duplicates.`,
        };
      }
    }

    const payload = sorted.map((row) => {
      const title = row.title?.trim() ?? '';
      const artist = row.artist?.trim() ?? '';

      if (!title) {
        throw new Error(`Rank ${row.rank}: title is required.`);
      }
      if (!artist) {
        throw new Error(`Rank ${row.rank}: artist is required.`);
      }

      const movement = toInt(String(row.movement ?? 0));
      if (movement === null) {
        throw new Error(
          `Rank ${row.rank}: movement must be a whole number.`
        );
      }

      if (platform === 'artist') {
        const songsCount = toInt(String(row.songs_count ?? ''));
        if (songsCount === null || songsCount < 0) {
          throw new Error(
            `Rank ${row.rank}: songs count is required and must be 0 or more for artist rows.`
          );
        }
        return {
          rank: row.rank,
          title,
          artist,
          movement,
          songs_count: songsCount,
        };
      }

      return {
        rank: row.rank,
        title,
        artist,
        movement,
        songs_count: null,
      };
    });

    const { error: rpcError } = await supabase.rpc(
      'save_trending_platform',
      {
        p_platform: platform,
        p_entries: payload,
      }
    );

    if (rpcError) {
      console.error(
        'save_trending_platform RPC Error:',
        rpcError.message
      );
      return { success: false, error: rpcError.message };
    }

    revalidatePath('/');
    revalidatePath('/admin/control-room');

    return { success: true, platform };
  } catch (error: any) {
    console.error(
      'saveTrendingPlatform Exception:',
      error.message
    );
    return {
      success: false,
      error:
        error.message ||
        'An unexpected error occurred while saving trending.',
    };
  }
}
