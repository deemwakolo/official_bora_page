'use client';

import React, { useState } from 'react';

import Top15Pop from './Top15Pop';

const placeholderSongs = Array.from({ length: 15 }, (_, index) => ({
  position: index + 1,
  title: `SONG TITLE ${String(index + 1).padStart(2, '0')}`,
  artist: 'ARTIST NAME',
}));

export default function Top15Control() {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  return (
    <div className="w-full">
      <div>
        {placeholderSongs.map((song) => (
          <button
            key={song.position}
            type="button"
            onClick={() => setSelectedPosition(song.position)}
            className="grid w-full grid-cols-[36px_52px_minmax(0,1fr)_70px] items-center gap-3 border-b px-4 py-3 text-left transition-all duration-200 last:border-b-0 hover:bg-[color-mix(in_srgb,var(--bora-gold)_4%,transparent)] sm:grid-cols-[44px_64px_minmax(0,1fr)_90px] sm:gap-4"
            style={{
              borderColor: 'var(--bora-border)',
            }}
          >
            {/* POSITION */}

            <div
              className="font-cinzel text-sm font-black"
              style={{
                color:
                  song.position <= 3
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-subtle)',
              }}
            >
              {String(song.position).padStart(2, '0')}
            </div>

            {/* COVER PLACEHOLDER */}

            <div
              className="aspect-square border"
              style={{
                borderColor: 'var(--bora-border-strong)',
                backgroundColor: 'var(--bora-background-deep)',
              }}
            />

            {/* SONG INFO */}

            <div className="min-w-0">
              <p
                className="truncate text-[8px] font-black uppercase tracking-[0.1em] sm:text-[9px]"
                style={{
                  color: 'var(--bora-text)',
                }}
              >
                {song.title}
              </p>

              <p
                className="mt-1 truncate text-[7px] uppercase tracking-[0.08em] sm:text-[8px]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                {song.artist}
              </p>
            </div>

            {/* STATUS */}

            <div className="text-right">
              <span
                className="text-[6px] font-black uppercase tracking-[0.12em] sm:text-[7px]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                PLACEHOLDER
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* POPUP */}

      {selectedPosition !== null && (
        <Top15Pop
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </div>
  );
}