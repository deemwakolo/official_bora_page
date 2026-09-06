'use client';

import React from 'react';

import Link from 'next/link';

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 w-full overflow-hidden border-b"
      style={{
        backgroundColor: 'var(--bora-background-deep)',
        borderColor: 'var(--bora-border)',
        color: 'var(--bora-text)',
      }}
    >
      {/* TINGA TEXTURE */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.70]"
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
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background) 20%, transparent), color-mix(in srgb, var(--bora-background-deep) 65%, transparent), var(--bora-background-deep))',
        }}
      />

      {/* SUBTLE GOLD GLOW */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-90px] h-[220px] w-[650px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

      {/* MAIN MASTHEAD */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex h-[105px] items-center justify-center md:h-[125px]">
          {/* CENTERED BRAND */}
          <Link
            href="/"
            className="group flex flex-col items-center justify-center"
          >
            <h1
              className="
                font-cinzel
                text-[40px]
                font-black
                uppercase
                leading-none
                tracking-[-0.045em]
                transition-all
                duration-300
                sm:text-[46px]
                md:text-[60px]
              "
              style={{
                color: 'var(--bora-text)',
              }}
            >
              BORA
              <span style={{ color: 'var(--bora-gold)' }}>
                .
              </span>
            </h1>

            {/* TAGLINE */}
            <p
              className="
                mt-2
                whitespace-nowrap
                text-[7px]
                font-bold
                uppercase
                tracking-[0.30em]
                sm:text-[8px]
                sm:tracking-[0.36em]
                md:text-[10px]
                md:tracking-[0.42em]
              "
              style={{
                color: 'var(--bora-gold)',
                opacity: 0.75,
              }}
            >
              TANZANIA MUSIC CHART
            </p>
          </Link>

          {/* LIVE */}
          <div
            className="
              absolute
              right-4
              top-1/2
              flex
              -translate-y-1/2
              items-center
              gap-2
              font-mono
              md:right-8
            "
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                style={{
                  backgroundColor: 'var(--bora-red)',
                }}
              />

              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--bora-red)',
                }}
              />
            </span>

            <span
              className="hidden text-[8px] font-bold uppercase tracking-[0.2em] sm:block"
              style={{
                color: 'var(--bora-text-muted)',
              }}
            >
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* SOFT TRANSITION INTO BORA SHELL */}
      <div
        className="relative z-10 h-[12px]"
        style={{
          background:
            'linear-gradient(to bottom, var(--bora-gold-glow), transparent)',
        }}
      />
    </header>
  );
}