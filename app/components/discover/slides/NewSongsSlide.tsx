'use client';

import React from 'react';
import { Music2, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function NewSongsSlide() {
  // ORODHA YA NYIMBO MPYA
  const songs = [
    {
      title: 'Naringa',
      artist: 'Zuchu',
      status: 'NEW ENTRY',
      movement: 4,
    },
    {
      title: 'Tomorrow',
      artist: 'Marioo',
      status: 'TRENDING',
      movement: 2,
    },
    {
      title: 'Single Again',
      artist: 'Harmonize',
      status: 'NEW ENTRY',
      movement: 3,
    },
    {
      title: 'Diamond',
      artist: 'Jay Melody',
      status: 'NEW ENTRY',
      movement: 1,
    },
    {
      title: 'Pitipiti',
      artist: 'Dulla Makabila',
      status: 'HOT',
      movement: 5,
    },
    {
      title: 'Falling',
      artist: 'Nandy',
      status: 'NEW ENTRY',
      movement: 0,
    },
    {
      title: 'Habibi',
      artist: 'Rayvanny',
      status: 'NEW ENTRY',
      movement: 2,
    },
    {
      title: 'Smile',
      artist: 'Phina',
      status: 'BREAKOUT',
      movement: 6,
    },
  ];

  // ICON YA MWELEKEO WA NYIMBO
  const MovementIcon = ({
    movement,
  }: {
    movement: number;
  }) => {
    if (movement > 0) {
      return <ArrowUp size={11} />;
    }

    if (movement < 0) {
      return <ArrowDown size={11} />;
    }

    return <Minus size={11} />;
  };

  return (
    <section className="w-full py-10 md:py-14 bg-[#050505] overflow-hidden relative">
      {/* BACKGROUND YA DISCOVER */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] bg-[#D4AF37]/10 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-[#b91c1c] animate-pulse" />

          <span className="text-[9px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase">
            Fresh Feed
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white font-cinzel uppercase leading-none">
              NEW <span className="text-white/20">SONGS</span>
            </h2>

            <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.25em] mt-3">
              Fresh music entering the BORA ecosystem
            </p>
          </div>

          <Music2
            size={24}
            className="text-[#D4AF37]/40 hidden md:block"
          />
        </div>
      </div>

      {/* SONG LIST */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="border-t border-white/[0.08]">
          {songs.map((song, index) => (
            <div
              key={`${song.artist}-${song.title}`}
              className="group flex items-center gap-4 md:gap-6 py-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition"
            >
              {/* NUMBER */}
              <div className="w-7 text-[10px] font-mono text-white/20">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* MUSIC ICON */}
              <div className="w-11 h-11 md:w-14 md:h-14 shrink-0 rounded-sm border border-white/10 bg-white/[0.03] flex items-center justify-center">
                <Music2
                  size={18}
                  className="text-white/25 group-hover:text-[#D4AF37] transition"
                />
              </div>

              {/* SONG INFO */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base font-bold text-white uppercase font-cinzel truncate group-hover:text-[#D4AF37] transition">
                  {song.title}
                </h3>

                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[8px] font-mono tracking-[0.15em] text-white/30 uppercase truncate">
                    {song.artist}
                  </span>

                  <span className="text-[7px] font-black tracking-widest text-[#b91c1c] shrink-0">
                    {song.status}
                  </span>
                </div>
              </div>

              {/* MOVEMENT */}
              <div className="flex items-center gap-1 text-[#D4AF37] min-w-[32px] justify-end">
                <MovementIcon movement={song.movement} />

                <span className="text-[9px] font-mono">
                  {Math.abs(song.movement)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}