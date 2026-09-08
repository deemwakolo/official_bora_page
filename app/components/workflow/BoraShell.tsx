'use client';

import React, { useState } from 'react';

import Header from './Header';
import Ticker from './Ticker';

type Section = 'top10' | 'trends' | 'discover' | 'news';

interface BoraShellProps {
  top10: React.ReactNode;
  trends: React.ReactNode;
  discover: React.ReactNode;
  news: React.ReactNode;
}

export default function BoraShell({
  top10,
  trends,
  discover,
  news,
}: BoraShellProps) {

  // SECTION INAYOONYESHWA KWA SASA
  const [activeSection, setActiveSection] =
    useState<Section>('top10');

  // MAJINA NA ALAMA ZA NAVIGATION
  const sections = [
    { id: 'top10' as Section, label: 'TOP 10', emoji: '🏆' },
    { id: 'trends' as Section, label: 'TRENDS', emoji: '📈' },
    { id: 'discover' as Section, label: 'DISCOVER', emoji: '✦' },
    { id: 'news' as Section, label: 'NEWS', emoji: '📰' },
  ];

  // KUCHAGUA CONTENT KULINGANA NA SECTION ILIYO ACTIVE
  const renderSection = () => {
    switch (activeSection) {
      case 'trends':
        return trends;

      case 'discover':
        return discover;

      case 'news':
        return news;

      case 'top10':
      default:
        return top10;
    }
  };

  return (
    <div
      className="w-full"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >

      {/* SUPER TICKER — INABADILIKA KULINGANA NA SECTION */}
      <Ticker activeSection={activeSection} />

      {/* HEADER INADHIBITIWA NA BORASHELL */}
      <Header />

      {/* SECTION NAVIGATION */}
      <nav
        className="sticky top-[75px] z-40 w-full backdrop-blur-xl"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--bora-surface) 92%, transparent)',
        }}
      >

        {/* SOFT GOLD ATMOSPHERE */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">

          <div
            className="absolute left-1/2 top-[-50px] h-[120px] w-[600px] -translate-x-1/2 rounded-full blur-[70px]"
            style={{
              backgroundColor: 'var(--bora-gold-glow)',
            }}
          />

        </div>

        {/* NAVIGATION BUTTONS */}
        <div className="relative mx-auto flex w-full max-w-7xl items-stretch">

          {sections.map((section) => {

            // KUJUA KAMA SECTION HII NDIYO INAYOONYESHWA
            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="group relative flex h-[58px] w-1/4 items-center justify-center overflow-hidden whitespace-nowrap px-1 text-[13px] font-black tracking-[0.04em] transition-all duration-300 sm:text-[13px] md:h-[78px] md:px-10 md:text-[16px] md:tracking-[0.22em]"
                style={{
                  color: active
                    ? 'var(--bora-text)'
                    : 'var(--bora-text-muted)',
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--bora-text) 3.5%, transparent)'
                    : 'transparent',
                }}
                onMouseEnter={(event) => {
                  if (!active) {
                    event.currentTarget.style.color =
                      'var(--bora-text)';

                    event.currentTarget.style.backgroundColor =
                      'color-mix(in srgb, var(--bora-text) 1.8%, transparent)';
                  }
                }}
                onMouseLeave={(event) => {
                  if (!active) {
                    event.currentTarget.style.color =
                      'var(--bora-text-muted)';

                    event.currentTarget.style.backgroundColor =
                      'transparent';
                  }
                }}
              >

                {/* ALAMA YA SECTION KWA BACKGROUND */}
                <span
                  className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[25px] leading-none transition-all duration-300 md:text-[34px] ${
                    active
                      ? 'scale-110 opacity-[0.16]'
                      : 'opacity-[0.035] group-hover:scale-105 group-hover:opacity-[0.09]'
                  }`}
                >
                  {section.emoji}
                </span>

                {/* JINA LA SECTION */}
                <span className="relative z-10">
                  {section.label}
                </span>

                {/* GOLD ACTIVE INDICATOR */}
                {active && (
                  <>
                    <span
                      className="absolute bottom-0 left-1/2 h-[2px] w-[42px] -translate-x-1/2 origin-center animate-[boraNavLineIn_400ms_cubic-bezier(0.22,1,0.36,1)] md:w-[70px]"
                      style={{
                        backgroundColor:
                          'var(--bora-gold)',
                      }}
                    />

                    <span
                      className="absolute bottom-0 left-1/2 h-[14px] w-[70px] -translate-x-1/2 origin-center blur-lg animate-[boraNavGlowIn_500ms_cubic-bezier(0.22,1,0.36,1)] md:w-[110px]"
                      style={{
                        backgroundColor:
                          'var(--bora-gold-glow)',
                      }}
                    />
                  </>
                )}

              </button>
            );
          })}

        </div>
      </nav>

      {/* ACTIVE SECTION CONTENT */}
      <section className="min-h-screen">

        <div
          key={activeSection}
          className="animate-[boraSectionIn_450ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          {renderSection()}
        </div>

      </section>

    </div>
  );
}