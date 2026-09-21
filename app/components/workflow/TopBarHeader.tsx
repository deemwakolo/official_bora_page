'use client';

import Link from 'next/link';

export default function TopBarHeader() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* TINGA TEXTURE — INAKANDAMIZWA NDANI YA COMPACT BAR */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 origin-top"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)',
          opacity: 'calc(0.70 - 0.52 * var(--bora-hp))',
          transform:
            'scale(calc(1 - 0.45 * var(--bora-hp)))',
        }}
      />

      {/* DARK OVERLAY */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background) 20%, transparent), color-mix(in srgb, var(--bora-background-deep) 65%, transparent), var(--bora-background-deep))',
          opacity: 'calc(1 - 0.55 * var(--bora-hp))',
        }}
      />

      {/* GOLD GLOW */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-90px] h-[220px] w-[650px] rounded-full blur-[120px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
          opacity: 'calc(1 - var(--bora-hp))',
          transform:
            'translateX(-50%) scale(calc(1 - 0.5 * var(--bora-hp)))',
        }}
      />

      {/* BORA — ELEMENT MOJA INAYOBADILIKA (EXPANDED -> COMPACT) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <Link
          href="/"
          aria-label="BORA home"
          className="pointer-events-auto flex flex-col items-center justify-center"
          style={{ color: 'var(--bora-text)' }}
        >
          <h1
            className="
              bora-hdr-brand
              font-cinzel
              font-black
              uppercase
              leading-none
              tracking-[-0.045em]
            "
          >
            BORA
            <span
              style={{ color: 'var(--bora-gold)' }}
            >
              .
            </span>
          </h1>

          <p
            className="
              bora-hdr-tagline
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
              opacity:
                'calc(0.75 - 0.75 * var(--bora-hp))',
            }}
          >
            TANZANIA MUSIC CHART
          </p>
        </Link>
      </div>
    </div>
  );
}
