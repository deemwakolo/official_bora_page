'use client';

import type { OperationsSection } from '../config/operations';

interface OperationsNavItem {
  id: OperationsSection;
  label: string;
  description: string;
}

interface OperationsNavProps {
  sections: readonly OperationsNavItem[];
  activeSection: OperationsSection;
  onSelect: (section: OperationsSection) => void;
}

/*
 * BORA OPERATIONS NAVIGATION
 *
 * Lugha ya macho inatoka kwenye AdminShell nav: bordered surface ya
 * --bora-background-deep, Cinzel uppercase labels, gold active state
 * na thin gold indicator.
 *
 * Responsive: 1 column (list) kwenye mobile → 4 columns (tab bar) sm+.
 * Hivyo labels hazigongani na hazivuji kwenye screen nyembamba.
 */
export default function OperationsNav({
  sections,
  activeSection,
  onSelect,
}: OperationsNavProps) {
  return (
    <nav
      aria-label="Operations sections"
      className="mt-3 w-full border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-background-deep)',
      }}
    >
      <div className="grid w-full grid-cols-1 sm:grid-cols-4">
        {sections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={isActive ? 'true' : undefined}
              className="relative min-w-0 overflow-hidden border-b px-4 py-4 text-left transition-all duration-300 last:border-b-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] sm:border-b-0 sm:border-r sm:px-4 sm:py-5 sm:text-center sm:last:border-r-0"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor: isActive
                  ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                  : 'transparent',
              }}
            >
              <p
                className="whitespace-normal break-words font-cinzel text-[10px] font-black uppercase leading-tight tracking-[0.14em] sm:text-xs sm:tracking-[0.08em]"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text)',
                }}
              >
                {section.label}
              </p>

              {/* DESCRIPTION: mobile pekee — sm+ inabaki tab bar safi */}

              <p
                className="mt-1 text-[6px] font-bold uppercase tracking-[0.14em] sm:hidden"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {section.description}
              </p>

              {/* THIN GOLD ACTIVE INDICATOR */}

              {isActive && (
                <span
                  aria-hidden
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
