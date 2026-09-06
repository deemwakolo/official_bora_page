'use client';

import React from 'react';

import { ArrowUpRight } from 'lucide-react';

import newsTheme from './NewsTheme';

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
      <div
        className="flex items-center justify-between border-b"
        style={{
          marginBottom: newsTheme.feed.headerMarginBottom,
          paddingBottom: newsTheme.feed.headerPaddingBottom,
          borderColor: newsTheme.border,
        }}
      >
        <span
          className="font-mono uppercase"
          style={{
            color: newsTheme.textMuted,
            fontSize: newsTheme.feed.headerLabelSize,
            fontWeight: newsTheme.feed.headerLabelWeight,
            letterSpacing: newsTheme.feed.headerLabelTracking,
          }}
        >
          LATEST INTEL
        </span>

        <span
          className="font-mono uppercase"
          style={{
            color: newsTheme.gold,
            fontSize: newsTheme.feed.headerIdSize,
            letterSpacing: newsTheme.feed.headerIdTracking,
            opacity: 0.6,
          }}
        >
          FEED_04
        </span>
      </div>

      {/* NEWS ITEMS */}
      <div
        className="divide-y"
        style={{
          borderColor: newsTheme.border,
        }}
      >
        {newsData.map((item, index) => (
          <article
            key={item.id}
            className="group relative flex"
            style={{
              gap: newsTheme.feed.rowGap,
              paddingTop: newsTheme.feed.rowPaddingY,
              paddingBottom: newsTheme.feed.rowPaddingY,
              borderColor: newsTheme.border,
            }}
          >
            {/* NUMBER */}
            <div
              className="shrink-0 pt-1 font-mono"
              style={{
                width: newsTheme.feed.numberWidth,
                color: newsTheme.textSubtle,
                fontSize: newsTheme.feed.numberSize,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* IMAGE */}
            <div
              className="relative shrink-0 overflow-hidden md:h-[6rem] md:w-[8rem]"
              style={{
                width: newsTheme.feed.imageWidth,
                height: newsTheme.feed.imageHeight,
                backgroundColor: newsTheme.surfaceElevated,
              }}
            >
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
              <div
                className="flex items-center gap-2"
                style={{
                  marginBottom: newsTheme.feed.metaMarginBottom,
                }}
              >
                <span
                  className="font-mono font-black uppercase"
                  style={{
                    color: newsTheme.gold,
                    fontSize: newsTheme.feed.categorySize,
                    fontWeight: newsTheme.feed.categoryWeight,
                    letterSpacing: newsTheme.feed.categoryTracking,
                  }}
                >
                  {item.category}
                </span>

                {item.isHot && (
                  <span
                    className="font-mono font-black uppercase"
                    style={{
                      color: newsTheme.live,
                      fontSize: newsTheme.feed.hotSize,
                      fontWeight: newsTheme.feed.hotWeight,
                      letterSpacing: newsTheme.feed.hotTracking,
                    }}
                  >
                    HOT
                  </span>
                )}
              </div>

              {/* TITLE */}
              <h3
                className="uppercase transition-colors duration-300"
                style={{
                  color: newsTheme.title,
                  fontSize: newsTheme.feed.titleSize,
                  fontWeight: newsTheme.feed.titleWeight,
                  letterSpacing: newsTheme.feed.titleTracking,
                  lineHeight: newsTheme.feed.titleLineHeight,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color =
                    newsTheme.gold;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color =
                    newsTheme.title;
                }}
              >
                {item.title}
              </h3>

              {/* TIMESTAMP */}
              <p
                className="font-mono uppercase"
                style={{
                  marginTop: newsTheme.feed.timestampMarginTop,
                  color: newsTheme.textSubtle,
                  fontSize: newsTheme.feed.timestampSize,
                  letterSpacing: newsTheme.feed.timestampTracking,
                }}
              >
                {item.timestamp}
              </p>
            </div>

            {/* ARROW */}
            <ArrowUpRight
              size={14}
              className="mt-1 shrink-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              style={{
                color: newsTheme.textSubtle,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color =
                  newsTheme.gold;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color =
                  newsTheme.textSubtle;
              }}
            />
          </article>
        ))}
      </div>
    </div>
  );
}