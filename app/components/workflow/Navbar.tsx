'use client';

import React from 'react';

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
  { id: 'charts' as Section, label: 'CHARTS', emoji: '📊' },
  { id: 'trending' as Section, label: 'TRENDING', emoji: '📈' },
  { id: 'vote' as Section, label: 'VOTE', emoji: '👑' },
  { id: 'updates' as Section, label: 'UPDATES', emoji: '✦' },
  { id: 'profile' as Section, label: 'PROFILE', emoji: '◎' },
];

export default function Navbar({
  activeSection,
  onSectionChange,
}: NavbarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] border-t backdrop-blur-xl"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--bora-background-deep) 94%, transparent)',
        borderColor: 'var(--bora-border)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-45px] h-[100px] w-[420px] -translate-x-1/2 rounded-full blur-[65px]"
          style={{
            backgroundColor: 'var(--bora-gold-glow)',
            opacity: 0.35,
          }}
        />
      </div>

      <div className="relative mx-auto flex h-[74px] w-full max-w-5xl items-stretch">
        {sections.map((section) => {
          const active = activeSection === section.id;
          const isVote = section.id === 'vote';

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`
                group relative flex flex-1
                flex-col items-center justify-center
                gap-1 overflow-hidden
                transition-all duration-300
                ${isVote ? 'scale-[1.02]' : ''}
              `}
              style={{
                color: active
                  ? 'var(--bora-text)'
                  : 'var(--bora-text-muted)',
              }}
            >
              {active && (
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, color-mix(in srgb, var(--bora-gold) 7%, transparent), transparent 70%)',
                  }}
                />
              )}

              <span
                className={`
                  relative z-10
                  text-[19px] leading-none
                  transition-all duration-300
                  ${active ? 'scale-110 opacity-100' : 'opacity-50 group-hover:opacity-80'}
                  ${isVote ? 'text-[25px]' : ''}
                `}
              >
                {section.emoji}
              </span>

              <span
                className={`
                  relative z-10
                  text-[8px] font-black
                  tracking-[0.12em]
                  transition-all duration-300
                  sm:text-[9px]
                  ${active ? 'opacity-100' : 'opacity-60'}
                `}
              >
                {section.label}
              </span>

              {active && (
                <>
                  <span
                    className="absolute bottom-0 left-1/2 h-[2px] w-[32px] -translate-x-1/2 animate-[boraNavLineIn_400ms_cubic-bezier(0.22,1,0.36,1)] sm:w-[42px]"
                    style={{
                      backgroundColor: 'var(--bora-gold)',
                    }}
                  />

                  <span
                    className="absolute bottom-0 left-1/2 h-[10px] w-[55px] -translate-x-1/2 blur-lg animate-[boraNavGlowIn_500ms_cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      backgroundColor: 'var(--bora-gold-glow)',
                    }}
                  />
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}