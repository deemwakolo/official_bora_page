'use client';

import React, { useState } from 'react';

interface Playlist {
  id: number;
  name: string;
}

export default function PlaylistsControl() {
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: 1,
      name: 'PLAYLIST 01',
    },
    {
      id: 2,
      name: 'PLAYLIST 02',
    },
  ]);

  const addPlaylist = () => {
    setPlaylists((current) => [
      ...current,
      {
        id: Date.now(),
        name: `PLAYLIST ${String(
          current.length + 1
        ).padStart(2, '0')}`,
      },
    ]);
  };

  return (
    <div className="w-full">
      {/* PLAYLIST LIST */}

      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        {playlists.map((playlist, index) => (
          <button
            key={playlist.id}
            type="button"
            className="relative flex w-full items-center gap-4 border-b px-4 py-4 text-left transition-all duration-200 last:border-b-0 sm:px-5 sm:py-5"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor:
                'var(--bora-surface)',
            }}
          >
            {/* NUMBER */}

            <span
              className="w-6 shrink-0 font-cinzel text-sm font-black"
              style={{
                color:
                  index < 3
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-subtle)',
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            {/* PLAYLIST ICON */}

            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center border text-[13px]"
              style={{
                borderColor:
                  'var(--bora-border-strong)',
                color: 'var(--bora-gold)',
              }}
            >
              ☷
            </span>

            {/* PLAYLIST NAME */}

            <div className="min-w-0">
              <p
                className="truncate font-cinzel text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px]"
                style={{
                  color: 'var(--bora-text)',
                }}
              >
                {playlist.name}
              </p>

              <p
                className="mt-1 text-[7px] uppercase tracking-[0.1em]"
                style={{
                  color:
                    'var(--bora-text-subtle)',
                }}
              >
                Playlist
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ADD PLAYLIST */}

      <button
        type="button"
        onClick={addPlaylist}
        className="mt-3 flex w-full items-center justify-center gap-3 border px-4 py-4 transition-all duration-200"
        style={{
          borderColor: 'var(--bora-gold)',
          backgroundColor:
            'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))',
          color: 'var(--bora-gold)',
        }}
      >
        <span className="text-base leading-none">
          +
        </span>

        <span className="text-[8px] font-black uppercase tracking-[0.18em]">
          Add Playlist
        </span>
      </button>
    </div>
  );
}