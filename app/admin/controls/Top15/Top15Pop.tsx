'use client';

import React from 'react';

import Top15Op from './Top15Op';

interface Top15PopProps {
  position: number;
  onClose: () => void;
}

export default function Top15Pop({
  position,
  onClose,
}: Top15PopProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* BACKDROP */}

      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onClick={onClose}
      />

      {/* FLOATING POPUP */}

      <div
        className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-xl border sm:max-w-2xl"
        style={{
          borderColor: 'var(--bora-border-strong)',
          backgroundColor:
            'color-mix(in srgb, var(--bora-background) 94%, transparent)',
          boxShadow:
            '0 25px 70px rgba(0,0,0,0.45), 0 0 35px var(--bora-gold-glow)',
        }}
      >
        {/* TOP BAR */}

        <div
          className="flex items-center justify-between border-b px-3 py-2.5 sm:px-4 sm:py-3"
          style={{
            borderColor: 'var(--bora-border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="font-cinzel text-xs font-black sm:text-sm"
              style={{
                color: 'var(--bora-gold)',
              }}
            >
              {String(position).padStart(2, '0')}
            </span>

            <div>
              <p
                className="text-[7px] font-black uppercase tracking-[0.18em] sm:text-[8px]"
                style={{
                  color: 'var(--bora-text)',
                }}
              >
                TOP 15
              </p>

              <p
                className="mt-0.5 text-[5px] uppercase tracking-[0.14em] sm:text-[6px]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                Position {String(position).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* CLOSE */}

          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md border text-base leading-none transition-all duration-200 sm:h-7 sm:w-7"
            style={{
              borderColor: 'var(--bora-border)',
              color: 'var(--bora-text-muted)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* CONTENT */}

        <div className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[0.8fr_1.2fr]">
          {/* GRAPHICS */}

          <div
            className="flex items-center justify-center border-r p-3 sm:p-5"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-background-deep) 72%, transparent)',
            }}
          >
            <div
              className="relative flex aspect-square w-full max-w-[76px] items-center justify-center overflow-hidden rounded-md border sm:max-w-[180px] sm:rounded-lg"
              style={{
                borderColor: 'var(--bora-border-strong)',
                backgroundColor: 'var(--bora-surface)',
              }}
            >
              {/* POSITION */}

              <div className="text-center">
                <p
                  className="font-cinzel text-2xl font-black sm:text-5xl"
                  style={{
                    color: 'var(--bora-text-subtle)',
                  }}
                >
                  {String(position).padStart(2, '0')}
                </p>

                <p
                  className="mt-1 text-[5px] font-black uppercase tracking-[0.15em] sm:mt-2 sm:text-[6px]"
                  style={{
                    color: 'var(--bora-text-subtle)',
                  }}
                >
                  Graphic
                </p>

                <p
                  className="mt-0.5 text-[4px] uppercase tracking-[0.1em] sm:mt-1 sm:text-[5px]"
                  style={{
                    color: 'var(--bora-text-subtle)',
                  }}
                >
                  Cover artwork
                </p>
              </div>
            </div>
          </div>

          {/* OPERATIONS */}

          <div className="min-w-0">
            <Top15Op position={position} />
          </div>
        </div>
      </div>
    </div>
  );
}