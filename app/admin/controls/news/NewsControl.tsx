'use client';

import React, { useState } from 'react';

import FeaturedControl from './FeaturedControl';
import FeedControl from './FeedControl';

type NewsChild =
  | 'Featured'
  | 'Feed';

const children: {
  id: NewsChild;
  label: string;
  symbol: string;
}[] = [
  {
    id: 'Featured',
    label: 'Featured',
    symbol: '★',
  },
  {
    id: 'Feed',
    label: 'Feed',
    symbol: '≡',
  },
];

export default function NewsControl() {
  const [activeChild, setActiveChild] =
    useState<NewsChild>('Featured');

  const renderActiveControl = () => {
    switch (activeChild) {
      case 'Featured':
        return <FeaturedControl />;

      case 'Feed':
        return <FeedControl />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        {children.map((child, index) => {
          const isActive =
            activeChild === child.id;

          return (
            <button
              key={child.id}
              type="button"
              onClick={() =>
                setActiveChild(child.id)
              }
              className="relative flex w-full items-center gap-4 border-b px-4 py-4 text-left transition-all duration-300 last:border-b-0 sm:px-5 sm:py-5"
              style={{
                borderColor:
                  'var(--bora-border)',
                backgroundColor: isActive
                  ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                  : 'var(--bora-surface)',
              }}
            >
              <span
                className="w-6 shrink-0 text-[8px] font-black"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-subtle)',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center text-[14px]"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-subtle)',
                }}
              >
                {child.symbol}
              </span>

              <span
                className="font-cinzel text-[10px] font-black uppercase tracking-[0.14em]"
                style={{
                  color: 'var(--bora-text)',
                }}
              >
                {child.label}
              </span>

              {isActive && (
                <span
                  className="absolute bottom-0 left-0 h-[2px] w-full"
                  style={{
                    backgroundColor:
                      'var(--bora-gold)',
                    boxShadow:
                      '0 0 10px var(--bora-gold-glow)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {renderActiveControl()}
      </div>
    </div>
  );
}