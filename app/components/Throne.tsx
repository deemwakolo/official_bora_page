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
 * THE ROYAL THRONE - ELEVATED IMPACT EDITION
 * Pulls content higher and maximizes song title font size.
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
    <section className="relative w-full bg-[#080000] pt-8 pb-10 text-center overflow-hidden min-h-[550px] md:min-h-[620px] flex flex-col justify-start font-cinzel">

      {/* 🔥 BACKGROUND FUSION */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src={cover} 
          alt="" 
          className="w-full h-full object-cover grayscale opacity-15 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0000] via-transparent to-[#080000]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_80%)] opacity-10 blur-[100px]" />
      </div>

      {/* 👑 CROWN DECORATION */}
      <div className="absolute top-0 right-[4%] rotate-[12deg] opacity-[0.07] pointer-events-none z-0">
        <div className="text-[130px] md:text-[220px] text-[#e5e7eb] drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]">
          ♛
        </div>
      </div>

      {/* ⚡ MAIN TEXT CONTENT - PULLED UP VIA MT-0 */}
      <div className="relative z-20 px-4 max-w-7xl mx-auto w-full mt-4 md:mt-8">
        
        {/* MASSIVE TITLE STYLING - INCREASED FONT SIZE */}
        <div className="mb-1">
          <span className="text-[8px] md:text-[10px] font-mono tracking-[0.8em] text-[#D4AF37] uppercase block mb-2 animate-pulse">
            Bora namba moja
          </span>
          <h1 className="flex flex-col items-center leading-[0.75] tracking-tighter">
            <span className="text-6xl md:text-[11rem] font-black text-white drop-shadow-[0_15px_40px_rgba(255,255,255,0.2)] break-words w-full uppercase">
              {song}
            </span>
            <span className="text-3xl md:text-[5rem] text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#fffbeb] to-[#8a6d1a] mt-1 italic font-bold">
              {/* Architect space maintained if needed later */}
            </span>
          </h1>
        </div>

        {/* ARTIST NAME - PULLED UP GAP */}
        <div className="flex flex-col items-center justify-center gap-2 mt-4 md:mt-6">
          <div className="flex items-center justify-center gap-3 w-full">
             <div className="h-[1px] flex-1 max-w-[60px] md:max-w-[100px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
             <span className="text-[8px] md:text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">Featuring</span>
             <div className="h-[1px] flex-1 max-w-[60px] md:max-w-[100px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>
          
          <p className="text-lg md:text-3xl lg:text-4xl font-bold uppercase tracking-[0.2em] text-white leading-tight drop-shadow-lg max-w-3xl px-4">
            {artist}
          </p>
          
          <div className="h-[2px] w-12 md:w-24 bg-[#b91c1c] shadow-[0_0_8px_#b91c1c]" />
        </div>
      </div>

      {/* METRICS GRID - PULLED UP GAP */}
      <div className="relative z-20 flex flex-wrap justify-center items-center gap-6 md:gap-12 mt-8 md:mt-10 px-4">
        <div className="text-center min-w-[70px] md:min-w-[90px]">
          <p className="font-mono text-[7px] md:text-[9px] text-white/50 uppercase tracking-[0.4em] mb-1">
            Tenure
          </p>
          <p className="text-[#f3f4f6] text-xl md:text-3xl font-bold italic">
            {weeksInChart}<span className="text-[10px] opacity-40 ml-0.5 not-italic font-mono text-[#D4AF37]">W</span>
          </p>
        </div>

        <div className="hidden sm:block w-[1px] h-8 bg-[#b91c1c]/30" />

        <div className="text-center min-w-[70px] md:min-w-[90px]">
          <p className="font-mono text-[7px] md:text-[9px] text-white/50 uppercase tracking-[0.4em] mb-1">
            Pulse
          </p>
          <p className="text-white text-xl md:text-3xl font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {votes}
          </p>
        </div>

        <div className="hidden sm:block w-[1px] h-8 bg-[#b91c1c]/30" />

        <div className="text-center min-w-[70px] md:min-w-[90px]">
          <p className="font-mono text-[7px] md:text-[9px] text-[#D4AF37] uppercase tracking-[0.4em] mb-1">
            Apex
          </p>
          <p className="text-[#D4AF37] text-xl md:text-3xl font-bold italic">
            {weeksAtNo1}<span className="text-[10px] opacity-60 ml-0.5 not-italic font-mono text-white">#1</span>
          </p>
        </div>
      </div>

      {/* PLATFORM STRIP - PULLED UP GAP */}
      <div className="relative z-20 flex flex-wrap justify-center gap-2 mt-8 md:mt-10 px-4">
        <div className="px-4 py-2 border border-white/5 bg-black/80 text-[8px] md:text-[10px] font-mono text-[#e5e7eb] tracking-widest uppercase backdrop-blur-xl">
          YT <span className="text-white font-bold ml-1 decoration-[#b91c1c] underline underline-offset-4">{ytRank}</span>
        </div>
        <div className="px-4 py-2 border border-white/5 bg-black/80 text-[8px] md:text-[10px] font-mono text-[#e5e7eb] tracking-widest uppercase backdrop-blur-xl">
          SP <span className="text-white font-bold ml-1 decoration-[#b91c1c] underline underline-offset-4">{spRank}</span>
        </div>
        <div className="px-4 py-2 border border-[#D4AF37]/30 bg-[#D4AF37]/5 text-[8px] md:text-[10px] font-mono text-[#D4AF37] tracking-widest uppercase font-bold backdrop-blur-xl">
          BP <span className="text-white ml-1 decoration-white underline underline-offset-4">{bpRank}</span>
        </div>
      </div>

      {/* 🔥 BOTTOM FADE */}
      <div className="absolute bottom-0 left-0 w-full h-20 pointer-events-none z-10">
        <div className="w-full h-full bg-gradient-to-t from-[#080000] to-transparent" />
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
      `}</style>

    </section>
  );
}