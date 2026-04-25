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
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor" />
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
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" fill="currentColor" />
      )
    },
    {
      id: 'boomplay',
      title: 'Stream Core',
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
    <>
      <section className="w-full max-w-4xl mx-auto px-4 py-2 -mt-4 relative z-30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {hotData.map((item) => (
            <div key={item.id} className="relative group">
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-700 blur-[30px] pointer-events-none"
                style={{ backgroundColor: item.accent }}
              />

              <div 
                className="relative bg-[#070707] p-3 transition-all duration-500 hover:bg-[#090909] border border-white/5 overflow-hidden shadow-xl"
                style={{ 
                  clipPath: 'polygon(0 0, 96% 0, 100% 10%, 100% 100%, 4% 100%, 0 90%)',
                }}
              >
                <div 
                  className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none"
                  style={{ 
                    backgroundImage: `linear-gradient(0deg, transparent 50%, rgba(255,255,255,0.08) 50%)`,
                    backgroundSize: '100% 3px'
                  }}
                />

                <div className="absolute -bottom-1 -right-1 w-24 h-24 pointer-events-none transition-all duration-700 group-hover:scale-110">
                  <svg 
                    className="absolute inset-0 w-full h-full opacity-[0.2] group-hover:opacity-[0.6] transition-all duration-500 blur-[0.3px]"
                    style={{ 
                      color: item.accent,
                      filter: `drop-shadow(0 0 10px ${item.accent})`,
                      maskImage: 'radial-gradient(circle at 75% 75%, black 20%, transparent 80%)',
                      WebkitMaskImage: 'radial-gradient(circle at 75% 75%, black 20%, transparent 80%)'
                    }} 
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                </div>

                <div className="flex items-center justify-between mb-1.5 relative z-10 font-mono">
                  <span className="text-[6px] text-white/30 tracking-[0.4em] uppercase group-hover:text-white/60">
                    {item.title}
                  </span>
                  <div 
                    className="w-1 h-1 rounded-full animate-pulse" 
                    style={{ 
                      backgroundColor: item.accent, 
                      boxShadow: `0 0 10px ${item.accent}` 
                    }} 
                  />
                </div>

                <div className="mb-4 relative z-10">
                  <h3 className="font-cinzel text-lg font-black text-white tracking-widest leading-tight uppercase truncate">
                    {item.song}
                  </h3>
                  <p className="font-cinzel text-[8px] text-white/40 tracking-[0.2em] uppercase mt-0.5">
                    {item.artist}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-white/10 relative z-10">
                  <div className="flex flex-col">
                    <span className="font-mono text-[5px] text-white/20 uppercase tracking-widest">Index</span>
                    <span className="font-cinzel text-sm font-black italic" style={{ color: '#D4AF37' }}>
                      {item.stats}
                    </span>
                  </div>
                  
                  <div className="flex gap-[1.5px] items-end h-3 opacity-40 group-hover:opacity-100 transition-opacity">
                    {[3, 10, 5, 12].map((h, i) => (
                      <div 
                        key={i} 
                        className="w-[1px] transition-all duration-500" 
                        style={{ 
                            height: `${h}px`, 
                            backgroundColor: i === 3 ? item.accent : 'white',
                            boxShadow: i === 3 ? `0 0 5px ${item.accent}` : 'none'
                        }} 
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                
                <div 
                  className="absolute top-0 left-0 h-full w-[1.5px] transition-all duration-500 group-hover:shadow-[1px_0_10px_currentColor]"
                  style={{ backgroundColor: item.accent, color: item.accent }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}