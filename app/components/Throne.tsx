'use client';

import React, { useState, useEffect } from 'react';

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      <section 
        className={`relative w-full bg-[#050505] py-10 text-center overflow-hidden border-b border-white/5 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}
      >
        
        {/* CINEMATIC BACKGROUND GLOW */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl pointer-events-none opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)] blur-[80px]" />
        </div>

        {/* WATERMARK CROWN - Added z-index and explicit display */}
        <div className="absolute -top-6 right-[15%] rotate-[12deg] z-0 opacity-[0.12] pointer-events-none transition-transform duration-[2s]">
          <div 
            className="text-[140px] md:text-[180px] text-transparent bg-clip-text bg-gradient-to-br from-[#D4AF37] to-white/10 font-serif"
            style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
          >
            ♛
          </div>
        </div>

        {/* MAIN HEADLINE - Fixed "Blackened" Text Error */}
        <div className="relative z-10 px-4">
          <h1 className="font-cinzel text-5xl md:text-7xl font-black uppercase leading-none tracking-tight">
            <span 
              className="inline-block text-transparent bg-clip-text bg-gradient-to-b from-[#f3e2ad] via-[#D4AF37] to-[#8a6d1a] drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
              style={{ 
                WebkitBackgroundClip: 'text', 
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent', // Forces the clip to work
                backgroundSize: '100% 100%' // Ensures the gradient covers the text area
              }}
            >
              {song}
            </span>
          </h1>
          
          <p className="text-white/40 text-[9px] md:text-[11px] font-mono tracking-[0.5em] uppercase mt-2">
            — {artist} —
          </p>
        </div>

        {/* METRIC HUD */}
        <div className="relative z-10 flex justify-center items-center gap-8 mt-8">
          <div className="text-center">
            <p className="font-mono text-[6px] text-white/20 uppercase tracking-[0.2em] mb-0.5">Tenure</p>
            <p className="text-white/70 text-base font-cinzel">{weeksInChart} <span className="text-[8px] opacity-50 uppercase">Wks</span></p>
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="text-center">
            <p className="font-mono text-[6px] text-[#D4AF37]/40 uppercase tracking-[0.2em] mb-0.5">Peak Status</p>
            <p className="text-[#D4AF37] text-base font-cinzel">{weeksAtNo1} <span className="text-[8px] opacity-70 uppercase">At #1</span></p>
          </div>
        </div>

        {/* PLATFORM BADGES */}
        <div className="relative z-10 flex justify-center gap-3 mt-6">
          {['YT', 'SP', 'BP'].map((plat, i) => (
            <div key={plat} className="px-3 py-1 border border-white/5 rounded-full bg-white/[0.02] text-[7px] font-mono text-white/30 tracking-widest flex items-center gap-1.5">
              {plat} <span className="text-white/70 font-bold">{[ytRank, spRank, bpRank][i]}</span>
            </div>
          ))}
        </div>

        {/* INTERACTIVE PULSE CONTROL */}
        <div className="relative z-10 flex items-center justify-center gap-8 mt-10">
          <button
            onClick={() => handleVote('up')}
            className={`group p-2 transition-all duration-300 ${lastVote === 'up' && animating ? 'scale-110' : 'hover:scale-105'}`}
          >
            <span className={`text-2xl ${lastVote === 'up' && animating ? 'text-[#D4AF37]' : 'text-[#D4AF37]/30 group-hover:text-[#D4AF37]'}`}>
              ▲
            </span>
          </button>

          <div className="relative text-center min-w-[60px]">
            <p className="text-3xl font-cinzel font-bold text-white tracking-widest leading-none">
              {votes}
            </p>
            <p className="text-[5px] text-white/20 uppercase tracking-[0.4em] mt-1">Pulse Power</p>
          </div>

          <button
            onClick={() => handleVote('down')}
            className="group p-2 transition-all duration-300 hover:scale-105"
          >
            <span className="text-2xl text-white/10 group-hover:text-white/40">
              ▼
            </span>
          </button>
        </div>

        {/* SIGNATURE BASE LINE */}
        <div className="absolute bottom-0 left-0 w-full">
           <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
        </div>
      </section>
    </>
  );
}