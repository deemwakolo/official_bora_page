'use client';

import React, { useRef, useState } from 'react';

// PERIOD ZA CHART
type ChartPeriod = 'weekly' | 'monthly';

const periods: ChartPeriod[] = [
  'weekly',
  'monthly',
];

const periodLabels = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

// PLACEHOLDER TOP 10 SONGS DATA
const placeholderSongs = [
  { rank: 1, title: 'PLACEHOLDER SONG 01', artist: 'PLACEHOLDER ARTIST' },
  { rank: 2, title: 'PLACEHOLDER SONG 02', artist: 'PLACEHOLDER ARTIST' },
  { rank: 3, title: 'PLACEHOLDER SONG 03', artist: 'PLACEHOLDER ARTIST' },
  { rank: 4, title: 'PLACEHOLDER SONG 04', artist: 'PLACEHOLDER ARTIST' },
  { rank: 5, title: 'PLACEHOLDER SONG 05', artist: 'PLACEHOLDER ARTIST' },
  { rank: 6, title: 'PLACEHOLDER SONG 06', artist: 'PLACEHOLDER ARTIST' },
  { rank: 7, title: 'PLACEHOLDER SONG 07', artist: 'PLACEHOLDER ARTIST' },
  { rank: 8, title: 'PLACEHOLDER SONG 08', artist: 'PLACEHOLDER ARTIST' },
  { rank: 9, title: 'PLACEHOLDER SONG 09', artist: 'PLACEHOLDER ARTIST' },
  { rank: 10, title: 'PLACEHOLDER SONG 10', artist: 'PLACEHOLDER ARTIST' },
];

