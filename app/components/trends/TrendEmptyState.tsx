'use client';

import trendsTheme from './TrendsTheme';

interface TrendEmptyStateProps {
  platform: 'YOUTUBE' | 'SPOTIFY' | 'ARTISTS';
  expected: number;
}

/*
 * BORA PUBLIC TRENDING — EMPTY STATE
 *
 * Onyeshwa TU pale platform hana rows zozote. Hakuna mock rows,
 * hakuna data iliyouzwa. Lugha ya macho ni ile ile ya slides.
 */
export default function TrendEmptyState({
  platform,
  expected,
}: TrendEmptyStateProps) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center border px-6 py-14 text-center"
      style={{
        borderColor: trendsTheme.border,
        backgroundColor: trendsTheme.surface,
      }}
    >
      <p
        className="font-cinzel text-[11px] font-black uppercase leading-none tracking-[0.2em]"
        style={{ color: trendsTheme.gold }}
      >
        No Signal Yet
      </p>

      <p
        className="mt-3 max-w-[320px] text-[7px] font-bold uppercase leading-relaxed tracking-[0.16em]"
        style={{ color: trendsTheme.textMuted }}
      >
        {platform} has no trending data right now.
      </p>

      <p
        className="mt-2 font-mono text-[7px] uppercase tracking-[0.18em]"
        style={{ color: trendsTheme.footer }}
      >
        {expected} {expected === 1 ? 'ROW' : 'ROWS'} PENDING
      </p>
    </div>
  );
}
