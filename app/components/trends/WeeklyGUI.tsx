'use client';

import React from 'react';
import { CalendarDays, TrendingUp } from 'lucide-react';

export default function WeeklyGUI() {
  return (
    <section className="w-full min-h-[520px] flex items-center justify-center">
      <div className="w-full max-w-5xl px-6">
        <div className="rounded-3xl border border-black/10 dark:border-white/10 p-8 md:p-12">
          
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays size={28} />
            <span className="text-sm font-semibold tracking-[0.2em]">
              WEEKLY
            </span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <TrendingUp size={34} />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Weekly Chart
            </h2>
          </div>

          <p className="max-w-2xl text-sm md:text-base opacity-60">
            The weekly chart will interpret the last 7 days of BORA activity
            and show which songs are gaining momentum.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
              <p className="text-xs uppercase tracking-wider opacity-50">
                Period
              </p>
              <p className="mt-2 text-xl font-semibold">
                Last 7 Days
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
              <p className="text-xs uppercase tracking-wider opacity-50">
                Status
              </p>
              <p className="mt-2 text-xl font-semibold">
                Coming Soon
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
              <p className="text-xs uppercase tracking-wider opacity-50">
                Source
              </p>
              <p className="mt-2 text-xl font-semibold">
                Realtime
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}