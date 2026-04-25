'use client';

import React, { useState } from 'react';

interface ThroneProps {
  song: string;
  artist: string;
  votes: string;
  weeksInChart: number;
  weeksAtNo1: number;
  ytRank: string;
  spRank: string;
  bpRank: string;
  onVote: (song: string, type: 'up' | 'down') => void;
}

export default function Throne({
  song, artist, votes, weeksInChart, weeksAtNo1, ytRank, spRank, bpRank, onVote
}: ThroneProps) {

  const [animating, setAnimating] = useState(false);
  const [lastVote, setLastVote] = useState<'up' | 'down' | null>(null);

  const handleVote = (type: 'up' | 'down') => {
    setLastVote(type);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 800);
    setTimeout(() => {
      onVote(song, type);
    }, 200);
  };

  return (
    <>
      <section className="relative w-full bg-[#050505] py-20 text-center overflow-hidden border-b border-white/5">
        
        {/* 1. CINEMATIC BACKGROUND GLOW */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)] blur-[100px]" />
        </div>

        {/* WATERMARK CROWN - Increased opacity as requested */}
        <div className="absolute -top-12 right-[10%] rotate-[15deg] z-0 opacity-[0.15] pointer-events-none transition-transform duration-[2s]">
          <div className="text-[180px] md:text-[240px] text-transparent bg-clip-text bg-gradient-to-br from-[#D4AF37] to-white/10 font-serif">
            ♛
          </div>
        </div>

        {/* MAIN HEADLINE */}
        <div className="relative z-10 px-4">
          <h1 className="font-cinzel text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-[#D4AF37] via-[#D4AF37] to-[#8a6d1a] drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]">
              {song}
            </span>
          </h1>
          
          <p className="text-white/40 text-[10px] md:text-[12px] font-mono tracking-[0.6em] uppercase mt-4">
            — {artist} —
          </p>
        </div>

        {/* METRIC HUD */}
        <div className="relative z-10 flex justify-center items-center gap-12 mt-12">
          <div className="text-center group">
            <p className="font-mono text-[7px] text-white/20 uppercase tracking-[0.3em] mb-1">Tenure</p>
            <p className="text-white/70 text-lg font-cinzel">{weeksInChart} <span className="text-[9px] opacity-50 uppercase">Wks</span></p>
          </div>

          <div className="w-[1px] h-10 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          <div className="text-center">
            <p className="font-mono text-[7px] text-[#D4AF37]/40 uppercase tracking-[0.3em] mb-1">Peak Status</p>
            <p className="text-[#D4AF37] text-lg font-cinzel">{weeksAtNo1} <span className="text-[9px] opacity-70 uppercase">At #1</span></p>
          </div>
        </div>

        {/* PLATFORM BADGES */}
        <div className="relative z-10 flex justify-center gap-4 mt-10">
          <div className="px-4 py-1.5 border border-white/5 rounded-full bg-white/[0.02] text-[8px] font-mono text-white/30 tracking-widest flex items-center gap-2 hover:border-[#D4AF37]/20 transition-colors">
            YT <span className="text-white/70 font-bold">{ytRank}</span>
          </div>
          <div className="px-4 py-1.5 border border-white/5 rounded-full bg-white/[0.02] text-[8px] font-mono text-white/30 tracking-widest flex items-center gap-2 hover:border-[#D4AF37]/20 transition-colors">
            SP <span className="text-white/70 font-bold">{spRank}</span>
          </div>
          <div className="px-4 py-1.5 border border-white/5 rounded-full bg-white/[0.02] text-[8px] font-mono text-white/30 tracking-widest flex items-center gap-2 hover:border-[#D4AF37]/20 transition-colors">
            BP <span className="text-white/70 font-bold">{bpRank}</span>
          </div>
        </div>

        {/* INTERACTIVE PULSE CONTROL */}
        <div className="relative z-10 flex items-center justify-center gap-12 mt-16">
          <button
            onClick={() => handleVote('up')}
            className={`group relative p-3 transition-all duration-300 ${
              lastVote === 'up' && animating ? 'scale-125' : 'hover:scale-110 active:scale-95'
            }`}
          >
            <span className={`text-3xl ${lastVote === 'up' && animating ? 'text-[#D4AF37]' : 'text-[#D4AF37]/30 group-hover:text-[#D4AF37]'}`}>
              ▲
            </span>
          </button>

          <div className="relative text-center min-w-[80px]">
            <p className="text-4xl font-cinzel font-bold text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              {votes}
            </p>
            <p className="text-[6px] text-white/20 uppercase tracking-[0.5em] mt-2">Pulse Power</p>
          </div>

          <button
            onClick={() => handleVote('down')}
            className="group p-3 transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <span className="text-3xl text-white/10 group-hover:text-white/40">
              ▼
            </span>
          </button>
        </div>

        {/* SIGNATURE BASE LINE - Fixed syntax error here */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 via-[#C0C0C0]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#D4AF37]/5 to-transparent opacity-50 blur-xl pointer-events-none" />
        
      </section>
    </>
  );
}