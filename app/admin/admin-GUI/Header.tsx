'use client';

import React from 'react';
import { Activity } from 'lucide-react';

export default function Header() {
  return (
    <header
      className="relative w-full overflow-hidden border-b"
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
        className="pointer-events-none absolute left-1/2 top-[-70px] h-[180px] w-[500px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

      {/* ADMIN HEADER CONTENT */}

      <div className="relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">

        {/* BRAND */}

        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center border"
            style={{
              borderColor: 'var(--bora-red)',
              color: 'var(--bora-red)',
            }}
          >
            <Activity size={14} />
          </div>

          <div>
            <div
              className="font-cinzel text-[12px] font-black uppercase tracking-[0.18em]"
              style={{
                color: 'var(--bora-text)',
              }}
            >
              BORA
            </div>

            <div
              className="text-[7px] font-bold uppercase tracking-[0.2em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              Control Room
            </div>
          </div>
        </div>

        {/* STATUS */}

        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{
              backgroundColor: 'var(--bora-green)',
            }}
          />

          <span
            className="text-[7px] font-black uppercase tracking-[0.18em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Admin Online
          </span>
        </div>

      </div>
    </header>
  );
}