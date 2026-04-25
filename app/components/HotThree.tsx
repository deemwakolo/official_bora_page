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
      title: 'Global Hot',
      accent: '#FF0000',
      song: 'Sielewi',
      artist: 'Dee',
      stats: '2.4M',
      icon: (
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor" />
      )
    },
    {
      id: 'voted',
      title: 'Fan Feed',
      accent: '#D4AF37',
      song: 'The Rock',
      artist: 'Rocky',
      stats: '84K',
      icon: (
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" fill="currentColor" />
      )
    },
    {
      id: 'boomplay',
      title: 'Core Sync',
      accent: '#00E5FF', 
      song: "Spirit",
      artist: 'Matitu',
      stats: '1.2M',
      icon: (
        <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
      )
    }
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-2 py-6 -mt-8 relative z-30">
      <div className="grid grid-cols-3 gap-2 md:gap-6 items-stretch">
        {hotData.map((item) => (
          <div key={item.id} className="relative group flex flex-col h-full">
            {/* Glow */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-all duration-700 blur-[40px] scale-90 group-hover:scale-110 pointer-events-none"
              style={{ backgroundColor: item.accent }}
            />

            {/* CARD BODY: flex flex-col h-full ensures all cards are same height */}
            <div 
              className="relative flex flex-col h-full bg-gradient-to-br from-[#0a0a0a] to-[#030303] p-3 md:p-6 transition-all duration-500 border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]"
              style={{ 
                clipPath: 'polygon(0 0, 90% 0, 100% 15%, 100% 100%, 10% 100%, 0 85%)',
              }}
            >
              {/* Background Logo */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 md:w-40 md:h-40 opacity-[0.07] group-hover:opacity-[0.15] group-hover:rotate-[-12deg] transition-all duration-700 pointer-events-none z-0">
                <svg className="w-full h-full" style={{ color: item.accent }} viewBox="0 0 24 24">
                  {item.icon}
                </svg>
              </div>

              {/* Scanlines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_4px] pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="font-mono text-[7px] md:text-[10px] text-white/60 font-bold tracking-[0.4em] uppercase truncate pr-1">
                  {item.title}
                </span>
                <div 
                  className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse flex-shrink-0" 
                  style={{ 
                    backgroundColor: item.accent, 
                    boxShadow: `0 0 12px ${item.accent}` 
                  }} 
                />
              </div>

              {/* SONG INFO - flex-grow pushes the footer to the bottom */}
              <div className="mb-6 relative z-10 flex-grow">
                <h3 className="font-cinzel text-[10px] sm:text-xs md:text-2xl font-black text-white tracking-[0.1em] md:tracking-[0.15em] uppercase leading-tight group-hover:translate-x-1 transition-transform truncate">
                  {item.song}
                </h3>
                <div className="h-[2px] w-4 md:w-8 mt-2 transition-all duration-500 group-hover:w-1/2" style={{ backgroundColor: item.accent }} />
                <p className="font-mono text-[7px] md:text-[12px] text-white/40 font-medium tracking-widest uppercase mt-2 truncate">
                  {item.artist}
                </p>
              </div>

              {/* FOOTER AREA - locked to bottom */}
              <div className="flex items-end justify-between pt-3 border-t border-white/5 relative z-10 mt-auto">
                <div className="flex flex-col">
                  <span className="font-mono text-[5px] md:text-[8px] text-white/30 uppercase tracking-[0.2em]">Pulse</span>
                  <span className="font-cinzel text-[10px] md:text-2xl font-black italic text-white drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] mt-1">
                    {item.stats}
                  </span>
                </div>
              </div>

              {/* Sidebar */}
              <div 
                className="absolute top-0 left-0 h-full w-[3px] md:w-[5px]"
                style={{ 
                  background: `linear-gradient(to bottom, ${item.accent}, transparent)`,
                  boxShadow: `2px 0 15px ${item.accent}44`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}