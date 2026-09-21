'use client';

import React, { useRef, useState } from 'react';

import WeeklyOP from './WeeklyOP';
import MonthlyOP from './MonthlyOP';
import TopPerformers from './TopPerformers';
import { weeklyMomentData, monthlyMomentData } from './MomentOP';
import { MomentChartData, MomentChartHeader } from './MomentChart';

type ChartPeriod = 'weekly' | 'monthly';

const periods: ChartPeriod[] = ['weekly', 'monthly'];

const periodLabels: Record<ChartPeriod, string> = {
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

const panes: { id: ChartPeriod; Pane: React.ComponentType; data: MomentChartData }[] = [
  { id: 'weekly', Pane: WeeklyOP, data: { title: 'TOP 10 SONGS', periodLabel: weeklyMomentData.periodLabel, date: weeklyMomentData.date, songs: weeklyMomentData.songs } },
  { id: 'monthly', Pane: MonthlyOP, data: { title: 'TOP 10 SONGS', periodLabel: monthlyMomentData.periodLabel, date: monthlyMomentData.date, songs: monthlyMomentData.songs } },
];

export default function MomentGUI() {
  const [activePeriod, setActivePeriod] = useState<ChartPeriod>('weekly');
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const total = periods.length;
  const activeIndex = periods.indexOf(activePeriod);
  const activeData = panes[activeIndex]?.data ?? panes[0].data;
  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(total - 1, index));
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: clamped * carouselRef.current.clientWidth, behavior: 'smooth' });
    }
    setActivePeriod(periods[clamped]);
  };
  const handleScroll = () => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.clientWidth;
    if (!width) return;
    const index = Math.round(carouselRef.current.scrollLeft / width);
    const period = periods[index];
    if (period) setActivePeriod(period);
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
  return (
    <section className="w-full pb-4 pt-5" style={{ backgroundColor: 'var(--bora-background)', color: 'var(--bora-text)' }}>
      <div className="mb-5">
        <MomentChartHeader data={activeData} />
      </div>
      <div className="mb-6">
        <TopPerformers songs={activeData.songs} />
      </div>
      <div className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-center gap-10 px-4">
        {panes.map((pane, index) => {
          const active = activePeriod === pane.id;
          return (
            <button key={pane.id} type="button" onClick={() => goToIndex(index)} className="relative px-2 py-3 text-[9px] font-black uppercase tracking-[0.24em] transition-all duration-300" style={{ color: active ? 'var(--bora-text)' : 'var(--bora-text-subtle)' }}>
              <span className="relative z-10">{periodLabels[pane.id]}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-[2px] w-full -translate-x-1/2" style={{ backgroundColor: 'var(--bora-gold)' }} />
              )}
            </button>
          );
        })}
      </div>
      <div ref={carouselRef} onScroll={handleScroll} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide" style={{ touchAction: 'pan-y' }}>
        <div className="w-full shrink-0 snap-center px-4"><WeeklyOP /></div>
        <div className="w-full shrink-0 snap-center px-4"><MonthlyOP /></div>
      </div>
    </section>
  );
}
