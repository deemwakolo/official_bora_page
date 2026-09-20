'use client';

import React from 'react';

import {
  BarChart3,
  TrendingUp,
  Crown,
  Bell,
  User,
} from 'lucide-react';

export type Section =
  | 'charts'
  | 'trending'
  | 'vote'
  | 'updates'
  | 'profile';

interface NavbarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

const sections = [
  {
    id: 'charts' as Section,
    label: 'Charts',
    ariaLabel: 'Charts',
    Icon: BarChart3,
  },
  {
    id: 'trending' as Section,
    label: 'Trending',
    ariaLabel: 'Trending',
    Icon: TrendingUp,
  },
  {
    id: 'vote' as Section,
    label: 'Vote',
    ariaLabel: 'Vote',
    Icon: Crown,
  },
  {
    id: 'updates' as Section,
    label: 'Updates',
    ariaLabel: 'Updates',
    Icon: Bell,
  },
  {
    id: 'profile' as Section,
    label: 'Profile',
    ariaLabel: 'Profile',
    Icon: User,
  },
];

export default function Navbar({
  activeSection,
  onSectionChange,
}: NavbarProps) {
  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] w-full">

      {/* NAVIGATION SURFACE — GLASSY BAR INAYOYEYUKA KWENYE UKINGO WA JUU */}
      <div
        className="
          pointer-events-auto
          relative mx-auto mb-0 w-full max-w-[540px]
          md:mb-0 md:rounded-b-none md:rounded-t-[26px]
        "
      >
        {/* GLASS BACKGROUND — GLASSY BAR BILA FADE */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 backdrop-blur-2xl md:rounded-t-[26px]"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background-deep) 62%, transparent), color-mix(in srgb, var(--bora-background-deep) 88%, transparent))',
          }}
        />

        {/* CENTER ARCH — SEHEMU ILIYOINUKA NYUMA YA VOTE */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-16px] z-0 h-[30px] w-[84px] -translate-x-1/2 rounded-t-full backdrop-blur-2xl"
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background-deep) 62%, transparent), color-mix(in srgb, var(--bora-background-deep) 88%, transparent))',
            border:
              '1px solid color-mix(in srgb, var(--bora-border) 55%, transparent)',
            borderBottomColor: 'transparent',
            boxShadow:
              '0 -8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 color-mix(in srgb, var(--bora-text) 10%, transparent)',
          }}
        />

        {/* MWANGA WA NAVBAR NZIMA UMEONDOLEWA — GLOW INAHAMIA KWA DESTINATION ILIYO ACTIVE */}

        {/* FIVE DESTINATIONS */}
        <div className="relative mx-auto flex h-[60px] w-full items-stretch px-1 pb-2 pt-2.5 md:h-[60px]">

          {sections.map((section) => {

            const active = activeSection === section.id;
            const isVote = section.id === 'vote';
            const Icon = section.Icon;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-label={section.ariaLabel}
                className={`
                  group relative flex flex-1
                  flex-col items-center justify-center
                  transition-all duration-300
                `}
                style={{
                  color: active
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-muted)',
                }}
              >

                {/* GLOW NYUMA YA DESTINATION ILIYO ACTIVE — HALI YA KAWAIDA */}
                {!isVote && (
                  <span
                    aria-hidden
                    className="
                      pointer-events-none absolute left-1/2 top-1/2
                      h-[46px] w-[76px]
                      -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl
                      transition-opacity duration-300
                    "
                    style={{
                      background:
                        'radial-gradient(closest-side, var(--bora-gold-glow), transparent)',
                      opacity: active ? 0.85 : 0,
                    }}
                  />
                )}

                {/* VOTE HERO — CROWN NYEKUNDU YA MIDUNDO INAYOINUKA JUU */}
                {isVote ? (
                  <span className="relative z-10 -mt-3 flex flex-col items-center">
                    <span
                      aria-hidden
                      className="
                        pointer-events-none absolute left-1/2 top-1/2
                        h-[64px] w-[92px]
                        -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl
                        transition-opacity duration-300
                      "
                      style={{
                        background: active
                          ? 'radial-gradient(closest-side, var(--bora-gold-glow), transparent)'
                          : 'radial-gradient(closest-side, var(--bora-red-glow), transparent)',
                        opacity: active ? 0.95 : 0.75,
                      }}
                    />
                    <span
                      className={`
                        relative z-10 flex items-center justify-center
                        rounded-full
                        transition-all duration-300
                        ${active ? 'h-[46px] w-[46px] scale-105' : 'h-[44px] w-[44px] scale-100 group-hover:scale-105'}
                      `}
                      style={{
                        background:
                          'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--bora-red) 88%, white 6%), var(--bora-red) 72%)',
                        border: '1px solid color-mix(in srgb, var(--bora-gold) 55%, transparent)',
                        boxShadow: active
                          ? '0 0 22px var(--bora-red-glow), 0 0 14px var(--bora-gold-glow)'
                          : '0 0 14px var(--bora-red-glow)',
                        color: active
                          ? 'var(--bora-gold)'
                          : 'var(--bora-text)',
                      }}
                    >
                      <Icon
                        strokeWidth={active ? 2.4 : 2.2}
                        className="h-[28px] w-[28px]"
                      />
                    </span>
                  </span>
                ) : (
                  /* ICON YA KAWAIDA */
                  <span
                    className={`
                      relative z-10 flex h-[24px] w-[24px] items-center justify-center
                      transition-all duration-300
                      ${
                        active
                          ? 'scale-105 opacity-100'
                          : 'scale-100 opacity-55 group-hover:opacity-90'
                      }
                    `}
                  >
                    <Icon
                      strokeWidth={active ? 2.2 : 1.9}
                      className="h-full w-full"
                    />
                  </span>
                )}

                {/* LABEL YA DESTINATION ILIYO ACTIVE PEKEE */}
                <span
                  className={`
                    relative z-10 overflow-hidden whitespace-nowrap
                    font-bold tracking-[0.02em]
                    transition-all duration-300
                    ${isVote ? 'text-[10px]' : 'text-[9px]'}
                    ${
                      active
                        ? 'mt-0.5 max-h-4 translate-y-0 opacity-100'
                        : 'mt-0 max-h-0 translate-y-1 opacity-0'
                    }
                  `}
                  style={{
                    color: active
                      ? 'var(--bora-text)'
                      : 'var(--bora-text-muted)',
                  }}
                >
                  {section.label}
                </span>

              </button>
            );
          })}

        </div>
      </div>
    </nav>
  );
}