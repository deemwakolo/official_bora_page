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

  const baseData: ChartItem[] = [
    { rank: 1, song: "Sielewi", artist: "Dee", votes: "18.2K", weeks: 12, yt: "#01", sp: "#02", bp: "#01", medal: "🥇", accent: "#D4AF37", direction: "up" },
    { rank: 2, song: "The Rock", artist: "Rocky", votes: "12.9K", weeks: 9, yt: "#03", sp: "#05", bp: "#04", medal: "🥈", accent: "#C0C0C0", direction: "flat" },
    { rank: 3, song: "Spirit", artist: "Matitu", votes: "10.1K", weeks: 7, yt: "#06", sp: "#07", bp: "#08", medal: "🥉", accent: "#8a6d1a", direction: "down" },
  ];

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
    : baseData;

  if (!hasMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 relative">
      
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle_at_center,_#D4AF37_0%,_transparent_70%)] blur-[120px]" />
      </div>

      <div className="flex flex-col gap-6 relative z-10">
        {fullData.map((item) => {
          const isNo1 = item.rank === 1;
          const isElite = item.rank <= 3;
          
          return (
            <div
              key={item.rank}
              className={`group relative flex items-stretch bg-[#050505] border transition-all duration-700 ${
                isNo1 
                  ? 'border-[#D4AF37]/30 min-h-[160px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]' 
                  : isElite 
                    ? 'border-white/10 min-h-[130px]' 
                    : 'border-white/5 min-h-[85px]'
              }`}
            >
              {/* THE CROWN WATERMARK (Upper Right Background) */}
              {isElite && (
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] select-none pointer-events-none z-0 transition-transform duration-1000 group-hover:scale-110">
                   <svg 
                    width={isNo1 ? "180" : "120"} 
                    height={isNo1 ? "180" : "120"} 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className={`transform rotate-[25deg] ${isNo1 ? 'text-[#D4AF37]' : 'text-white'}`}
                   >
                    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
                   </svg>
                </div>
              )}

              {/* VOTE ASCEND */}
              <button
                onClick={() => onVote(item.song, 'up')}
                className={`relative w-16 md:w-24 flex items-center justify-center border-r border-white/5 transition-all group/up z-20 ${
                  isElite ? 'bg-[#D4AF37]/5 hover:bg-[#D4AF37]/20' : 'bg-white/[0.01] hover:bg-white/10'
                }`}
              >
                <span className={`text-2xl transition-transform group-hover/up:-translate-y-1 ${isElite ? 'text-[#D4AF37]' : 'text-white/10'}`}>
                  ▲
                </span>
              </button>

              {/* IDENTITY SEAT */}
              <div className="flex-grow flex items-center px-8 relative z-10">
                
                <div className="relative mr-10">
                  <span className={`font-cinzel font-black italic leading-none select-none ${
                    isNo1 ? 'text-[90px] text-[#D4AF37]' : isElite ? 'text-[65px] text-white/40' : 'text-2xl text-white/10'
                  }`}>
                    {item.rank < 10 ? `0${item.rank}` : item.rank}
                  </span>
                </div>

                <div className="flex flex-col">
                  <h3 className={`font-cinzel uppercase tracking-tighter leading-tight ${
                    isNo1 ? 'text-3xl font-black text-white' : isElite ? 'text-xl font-bold text-white/90' : 'text-base font-medium text-white/60'
                  }`}>
                    {item.song}
                  </h3>
                  <p className="text-[10px] text-[#D4AF37]/50 font-mono tracking-[0.5em] uppercase mt-2">
                    {item.artist}
                  </p>
                </div>
              </div>

              {/* PULSE STATS */}
              <div className={`flex flex-col items-center justify-center px-6 border-x border-white/5 min-w-[110px] z-10 ${isNo1 ? 'bg-[#D4AF37]/5' : 'bg-black/40'}`}>
                <span className={`text-xl font-mono font-black ${isElite ? 'text-[#D4AF37]' : 'text-white/60'}`}>
                  {item.votes}
                </span>
                <div className={`text-xs mt-1 font-bold ${
                  item.direction === 'up' ? 'text-[#D4AF37]' : item.direction === 'down' ? 'text-red-600' : 'text-white/10'
                }`}>
                  {item.direction === 'up' && '▲'}
                  {item.direction === 'down' && '▼'}
                  {item.direction === 'flat' && '—'}
                </div>
              </div>

              {/* VOTE DESCEND */}
              <button
                onClick={() => onVote(item.song, 'down')}
                className="relative w-16 md:w-24 flex items-center justify-center transition-all bg-white/[0.01] hover:bg-red-950/20 z-20"
              >
                <span className="text-2xl text-white/10 group-hover:text-red-600 transition-colors">
                  ▼
                </span>
              </button>

              {/* DYNAMIC THRONE ACCENT */}
              <div className={`absolute left-0 top-0 h-full transition-all duration-700 z-10 ${
                isNo1 ? 'w-[4px] bg-[#D4AF37] shadow-[4px_0_20px_#D4AF37]' : isElite ? 'w-[2px] bg-white/20' : 'w-[1px] bg-white/5'
              }`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}