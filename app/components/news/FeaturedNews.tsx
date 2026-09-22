'use client';

import React from 'react';

import { ArrowUpRight, Flame } from 'lucide-react';

import newsTheme from './NewsTheme';
import type { FeaturedNewsItem } from './newsData';

interface FeaturedNewsProps {
  story: FeaturedNewsItem;
}

// COMPONENT HII NI PURELY VISUAL: INAPOKEA STORY TU
export default function FeaturedNews({
  story,
}: FeaturedNewsProps) {
  return (
    <article
      className="group relative overflow-hidden border"
      style={{
        backgroundColor: newsTheme.card.background,
        borderColor: newsTheme.card.border,
        color: newsTheme.text,
      }}
    >
      {/* FEATURED IMAGE */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={story.image}
          alt=""
          className="h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
        />

        {/* IMAGE OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* HOT SIGNAL */}
        {story.isHot && (
          <div
            className="absolute left-4 top-4 flex items-center gap-2 px-3 py-2"
            style={{
              backgroundColor: newsTheme.live,
              color: newsTheme.text,
            }}
          >
            <Flame
              size={11}
              fill="currentColor"
            />

            <span
              className="font-mono font-black uppercase"
              style={{
                fontSize: newsTheme.featured.categorySize,
                letterSpacing: '0.18em',
              }}
            >
              HOT
            </span>
          </div>
        )}

        {/* STORY NUMBER */}
        <div
          className="absolute right-4 top-4 font-mono tracking-widest"
          style={{
            color: newsTheme.textMuted,
            fontSize: newsTheme.header.identifierSize,
          }}
        >
          FEATURED_01
        </div>
      </div>

      {/* STORY CONTENT */}
      <div
        style={{
          padding: newsTheme.featured.contentPadding,
        }}
      >
        {/* CATEGORY + TIME */}
        <div
          className="flex items-center gap-3"
          style={{
            marginBottom: newsTheme.featured.metaMarginBottom,
          }}
        >
          <span
            className="font-mono font-black uppercase"
            style={{
              color: newsTheme.gold,
              fontSize: newsTheme.featured.categorySize,
              fontWeight: newsTheme.featured.categoryWeight,
              letterSpacing: newsTheme.featured.categoryTracking,
            }}
          >
            {story.category}
          </span>

          <span
            className="h-px w-5"
            style={{
              backgroundColor: newsTheme.borderStrong,
            }}
          />

          <span
            className="font-mono uppercase"
            style={{
              color: newsTheme.textSubtle,
              fontSize: newsTheme.featured.timestampSize,
              letterSpacing: newsTheme.featured.timestampTracking,
            }}
          >
            {story.timestamp}
          </span>
        </div>

        {/* HEADLINE */}
        <h3
          className="max-w-2xl uppercase leading-[1.05] tracking-tight"
          style={{
            color: newsTheme.title,
            fontSize: newsTheme.featured.headlineSize,
            fontWeight: newsTheme.featured.headlineWeight,
            lineHeight: newsTheme.featured.headlineLineHeight,
          }}
        >
          {story.title}
        </h3>

        {/* EXCERPT */}
        <p
          className="max-w-xl"
          style={{
            marginTop: newsTheme.featured.excerptMarginTop,
            color: newsTheme.metadata,
            fontSize: newsTheme.featured.excerptSize,
            lineHeight: newsTheme.featured.excerptLineHeight,
          }}
        >
          {story.excerpt}
        </p>

        {/* ACTION */}
        <button
          type="button"
          className="flex items-center gap-3 border px-4 py-3 transition-all duration-300"
          style={{
            marginTop: newsTheme.featured.actionMarginTop,
            borderColor: newsTheme.goldGlow,
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor =
              newsTheme.gold;
            event.currentTarget.style.backgroundColor =
              newsTheme.goldGlow;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor =
              newsTheme.goldGlow;
            event.currentTarget.style.backgroundColor =
              'transparent';
          }}
        >
          <span
            className="font-mono font-black uppercase"
            style={{
              color: newsTheme.gold,
              fontSize: newsTheme.featured.actionSize,
              fontWeight: newsTheme.featured.actionWeight,
              letterSpacing: newsTheme.featured.actionTracking,
            }}
          >
            Decrypt Full Intel
          </span>

          <ArrowUpRight
            size={13}
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            style={{
              color: newsTheme.gold,
            }}
          />
        </button>
      </div>
    </article>
  );
}