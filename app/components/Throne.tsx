'use client';

import React from 'react';

interface ThroneProps {
  song: string;
  artist: string;

  // FIX: votes must be numeric for ranking logic
  votes: number;

  weeksInChart: number;
  weeksAtNo1: number;

  ytRank: string;
  spRank: string;
  bpRank: string;

  cover?: string;
}

/**
 * THE ROYAL THRONE - ELEVATED IMPACT EDITION
 */
export default function Throne({
  song = "Enjoy",
  artist = "Diamond Platnumz ft Mafikizolo and DJ White",
  votes = 0,
  weeksInChart = 0,
  weeksAtNo1 = 0,
  ytRank = "-",
  spRank = "-",
  bpRank = "-",
  cover = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"
}: ThroneProps) {

  return (
    <section className="relative w-full bg-[#080000] pt-8 pb-10 text-center overflow-hidden min-h-[550px] md:min-h-[620px] flex flex-col justify-start font-cinzel">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={cover}
          alt=""
          className="w-full h-full object-cover grayscale opacity-15 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0000] via-transparent to-[#080000]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_80%)] opacity-10 blur-[100px]" />
      </div>

      {/* CROWN */}
      <div className="absolute top-0 right-[4%] rotate-[12deg] opacity-[0.07] pointer-events-none z-0">
        <div className="text-[130px] md:text-[220px] text-[#e5e7eb]">
          ♛
        </div>
      </div>

      {/* MAIN */}
      <div className="relative z-20 px-4 max-w-7xl mx-auto w-full mt-4 md:mt-8">

        <span className="text-[8px] md:text-[10px] font-mono tracking-[0.8em] text-[#D4AF37] uppercase block mb-2 animate-pulse">
          Bora namba moja
        </span>

        <h1 className="flex flex-col items-center leading-[0.75] tracking-tighter">
          <span className="text-6xl md:text-[11rem] font-black text-white uppercase">
            {song}
          </span>
        </h1>
      </div>

      {/* METRICS */}
      <div className="relative z-20 flex flex-wrap justify-center items-center gap-6 md:gap-12 mt-8 md:mt-10 px-4">

        <div className="text-center">
          <p className="text-[9px] text-white/50 uppercase">Tenure</p>
          <p className="text-2xl font-bold">
            {weeksInChart}W
          </p>
        </div>

        <div className="text-center">
          <p className="text-[9px] text-white/50 uppercase">Pulse</p>
          <p className="text-2xl font-black text-white">
            {votes}
          </p>
        </div>

        <div className="text-center">
          <p className="text-[9px] text-[#D4AF37] uppercase">Apex</p>
          <p className="text-2xl font-bold text-[#D4AF37]">
            {weeksAtNo1}#1
          </p>
        </div>

      </div>

      {/* PLATFORM */}
      <div className="relative z-20 flex flex-wrap justify-center gap-2 mt-8 px-4">

        <div className="px-3 py-2 text-[10px] border text-white">
          YT {ytRank}
        </div>

        <div className="px-3 py-2 text-[10px] border text-white">
          SP {spRank}
        </div>

        <div className="px-3 py-2 text-[10px] border text-[#D4AF37]">
          BP {bpRank}
        </div>

      </div>

    </section>
  );
}