export default function ChartsGUI() {

  // PERIOD INAYOONYESHWA KWA SASA
  const [activePeriod, setActivePeriod] =
    useState<ChartPeriod>('weekly');

  // CONTAINER YA CAROUSEL
  const carouselRef = useRef<HTMLDivElement>(null);

  // SWIPE GESTURE TRACKING
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const total = periods.length;

  // PERIOD PANE INAYOONEKANA KWA SASA
  const activeIndex = periods.indexOf(activePeriod);

  // KUHAMIA KWENYE CARD FULANI
  const goToIndex = (index: number) => {
    const clamped = Math.max(
      0,
      Math.min(total - 1, index)
    );

    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: clamped * carouselRef.current.clientWidth,
        behavior: 'smooth',
      });
    }

    setActivePeriod(periods[clamped]);
  };

  // KUFUATILIA CARD INAYOONEKANA
  const handleScroll = () => {
    if (!carouselRef.current) return;

    const width = carouselRef.current.clientWidth;

    if (!width) return;

    const index = Math.round(
      carouselRef.current.scrollLeft / width
    );

    const period = periods[index];

    if (period) {
      setActivePeriod(period);
    }
  };

  // KUANZA SWIPE
  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    touchStartX.current = event.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  // KUFUATILIA MWENDO WA SWIPE
  const handleTouchMove = (
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    if (touchStartX.current === null) return;

    touchDeltaX.current =
      event.touches[0].clientX - touchStartX.current;
  };

  // KUMALIZA SWIPE
  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;

    touchStartX.current = null;
    touchDeltaX.current = 0;

    // THRESHOLD YA SWIPE
    const threshold = 50;

    // KUSHOTO = CARD INAYOFUATA
    if (delta < -threshold) {
      goToIndex(activeIndex + 1);
      return;
    }

    // KULIA = CARD ILIYOPITA
    if (delta > threshold) {
      goToIndex(activeIndex - 1);
    }
  };

  return (
    <section
      className="w-full pb-8 pt-6"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >

      {/* PERIOD SWITCH */}
      <div className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-center px-4">
        <div
          className="flex items-stretch overflow-hidden rounded-full border"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--bora-surface-elevated) 72%, transparent)',
            borderColor:
              'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
          }}
        >
          {periods.map((period) => {

            const active = activePeriod === period;

            return (
              <button
                key={period}
                type="button"
                onClick={() => setActivePeriod(period)}
                className="relative px-6 py-3 text-[9px] font-black uppercase tracking-[0.24em] transition-all duration-300"
                style={{
                  color: active
                    ? 'var(--bora-text)'
                    : 'var(--bora-text-subtle)',
                }}
              >

                {/* GOLD GLOW YA PERIOD ACTIVE */}
                {active && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to bottom, color-mix(in srgb, var(--bora-gold) 9%, transparent), transparent 75%)',
                    }}
                  />
                )}

                <span className="relative z-10">
                  {periodLabels[period]}
                </span>

                {/* GOLD LINE YA PERIOD ACTIVE */}
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 h-[2px] w-[26px] -translate-x-1/2"
                    style={{
                      backgroundColor: 'var(--bora-gold)',
                    }}
                  />
                )}

              </button>
            );
          })}
        </div>
      </div>

      {/* CHART CAROUSEL */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        style={{
          touchAction: 'pan-y',
        }}
      >

        {periods.map((period) => (

          <div
            key={period}
            className="w-full shrink-0 snap-center px-4"
          >

            {/* PLACEHOLDER TOP 10 SONGS CHART */}
            <div
              className="mx-auto w-full max-w-3xl rounded-[1.75rem] border p-6 animate-[boraSectionIn_450ms_cubic-bezier(0.22,1,0.36,1)]"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--bora-surface-elevated) 72%, transparent)',
                borderColor:
                  'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
                boxShadow:
                  '0 25px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >

              {/* CARD HEADER */}
              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full border text-xl"
                    style={{
                      backgroundColor: 'var(--bora-gold-glow)',
                      borderColor:
                        'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
                    }}
                  >
                    🏆
                  </span>

                  <div className="flex flex-col">

                    <span className="font-cinzel text-sm font-bold tracking-[0.18em]">
                      TOP 10 SONGS
                    </span>

                    <span
                      className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em]"
                      style={{
                        color: 'var(--bora-text-subtle)',
                      }}
                    >
                      {periodLabels[period]} CHART
                    </span>

                  </div>

                </div>

                {/* PLACEHOLDER BADGE */}
                <span
                  className="rounded-full border px-3 py-1 text-[7px] font-black uppercase tracking-[0.2em]"
                  style={{
                    color: 'var(--bora-text-muted)',
                    borderColor: 'var(--bora-border)',
                  }}
                >
                  PLACEHOLDER
                </span>

              </div>

              {/* PLACEHOLDER SONG ROWS */}
              <div className="mt-6 flex flex-col gap-2">

                {placeholderSongs.map((song) => (

                  <div
                    key={`${period}-row-${song.rank}`}
                    className="flex items-center gap-4 rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--bora-surface-elevated) 60%, transparent)',
                      borderColor: 'var(--bora-border)',
                    }}
                  >

                    {/* RANK */}
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-black"
                      style={{
                        backgroundColor: 'var(--bora-gold-glow)',
                        borderColor:
                          'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
                        color: 'var(--bora-gold)',
                      }}
                    >
                      {song.rank}
                    </span>

                    {/* SONG + ARTIST */}
                    <div className="flex min-w-0 flex-1 flex-col">

                      <span className="truncate font-cinzel text-[11px] font-bold tracking-[0.14em]">
                        {song.title}
                      </span>

                      <span
                        className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.22em]"
                        style={{
                          color: 'var(--bora-text-subtle)',
                        }}
                      >
                        {song.artist}
                      </span>

                    </div>

                    {/* PLACEHOLDER SLEEVE */}
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg border"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--bora-surface-elevated) 90%, transparent)',
                        borderColor: 'var(--bora-border)',
                      }}
                    />

                  </div>

                ))}

              </div>

              {/* CARD FOOTER */}
              {/*
              <div
                className="mt-5 flex items-center justify-between border-t pt-4"
                style={{
                  borderColor: 'var(--bora-border)',
                }}
              >

                <span
                  className="text-[8px] font-bold uppercase tracking-[0.22em]"
                  style={{
                    color: 'var(--bora-text-subtle)',
                  }}
                >
                  CHART DATA ITAUNGANISHWA BAADAYE — TOP 10 SONGS
                </span>

                <span
                  className="text-[8px] font-black uppercase tracking-[0.22em]"
                  style={{
                    color: 'var(--bora-gold)',
                  }}
                >
                  {activeIndex + 1} / {total}
                </span>

              </div>
              */}

            </div>

          </div>

        ))}

      </div>

      {/* CAROUSEL INDICATORS */}
      <div className="mt-6 flex items-center justify-center gap-3">

        {periods.map((period, index) => {

          const active = activeIndex === index;

          return (
            <button
              key={`indicator-${period}`}
              type="button"
              onClick={() => goToIndex(index)}
              aria-label={periodLabels[period]}
              className="h-[3px] rounded-full transition-all duration-300"
              style={{
                width: active ? '32px' : '14px',
                backgroundColor: active
                  ? 'var(--bora-gold)'
                  : 'color-mix(in srgb, var(--bora-text-subtle) 55%, transparent)',
                boxShadow: active
                  ? '0 0 12px var(--bora-gold-glow)'
                  : 'none',
              }}
            />
          );
        })}

      </div>

    </section>
  );
}