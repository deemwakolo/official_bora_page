'use client';

import React, { useState } from 'react';

import Header from './Header';
import Ticker from './Ticker';

// SECTIONS ZOTE AMBAZO BORA INAZIONYESHA
type Section = 'top10' | 'trends' | 'discover' | 'news';

// TAARIFA AMBAZO BORASHELL INAPOKEA KWA AJILI YA KILA SECTION
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
    <div className="w-full">

      {/* SUPER TICKER — INABADILIKA KULINGANA NA SECTION */}
      <Ticker activeSection={activeSection} />

      {/* HEADER INADHIBITIWA NA BORASHELL LAKINI COMPONENT YAKE INABAKI PEKE YAKE */}
      <Header />

      {/* SECTION NAVIGATION */}
      <nav className="sticky top-[75px] z-40 w-full bg-[#080808]/92 backdrop-blur-xl">

        {/* SOFT GOLD ATMOSPHERE */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
          <div className="absolute left-1/2 top-[-50px] h-[120px] w-[600px] -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.045] blur-[70px]" />
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
                className={`
                  group
                  relative
                  w-1/4
                  h-[58px] md:h-[78px]
                  px-1 md:px-10
                  flex items-center justify-center
                  text-[13px] sm:text-[13px] md:text-[16px]
                  font-black
                  tracking-[0.04em] sm:tracking-[0.08em] md:tracking-[0.22em]
                  whitespace-nowrap
                  overflow-hidden
                  transition-all duration-300

                  ${
                    active
                      ? 'text-white bg-white/[0.035]'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/[0.018]'
                  }
                `}
              >

                {/* ALAMA YA SECTION KWA BACKGROUND */}
                <span
                  className={`
                    absolute
                    left-1/2
                    top-1/2
                    -translate-x-1/2
                    -translate-y-1/2
                    text-[25px] md:text-[34px]
                    leading-none
                    pointer-events-none
                    select-none
                    transition-all duration-300

                    ${
                      active
                        ? 'opacity-[0.16] scale-110'
                        : 'opacity-[0.035] group-hover:opacity-[0.09] group-hover:scale-105'
                    }
                  `}
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
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-[42px] -translate-x-1/2 bg-[#D4AF37] md:w-[70px]" />

                    <span className="absolute bottom-0 left-1/2 h-[14px] w-[70px] -translate-x-1/2 bg-[#D4AF37]/[0.12] blur-lg md:w-[110px]" />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ACTIVE SECTION CONTENT */}
      <section className="min-h-screen">
        {renderSection()}
      </section>

    </div>
  );
}