'use client';

import React, { useState } from 'react';

const placeholderSongs = Array.from(
  { length: 10 },
  (_, index) => ({
    position: index + 1,
    title: `NEW SONG TITLE ${String(index + 1).padStart(2, '0')}`,
    artist: 'ARTIST NAME',
  })
);

export default function NewSongsControl() {
  const [selectedPosition, setSelectedPosition] =
    useState<number | null>(null);

  return (
    <div className="w-full">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        {placeholderSongs.map((song) => {
          const isSelected =
            selectedPosition === song.position;

          return (
            <button
              key={song.position}
              type="button"
              onClick={() =>
                setSelectedPosition(song.position)
              }
              className="relative grid w-full grid-cols-[36px_52px_minmax(0,1fr)] items-center gap-3 border-b px-4 py-3 text-left transition-all duration-200 last:border-b-0 sm:grid-cols-[44px_64px_minmax(0,1fr)] sm:gap-4 sm:px-5 sm:py-4"
              style={{
                borderColor:
                  'var(--bora-border)',
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                  : 'var(--bora-surface)',
              }}
            >
              {/* NUMBER */}

              <div
                className="font-cinzel text-sm font-black"
                style={{
                  color:
                    song.position <= 3
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text-subtle)',
                }}
              >
                {String(song.position).padStart(
                  2,
                  '0'
                )}
              </div>

              {/* COVER PLACEHOLDER */}

              <div
                className="aspect-square border"
                style={{
                  borderColor:
                    'var(--bora-border-strong)',
                  backgroundColor:
                    'var(--bora-background-deep)',
                }}
              />

              {/* SONG INFO */}

              <div className="min-w-0">
                <p
                  className="truncate text-[8px] font-black uppercase tracking-[0.1em] sm:text-[9px]"
                  style={{
                    color:
                      'var(--bora-text)',
                  }}
                >
                  {song.title}
                </p>

                <p
                  className="mt-1 truncate text-[7px] uppercase tracking-[0.08em] sm:text-[8px]"
                  style={{
                    color:
                      'var(--bora-text-subtle)',
                  }}
                >
                  {song.artist}
                </p>
              </div>

              {/* ACTIVE LINE */}

              {isSelected && (
                <span
                  className="absolute bottom-0 left-0 h-[2px] w-full"
                  style={{
                    backgroundColor:
                      'var(--bora-gold)',
                    boxShadow:
                      '0 0 10px var(--bora-gold-glow)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}