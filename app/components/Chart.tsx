'use client';

import React, { useEffect, useState } from 'react';

interface ChartItem {
  song: string;
  artist: string;
  votes: string;
  weeks: number;
  yt: string;
  sp: string;
  bp: string;
  medal?: string;
  accent: string;
  rank: number;
  direction?: 'up' | 'down' | 'flat';
}

export default function Chart({
  onVote
}: {
  onVote: (song: string, type: 'up' | 'down') => void;
}) {
  const [hasMounted, setHasMounted] = useState(false);

  // Fixed core data to prevent hydration mismatch
  const baseData: ChartItem[] = [
    { rank: 1, song: "Sielewi", artist: "Dee", votes: "18.2K", weeks: 12, yt: "#01", sp: "#02", bp: "#01", medal: "🥇", accent: "#D4AF37", direction: "up" },
    { rank: 2, song: "The Rock", artist: "Rocky", votes: "12.9K", weeks: 9, yt: "#03", sp: "#05", bp: "#04", medal: "🥈", accent: "#C0C0C0", direction: "flat" },
    { rank: 3, song: "Spirit", artist: "Matitu", votes: "10.1K", weeks: 7, yt: "#06", sp: "#07", bp: "#08", medal: "🥉", accent: "#8a6d1a", direction: "down" },
  ];

  // Effect to handle hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Generate the rest of the chart only after mounting
  const fullData = hasMounted 
    ? [
        ...baseData,
        ...Array.from({ length: 7 }, (_, i) => ({
          rank: i + 4,
          song: `Pulse Track ${i + 4}`,
          artist: "Matitu Nation",
          votes: `${(Math.random() * 5 + 0.5).toFixed(1)}K`,
          weeks: Math.floor(Math.random() * 15),
          yt: `#${i + 10}`, sp: `#${i + 12}`, bp: `#${i + 8}`,
          accent: "#1a1a1a",
          direction: ['up', 'down', 'flat'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'flat'
        }))
      ]
    : baseData; // Initially only show the Top 3 to match server render

  if (!hasMounted) {
    return <div className="w-full max-w-6xl mx-auto px-4 py-12 opacity-0" />; // Prevent flicker
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      {/* BRAND HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 px-6 border-l-2 border-[#D4AF37] gap-4">
        <div>
          <h1 className="font-cinzel text-4xl font-black text-white tracking-[0.15em] uppercase leading-none">
            Bora <span className="text-[#D4AF37]">Charts</span>
          </h1>
          <p className="text-[8px] font-mono text-white/20 uppercase tracking-[0.6em] mt-3">Matitu Nation Protocol // 2026</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold">Sunday Edit: 26.04.26</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {fullData.map((item) => {
          const isElite = item.rank <= 3;
          return (
            <div
              key={item.rank}
              className={`group relative flex items-stretch bg-[#050505] border transition-all duration-500 overflow-hidden ${
                isElite ? 'border-white/10 min-h-[140px]' : 'border-white/5 min-h-[85px]'
              }`}
            >
              {/* ASCEND PILLAR */}
              <button
                onClick={() => onVote(item.song, 'up')}
                className={`relative w-16 md:w-24 flex items-center justify-center transition-all border-r border-white/5 group/up ${
                  isElite ? 'bg-[#D4AF37]/5 hover:bg-[#D4AF37]/20' : 'bg-white/[0.01] hover:bg-white/5'
                }`}
              >
                <span className={`text-2xl transition-transform duration-300 group-hover/up:-translate-y-1 ${isElite ? 'text-[#D4AF37]' : 'text-white/20'}`}>
                  ▲
                </span>
              </button>

              {/* IDENTITY SEAT */}
              <div className="flex-grow flex items-center px-6 relative">
                {item.medal && (
                  <span className="absolute right-6 text-[120px] opacity-[0.03] rotate-12 pointer-events-none select-none">
                    {item.medal}
                  </span>
                )}
                <div className="relative z-10 flex flex-col">
                  <div className="flex items-center gap-4">
                    <span className={`font-cinzel text-2xl font-black italic ${isElite ? 'text-[#D4AF37]' : 'text-white/10'}`}>
                      {item.rank < 10 ? `0${item.rank}` : item.rank}
                    </span>
                    <h3 className={`font-cinzel uppercase tracking-tighter ${isElite ? 'text-2xl font-black text-white' : 'text-lg font-bold text-white/70'}`}>
                      {item.song}
                    </h3>
                  </div>
                  <p className="text-[10px] text-white/30 font-mono tracking-[0.4em] uppercase mt-1">
                    {item.artist}
                  </p>
                </div>
              </div>

              {/* STATS COLUMN */}
              <div className="flex flex-col items-center justify-center px-6 border-x border-white/5 bg-black/40 min-w-[100px]">
                <span className={`text-xl font-mono font-black ${isElite ? 'text-[#D4AF37]' : 'text-white/80'}`}>
                  {item.votes}
                </span>
                <span className={`text-sm ${item.direction === 'up' ? 'text-[#D4AF37]' : item.direction === 'down' ? 'text-red-600' : 'text-white/10'}`}>
                  {item.direction === 'up' && '▲'}
                  {item.direction === 'down' && '▼'}
                  {item.direction === 'flat' && '—'}
                </span>
              </div>

              {/* DESCEND PILLAR */}
              <button
                onClick={() => onVote(item.song, 'down')}
                className="relative w-16 md:w-24 flex items-center justify-center transition-all bg-white/[0.01] hover:bg-red-950/20 group/down"
              >
                <span className="text-2xl text-white/10 group-hover/down:text-red-600 group-hover/down:translate-y-1 transition-all duration-300">
                  ▼
                </span>
              </button>

              <div 
                className={`absolute left-0 top-0 h-full w-[3px] transition-all duration-500 ${isElite ? 'bg-[#D4AF37] shadow-[2px_0_15px_#D4AF37]' : 'bg-white/10'}`} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}