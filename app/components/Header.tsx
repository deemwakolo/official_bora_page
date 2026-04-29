'use client';

import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#040404] border-b border-white/5 overflow-hidden">

      {/* 🌌 BACKGROUND LAYER (cleaned + controlled) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black" />

        {/* soft gold system glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[180px] bg-[#D4AF37]/10 blur-[120px]" />
      </div>

      {/* 🎭 TINGA ASSET (NOW SUBTLE TEXTURE LAYER) */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-20"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0) 100%)',
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">

        {/* LEFT: BRAND */}
        <Link href="/" className="flex flex-col group">

          <div className="flex items-center gap-2">
            <span className="w-1 h-5 bg-[#b91c1c] group-hover:h-6 transition-all" />

            <h1 className="font-cinzel text-xl md:text-3xl font-black text-white uppercase tracking-tight">
              Bora<span className="text-[#D4AF37]">Charts</span>
            </h1>
          </div>

          <span className="text-[8px] tracking-[0.5em] text-white/30 uppercase ml-3 mt-1">
            Matitu Central Registry
          </span>

        </Link>

        {/* CENTER: NAV (CLEANER SYSTEM STYLE) */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/[0.02] border border-white/5 px-2 py-1">

          {['Top 20', 'Drops', 'News'].map((item) => (
            <a
              key={item}
              href="#"
              className="px-5 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#D4AF37] hover:bg-white/[0.03] transition"
            >
              {item}
            </a>
          ))}

          <Link
            href="/Faq"
            className="px-5 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-[#D4AF37] hover:bg-[#b91c1c]/10 transition"
          >
            Intel
          </Link>

        </nav>

        {/* RIGHT: SYSTEM STATUS */}
        <div className="flex flex-col items-end font-mono">

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-[#b91c1c] opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-[#b91c1c]" />
            </span>

            <span className="text-[9px] uppercase tracking-widest text-white font-bold">
              Live System
            </span>
          </div>

          <div className="hidden sm:flex gap-3 mt-1 text-[8px]">

            <span className="text-[#D4AF37] border-r border-white/10 pr-2">
              2026.04.26
            </span>

            <span className="text-white/30">
              EAT 20:46
            </span>

          </div>

        </div>

      </div>

      {/* SIGNAL LINE */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=swap');
      `}</style>

    </header>
  );
}