'use client';

import React, { useRef, useState } from 'react';

import WeeklyOP, {
  weeklyChartData,
} from './WeeklyOP';
import MonthlyOP, {
  monthlyChartData,
} from './MonthlyOP';
import {
  MomentChartData,
  MomentChartHeader,
} from './MomentChart';

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

// PANE REGISTRY — GUI moja, operators mbili.
// Weekly na Monthly zote zinatumia GUI hii hii (hakuna duplicate).
// data inatoka kwa operator husika (MomentGUI haihardcode period/date).
const panes: {
  id: ChartPeriod;
  Pane: React.ComponentType;
  data: MomentChartData;
}[] = [
  {
    id: 'weekly',
    Pane: WeeklyOP,
    data: weeklyChartData,
  },
  {
    id: 'monthly',
    Pane: MonthlyOP,
    data: monthlyChartData,
  },
];

export default function MomentGUI() {

  // PERIOD INAYOONYESHWA KWA SASA (state moja inasimamia
  // switcher, carousel, na indicators)
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

  // DATA YA PERIOD ACTIVE (period label + date + highlights)
  const activeData =
    panes[activeIndex]?.data ?? panes[0].data;

  // KUHAMIA KWENYE PANE FULANI
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

  // KUFUATILIA PANE INAYOONEKANA
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

    // KUSHOTO = PANE INAYOFUATA
    if (delta < -threshold) {
      goToIndex(activeIndex + 1);
      return;
    }

    // KULIA = PANE ILIYOPITA
    if (delta > threshold) {
      goToIndex(activeIndex - 1);
    }
  };

  return (
    <section
      className="w-full pb-4 pt-5"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >

      {/* CHART HEADER — BORA / TOP 10 SONGS / PERIOD CHART / DATE */}
      <div className="mb-5">
        <MomentChartHeader data={activeData} />
      </div>

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
          {panes.map((pane, index) => {

            const active = activePeriod === pane.id;

            return (
              <button
                key={pane.id}
                type="button"
                onClick={() => goToIndex(index)}
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
                  {periodLabels[pane.id]}
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

        {panes.map(({ id, Pane }) => (

          <div
            key={id}
            className="w-full shrink-0 snap-center px-4"
          >
            <Pane />
          </div>

        ))}

      </div>

    </section>
  );
}
