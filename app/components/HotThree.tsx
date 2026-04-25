'use client';

import React, { JSX } from 'react';

interface HotItem {
  id: string;
  title: string;
  accent: string;
  song: string;
  artist: string;
  stats: string;
  icon: JSX.Element;
}

export default function HotThree() {
  const hotData: HotItem[] = [
    {
      id: 'youtube',
      title: 'Global Sync',
      accent: '#FF0000',
      song: 'Sielewi',
      artist: 'Dee',
      stats: '2.4M',
      icon: (
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z M9.75 15.02l5.75-3.02-5.75-3.02v6.04z" fill="currentColor" />
      )
    },
    {
      id: 'voted',
      title: 'Public Feed',
      accent: '#D4AF37',
      song: 'The Rock',
      artist: 'Baby Rocky',
      stats: '84K',
      icon: (
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2" fill="none" />
      )
    },
    {
      id: 'boomplay',
      title: 'Stream Core',
      accent: '#C0C0C0',
      song: "Spirit",
      artist: 'Matitu',
      stats: '1.2M',
      icon: (
        <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
      )
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-1"> {/* Tightened further to move up */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Added gap for "Card" format */}
        {hotData.map((item) => (
          <div 
            key={item.id} 
            className="group relative bg-[#0a0a0a] border border-white/10 p-5 transition-all duration-500 hover:border-[#D4AF37]/30 hover:-translate-y-1 shadow-2xl"
          >
            {/* GLOW OVERLAY */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none"
              style={{ background: `radial-gradient(circle at top right, ${item.accent}, transparent)` }}
            />

            {/* HEADER AREA */}
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-[8px] text-white/40 tracking-[0.3em] uppercase">
                {item.title}
              </span>
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: item.accent, boxShadow: `0 0 10px ${item.accent}` }} 
              />
            </div>

            {/* CENTER CONTENT: SONG & BLENDED LOGO */}
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex flex-col min-w-0">
                <h3 className="font-cinzel text-xl font-black text-white tracking-tighter leading-none uppercase truncate mb-1">
                  {item.song}
                </h3>
                <p className="font-cinzel text-[10px] text-[#C0C0C0] opacity-60 tracking-widest uppercase">
                  {item.artist}
                </p>
              </div>

              {/* BRAND LOGO (Blended Right) */}
              <svg 
                className="w-8 h-8 opacity-10 group-hover:opacity-40 transition-all duration-500 flex-shrink-0" 
                style={{ color: item.accent }} 
                viewBox="0 0 24 24"
              >
                {item.icon}
              </svg>
            </div>

            {/* FOOTER AREA: STATS */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-white/20 uppercase tracking-widest">Aggregate Score</span>
                <span className="font-cinzel text-sm font-black text-[#D4AF37]">
                  {item.stats}
                </span>
              </div>
              
              {/* MINI RADAR SYMBOL */}
              <div className="flex gap-1 items-end h-3">
                {[40, 70, 50].map((h, i) => (
                   <div 
                    key={i} 
                    className="w-[2px] bg-white/20 group-hover:bg-[#D4AF37] transition-all duration-500" 
                    style={{ height: `${h}%` }} 
                   />
                ))}
              </div>
            </div>

            {/* HOVER BORDER HOOK */}
            <div 
              className="absolute top-0 left-0 h-full w-[2px] scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top"
              style={{ backgroundColor: item.accent }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}