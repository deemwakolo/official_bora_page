'use client';

import React, { useEffect, useRef, useState } from 'react';

import WeeklyOP from './WeeklyOP';
import MonthlyOP from './MonthlyOP';
import TopPerformers from './TopPerformers';
import {
  useMomentCharts,
  preloadMomentCharts,
  refreshMomentCharts,
} from './momentChartsCache';
import { MomentChartData, MomentChartHeader } from './MomentChart';

type ChartPeriod = 'weekly' | 'monthly';

const periods: ChartPeriod[] = ['weekly', 'monthly'];

const periodLabels: Record<ChartPeriod, string> = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

// SUPABASE NDIO SOURCE OF TRUTH (MomentOP hardcoded data haiko hapa tena).
// Wakati wa loading au kama DB haiko patoanalina, tunaonyesha hali tupu
// bila kuangusha ukurasa — hakuna fallback kwenye data ya zamani.
const emptyChart = (period: ChartPeriod): MomentChartData => ({
  title: 'TOP 10 SONGS',
  periodLabel: periodLabels[period],
  date: '',
  songs: [],
});

export default function MomentGUI() {
  // Charts come from the shared preload + cache store so the first
  // Charts visit and every return to it reuse data instead of refetching.
  const { weekly, monthly, status } = useMomentCharts();

  // Safety net: if the shell's preload has not produced data yet (e.g.
  // Charts mounted before the shell effect ran), kick the same deduped
  // loader. Fresh data short-circuits, so this never double-fetches.
  useEffect(() => {
    preloadMomentCharts();
  }, []);

  const [activePeriod, setActivePeriod] = useState<ChartPeriod>('weekly');
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const total = periods.length;
  const activeIndex = periods.indexOf(activePeriod);

  const hasData = status === 'ready' && (weekly !== null || monthly !== null);
  const hasError = status === 'error' && !hasData;

  const panes: {
    id: ChartPeriod;
    Pane: React.ComponentType<{ data: MomentChartData }>;
    data: MomentChartData;
  }[] = [
    { id: 'weekly', Pane: WeeklyOP, data: weekly ?? emptyChart('weekly') },
    { id: 'monthly', Pane: MonthlyOP, data: monthly ?? emptyChart('monthly') },
  ];

  const activeData = panes[activeIndex]?.data ?? panes[0].data;

  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(total - 1, index));

    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: clamped * carouselRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };
  const handleScroll = () => {
    if (!carouselRef.current) return;

    const width = carouselRef.current.clientWidth;
    if (!width) return;

    const index = Math.round(
      carouselRef.current.scrollLeft / width
    );

    const period = periods[index];

    if (period && period !== activePeriod) {
      setActivePeriod(period);
    }
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = event.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    const threshold = 50;
    if (delta < -threshold) { goToIndex(activeIndex + 1); return; }
    if (delta > threshold) { goToIndex(activeIndex - 1); }
  };

  // LOADING — shown only when there is no data to display yet (first
  // visit before the preload resolves). Cached data skips this entirely,
  // so a returning visitor never sees a spinner over real content.
  if (status === 'loading') {
    return (
      <section
        data-bora-ui="public-charts"
        className="w-full pb-4 pt-5"
        style={{ backgroundColor: 'var(--bora-background)', color: 'var(--bora-text)' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="mb-5">
            <MomentChartHeader data={emptyChart('weekly')} />
          </div>
          <div
            role="status"
            aria-live="polite"
            className="mx-auto w-full max-w-3xl py-16 text-center"
          >
            <span
              className="text-[10px] font-black uppercase tracking-[0.3em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              LOADING CHART…
            </span>
          </div>
        </div>
      </section>
    );
  }

  // ERROR — the first request failed and there is no prior good data to
  // show. Offer an explicit retry; the last good data (if any) would have
  // taken the ready branch above instead.
  if (hasError) {
    return (
      <section
        data-bora-ui="public-charts"
        className="w-full pb-4 pt-5"
        style={{ backgroundColor: 'var(--bora-background)', color: 'var(--bora-text)' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="mb-5">
            <MomentChartHeader data={emptyChart('weekly')} />
          </div>
          <div
            role="status"
            aria-live="polite"
            className="mx-auto w-full max-w-3xl py-16 text-center"
          >
            <span
              className="block text-[12px] font-bold"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Chart data is unavailable right now.
            </span>
            <button
              type="button"
              onClick={() => refreshMomentCharts()}
              className="mt-4 border px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-200 hover:text-[color:var(--bora-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--bora-gold)]"
              style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-muted)' }}
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-bora-ui="public-charts" className="w-full pb-4 pt-5" style={{ backgroundColor: 'var(--bora-background)', color: 'var(--bora-text)' }}>
      <div className="mb-5">
        <MomentChartHeader data={activeData} />
      </div>

      {/* SUBCATEGORY CHOOSER — TikTok-style in-screen tab row, directly beneath the heading */}
      <div
        data-bora-ui="public-charts-period-nav"
        className="mx-auto mb-6 w-full max-w-5xl overflow-x-auto scrollbar-hide"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex w-max min-w-full items-center justify-center gap-8 px-4">
          {panes.map((pane, index) => {
            const active = activePeriod === pane.id;
            return (
              <button
                key={pane.id}
                type="button"
                onClick={() => goToIndex(index)}
                className="relative flex min-h-[36px] shrink-0 items-center whitespace-nowrap px-2 text-[10px] font-black uppercase tracking-[0.24em] transition-colors duration-200"
                style={{ color: active ? 'var(--bora-gold)' : 'var(--bora-text-subtle)' }}
              >
                <span className="relative z-10">{periodLabels[pane.id]}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: 'var(--bora-gold)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <TopPerformers songs={activeData.songs} />
      </div>
      <div ref={carouselRef} onScroll={handleScroll} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide" style={{ touchAction: 'pan-y' }}>
        <div className="w-full shrink-0 snap-center px-4"><WeeklyOP data={panes[0].data} /></div>
        <div className="w-full shrink-0 snap-center px-4"><MonthlyOP data={panes[1].data} /></div>
      </div>
    </section>
  );
}