'use client';

import React from 'react';

import Link from 'next/link';

interface TopBarHeaderProps {
  retracted: boolean;
}

export default function TopBarHeader({
  retracted,
}: TopBarHeaderProps) {
  return (
    <>
      {/* TINGA TEXTURE */}
      <div
        aria-hidden
        className={`
          pointer-events-none absolute inset-0
          transition-opacity duration-500 ease-out
          ${retracted ? 'opacity-0' : 'opacity-[0.70]'}
        `}
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
        aria-hidden
        className={`
          pointer-events-none absolute inset-0
          transition-opacity duration-500 ease-out
          ${retracted ? 'opacity-0' : 'opacity-100'}
        `}
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background) 20%, transparent), color-mix(in srgb, var(--bora-background-deep) 65%, transparent), var(--bora-background-deep))',
        }}
      />

      {/* SUBTLE GOLD GLOW */}
      <div
        aria-hidden
        className={`
          pointer-events-none absolute left-1/2 top-[-90px] h-[220px] w-[650px] -translate-x-1/2
          rounded-full blur-[120px]
          transition-opacity duration-500 ease-out
          ${retracted ? 'opacity-0' : 'opacity-100'}
        `}
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

      {/* FULL MASTHEAD CONTENT */}
      <div
        className={`
          pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex max-w-7xl items-center
          justify-center px-4 transition-all duration-500 ease-out md:px-8
          ${
            retracted
              ? 'h-[56px] -translate-y-1 opacity-0'
              : 'h-[105px] translate-y-0 opacity-100 md:h-[125px]'
          }
        `}
      >
        {/* CENTERED BRAND */}
        <Link
          href="/"
          aria-label="BORA home"
          aria-hidden={retracted}
          tabIndex={retracted ? -1 : 0}
          className="group pointer-events-auto flex flex-col items-center justify-center"
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
          aria-hidden={retracted}
          className={`
            absolute
            right-4
            top-1/2
            z-10
            flex
            -translate-y-1/2
            items-center
            gap-2
            font-mono
            transition-all duration-500 ease-out
            md:right-8
            ${
              retracted
                ? 'pointer-events-none translate-x-2 opacity-0'
                : 'translate-x-0 opacity-100'
            }
          `}
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

      {/* COMPACT BRAND — INAONEKANA TU BAADA YA KURETRACT */}
      <Link
        href="/"
        aria-label="BORA home"
        aria-hidden={!retracted}
        tabIndex={retracted ? 0 : -1}
        className={`
          absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-cinzel
          text-[22px] font-black uppercase leading-none tracking-[-0.045em]
          transition-opacity duration-500 ease-out
          ${retracted ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
        style={{ color: 'var(--bora-text)' }}
      >
        BORA
        <span style={{ color: 'var(--bora-gold)' }}>.</span>
      </Link>
    </>
  );
}
