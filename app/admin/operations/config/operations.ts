// BORA OPERATIONS CONFIG: SINGLE SOURCE OF TRUTH YA ROOM YA OPERATIONS.
//
// Operations ni room inayojitegemea: song identity, artists, platform
// identity na assets. Haina charts, voting, trending, profile, engine
// wala updates — hizo ni rooms/systems zingine.

/*
 * OPERATIONS SECTIONS: nne PEKEE.
 * UPDATES haipo hapa — Updates ni room yake (/admin/updates).
 */
export const OPERATIONS_SECTIONS = [
  {
    id: 'songs',
    label: 'Songs',
    description: 'Song Identity · Content',
  },
  {
    id: 'artists',
    label: 'Artists',
    description: 'Artist Workspace',
  },
  {
    id: 'platformIds',
    label: 'Platform IDs',
    description: 'Platform Identity Mapping',
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'Artwork · Media',
  },
] as const;

export type OperationsSection =
  (typeof OPERATIONS_SECTIONS)[number]['id'];

/*
 * OPERATIONS-OWNED SONG FIELDS PEKEE.
 *
 * Hizi ndizo fields ambazo Operations inamiliki. Chart/voting fields
 * (slot_number, momentum_score, raw_votes, yt_views, sp_plays n.k.)
 * HAZIONEKANI kwenye Operations UI na HAZITUMWA kwenye write yoyote.
 *
 * NDANI YA OPERATIONS HAKUNA `.update(song)` — payload inaundwa kwa
 * whitelist hii pekee.
 */
export interface OperationsSong {
  id: string;
  title: string;
  artist: string;
  feature: string;
  release_date: string;
  genre: string;
  producer: string;
  cover_url: string;
  youtube_id: string;
}

export const OPERATIONS_SONG_FIELDS = [
  'id',
  'title',
  'artist',
  'feature',
  'release_date',
  'genre',
  'producer',
  'cover_url',
  'youtube_id',
] as const satisfies readonly (keyof OperationsSong)[];

// SELECT LIST: whitelist hii pekee inatoka Supabase.
export const OPERATIONS_SONG_COLUMNS =
  OPERATIONS_SONG_FIELDS.join(', ');

function readText(value: unknown): string {
  if (value === null || value === undefined) return '';

  return String(value);
}

// DATE NORMALISE: release_date inarudishwa kama yyyy-mm-dd
// (date input inasoma muundo huo pekee).
function readDate(value: unknown): string {
  return readText(value).slice(0, 10);
}

/*
 * BOUNDARY MAPPER: kila row ya Supabase inapunguzwa hadi
 * Operations-owned fields. Hakuna chart field inayovuka hapa.
 */
export function toOperationsSong(
  row: Record<string, unknown>
): OperationsSong {
  return {
    id: readText(row.id),
    title: readText(row.title),
    artist: readText(row.artist),
    feature: readText(row.feature),
    release_date: readDate(row.release_date),
    genre: readText(row.genre),
    producer: readText(row.producer),
    cover_url: readText(row.cover_url),
    youtube_id: readText(row.youtube_id),
  };
}
