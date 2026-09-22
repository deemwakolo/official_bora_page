'use client';

import React from 'react';

import { ArrowUpRight } from 'lucide-react';

import newsTheme from './NewsTheme';
import type { NewsItem } from './newsData';

interface NewsFeedProps {
  items: NewsItem[];
}

// COMPONENT HII NI PURELY VISUAL: INAPOKEA ITEMS TU
export default function NewsFeed({
  items,
}: NewsFeedProps) {
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
        {items.map((item, index) => (
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