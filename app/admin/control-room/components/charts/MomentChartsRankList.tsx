'use client';

import type { MomentSong } from '@/app/components/charts/MomentChart';

import { movementKindLabels } from './MomentChartsMovementFields';

interface MomentChartsRankListProps {
  songs: MomentSong[];
  selectedRank: number | null;
  dirtyRanks: number[];
  onSelectRank: (rank: number) => void;
}

/*
 * BORA MOMENT CHARTS RANK LIST
 *
 * Left-column rank selector (OperationsSongs list treatment):
 * cover thumb + 36px rank-adjacent identity rows. One song per row —
 * artwork, title, artist, movement — with gold draft dot when the
 * rank has local edits. No tiny 10-column table.
 */
export default function MomentChartsRankList({
  songs,
  selectedRank,
  dirtyRanks,
  onSelectRank,
}: MomentChartsRankListProps) {
  return (
    <section
      aria-label="Moment chart ranks"
      className="flex w-full flex-col border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <div
        className="border-b px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <p
          className="text-[7px] font-black uppercase tracking-[0.2em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          Chart Ranks
        </p>

        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {songs.length} {songs.length === 1 ? 'entry' : 'entries'} in
          edition
        </p>
      </div>

      <div className="lg:max-h-[560px] lg:overflow-y-auto">
        {songs.map((song) => {
          const isSelected = song.rank === selectedRank;
          const hasDraft = dirtyRanks.includes(song.rank);

          return (
            <button
              key={song.rank}
              type="button"
              onClick={() => onSelectRank(song.rank)}
              aria-pressed={isSelected}
              className={`grid w-full grid-cols-[36px_minmax(0,1fr)] items-center gap-3 border-b px-4 py-3 text-left transition-all duration-200 last:border-b-0 hover:bg-[color-mix(in_srgb,var(--bora-gold)_4%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] sm:gap-4 ${
                isSelected
                  ? 'bg-[color-mix(in_srgb,var(--bora-gold)_5%,var(--bora-surface))]'
                  : ''
              }`}
              style={{ borderColor: 'var(--bora-border)' }}
            >
              <span
                className="text-center font-cinzel text-[15px] font-black"
                style={{
                  color: isSelected
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-muted)',
                }}
              >
                {song.rank}
              </span>

              <span className="min-w-0">
                <span
                  className="block truncate text-[8px] font-black uppercase tracking-[0.1em] sm:text-[9px]"
                  style={{
                    color: isSelected
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text)',
                  }}
                >
                  {song.metadata.title || 'Untitled entry'}
                </span>

                <span className="mt-1 flex items-center gap-2">
                  <span
                    className="truncate text-[7px] uppercase tracking-[0.08em] sm:text-[8px]"
                    style={{ color: 'var(--bora-text-subtle)' }}
                  >
                    {song.metadata.artist || 'Unknown artist'}
                    {' · '}
                    {movementKindLabels[song.movement.kind]}
                    {song.movement.kind === 'up' ||
                    song.movement.kind === 'down'
                      ? ` ${song.movement.delta ?? 0}`
                      : ''}
                  </span>

                  {hasDraft && (
                    <span
                      aria-hidden
                      className="h-1 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: 'var(--bora-gold)' }}
                    />
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
