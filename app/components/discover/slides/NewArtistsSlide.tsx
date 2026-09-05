'use client';

import React from 'react';
import { Mic2, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function NewArtistsSlide() {
  // ORODHA YA WASANII WAPYA
  const artists = [
    {
      name: 'Kusah',
      genre: 'BONGO FLAVA',
      status: 'BREAKOUT',
      movement: 4,
      songs: 3,
    },
    {
      name: 'Mbosso',
      genre: 'BONGO FLAVA',
      status: 'RISING',
      movement: 2,
      songs: 5,
    },
    {
      name: 'Ibraah',
      genre: 'AFRO POP',
      status: 'RISING',
      movement: 6,
      songs: 2,
    },
    {
      name: 'Mocco Genius',
      genre: 'BONGO FLAVA',
      status: 'NEW',
      movement: 1,
      songs: 2,
    },
    {
      name: 'Nadia Mukami',
      genre: 'AFRO POP',
      status: 'BREAKOUT',
      movement: 3,
      songs: 4,
    },
  ];

  // ICON YA MOVEMENT
  const MovementIcon = ({
    movement,
  }: {
    movement: number;
  }) => {
    if (movement > 0) {
      return <ArrowUp size={12} />;
    }

    if (movement < 0) {
      return <ArrowDown size={12} />;
    }

    return <Minus size={12} />;
  };

  return (
    <section className="w-full py-10 md:py-14 bg-[#050505] overflow-hidden relative">
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] bg-[#D4AF37]/10 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-[#b91c1c] animate-pulse" />

          <span className="text-[9px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase">
            Artist Discovery
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white font-cinzel uppercase leading-none">
              NEW <span className="text-white/20">ARTISTS</span>
            </h2>

            <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.25em] mt-3">
              Artists gaining attention across BORA
            </p>
          </div>

          <Mic2
            size={24}
            className="text-[#D4AF37]/40 hidden md:block"
          />
        </div>
      </div>

      {/* ARTIST LIST */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="border-t border-white/[0.08]">
          {artists.map((artist, index) => (
            <div
              key={artist.name}
              className="group flex items-center gap-4 md:gap-6 py-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition"
            >
              {/* RANK */}
              <div className="w-7 text-[10px] font-mono text-white/20">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* ARTIST AVATAR */}
              <div className="w-11 h-11 md:w-14 md:h-14 shrink-0 rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-black flex items-center justify-center overflow-hidden">
                <Mic2
                  size={18}
                  className="text-white/30 group-hover:text-[#D4AF37] transition"
                />
              </div>

              {/* ARTIST INFO */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base font-bold text-white uppercase font-cinzel truncate group-hover:text-[#D4AF37] transition">
                  {artist.name}
                </h3>

                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[8px] font-mono tracking-[0.15em] text-white/30">
                    {artist.genre}
                  </span>

                  <span className="text-[7px] font-black tracking-widest text-[#b91c1c]">
                    {artist.status}
                  </span>
                </div>
              </div>

              {/* SONG COUNT */}
              <div className="hidden sm:block text-right">
                <p className="text-[8px] font-mono text-white/20 uppercase tracking-widest">
                  BORA SONGS
                </p>

                <p className="text-sm font-black text-white mt-1">
                  {artist.songs}
                </p>
              </div>

              {/* MOVEMENT */}
              <div className="flex items-center gap-1 text-[#D4AF37] min-w-[32px] justify-end">
                <MovementIcon movement={artist.movement} />

                <span className="text-[9px] font-mono">
                  {Math.abs(artist.movement)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}