'use client';

import React from 'react';

interface SupportedSong {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
}

// MOCK SONGS: COLLECTION YA WIMBO ULIOFANYA VOTE
const songs: SupportedSong[] = [
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
];

export default function ProfileSongs() {
  return (
    <div
      className="divide-y"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      {songs.map((song) => (
        <div
          key={song.id}
          className="flex items-center gap-3 py-3"
        >
          {/* COVER + FALLBACK */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{
              backgroundColor:
                'var(--bora-background-deep)',
            }}
          >
            {song.coverUrl ? (
              <img
                src={song.coverUrl}
                alt={song.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-cinzel text-sm font-black text-[var(--bora-gold)]">
                {song.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* TITLE + ARTIST */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {song.title}
            </p>

            <p
              className="truncate text-xs"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {song.artist}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
