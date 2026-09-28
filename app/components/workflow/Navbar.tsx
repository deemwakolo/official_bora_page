'use client';

import React from 'react';

import type {
  PublicSectionDefinition,
  Section,
} from './publicSections';

export type { Section };

interface NavbarProps {
  /**
   * The sections to render, in order, already filtered and enriched
   * by PublicShell. The Navbar owns no navigation policy: it never
   * imports the canonical list and never decides what is visible.
   */
  sections: readonly PublicSectionDefinition[];
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

export default function Navbar({
  sections,
  activeSection,
  onSectionChange,
}: NavbarProps) {
  const handlePress = (id: Section) => {
    onSectionChange(id);
  };

  return (
    <nav
      data-bora-ui="public-navbar"
      className="
        pointer-events-none
        fixed bottom-0 left-0 right-0
        z-[100]
        w-full
      "
    >
      {/* PAGE → NAVBAR FADE */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[170px]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--bora-background-deep) 10%, transparent) 30%, color-mix(in srgb, var(--bora-background-deep) 35%, transparent) 55%, color-mix(in srgb, var(--bora-background-deep) 75%, transparent) 78%, color-mix(in srgb, var(--bora-background-deep) 96%, transparent) 100%)',
        }}
      />

      {/* NAVIGATION SURFACE */}
      <div
        data-bora-ui="public-navbar-surface"
        className="
          pointer-events-auto
          relative mx-auto w-full max-w-[540px]
          backdrop-blur-2xl
          md:mb-3 md:rounded-[26px]
        "
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background-deep) 30%, transparent) 0%, color-mix(in srgb, var(--bora-background-deep) 65%, transparent) 55%, color-mix(in srgb, var(--bora-background-deep) 92%, transparent) 100%)',
        }}
      >
        {/* DESTINATIONS — order and membership come from the shell */}
        <div className="relative mx-auto flex h-[56px] w-full items-stretch px-1 md:h-[60px]">
          {sections.map((section) => {
            const active = activeSection === section.id;
            const isVote = section.prominent;
            const Icon = section.Icon;

            return (
              <button
                key={section.id}
                data-bora-ui="public-navbar-item"
                type="button"
                onClick={() => handlePress(section.id)}
                aria-label={section.label}
                /*
                 * STABLE IDENTITY — deliberately separate from the
                 * accessible name above.
                 *
                 * `aria-label` is the user-facing accessible name and
                 * may be renamed by the UI Room; this attribute is the
                 * internal section id and never changes. The UI Room
                 * bridge detects the active section from THIS, so a
                 * renamed label can never break section tracking.
                 *
                 * Not editable, not a design token, never derived
                 * from visible text.
                 */
                data-bora-section={section.id}
                aria-current={active ? 'page' : undefined}
                className="
                  group relative flex flex-1
                  flex-col items-center justify-center
                  transition-all duration-300
                  active:scale-95
                "
                style={{
                  color: active
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-muted)',
                }}
              >
                {/* ACTIVE GOLD GLOW */}
                {!isVote && (
                  <span
                    aria-hidden
                    className="
                      pointer-events-none absolute left-1/2 top-1/2
                      h-[50px] w-[82px]
                      -translate-x-1/2 -translate-y-1/2
                      rounded-full blur-2xl
                      transition-opacity duration-300
                    "
                    style={{
                      background:
                        'radial-gradient(closest-side, var(--bora-gold-glow), transparent)',
                      opacity: active ? 0.9 : 0,
                    }}
                  />
                )}

                {/* VOTE HERO */}
                {isVote ? (
                  <span className="relative z-10 -mt-4 flex flex-col items-center">
                    <span
                      aria-hidden
                      className="
                        pointer-events-none absolute left-1/2 top-1/2
                        h-[68px] w-[96px]
                        -translate-x-1/2 -translate-y-1/2
                        rounded-full blur-2xl
                        transition-opacity duration-300
                      "
                      style={{
                        background: active
                          ? 'radial-gradient(closest-side, var(--bora-gold-glow), transparent)'
                          : 'radial-gradient(closest-side, var(--bora-red-glow), transparent)',
                        opacity: active ? 1 : 0.8,
                      }}
                    />

                    <span
                      data-bora-ui="public-navbar-vote"
                      className={`
                        relative z-10 flex items-center justify-center
                        rounded-full
                        transition-all duration-300
                        ${
                          active
                            ? 'h-[46px] w-[46px] scale-105'
                            : 'h-[42px] w-[42px] scale-100 group-hover:scale-105'
                        }
                      `}
                      style={{
                        background:
                          'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--bora-red) 88%, white 6%), var(--bora-red) 72%)',
                        border:
                          '1px solid color-mix(in srgb, var(--bora-gold) 55%, transparent)',
                        boxShadow: active
                          ? '0 0 24px var(--bora-red-glow), 0 0 16px var(--bora-gold-glow)'
                          : '0 0 16px var(--bora-red-glow)',
                        color: active
                          ? 'var(--bora-gold)'
                          : 'var(--bora-text)',
                      }}
                    >
                      <Icon
                        strokeWidth={active ? 2.4 : 2.2}
                        className="h-[30px] w-[30px]"
                      />
                    </span>
                  </span>
                ) : (
                  /* NORMAL ICON */
                  <span
                    data-bora-ui="public-navbar-icon"
                    className={`
                      relative z-10 flex h-[25px] w-[25px]
                      items-center justify-center
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

                {/* ACTIVE LABEL ONLY */}
                <span
                  data-bora-ui="public-navbar-label"
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