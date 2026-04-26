'use client';

import React, { useEffect, useState } from 'react';

interface ChartItem {
  song: string;
  artist: string;
  votes: string;
  rank: number;
  direction?: 'up' | 'down' | 'flat';
  cover?: string;
}

export default function Chart({
  onVote
}: {
  onVote: (song: string, type: 'up' | 'down') => void;
}) {
  const [hasMounted, setHasMounted] = useState(false);

  const baseData: ChartItem[] = [
    { 
      rank: 2, 
      song: "The Rock", 
      artist: "Rocky", 
      votes: "12.9K", 
      direction: "flat",
      cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80" 
    },
    { 
      rank: 3, 
      song: "Spirit", 
      artist: "Matitu", 
      votes: "10.1K", 
      direction: "down",
      cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&q=80"
    },
  ];

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fullData = hasMounted 
    ? [
        ...baseData,
        ...Array.from({ length: 17 }, (_, i) => ({
          rank: i + 4,
          song: `Pulse Track ${i + 4}`,
          artist: "Matitu Nation",
          votes: `${(Math.random() * 5 + 0.5).toFixed(1)}K`,
          direction: ['up', 'down', 'flat'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'flat',
          cover: "" 
        }))
      ].filter(item => item.rank <= 20)
    : baseData;

  if (!hasMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 relative">
      
      {/* Background Technical Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="flex flex-col gap-4 relative z-10">
        {fullData.map((item) => {
          const isTopTier = item.rank <= 3;
          
          return (
            <div
              key={item.rank}
              className="group relative flex items-stretch bg-[#050505] border border-white/5 hover:border-[#D4AF37]/40 transition-all duration-700 overflow-hidden min-h-[100px]"
            >
              
              {/* THE FUSED ART ENGINE - HIGH OPACITY VERSION */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {item.cover ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={item.cover} 
                      alt="" 
                      className="absolute left-0 top-0 w-full md:w-3/4 h-full object-cover transition-all duration-1000 ease-in-out
                        grayscale-[50%] opacity-60 group-hover:grayscale-0 group-hover:opacity-90 group-hover:scale-105"
                    />
                    {/* Refined Fusion Mask - Pushed further right for more image visibility */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-[#050505]/40 to-[#050505]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30" />
                )}
              </div>

              {/* RANK PLATE */}
              <div className="relative w-20 md:w-24 flex flex-col items-center justify-center border-r border-white/10 z-10 backdrop-blur-md bg-black/40">
                <span className="font-mono text-[8px] text-white/40 tracking-[0.3em] uppercase mb-1">Rank</span>
                <span className={`font-cinzel font-black italic text-2xl md:text-3xl transition-all duration-500 ${isTopTier ? 'text-[#D4AF37] scale-110 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'text-white/60 group-hover:text-white'}`}>
                  {item.rank < 10 ? `0${item.rank}` : item.rank}
                </span>
              </div>

              {/* INTERACTION ZONE (VOTING) */}
              <div className="relative flex flex-col border-r border-white/10 z-10 bg-black/20 backdrop-blur-sm">
                <button
                  onClick={() => onVote(item.song, 'up')}
                  className="flex-1 w-12 md:w-16 flex items-center justify-center hover:bg-[#D4AF37]/30 transition-all group/btn"
                >
                  <span className="text-white/30 group-hover/btn:text-[#D4AF37] text-lg transition-transform group-hover/btn:-translate-y-1">▲</span>
                </button>
                <button
                  onClick={() => onVote(item.song, 'down')}
                  className="flex-1 w-12 md:w-16 flex items-center justify-center border-t border-white/10 hover:bg-red-950/40 transition-all group/btn"
                >
                  <span className="text-white/30 group-hover/btn:text-red-600 text-lg transition-transform group-hover/btn:translate-y-1">▼</span>
                </button>
              </div>

              {/* TRACK IDENTITY (FUSED OVER ART) */}
              <div className="relative flex-grow flex flex-col justify-center px-8 z-10">
                <h3 className="font-cinzel uppercase tracking-[0.25em] text-sm md:text-xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
                  {item.song}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="h-[1px] w-4 bg-[#D4AF37]" />
                  <p className="text-[10px] text-white font-mono tracking-[0.5em] uppercase drop-shadow-md">
                    {item.artist}
                  </p>
                </div>
              </div>

              {/* STATUS ANALYTICS */}
              <div className="relative flex items-center gap-6 px-8 z-10 bg-[#050505]/80 backdrop-blur-2xl border-l border-white/10 group-hover:border-[#D4AF37]/40">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[9px] text-[#D4AF37] tracking-[0.2em] mb-1 uppercase font-bold">Pulse Engine</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-black text-lg text-white">
                      {item.votes}
                    </span>
                  </div>
                </div>
                
                <div className={`flex items-center justify-center w-10 h-10 border-2 transition-all duration-500 shadow-lg ${
                  item.direction === 'up' ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10' : 
                  item.direction === 'down' ? 'border-red-600 text-red-600 bg-red-600/10' : 'border-white/20 text-white/20'
                }`}>
                  <span className="text-xs font-bold">
                    {item.direction === 'up' && '▲'}
                    {item.direction === 'down' && '▼'}
                    {item.direction === 'flat' && '—'}
                  </span>
                </div>
              </div>

              {/* THE THRONE ACCENT */}
              <div className={`absolute right-0 top-0 bottom-0 w-[1px] transition-all duration-700 ${isTopTier ? 'bg-[#D4AF37]' : 'bg-transparent'}`} />
              {isTopTier && (
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#D4AF37] z-20 shadow-[6px_0_25px_rgba(212,175,55,0.6)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}