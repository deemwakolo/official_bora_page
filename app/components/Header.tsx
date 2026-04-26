'use client';

import React from 'react';

/**
 * BORA CHARTS HEADER - "THE ARCHIVE" EDITION
 * Shifted to a high-contrast, wider layout with asymmetrical accents.
 * Focuses on a premium "Dashboard" feel with sharpened typography.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#050505] border-b border-[#b91c1c]/30">
      
      {/* GLITCH OVERLAY EFFECT */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/60-lines.png')]" />

      <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between relative z-10">
        
        {/* LEFT: PRIMARY BRANDING */}
        <div className="flex flex-col group cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#b91c1c] group-hover:h-6 transition-all duration-300" />
            <h1 className="font-cinzel text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">
              Bora<span className="text-[#D4AF37] italic">Charts</span>
            </h1>
          </div>
          <span className="text-[8px] font-mono tracking-[0.6em] text-white/30 uppercase mt-1 ml-3">
            Matitu Central Registry
          </span>
        </div>

        {/* CENTER: NAV (TACTICAL STYLE) */}
        <nav className="hidden lg:flex items-center bg-white/[0.03] border border-white/5 rounded-sm px-2">
          {['Top 20', 'Drops', 'News'].map((item) => (
            <a
              key={item}
              href="#"
              className="px-6 py-2 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#D4AF37] hover:bg-white/[0.02] transition-all border-x border-transparent hover:border-white/5"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* RIGHT: METRIC STATUS */}
        <div className="flex flex-col items-end font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b91c1c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#b91c1c]"></span>
            </span>
            <span className="text-[10px] text-white font-bold tracking-widest uppercase">
              System Live
            </span>
          </div>
          <div className="flex gap-3 mt-1">
            <span className="text-[9px] text-[#D4AF37] border-r border-white/10 pr-3">
              APR 26. 2026
            </span>
            <span className="text-[9px] text-white/30 tracking-tighter">
              18:58:47 EAT
            </span>
          </div>
        </div>

      </div>

      {/* BOTTOM SCANLINE */}
      <div className="w-full h-[2px] bg-gradient-to-r from-[#b91c1c] via-[#D4AF37] to-transparent opacity-60" />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=swap');
      `}</style>

    </header>
  );
}