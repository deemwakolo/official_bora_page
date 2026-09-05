'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface NewsItem {
  id: number;
  category: string;
  title: string;
  timestamp: string;
  excerpt: string;
  image: string;
  isHot?: boolean;
}

// PLACEHOLDER NEWS: COCKPIT ITAINGIA DATA HAPA BAADAYE
const newsData: NewsItem[] = [
  {
    id: 2,
    category: 'INDUSTRY',
    title: 'The Rise of Bongo-Drill: A New Sonic Frontier',
    timestamp: '18:12 / 26 APR',
    excerpt:
      'A new wave of artists is pushing Tanzanian drill into unexpected territory.',
    image:
      'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    category: 'STUDIO TECH',
    title: 'Matitu Nation Unveils Creative Suite',
    timestamp: '16:40 / 26 APR',
    excerpt:
      'Inside the tools and spaces shaping the next generation of local creators.',
    image:
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    category: 'CULTURE',
    title: 'Visual Identity: The Beast Titan Aesthetic',
    timestamp: '14:22 / 26 APR',
    excerpt:
      'How Tanzanian artists are turning visual identity into part of the music itself.',
    image:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    category: 'MARKET',
    title: 'Iringa Music Scene: The Nzihi Corridor',
    timestamp: '11:08 / 26 APR',
    excerpt:
      'A closer look at the regional movement developing outside the traditional music hubs.',
    image:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80',
  },
];

export default function NewsFeed() {
  return (
    <div className="flex flex-col">
      {/* NEWS FEED HEADER */}
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
          LATEST INTEL
        </span>

        <span className="font-mono text-[8px] uppercase tracking-widest text-[#D4AF37]/60">
          FEED_04
        </span>
      </div>

      {/* NEWS ITEMS */}
      <div className="divide-y divide-white/[0.06]">
        {newsData.map((item, index) => (
          <article
            key={item.id}
            className="group relative flex gap-4 py-5"
          >
            {/* NUMBER */}
            <div className="w-5 shrink-0 pt-1 font-mono text-[9px] text-white/20">
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* IMAGE */}
            <div className="relative h-20 w-24 shrink-0 overflow-hidden bg-white/[0.03] md:h-24 md:w-32">
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-cover opacity-70 grayscale transition-all duration-500 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
              />

              {/* IMAGE OVERLAY */}
              <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* STORY INFO */}
            <div className="min-w-0 flex-1">
              {/* META */}
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-[#D4AF37]">
                  {item.category}
                </span>

                {item.isHot && (
                  <span className="font-mono text-[7px] font-black uppercase tracking-widest text-[#b91c1c]">
                    HOT
                  </span>
                )}
              </div>

              {/* TITLE */}
              <h3 className="text-sm font-black uppercase leading-tight tracking-wide text-white transition-colors duration-300 group-hover:text-[#D4AF37]">
                {item.title}
              </h3>

              {/* TIMESTAMP */}
              <p className="mt-2 font-mono text-[8px] uppercase tracking-widest text-white/25">
                {item.timestamp}
              </p>
            </div>

            {/* ARROW */}
            <ArrowUpRight
              size={14}
              className="mt-1 shrink-0 text-white/15 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#D4AF37]"
            />
          </article>
        ))}
      </div>
    </div>
  );
}