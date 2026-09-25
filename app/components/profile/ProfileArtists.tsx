'use client';

import React from 'react';

import { useProfileContent } from './profileData';

export default function ProfileArtists() {
  // SUPPORTED ARTISTS: zinasoma kutoka profileData (shared mock)
  const { artists } = useProfileContent();

  return (
    // COMPACT GRID INAFAA KWA LUGHA YA PROFILE YA TIKTOK
    <div className="grid grid-cols-3 gap-4">
      {artists.map((artist) => (
        <div
          key={artist.id}
          className="flex flex-col items-center text-center"
        >
          {/* PHOTO + FALLBACK */}
          <div
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10"
            style={{
              backgroundColor:
                'var(--bora-background-deep)',
            }}
          >
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-cinzel text-base font-black text-[var(--bora-gold)]">
                {artist.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* NAME */}
          <p className="mt-2 truncate text-xs font-semibold">
            {artist.name}
          </p>
        </div>
      ))}
    </div>
  );
}
