'use client';

// TAP OPERATOR — metadata structure + wiring ya song iliyochaguliwa.
// Hapa ndipo metadata ya song itaunganishwa baadaye (Supabase/API).
// HAKUNA fetch/score/voting logic hapa.

export interface SongMetadata {
  title: string;
  artist: string;
  feature: string;
  producer: string;
  releaseDate: string;
  genre: string;
  artwork: string;
  youtube: string;
  spotify: string;
  boomplay: string;
}

// STRUCTURE INAYOTUMIWA NA TapGUI (rank + metadata pekee)
export interface TapTarget {
  rank: number;
  metadata: SongMetadata;
}

// WIRING: chukua song iliyochaguliwa, rudisha metadata yake.
// (Baadaye hii inaweza kuvuta data halisi kwa id/rank.)
export function resolveTapTarget(
  song: TapTarget | null | undefined
): TapTarget | null {
  if (!song) return null;

  return {
    rank: song.rank,
    metadata: song.metadata,
  };
}

// MAJUKUMU YA PLATFORM — placeholder links.
// Hazitakuwa tupu baada ya data wiring.
export const platformLinks = (
  metadata: SongMetadata
) => [
  { id: 'youtube', label: 'YouTube', url: metadata.youtube },
  { id: 'spotify', label: 'Spotify', url: metadata.spotify },
  { id: 'boomplay', label: 'Boomplay', url: metadata.boomplay },
];
