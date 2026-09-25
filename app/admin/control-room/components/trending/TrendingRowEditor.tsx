'use client';

import type { TrendingEntry } from '@/lib/trending-shared';

import TrendingField from './TrendingField';

interface TrendingRowEditorProps {
  row: TrendingEntry;
  isArtist: boolean;
  onChange: (
    rank: number,
    field: 'title' | 'artist' | 'movement' | 'songs_count',
    value: string,
  ) => void;
  onRevert: (rank: number) => void;
  isDirty: boolean;
}

function fieldId(rank: number, name: string) {
  return `trending-${rank}-${name}`;
}

/*
 * BORA CONTROL ROOM TRENDING ROW EDITOR
 *
 * One rank at a time. songs_count only exists on artist rows.
 */
export default function TrendingRowEditor({
  row,
  isArtist,
  onChange,
  onRevert,
  isDirty,
}: TrendingRowEditorProps) {
  return (
    <section
      aria-label={`Trending rank ${row.rank} editor`}
      className="flex w-full flex-col border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <div className="min-w-0">
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            Rank {row.rank}
          </p>
          <p
            className="mt-1 truncate text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {isDirty
              ? 'Unsaved draft — local only'
              : 'In sync with database'}
          </p>
        </div>

        {isDirty && (
          <button
            type="button"
            onClick={() => onRevert(row.rank)}
            className="shrink-0 border px-3 py-2 text-[7px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98]"
            style={{
              borderColor: 'var(--bora-border-strong)',
              color: 'var(--bora-text-muted)',
            }}
          >
            Revert
          </button>
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <TrendingField
          id={fieldId(row.rank, 'title')}
          label={isArtist ? 'Artist Name' : 'Title'}
          value={row.title}
          placeholder={isArtist ? 'Artist name' : 'Song title'}
          onChange={(value) =>
            onChange(row.rank, isArtist ? 'artist' : 'title', value)
          }
        />

        {!isArtist && (
          <TrendingField
            id={fieldId(row.rank, 'artist')}
            label="Artist"
            value={row.artist}
            placeholder="Artist name"
            onChange={(value) =>
              onChange(row.rank, 'artist', value)
            }
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TrendingField
            id={fieldId(row.rank, 'movement')}
            label="Movement"
            value={String(row.movement)}
            placeholder="0 = no movement, may be negative"
            onChange={(value) =>
              onChange(row.rank, 'movement', value)
            }
          />

          {isArtist && (
            <TrendingField
              id={fieldId(row.rank, 'songs-count')}
              label="Songs In Bora"
              value={
                row.songs_count === null
                  ? ''
                  : String(row.songs_count)
              }
              placeholder="Number of songs"
              onChange={(value) =>
                onChange(row.rank, 'songs_count', value)
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
