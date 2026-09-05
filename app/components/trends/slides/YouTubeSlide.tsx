'use client';

import React from 'react';
import { Youtube, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface YouTubeSong {
  rank: number;
  title: string;
  artist: string;
  movement: number;
}

export default function YouTubeSlide() {
  // DATA YA MFANO YA YOUTUBE TOP 10
  const songs: YouTubeSong[] = [
    { rank: 1, title: 'SIGNAL', artist: 'BORA ARTIST', movement: 2 },
    { rank: 2, title: 'NIGHT DRIVE', artist: 'BORA ARTIST', movement: -1 },
    { rank: 3, title: 'MOTO', artist: 'BORA ARTIST', movement: 0 },
    { rank: 4, title: 'MALAIKA', artist: 'BORA ARTIST', movement: 3 },
    { rank: 5, title: 'CITY LIGHTS', artist: 'BORA ARTIST', movement: -2 },
    { rank: 6, title: 'KESHO', artist: 'BORA ARTIST', movement: 1 },
    { rank: 7, title: 'NANI', artist: 'BORA ARTIST', movement: 0 },
    { rank: 8, title: 'MASHUP', artist: 'BORA ARTIST', movement: -1 },
    { rank: 9, title: 'KIVULI', artist: 'BORA ARTIST', movement: 2 },
    { rank: 10, title: 'MWANGA', artist: 'BORA ARTIST', movement: 0 },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-[#050505] px-4 py-10">
      {/* GLOW YA YOUTUBE */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[500px] -translate-x-1/2 rounded-full bg-red-600/[0.04] blur-[120px]" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">

        {/* HEADER */}
        <div className="mb-7 flex items-end justify-between border-b border-white/10 pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Youtube
                size={14}
                className="text-red-500"
              />

              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-red-500">
                YOUTUBE
              </span>
            </div>

            <h2 className="font-cinzel text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
              TOP 10
            </h2>
          </div>

          <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">
            PLATFORM SIGNAL
          </span>
        </div>

        {/* SONG LIST */}
        <div className="divide-y divide-white/[0.06]">
          {songs.map((song) => (
            <div
              key={song.rank}
              className="flex items-center gap-3 py-3.5"
            >
              {/* RANK */}
              <div className="w-7 shrink-0 text-right font-cinzel text-sm font-black text-white/35">
                {String(song.rank).padStart(2, '0')}
              </div>

              {/* MOVEMENT */}
              <div className="flex w-7 shrink-0 justify-center">
                {song.movement > 0 ? (
                  <ArrowUp
                    size={11}
                    className="text-[#D4AF37]"
                  />
                ) : song.movement < 0 ? (
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

              {/* SONG */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">
                  {song.title}
                </p>

                <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.15em] text-white/30">
                  {song.artist}
                </p>
              </div>

              {/* MOVEMENT NUMBER */}
              <div className="w-8 shrink-0 text-right font-mono text-[8px] text-white/25">
                {song.movement > 0
                  ? `+${song.movement}`
                  : song.movement < 0
                    ? song.movement
                    : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-5 border-t border-white/[0.06] pt-3">
          <p className="text-center font-mono text-[7px] uppercase tracking-[0.22em] text-white/20">
            YOUTUBE PERFORMANCE • BORA TREND SIGNAL
          </p>
        </div>

      </div>
    </div>
  );
}