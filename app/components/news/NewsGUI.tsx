'use client';

import React from 'react';

import FeaturedNews from './FeaturedNews';
import NewsFeed from './NewsFeed';
import newsTheme from './NewsTheme';

export default function NewsGUI() {
  // GUI KUU YA NEWS: INAPANGA FEATURED STORY NA NEWS FEED

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: newsTheme.background,
        color: newsTheme.text,
        paddingLeft: newsTheme.layout.paddingX,
        paddingRight: newsTheme.layout.paddingX,
        paddingTop: newsTheme.layout.paddingY,
        paddingBottom: newsTheme.layout.paddingY,
      }}
    >
      {/* NEWS HEADER */}
      <div
        className="flex items-end justify-between border-b"
        style={{
          marginBottom: newsTheme.layout.headerMarginBottom,
          paddingBottom: newsTheme.layout.headerPaddingBottom,
          borderColor: newsTheme.border,
        }}
      >
        <div>
          {/* LABEL YA SECTION */}
          <p
            className="mb-2 font-black uppercase"
            style={{
              color: newsTheme.gold,
              fontSize: newsTheme.header.labelSize,
              fontWeight: newsTheme.header.labelWeight,
              letterSpacing: newsTheme.header.labelTracking,
            }}
          >
            BORA INTELLIGENCE
          </p>

          {/* KICHWA KIKUU */}
          <h2
            className="uppercase tracking-tight"
            style={{
              color: newsTheme.text,
              fontSize: newsTheme.header.titleSize,
              fontWeight: newsTheme.header.titleWeight,
            }}
          >
            NEWS
          </h2>

          {/* IDENTIFIER YA FEED */}
          <p
            className="mt-2 font-mono uppercase"
            style={{
              color: newsTheme.textSubtle,
              fontSize: newsTheme.header.identifierSize,
              letterSpacing: newsTheme.header.identifierTracking,
            }}
          >
            ARCHIVE_FEED.V7
          </p>
        </div>

        {/* LIVE SIGNAL */}
        <div className="flex items-center gap-2 pb-1">
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{
              backgroundColor: newsTheme.live,
            }}
          />

          <span
            className="font-mono uppercase"
            style={{
              color: newsTheme.textSubtle,
              fontSize: newsTheme.header.liveSize,
              letterSpacing: newsTheme.header.liveTracking,
            }}
          >
            LIVE FEED
          </span>
        </div>
      </div>

      {/* NEWS CONTENT */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]"
        style={{
          gap: newsTheme.layout.contentGap,
        }}
      >
        {/* FEATURED NEWS */}
        <FeaturedNews />

        {/* NEWS FEED */}
        <NewsFeed />
      </div>
    </section>
  );
}