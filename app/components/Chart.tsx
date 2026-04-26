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
    <section className="w-full max-w-5xl mx-auto px-6 pt-2 pb-12 bg-transparent text-[#f0f0f0]">
      
      <div className="grid gap-px bg-white/5 border-t border-white/5">
        {fullData.map((item) => {
          return (
            <div
              key={item.rank}
              className="group relative flex items-center bg-[#0a0a0a] py-8 px-4 transition-all duration-500 hover:bg-[#111]"
            >
              {/* ROTATING VINYL COVER */}
              <div className="relative flex-shrink-0 mr-8">
                <div className="relative w-20 h-20 md:w-24 md:h-24 overflow-hidden rounded-full border-2 border-white/5 group-hover:border-[#D4AF37]/50 transition-all duration-700 group-hover:rotate-[360deg]">
                  <img 
                    src={item.cover} 
                    alt="" 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0" 
                  />
                  {/* Center Hole Decor */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-[#0a0a0a] rounded-full border border-white/20 shadow-inner" />
                  </div>
                </div>
                {/* Ranking Tag */}
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-[#D4AF37] text-black font-black flex items-center justify-center text-xs rounded-sm transform -rotate-12 group-hover:rotate-0 transition-transform">
                  {item.rank}
                </div>
              </div>

              {/* TRACK INFO */}
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                    item.direction === 'up' ? 'bg-green-500/20 text-green-400' :
                    item.direction === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'
                  }`}>
                    {item.direction === 'up' ? 'ASC' : item.direction === 'down' ? 'DSC' : 'STB'}
                  </span>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{item.artist}</p>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight transition-all group-hover:text-[#D4AF37]">
                  {item.song}
                </h3>
              </div>

              {/* STATS & VOTING */}
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
                <div className="text-right">
                  <span className="block text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">Net Volume</span>
                  <span className="text-xl font-black italic text-white/90">{item.votes}</span>
                </div>

                {/* VOTING ARROWS */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onVote(item.song, 'up')}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all active:scale-90"
                    aria-label="Vote Up"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onVote(item.song, 'down')}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:border-red-600 hover:text-red-600 transition-all active:scale-90"
                    aria-label="Vote Down"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* SIDE ACCENT */}
              <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-white/5 group-hover:bg-[#D4AF37]/40 transition-colors" />
            </div>
          );
        })}
      </div>
    </section>
  );
}