'use client';

import React from 'react';
import Link from 'next/link';

/**
 * BORA CHARTS HEADER - "THE ARCHIVE" EDITION
 * Full-bleed Tinga asset injection with negative vertical flow.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#050505] border-b border-[#b91c1c]/30 overflow-hidden">
      
      {/* TACTICAL ASSET INJECTION: Tinga.png (Full Width / Top-Down) */}
      <div 
        className="absolute top-0 left-0 right-0 w-full h-full pointer-events-none z-0"
        style={{ 
          backgroundImage: "url('/assets/Tinga.png')",
          // 'cover' ensures the image occupies the full width from left to right
          backgroundSize: 'cover', 
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
          // MAINTAINED: Solid at top (0%), fading out toward the bottom (100%)
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)'
        }}
      />

      {/* GLITCH OVERLAY EFFECT */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/60-lines.png')]" />

      <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between relative z-10">
        
        {/* LEFT: PRIMARY BRANDING */}
        <Link href="/" className="flex flex-col group cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#b91c1c] group-hover:h-6 transition-all duration-300" />
            <h1 className="font-cinzel text-xl md:text-3xl font-black text-white uppercase tracking-tighter leading-none">
              Bora<span className="text-[#D4AF37] italic">Charts</span>
            </h1>
          </div>
          <span className="text-[7px] md:text-[8px] font-mono tracking-[0.4em] md:tracking-[0.6em] text-white/30 uppercase mt-1 ml-3">
            Matitu Central Registry
          </span>
        </Link>

        {/* CENTER: NAV (TACTICAL STYLE) */}
        <nav className="hidden lg:flex items-center bg-white/[0.03] border border-white/5 rounded-sm px-2 backdrop-blur-sm">
          {['Top 20', 'Drops', 'News'].map((item) => (
            <a
              key={item}
              href="#"
              className="px-6 py-2 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#D4AF37] hover:bg-white/[0.02] transition-all border-x border-transparent hover:border-white/5"
            >
              {item}
            </a>
          ))}
          <Link
            href="/Faq"
            className="px-6 py-2 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-[#D4AF37] hover:bg-[#b91c1c]/10 transition-all border-l border-white/5"
          >
            Intel
          </Link>
        </nav>

        {/* RIGHT: METRIC STATUS */}
        <div className="flex flex-col items-end font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b91c1c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#b91c1c]"></span>
            </span>
            <span className="text-[9px] md:text-[10px] text-white font-bold tracking-widest uppercase">
              System Live
            </span>
          </div>
          
          <div className="hidden sm:flex gap-3 mt-1">
            <span className="text-[8px] md:text-[9px] text-[#D4AF37] border-r border-white/10 pr-3">
              APR 26. 2026
            </span>
            <span className="text-[8px] md:text-[9px] text-white/30 tracking-tighter uppercase">
              20:46:26 EAT
            </span>
          </div>
        </div>

      </div>

      {/* BOTTOM SCANLINE */}
      <div className="w-full h-[1px] md:h-[2px] bg-gradient-to-r from-[#b91c1c] via-[#D4AF37] to-transparent opacity-60" />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=swap');
      `}</style>

    </header>
  );
}