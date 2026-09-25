'use client';

import { useSyncExternalStore } from 'react';

// ============================================================
// PROFILE — SHARED MOCK CONTENT (CLIENT-SAFE)
//
// Hii ni MOCK DATA tu. Hakuna Supabase, hakuna auth, hakuna DB.
//
// Control Room Profile inaandika hapa; public Profile inaisoma
// hapa. Hakuna nakala tofauti ili isitofautiane.
//
// Kwa nini module + useSyncExternalStore, si Context?
// Public Profile (/ na PublicShell) na Control Room Profile
// (/admin/control-room) haishirikiwi mzizi mmoja unao
// mountiwa. Context isingefanya kazi. Module store inafanya.
//
// Refresh inafuta mabadiliko — hiyo ni makubaliano.
// ============================================================

export interface ProfileIdentity {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
}

export interface ProfileFavoriteArtist {
  name: string;
  imageUrl: string;
}

export interface ProfileSong {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
}

export interface ProfileArtist {
  id: string;
  name: string;
  imageUrl: string;
}

export interface ProfileMockContent {
  profile: ProfileIdentity;
  favoriteArtists: ProfileFavoriteArtist[];
  songs: ProfileSong[];
  artists: ProfileArtist[];
}

export const DEFAULT_PROFILE_CONTENT: ProfileMockContent = {
  profile: {
    displayName: 'Dee',
    username: 'deemwakolo',
    bio: 'Tanzanian music lover 🇹🇿',
    avatarUrl: '',
  },

  // WATISTI ANAOWAPENDA: zinakwenda kwenye ProfileHeader
  favoriteArtists: [
    {
      name: 'Marioo',
      imageUrl:
        'https://images.unsplash.com/photo-1520785643438-5bf77931f493?auto=format&fit=crop&w=200&q=80',
    },
    {
      name: 'Diamond',
      imageUrl:
        'https://images.unsplash.com/photo-1470229722913-7ea0d7d2f0d5?auto=format&fit=crop&w=200&q=80',
    },
    {
      name: 'Rayvanny',
      imageUrl:
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=200&q=80',
    },
  ],

  // SONGS: zinakwenda kwenye tab ya ProfileSongs
  songs: [
    {
      id: 'song-1',
      title: 'Song A',
      artist: 'Artist A',
      coverUrl: '',
    },
    {
      id: 'song-2',
      title: 'Song B',
      artist: 'Artist B',
      coverUrl: '',
    },
    {
      id: 'song-3',
      title: 'Song C',
      artist: 'Artist C',
      coverUrl: '',
    },
  ],

  // SUPPORTED ARTISTS: zinakwenda kwenye tab ya ProfileArtists
  artists: [
    {
      id: 'artist-1',
      name: 'Artist A',
      imageUrl: '',
    },
    {
      id: 'artist-2',
      name: 'Artist B',
      imageUrl: '',
    },
    {
      id: 'artist-3',
      name: 'Artist C',
      imageUrl: '',
    },
  ],
};

let current: ProfileMockContent = DEFAULT_PROFILE_CONTENT;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

/** Soma mock content yote (identiki + collections). */
export function useProfileContent(): ProfileMockContent {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

/** Badilisha sehemu moja ya identity. */
export function setProfileIdentity(
  patch: Partial<ProfileIdentity>
) {
  current = {
    ...current,
    profile: { ...current.profile, ...patch },
  };
  emit();
}

/** Badilisha index moja ya favorite artists (header). */
export function setFavoriteArtist(
  index: number,
  patch: Partial<ProfileFavoriteArtist>
) {
  current = {
    ...current,
    favoriteArtists: current.favoriteArtists.map(
      (artist, i) =>
        i === index ? { ...artist, ...patch } : artist
    ),
  };
  emit();
}

/** Badilisha index moja ya songs. */
export function setProfileSong(
  index: number,
  patch: Partial<ProfileSong>
) {
  current = {
    ...current,
    songs: current.songs.map((song, i) =>
      i === index ? { ...song, ...patch } : song
    ),
  };
  emit();
}

/** Badilisha index moja ya supported artists. */
export function setProfileArtist(
  index: number,
  patch: Partial<ProfileArtist>
) {
  current = {
    ...current,
    artists: current.artists.map((artist, i) =>
      i === index ? { ...artist, ...patch } : artist
    ),
  };
  emit();
}

/** Rudisha content yote kwa default (mabadiliko yameondolewa). */
export function resetProfileContent() {
  current = DEFAULT_PROFILE_CONTENT;
  emit();
}
