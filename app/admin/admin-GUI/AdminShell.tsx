'use client';

import React, { useState } from 'react';

import Top15Control from '../controls/Top15/Top15Control';
import DiscoverControl from '../controls/discover/DiscoverControl';
import NewsControl from '../controls/news/NewsControl';
import FAQControl from '../controls/faq/FAQControl';

type AdminSection =
  | 'top15'
  | 'trends'
  | 'discover'
  | 'news'
  | 'faq';

export default function AdminShell() {
  const [activeSection, setActiveSection] =
    useState<AdminSection>('top15');

  const sections: {
    id: AdminSection;
    label: string;
  }[] = [
    {
      id: 'top15',
      label: 'TOP 15',
    },
    {
      id: 'trends',
      label: 'TRENDS',
    },
    {
      id: 'discover',
      label: 'DISCOVER',
    },
    {
      id: 'news',
      label: 'NEWS',
    },
    {
      id: 'faq',
      label: 'FAQ',
    },
  ];

  return (
    <main
      className="w-full"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <nav
          className="w-full border"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor:
              'var(--bora-background-deep)',
          }}
        >
          <div className="grid w-full grid-cols-5">
            {sections.map((section) => {
              const isActive =
                activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(section.id)
                  }
                  className="relative min-w-0 overflow-hidden border-r px-2 py-4 text-center transition-all duration-300 last:border-r-0 sm:px-4 sm:py-5"
                  style={{
                    borderColor:
                      'var(--bora-border)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                      : 'transparent',
                  }}
                >
                  <p
                    className="whitespace-normal break-words font-cinzel text-[8px] font-black uppercase leading-tight tracking-[0.06em] sm:text-xs sm:tracking-[0.08em]"
                    style={{
                      color: isActive
                        ? 'var(--bora-gold)'
                        : 'var(--bora-text)',
                    }}
                  >
                    {section.label}
                  </p>

                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
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
        </nav>

        <div className="mt-3">
          {activeSection === 'top15' && (
            <Top15Control />
          )}

          {activeSection === 'discover' && (
            <DiscoverControl />
          )}

          {activeSection === 'news' && (
            <NewsControl />
          )}

          {activeSection === 'faq' && (
            <FAQControl />
          )}
        </div>
      </div>
    </main>
  );
}