'use client';

import Link from 'next/link';
import { Activity, Disc3, Gauge } from 'lucide-react';

export type EngineRoomSection = 'songs' | 'premium' | 'operations';

const SECTIONS: readonly {
  readonly id: EngineRoomSection;
  readonly label: string;
  readonly Icon: typeof Disc3;
}[] = [
  { id: 'songs', label: 'Songs', Icon: Disc3 },
  { id: 'premium', label: 'Premium', Icon: Gauge },
  { id: 'operations', label: 'Operations', Icon: Activity },
];

export default function EngineRoomNavbar({
  activeSection,
  onSectionChange,
  canOpenOperations,
}: {
  readonly activeSection: EngineRoomSection;
  readonly onSectionChange?: (section: EngineRoomSection) => void;
  readonly canOpenOperations: boolean;
}) {
  const sections = canOpenOperations
    ? SECTIONS
    : SECTIONS.filter((section) => section.id !== 'operations');

  return (
    <nav
      aria-label="Engine Room categories"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] w-full"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[150px]"
        style={{
          background:
            'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bora-background-deep) 92%, transparent))',
        }}
      />
      <div
        className="pointer-events-auto relative mx-auto mb-2 flex w-[min(100%-1rem,540px)] items-stretch rounded-2xl border px-1 backdrop-blur-2xl md:mb-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--bora-border) 80%, transparent)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bora-background-deep) 72%, transparent), color-mix(in srgb, var(--bora-background-deep) 96%, transparent))',
        }}
      >
        {sections.map(({ id, label, Icon }) => {
          const active = activeSection === id;
          const className =
            'group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors active:scale-95';
          const style = {
            color: active ? 'var(--bora-gold)' : 'var(--bora-text-muted)',
          };
          const content = (
            <>
              <Icon size={17} strokeWidth={active ? 2.3 : 1.8} aria-hidden />
              <span className="text-[7px] font-black uppercase tracking-[0.12em]">
                {label}
              </span>
            </>
          );
          return onSectionChange ? (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              aria-current={active ? 'page' : undefined}
              className={className}
              style={style}
            >
              {content}
            </button>
          ) : (
            <Link
              key={id}
              href={id === 'premium' ? '/admin/engine?category=premium' : '/admin/engine'}
              aria-current={active ? 'page' : undefined}
              className={className}
              style={style}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
