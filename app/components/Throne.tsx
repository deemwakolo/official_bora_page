'use client';

import React from 'react';

interface ThroneProps {
  song: string;
  artist: string;
  votes: string;
  weeksInChart: number;
  weeksAtNo1: number;
  ytRank: string;
  spRank: string;
  bpRank: string;
  cover?: string;
}

/**
 * THE DIAMOND THRONE - CINZEL EDITION
 * Updated with Cinzel typography and a refined title style.
 */
export default function Throne({
  song = "Enjoy",
  artist = "Diamond",
  votes,
  weeksInChart,
  weeksAtNo1,
  ytRank,
  spRank,
  bpRank,
  cover = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"
}: ThroneProps) {

  return (
    <section className="relative w-full bg-[#050505] pt-32 pb-24 text-center overflow-hidden min-h-[700px] flex flex-col justify-center font-cinzel">

      {/* 🔥 BACKGROUND FUSION */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src={cover} 
          alt="" 
          className="w-full h-full object-cover grayscale opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_75%)] opacity-20 blur-[100px]" />
      </div>

      {/* 👑 MASSIVE CROWN DECORATION */}
      <div className="absolute -top-16 right-[10%] rotate-[15deg] opacity-[0.08] pointer-events-none z-0">
        <div className="text-[200px] md:text-[300px] text-[#D4AF37]">
          ♛
        </div>
      </div>

      {/* ⚡ MAIN TEXT CONTENT */}
      <div className="relative z-20 px-6 max-w-7xl mx-auto w-full">
        
        {/* REFINED TITLE STYLING */}
        <div className="mb-4">
          <span className="text-[10px] md:text-sm font-mono tracking-[1em] text-[#D4AF37] uppercase block mb-4 animate-pulse">
            Sovereign Asset
          </span>
          <h1 className="text-7xl md:text-[11rem] font-black uppercase leading-[0.8] tracking-tighter">
            <span className="block text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              {song}
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#f3e3ad] to-[#8a6d1a] mt-2 italic drop-shadow-[0_0_25px_rgba(212,175,55,0.3)]">
              Architect
            </span>
          </h1>
        </div>

        {/* ARTIST NAME */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="h-[2px] w-8 md:w-16 bg-[#D4AF37]" />
          <p className="text-white text-3xl md:text-6xl font-bold uppercase tracking-[0.4em] drop-shadow-md">
            {artist}
          </p>
          <div className="h-[2px] w-8 md:w-16 bg-[#D4AF37]" />
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="relative z-20 flex justify-center items-center gap-8 md:gap-16 mt-24">
        <div className="text-center">
          <p className="font-mono text-[9px] text-white/40 uppercase tracking-[0.4em] mb-3">
            Tenure
          </p>
          <p className="text-white text-3xl md:text-4xl font-bold italic">
            {weeksInChart}<span className="text-xs opacity-40 ml-2 not-italic">WKS</span>
          </p>
        </div>

        <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

        <div className="text-center">
          <p className="font-mono text-[9px] text-white/40 uppercase tracking-[0.4em] mb-3">
            Pulse
          </p>
          <p className="text-white text-3xl md:text-4xl font-bold italic">
            {votes}
          </p>
        </div>

        <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

        <div className="text-center">
          <p className="font-mono text-[9px] text-[#D4AF37] uppercase tracking-[0.4em] mb-3">
            Apex
          </p>
          <p className="text-[#D4AF37] text-3xl md:text-4xl font-bold italic">
            {weeksAtNo1}<span className="text-xs opacity-60 ml-2 not-italic">#1</span>
          </p>
        </div>
      </div>

      {/* PLATFORM STRIP */}
      <div className="relative z-20 flex justify-center gap-4 mt-20">
        <div className="px-8 py-3 border border-white/5 bg-black/60 text-[10px] font-mono text-white/60 tracking-widest uppercase backdrop-blur-md">
          YT <span className="text-white font-bold ml-2">{ytRank}</span>
        </div>
        <div className="px-8 py-3 border border-white/5 bg-black/60 text-[10px] font-mono text-white/60 tracking-widest uppercase backdrop-blur-md">
          SP <span className="text-white font-bold ml-2">{spRank}</span>
        </div>
        <div className="px-8 py-3 border border-[#D4AF37]/40 bg-[#D4AF37]/5 text-[10px] font-mono text-[#D4AF37] tracking-widest uppercase font-bold backdrop-blur-md">
          BP <span className="text-white ml-2">{bpRank}</span>
        </div>
      </div>

      {/* 🔥 BOTTOM FADE */}
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none z-10">
        <div className="w-full h-full bg-gradient-to-t from-[#050505] to-transparent" />
      </div>

      {/* EXTERNAL FONT LOAD */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
      `}</style>

    </section>
  );
}