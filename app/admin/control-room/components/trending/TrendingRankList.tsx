'use client';

import type { TrendingEntry } from '@/lib/trending-shared';

import TrendingRowEditor from './TrendingRowEditor';

interface TrendingRankListProps {
  rows: TrendingEntry[];
  selectedRank: number | null;
  dirtyRanks: number[];
  onSelectRank: (rank: number) => void;
}

function movementLabel(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return '—';
}

/*
 * BORA CONTROL ROOM TRENDING RANK LIST
 *
 * Same list treatment as the Moment Charts rank list: bordered rows,
 * gold active line, dirty marker.
 */
export default function TrendingRankList({
  rows,
  selectedRank,
  dirtyRanks,
  onSelectRank,
}: TrendingRankListProps) {
  return (
    <div
      className="flex w-full flex-col border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      {rows.map((row) => {
        const isActive = selectedRank === row.rank;
        const isDirty = dirtyRanks.includes(row.rank);

        return (
          <button
            key={row.rank}
            type="button"
            onClick={() => onSelectRank(row.rank)}
            aria-current={isActive ? 'true' : undefined}
            className="relative flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition-all duration-300 last:border-b-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)]"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: isActive
                ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                : 'var(--bora-surface)',
            }}
          >
            <span
              className="w-6 shrink-0 font-cinzel text-[11px] font-black"
              style={{
                color: isActive
                  ? 'var(--bora-gold)'
                  : 'var(--bora-text-subtle)',
              }}
            >
              {String(row.rank).padStart(2, '0')}
            </span>

            <span
              className="min-w-0 flex-1"
            >
              <span
                className="block truncate text-[9px] font-black uppercase tracking-[0.1em]"
                style={{ color: 'var(--bora-text)' }}
              >
                {row.title}
              </span>

              <span
                className="mt-0.5 block truncate text-[7px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {row.artist}
              </span>
            </span>

            <span
              className="shrink-0 font-mono text-[7px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {movementLabel(row.movement)}
            </span>

            {isDirty && (
              <span
                aria-label="Unsaved changes"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: 'var(--bora-gold)',
                }}
              />
            )}

            {isActive && (
              <span
                className="absolute bottom-0 left-0 h-[2px] w-full"
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
  );
}
