import { createClient } from '@/lib/supabase/server';

// ============================================================
// TRENDING — DATA LAYER (SUPABASE)
//
// Source: public.trending_entries
//
// Trending ni system yake mwenyewe. HAITEGEMEA Songs registry
// kwa display — title/artist ni snapshots zenyewe.
// ============================================================

export type TrendingPlatform =
  | 'youtube'
  | 'spotify'
  | 'artist';

// Idhaa ya rows inazotarajiwa kwa kila platform.
// Hii ndiyo truth ya "expected structure" — inalingana na
// umiliki wa public Trending (10 / 10 / 8).
export const TRENDING_RANK_COUNT: Record<
  TrendingPlatform,
  number
> = {
  youtube: 10,
  spotify: 10,
  artist: 8,
};

export const TRENDING_PLATFORMS: TrendingPlatform[] = [
  'youtube',
  'spotify',
  'artist',
];

// DB ROW (0004_create_trending.sql)
export interface TrendingEntry {
  platform: TrendingPlatform;
  rank: number;
  song_id: string | null;
  title: string;
  artist: string;
  movement: number;
  songs_count: number | null;
}

export interface TrendingData {
  youtube: TrendingEntry[];
  spotify: TrendingEntry[];
  artist: TrendingEntry[];
}

export function emptyTrendingData(): TrendingData {
  return { youtube: [], spotify: [], artist: [] };
}

const platformKeys: TrendingPlatform[] = [
  'youtube',
  'spotify',
  'artist',
];

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
      .in('platform', platformKeys);

    if (error) {
      console.error(
        'Trending Fetch Error:',
        error.message
      );
      return result;
    }

    const rows = (data ?? []) as TrendingEntry[];

    for (const platform of platformKeys) {
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
