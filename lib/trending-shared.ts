// ============================================================
// TRENDING — SHARED, CLIENT-SAFE CONTRACT
//
// Hapa kuna TYPES, CONSTANTS na DEFAULT DATA pekee.
// Hakuna Supabase, hakuna next/headers, hakuna server code.
//
// Kwa nini? Client components ('use client') zinahitaji
// TrendingPlatform / TRENDING_RANK_COUNT / TrendingEntry.
// Ikiwa zinazimporta kutoka lib/trending.ts, webpack itabeba
// module nzima — ambayo ina server Supabase client — na
// next/headers inaisha kwenye client bundle = build error.
//
// Hii ni split ile ile inayotumika kwa Moment Charts:
//   lib/moment-charts.ts  -> data layer (server)
//   MomentChart.ts        -> client-safe types
// ============================================================

export type TrendingPlatform =
  | 'youtube'
  | 'spotify'
  | 'artist';

// Idhaa ya rows inazotarajiwa kwa kila platform.
// Hii ndiyo truth ya "expected structure" — inalingana na
// umiliki wa public Trending (10 / 10 / 8) na RPC validation.
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

// SHAPE ya row moja. Inalingana na schema ya
// 0004_create_trending.sql.
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
