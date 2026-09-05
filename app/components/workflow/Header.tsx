'use client';

import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full overflow-hidden bg-[#040404] border-b border-white/5">

      {/* TINGA TEXTURE */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.70]"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)',
        }}
      />

      {/* DARK FADE */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050505]/20 via-[#040404]/65 to-[#040404]" />

      {/* SUBTLE GOLD GLOW */}
      <div className="absolute left-1/2 top-[-90px] -translate-x-1/2 w-[650px] h-[220px] rounded-full bg-[#D4AF37]/[0.06] blur-[120px] pointer-events-none" />

      {/* MAIN MASTHEAD */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <div className="h-[105px] md:h-[125px] flex items-center justify-center">

          {/* CENTERED BRAND */}
          <Link
            href="/"
            className="group flex flex-col items-center justify-center"
          >
            <h1
              className="
                font-cinzel
                text-[40px]
                sm:text-[46px]
                md:text-[60px]
                font-black
                uppercase
                leading-none
                tracking-[-0.045em]
                text-white
                transition-all duration-300
              "
            >
              BORA<span className="text-[#D4AF37]">.</span>
            </h1>

            {/* TAGLINE */}
            <p
              className="
                mt-2
                whitespace-nowrap
                text-[7px]
                sm:text-[8px]
                md:text-[10px]
                font-bold
                uppercase
                tracking-[0.30em]
                sm:tracking-[0.36em]
                md:tracking-[0.42em]
                text-[#D4AF37]/75
              "
            >
              TANZANIA MUSIC CHART
            </p>
          </Link>

          {/* LIVE */}
          <div
            className="
              absolute
              right-4 md:right-8
              top-1/2
              -translate-y-1/2
              flex
              items-center
              gap-2
              font-mono
            "
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#b91c1c] opacity-50 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#b91c1c]" />
            </span>

            <span className="hidden sm:block text-[8px] font-bold uppercase tracking-[0.2em] text-white/50">
              LIVE
            </span>
          </div>

        </div>
      </div>

      {/* SOFT TRANSITION INTO BORA SHELL */}
      <div className="relative z-10 h-[12px] bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent" />

    </header>
  );
}