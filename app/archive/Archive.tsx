'use client';

import React from 'react';
import Link from 'next/link';
import {
  Archive as ArchiveIcon,
  Music2,
  Trophy,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';

const archiveSections = [
  {
    title: 'CHART HISTORY',
    description: 'Past BORA rankings and chart movements.',
    icon: Trophy,
  },
  {
    title: 'SONG ARCHIVE',
    description: 'Songs that have entered the BORA ecosystem.',
    icon: Music2,
  },
  {
    title: 'MOMENTS',
    description: 'Important movements, peaks and chart milestones.',
    icon: CalendarDays,
  },
];

export default function Archive() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* HEADER */}
      <header className="border-b border-white/[0.06] px-6 py-10 md:px-12 md:py-14">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-[#D4AF37]"
        >
          ← BACK TO BORA
        </Link>

        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <ArchiveIcon
                size={18}
                className="text-[#D4AF37]"
              />

              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                BORA MUSIC CHARTS
              </span>
            </div>

            <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
              ARCHIVE
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/35">
              The historical record of BORA charts, songs, artists and
              moments.
            </p>
          </div>

          <div className="hidden text-right md:block">
            <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/20">
              BORA DATABASE
            </p>

            <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]/60">
              HISTORICAL RECORD
            </p>
          </div>
        </div>
      </header>

      {/* ARCHIVE SECTIONS */}
      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25">
            EXPLORE
          </p>

          <h2 className="mt-2 text-2xl font-black uppercase">
            BORA HISTORY
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {archiveSections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={section.title}
                type="button"
                className="group border border-white/[0.06] bg-white/[0.02] p-6 text-left transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-white/[0.04]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center border border-[#D4AF37]/20 bg-[#D4AF37]/5">
                    <Icon
                      size={18}
                      className="text-[#D4AF37]"
                    />
                  </div>

                  <ArrowRight
                    size={16}
                    className="text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#D4AF37]"
                  />
                </div>

                <h3 className="text-sm font-black uppercase tracking-wide">
                  {section.title}
                </h3>

                <p className="mt-3 text-[10px] leading-relaxed text-white/30">
                  {section.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* STATUS */}
      <section className="px-6 pb-16 md:px-12">
        <div className="border border-white/[0.06] bg-white/[0.015] p-8">
          <p className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#D4AF37]/60">
            ARCHIVE STATUS
          </p>

          <h3 className="mt-3 text-xl font-black uppercase">
            Historical data coming online
          </h3>

          <p className="mt-3 max-w-xl text-[10px] leading-relaxed text-white/30">
            BORA will preserve chart history, rankings and important
            movements as the chart evolves.
          </p>
        </div>
      </section>

      {/* FOOTER LINE */}
      <div className="border-t border-white/[0.06] px-6 py-6 md:px-12">
        <p className="text-center text-[8px] font-mono uppercase tracking-[0.25em] text-white/20">
          BORA MUSIC CHARTS • ARCHIVE
        </p>
      </div>
    </main>
  );
}