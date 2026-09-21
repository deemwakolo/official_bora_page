'use client';

import Link from 'next/link';

interface TopBarHeaderProps {
  retracted: boolean;
}

export default function TopBarHeader({
  retracted,
}: TopBarHeaderProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* EXPANDED BACKGROUND */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          retracted ? 'opacity-0' : 'opacity-[0.70]'
        }`}
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

      {/* DARK OVERLAY */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          retracted ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background) 20%, transparent), color-mix(in srgb, var(--bora-background-deep) 65%, transparent), var(--bora-background-deep))',
        }}
      />

      {/* GOLD GLOW */}
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-[-90px] h-[220px] w-[650px] -translate-x-1/2 rounded-full blur-[120px] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          retracted ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

      {/* EXPANDED BORA */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          retracted
            ? 'pointer-events-none opacity-0'
            : 'z-10 opacity-100'
        }`}
      >
        <Link
          href="/"
          aria-label="BORA home"
          tabIndex={retracted ? -1 : 0}
          className="flex flex-col items-center justify-center"
        >
          <h1
            className="
              font-cinzel
              text-[40px]
              font-black
              uppercase
              leading-none
              tracking-[-0.045em]
              sm:text-[46px]
              md:text-[60px]
            "
            style={{
              color: 'var(--bora-text)',
            }}
          >
            BORA
            <span style={{ color: 'var(--bora-gold)' }}>.</span>
          </h1>

          <p
            className="
              mt-2 whitespace-nowrap
              text-[7px] font-bold uppercase tracking-[0.30em]
              sm:text-[8px] sm:tracking-[0.36em]
              md:text-[10px] md:tracking-[0.42em]
            "
            style={{
              color: 'var(--bora-gold)',
              opacity: 0.75,
            }}
          >
            TANZANIA MUSIC CHART
          </p>
        </Link>
      </div>

      {/* RETRACTED MAST */}
      <div
        className={`
          absolute inset-0
          flex items-center justify-center
          transition-all
          duration-700
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${
            retracted
              ? 'z-[100] opacity-100'
              : 'pointer-events-none -z-10 opacity-0'
          }
        `}
      >
        <Link
          href="/"
          aria-label="BORA home"
          tabIndex={retracted ? 0 : -1}
          className="
            pointer-events-auto
            font-cinzel
            text-[22px]
            font-black
            uppercase
            leading-none
            tracking-[-0.045em]
          "
          style={{
            color: 'var(--bora-text)',
          }}
        >
          BORA
          <span style={{ color: 'var(--bora-gold)' }}>.</span>
        </Link>
      </div>
    </div>
  );
}