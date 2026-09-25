'use client';

import React from 'react';

import { useProfileContent } from './profileData';

export default function ProfileSongs() {
  // SONGS: zinasoma kutoka profileData (shared mock)
  const { songs } = useProfileContent();

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
