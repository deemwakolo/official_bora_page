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

/**
 * THE BORA CHART - COMPACT PRESTIGE EDITION
 * Bottom gap removed (pb-0) to sit flush with the Fresh.tsx section.
 * Maintains unique Top 3 styling and high-density technical aesthetics.
 */
export default function Chart({
  onVote
}: {
  onVote: (song: string, type: 'up' | 'down') => void;
}) {
  const [hasMounted, setHasMounted] = useState(false);

  const baseData: ChartItem[] = [
    { 
      rank: 1, 
      song: "Sielewi", 
      artist: "Matitu Nation", 
      votes: "15.4K", 
      direction: "up",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"
    },
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
    }
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
          cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80"
        }))
      ]
    : baseData;

  if (!hasMounted) return null;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pt-2 pb-0 bg-transparent text-[#f0f0f0] font-cinzel">
      
      <div className="flex flex-col gap-2 md:gap-px">
        {fullData.map((item) => {
          const isTop3 = item.rank <= 3;
          
          return (
            <div
              key={item.rank}
              className={`group relative flex flex-col md:flex-row items-start md:items-center transition-all duration-500 
                ${isTop3 
                  ? 'bg-gradient-to-r from-[#1a0000] to-[#080000] py-6 md:py-8 border-2 border-[#D4AF37]/30 mb-2 shadow-[0_0_20px_rgba(185,28,28,0.1)]' 
                  : 'bg-[#080000] py-4 md:py-5 border-b border-white/5 md:border-none'
                } px-4 md:px-6 hover:bg-[#120000]`}
            >
              
              <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
                <div className="relative flex-shrink-0 mr-4 md:mr-8">
                  <div className={`relative overflow-hidden rounded-full border-2 transition-all duration-700 group-hover:rotate-[360deg]
                    ${isTop3 
                      ? 'w-20 h-20 md:w-28 md:h-28 border-[#D4AF37]' 
                      : 'w-14 h-14 md:w-16 md:h-16 border-[#e5e7eb]/10 group-hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <img 
                      src={item.cover} 
                      alt="" 
                      className={`w-full h-full object-cover grayscale transition-all group-hover:grayscale-0 ${isTop3 ? 'grayscale-[0.3]' : ''}`} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`${isTop3 ? 'w-4 h-4' : 'w-2 h-2'} bg-[#0a0a0a] rounded-full border border-white/20`} />
                    </div>
                  </div>

                  <div className={`absolute -top-1 -left-1 font-black flex items-center justify-center rounded-sm transform -rotate-12 group-hover:rotate-0 transition-transform shadow-md border
                    ${isTop3 
                      ? 'w-8 h-8 md:w-10 md:h-10 bg-[#b91c1c] text-white border-[#D4AF37] text-sm md:text-lg' 
                      : 'w-6 h-6 bg-[#222] text-[#e5e7eb] border-white/10 text-[9px]'
                    }`}
                  >
                    {item.rank}
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1 overflow-hidden">
                    <span className={`text-[7px] md:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0 ${
                      item.direction === 'up' ? 'bg-[#b91c1c] text-white' :
                      item.direction === 'down' ? 'bg-white/20 text-[#e5e7eb]' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    }`}>
                      {item.direction === 'up' ? 'ASC' : item.direction === 'down' ? 'DSC' : 'STB'}
                    </span>
                    <p className={`font-mono uppercase tracking-widest truncate ${isTop3 ? 'text-[#D4AF37] text-[9px] md:text-[10px]' : 'text-white/40 text-[8px] md:text-[9px]'}`}>
                      {item.artist}
                    </p>
                  </div>
                  <h3 className={`font-bold uppercase tracking-tight truncate transition-all group-hover:text-[#D4AF37]
                    ${isTop3 
                      ? 'text-2xl md:text-4xl text-white' 
                      : 'text-lg md:text-2xl text-white/90'
                    }`}
                  >
                    {item.song}
                  </h3>
                </div>
              </div>

              <div className={`flex items-center justify-between w-full md:w-auto md:ml-auto gap-4 md:gap-10 pl-2 md:pl-0 pt-3 md:pt-0 
                ${isTop3 ? 'md:border-none' : 'border-t border-white/5 md:border-none'}`}>
                
                <div className="text-left md:text-right">
                  <span className={`block font-mono uppercase tracking-[0.3em] ${isTop3 ? 'text-[#D4AF37] text-[8px]' : 'text-white/20 text-[6px] md:text-[7px]'}`}>
                    Volume
                  </span>
                  <span className={`font-black italic transition-colors 
                    ${isTop3 ? 'text-2xl md:text-3xl text-white' : 'text-base md:text-lg text-white/90 group-hover:text-white'}`}>
                    {item.votes}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onVote(item.song, 'up')}
                    className={`flex items-center justify-center rounded-full border transition-all active:scale-90
                      ${isTop3 
                        ? 'w-10 h-10 md:w-14 md:h-14 bg-[#b91c1c] border-[#D4AF37] text-white hover:bg-white hover:text-black' 
                        : 'w-8 h-8 md:w-10 md:h-10 border-white/10 bg-white/5 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                      }`}
                    aria-label="Vote Up"
                  >
                    <svg width={isTop3 ? "20" : "14"} height={isTop3 ? "20" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onVote(item.song, 'down')}
                    className={`flex items-center justify-center rounded-full border transition-all active:scale-90
                      ${isTop3 
                        ? 'w-10 h-10 md:w-14 md:h-14 bg-transparent border-[#b91c1c] text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white' 
                        : 'w-8 h-8 md:w-10 md:h-10 border-white/10 bg-white/5 hover:border-white hover:text-white'
                      }`}
                    aria-label="Vote Down"
                  >
                    <svg width={isTop3 ? "20" : "14"} height={isTop3 ? "20" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                  </button>
                </div>
              </div>

              {!isTop3 && (
                <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-white/5 group-hover:bg-[#D4AF37]/40 transition-all" />
              )}
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
      `}</style>
    </section>
  );
}