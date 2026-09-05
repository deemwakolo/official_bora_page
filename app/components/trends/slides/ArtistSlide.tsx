'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Minus, Mic2 } from 'lucide-react';

interface ArtistTrend {
  rank: number;
  artist: string;
  songs: number;
  movement: number;
}

export default function ArtistSlide() {
  // DATA YA MFANO YA WASANII WANAOTRENDA
  const artists: ArtistTrend[] = [
    { rank: 1, artist: 'BORA ARTIST', songs: 3, movement: 4 },
    { rank: 2, artist: 'ANOTHER ARTIST', songs: 2, movement: 2 },
    { rank: 3, artist: 'RISING ARTIST', songs: 2, movement: 5 },
    { rank: 4, artist: 'NEW WAVE', songs: 1, movement: 3 },
    { rank: 5, artist: 'CITY ARTIST', songs: 2, movement: -1 },
    { rank: 6, artist: 'MOTO ARTIST', songs: 1, movement: 2 },
    { rank: 7, artist: 'FRESH ARTIST', songs: 1, movement: 1 },
    { rank: 8, artist: 'URBAN ARTIST', songs: 2, movement: -2 },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-[#050505] px-4 py-10">
      {/* GLOW YA ARTIST PULSE */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[500px] -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.035] blur-[120px]" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        {/* HEADER */}
        <div className="mb-7 flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Mic2
                size={14}
                className="text-[#D4AF37]"
              />

              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                ARTISTS
              </span>
            </div>

            <h2 className="font-cinzel text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
              PULSE
            </h2>
          </div>

          <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">
            ARTIST SIGNAL
          </span>
        </div>

        {/* ARTIST LIST */}
        <div className="divide-y divide-white/[0.06]">
          {artists.map((artist) => (
            <div
              key={artist.rank}
              className="flex items-center gap-3 py-4"
            >
              {/* RANK */}
              <div className="w-7 shrink-0 text-right font-cinzel text-sm font-black text-white/30">
                {String(artist.rank).padStart(2, '0')}
              </div>

              {/* MOVEMENT */}
              <div className="flex w-7 shrink-0 justify-center">
                {artist.movement > 0 ? (
                  <ArrowUp
                    size={11}
                    className="text-[#D4AF37]"
                  />
                ) : artist.movement < 0 ? (
                  <ArrowDown
                    size={11}
                    className="text-red-500"
                  />
                ) : (
                  <Minus
                    size={10}
                    className="text-white/15"
                  />
                )}
              </div>

              {/* ARTIST */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">
                  {artist.artist}
                </p>

                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/30">
                  {artist.songs}{' '}
                  {artist.songs === 1 ? 'SONG' : 'SONGS'} IN BORA
                </p>
              </div>

              {/* MOVEMENT */}
              <div className="w-10 shrink-0 text-right font-mono text-[8px] text-white/25">
                {artist.movement > 0
                  ? `+${artist.movement}`
                  : artist.movement < 0
                    ? artist.movement
                    : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-5 border-t border-white/[0.06] pt-3">
          <p className="text-center font-mono text-[7px] uppercase tracking-[0.22em] text-white/20">
            ARTIST MOMENTUM • BORA TREND SIGNAL
          </p>
        </div>
      </div>
    </div>
  );
}