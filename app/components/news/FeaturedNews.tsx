'use client';

import React from 'react';
import { ArrowUpRight, Flame } from 'lucide-react';

interface FeaturedNewsItem {
  category: string;
  title: string;
  timestamp: string;
  excerpt: string;
  image: string;
  isHot?: boolean;
}

// PLACEHOLDER FEATURED NEWS: COCKPIT ITAINGIA DATA HAPA BAADAYE
const featuredNews: FeaturedNewsItem = {
  category: 'CHART PULSE',
  title: 'Sielewi Dominates the Bora Top 20 for the Third Week',
  timestamp: '20:44 / 26 APR',
  excerpt:
    'The latest BORA numbers show continued momentum as the track holds its position at the top of the chart.',
  image:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80',
  isHot: true,
};

export default function FeaturedNews() {
  return (
    <article className="group relative overflow-hidden border border-white/[0.06] bg-white/[0.02]">
      {/* FEATURED IMAGE */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={featuredNews.image}
          alt=""
          className="h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
        />

        {/* IMAGE OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* HOT SIGNAL */}
        {featuredNews.isHot && (
          <div className="absolute left-4 top-4 flex items-center gap-2 bg-[#b91c1c] px-3 py-2">
            <Flame size={11} fill="currentColor" />
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.18em]">
              HOT
            </span>
          </div>
        )}

        {/* STORY NUMBER */}
        <div className="absolute right-4 top-4 font-mono text-[9px] tracking-widest text-white/40">
          FEATURED_01
        </div>
      </div>

      {/* STORY CONTENT */}
      <div className="p-5 md:p-7">
        {/* CATEGORY + TIME */}
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            {featuredNews.category}
          </span>

          <span className="h-px w-5 bg-white/10" />

          <span className="font-mono text-[8px] uppercase tracking-widest text-white/25">
            {featuredNews.timestamp}
          </span>
        </div>

        {/* HEADLINE */}
        <h3 className="max-w-2xl text-2xl font-black uppercase leading-[1.05] tracking-tight text-white md:text-4xl">
          {featuredNews.title}
        </h3>

        {/* EXCERPT */}
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
          {featuredNews.excerpt}
        </p>

        {/* ACTION */}
        <button
          type="button"
          className="mt-6 flex items-center gap-3 border border-[#D4AF37]/20 px-4 py-3 transition-all duration-300 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5"
        >
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Decrypt Full Intel
          </span>

          <ArrowUpRight
            size={13}
            className="text-[#D4AF37] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </article>
  );
}