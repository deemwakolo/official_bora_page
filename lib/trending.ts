import { createClient } from '@/lib/supabase/server';

import {
  TRENDING_PLATFORMS,
  emptyTrendingData,
  type TrendingData,
  type TrendingEntry,
} from './trending-shared';

// ============================================================
// TRENDING — SERVER DATA LAYER (SUPABASE)
//
// Source: public.trending_entries
//
// Trending ni system yake mwenyewe. HAITEGEMEA Songs registry
// kwa display — title/artist ni snapshots zenyewe.
//
// Types na constants zinaishi lib/trending-shared.ts ili
// client components wasiweze import bila kuvuta server module
// kwenye client bundle. Usirudushe types hapa.
// ============================================================

export {
  TRENDING_PLATFORMS,
  TRENDING_RANK_COUNT,
  emptyTrendingData,
} from './trending-shared';

export type {
  TrendingData,
  TrendingEntry,
  TrendingPlatform,
} from './trending-shared';

/**
 * SOMA TRENDING YOTE (CURRENT SET)
 *
 * Kila platform inapewa rows zake tu. Hakuna data ya mtu mwingine
 * hapa. Ukosefu wa database hausitishi UI — returns safi.
 */
export async function getTrending(): Promise<TrendingData> {
  const result = emptyTrendingData();

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('trending_entries')
      .select(
        'platform, rank, song_id, title, artist, movement, songs_count'
      )
      .in('platform', TRENDING_PLATFORMS);

    if (error) {
      console.error(
        'Trending Fetch Error:',
        error.message
      );
      return result;
    }

    const rows = (data ?? []) as TrendingEntry[];

    for (const platform of TRENDING_PLATFORMS) {
      result[platform] = rows
        .filter((row) => row.platform === platform)
        .sort((a, b) => a.rank - b.rank);
    }

    return result;
  } catch (error: any) {
    console.error(
      'Trending Fetch Exception:',
      error.message
    );
    return result;
  }
}

