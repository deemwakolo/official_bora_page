'use client';

import React from 'react';
import { ArrowUp, Crown, Zap } from 'lucide-react';

export default function ThroneSlide() {
  // DATA YA MFANO YA WIMBO UNAOKAA KWENYE THRONE
  const song = {
    rank: 1,
    previousRank: 4,
    title: 'SIGNAL',
    artist: 'BORA ARTIST',
    momentum: 94,
    movement: 3,
  };

  return (
    <div className="relative flex min-h-[420px] w-full items-center justify-center overflow-hidden bg-[#050505] px-4 py-10">
      {/* GLOW YA NYUMA */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/[0.07] blur-[110px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">

        {/* LABEL */}
        <div className="mb-6 flex items-center gap-2">
          <Crown
            size={14}
            strokeWidth={2}
            className="text-[#D4AF37]"
          />

          <span className="text-[8px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">
            THRONE
          </span>
        </div>

        {/* RANK */}
        <div className="mb-2 font-mono text-[11px] font-bold tracking-[0.25em] text-white/30">
          CURRENT POSITION
        </div>

        <div className="font-cinzel text-[110px] font-black leading-none tracking-[-0.08em] text-[#D4AF37]">
          #{song.rank}
        </div>

        {/* MOVEMENT */}
        <div className="mt-4 flex items-center gap-2 text-[#D4AF37]">
          <ArrowUp
            size={15}
            strokeWidth={2.5}
          />

          <span className="text-[10px] font-black uppercase tracking-[0.18em]">
            +{song.movement} POSITIONS
          </span>
        </div>

        {/* SONG */}
        <div className="mt-8">
          <h2 className="font-cinzel text-[30px] font-black uppercase leading-none tracking-[-0.02em] text-white md:text-[42px]">
            {song.title}
          </h2>

          <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.28em] text-white/45">
            {song.artist}
          </p>
        </div>

        {/* MOMENTUM */}
        <div className="mt-8 flex items-center gap-2 border border-white/10 bg-white/[0.025] px-4 py-2">
          <Zap
            size={11}
            className="text-[#D4AF37]"
          />

          <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">
            MOMENTUM
          </span>

          <span className="font-mono text-[10px] font-bold text-[#D4AF37]">
            {song.momentum}
          </span>
        </div>

      </div>
    </div>
  );
}