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
 * THE ROYAL THRONE - DYNAMIC ARTIST EDITION
 * Optimized for long collaborator strings (e.g., Diamond Platnumz ft. Mafikizolo & DJ White).
 * Palette: Red, White, Gold, Silver.
 */
export default function Throne({
  song = "Enjoy",
  artist = "Diamond Platnumz ft Mafikizolo and DJ White",
  votes,
  weeksInChart,
  weeksAtNo1,
  ytRank,
  spRank,
  bpRank,
  cover = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"
}: ThroneProps) {

  return (
    <section className="relative w-full bg-[#080000] pt-20 pb-16 text-center overflow-hidden min-h-[750px] flex flex-col justify-center font-cinzel">

      {/* 🔥 BACKGROUND FUSION */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src={cover} 
          alt="" 
          className="w-full h-full object-cover grayscale opacity-20 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0000] via-transparent to-[#080000]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_85%)] opacity-10 blur-[120px]" />
      </div>

      {/* 👑 CROWN DECORATION */}
      <div className="absolute -top-12 right-[2%] rotate-[12deg] opacity-[0.1] pointer-events-none z-0">
        <div className="text-[180px] md:text-[320px] text-[#e5e7eb] drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]">
          ♛
        </div>
      </div>

      {/* ⚡ MAIN TEXT CONTENT */}
      <div className="relative z-20 px-4 max-w-7xl mx-auto w-full">
        
        {/* MASSIVE TITLE STYLING */}
        <div className="mb-2">
          <span className="text-[9px] md:text-xs font-mono tracking-[1em] text-[#D4AF37] uppercase block mb-4 animate-pulse">
            Sovereign Chart Asset
          </span>
          <h1 className="flex flex-col items-center leading-[0.75] tracking-tighter">
            <span className="text-6xl md:text-[11rem] font-black text-white drop-shadow-[0_15px_40px_rgba(255,255,255,0.2)] break-words w-full uppercase">
              {song}
            </span>
            <span className="text-4xl md:text-[7rem] text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#fffbeb] to-[#8a6d1a] mt-2 italic font-bold drop-shadow-[0_0_30px_rgba(185,28,28,0.4)]">
              Architect
            </span>
          </h1>
        </div>

        {/* ARTIST NAME - REDUCED & RESPONSIVE FOR LONG STRINGS */}
        <div className="flex flex-col items-center justify-center gap-3 mt-10">
          <div className="flex items-center justify-center gap-4 w-full">
             <div className="h-[1px] flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
             <span className="text-[10px] md:text-xs font-mono tracking-[0.4em] text-white/40 uppercase">Featuring</span>
             <div className="h-[1px] flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>
          
          <p className="text-xl md:text-4xl lg:text-5xl font-bold uppercase tracking-[0.25em] text-white leading-snug drop-shadow-lg max-w-4xl px-4">
            {artist}
          </p>
          
          <div className="h-[2px] w-16 md:w-32 bg-[#b91c1c] shadow-[0_0_10px_#b91c1c]" />
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="relative z-20 flex flex-wrap justify-center items-center gap-8 md:gap-16 mt-20 px-4">
        <div className="text-center min-w-[90px]">
          <p className="font-mono text-[8px] md:text-[10px] text-white/50 uppercase tracking-[0.4em] mb-2">
            Tenure
          </p>
          <p className="text-[#f3f4f6] text-2xl md:text-4xl font-bold italic">
            {weeksInChart}<span className="text-xs opacity-40 ml-1 not-italic font-mono text-[#D4AF37]">W</span>
          </p>
        </div>

        <div className="hidden sm:block w-[1px] h-12 bg-[#b91c1c]/30" />

        <div className="text-center min-w-[90px]">
          <p className="font-mono text-[8px] md:text-[10px] text-white/50 uppercase tracking-[0.4em] mb-2">
            Pulse
          </p>
          <p className="text-white text-2xl md:text-4xl font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {votes}
          </p>
        </div>

        <div className="hidden sm:block w-[1px] h-12 bg-[#b91c1c]/30" />

        <div className="text-center min-w-[90px]">
          <p className="font-mono text-[8px] md:text-[10px] text-[#D4AF37] uppercase tracking-[0.4em] mb-2">
            Apex
          </p>
          <p className="text-[#D4AF37] text-2xl md:text-4xl font-bold italic">
            {weeksAtNo1}<span className="text-xs opacity-60 ml-1 not-italic font-mono text-white">#1</span>
          </p>
        </div>
      </div>

      {/* PLATFORM STRIP */}
      <div className="relative z-20 flex flex-wrap justify-center gap-3 mt-16 px-4">
        <div className="px-6 py-2.5 border border-white/5 bg-black/80 text-[9px] md:text-[11px] font-mono text-[#e5e7eb] tracking-widest uppercase backdrop-blur-xl">
          YT <span className="text-white font-bold ml-1 decoration-[#b91c1c] underline underline-offset-4">{ytRank}</span>
        </div>
        <div className="px-6 py-2.5 border border-white/5 bg-black/80 text-[9px] md:text-[11px] font-mono text-[#e5e7eb] tracking-widest uppercase backdrop-blur-xl">
          SP <span className="text-white font-bold ml-1 decoration-[#b91c1c] underline underline-offset-4">{spRank}</span>
        </div>
        <div className="px-6 py-2.5 border border-[#D4AF37]/30 bg-[#D4AF37]/5 text-[9px] md:text-[11px] font-mono text-[#D4AF37] tracking-widest uppercase font-bold backdrop-blur-xl">
          BP <span className="text-white ml-1 decoration-white underline underline-offset-4">{bpRank}</span>
        </div>
      </div>

      {/* 🔥 BOTTOM FADE */}
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none z-10">
        <div className="w-full h-full bg-gradient-to-t from-[#080000] to-transparent" />
      </div>

      {/* EXTERNAL FONT LOAD */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
      `}</style>

    </section>
  );
}