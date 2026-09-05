'use client';

import React from 'react';

import FeaturedNews from './FeaturedNews';
import NewsFeed from './NewsFeed';

export default function NewsGUI() {
  // GUI KUU YA NEWS: INAPANGA FEATURED STORY NA NEWS FEED
  return (
    <section className="w-full px-4 py-8 md:px-8 md:py-12">
      {/* NEWS HEADER */}
      <div className="mb-8 flex items-end justify-between border-b border-white/[0.06] pb-5">
        <div>
          {/* LABEL YA SECTION */}
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            BORA INTELLIGENCE
          </p>

          {/* KICHWA KIKUU */}
          <h2 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
            NEWS
          </h2>

          {/* IDENTIFIER YA FEED */}
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
            ARCHIVE_FEED.V7
          </p>
        </div>

        {/* LIVE SIGNAL */}
        <div className="flex items-center gap-2 pb-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#b91c1c]" />

          <span className="font-mono text-[8px] uppercase tracking-widest text-white/30">
            LIVE FEED
          </span>
        </div>
      </div>

      {/* NEWS CONTENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* FEATURED NEWS */}
        <FeaturedNews />

        {/* NEWS FEED */}
        <NewsFeed />
      </div>
    </section>
  );
}