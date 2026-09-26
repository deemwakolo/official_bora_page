'use client';

import { useCallback } from 'react';

import {
  HelpCircle,
  Newspaper,
  Info,
  type LucideIcon,
} from 'lucide-react';

export type UpdatesSection = 'faq' | 'news' | 'about';

interface UpdatesSectionDef {
  id: UpdatesSection;
  label: string;
  icon: LucideIcon;
}

const sections: UpdatesSectionDef[] = [
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'news', label: 'NEWS', icon: Newspaper },
  { id: 'about', label: 'ABOUT US', icon: Info },
];

/*
 * BORA UPDATES ROOM NAVIGATION
 *
 * Interpretasi ndogo ya public Navbar (app/components/workflow/
 * Navbar.tsx): compact destinations, gold active state, icon +
 * label, duration-300 transitions.
 *
 * Hii SI public Navbar yenyewe — public inaendesha routing
 * ya site nzima (Charts/Trending/Vote/Updates/Profile) na
 * kuiweka hapa ingeintroduce public behaviour.
 */
export default function UpdatesNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: UpdatesSection;
  onSectionChange: (section: UpdatesSection) => void;
}) {
  const handlePress = useCallback(
    (id: UpdatesSection) => onSectionChange(id),
    [onSectionChange]
  );

  return (
    <nav
      aria-label="Updates room sections"
      className="w-full border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-background-deep)',
      }}
    >
      <div className="grid w-full grid-cols-3">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handlePress(section.id)}
              aria-label={section.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex min-w-0 flex-col items-center justify-center gap-1.5 border-r px-2 py-4 transition-colors duration-300 last:border-r-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--bora-gold)] sm:flex-row sm:gap-2 sm:py-5"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor: isActive
                  ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                  : 'transparent',
                color: isActive
                  ? 'var(--bora-gold)'
                  : 'var(--bora-text-muted)',
              }}
            >
              <span
                className="shrink-0 transition-transform duration-300"
                style={{
                  transform: isActive
                    ? 'scale-110'
                    : 'scale-100',
                }}
              >
                <Icon size={15} strokeWidth={1.75} />
              </span>

              <span
                className="truncate whitespace-nowrap text-[8px] font-black uppercase tracking-[0.16em] sm:text-[9px]"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-muted)',
                }}
              >
                {section.label}
              </span>

              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    backgroundColor: 'var(--bora-gold)',
                    boxShadow: '0 0 10px var(--bora-gold-glow)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
