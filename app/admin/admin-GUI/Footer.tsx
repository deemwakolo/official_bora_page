'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer
      className="relative w-full overflow-hidden border-t"
      style={{
        backgroundColor: 'var(--bora-background-deep)',
        borderColor: 'var(--bora-border)',
        color: 'var(--bora-text)',
      }}
    >
      {/* TINGA BACKGROUND */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
          maskImage:
            'linear-gradient(to top, black 0%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, black 35%, transparent 100%)',
        }}
      />

      {/* DARK FADE */}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, color-mix(in srgb, var(--bora-background) 20%, transparent), color-mix(in srgb, var(--bora-background-deep) 65%, transparent), var(--bora-background-deep))',
        }}
      />

      {/* SUBTLE GOLD GLOW */}

      <div
        className="pointer-events-none absolute bottom-[-80px] left-1/2 h-[180px] w-[500px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

      {/* CONTENT */}

      <div className="relative z-10 mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">

        {/* LEFT */}

        <div>
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text-muted)',
            }}
          >
            Editorial Control System
          </p>

          <p
            className="mt-1 text-[6px] uppercase tracking-[0.15em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            BORA Administration
          </p>
        </div>

        {/* RIGHT */}

        <div className="text-right">
          <p
            className="text-[7px] font-black uppercase tracking-[0.15em]"
            style={{
              color: 'var(--bora-gold)',
            }}
          >
            MATITU NATION
          </p>

          <p
            className="mt-1 text-[6px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            BORA // CONTROL
          </p>
        </div>

      </div>
    </footer>
  );
}