'use client';

import type { OperationsSong } from '../config/operations';

import OperationsField from './OperationsField';
import OperationsStatePanel from './OperationsStatePanel';

interface OperationsSongEditorProps {
  draft: OperationsSong | null;
  isDirty: boolean;
  onChangeField: (
    field: keyof OperationsSong,
    value: string
  ) => void;
  onRevertSong: () => void;
}

/*
 * BORA OPERATIONS SONG EDITOR
 *
 * Two-pane editor (artwork + identity) — muundo unatoka kwenye
 * Top15Pop: graphics pane yenye border-r na operations pane.
 *
 * Fields ni Operations-owned pekee. Hakuna chart field inaonekana
 * hapa na hakuna metric ya platform inayotumika kama data ya chart.
 */
export default function OperationsSongEditor({
  draft,
  isDirty,
  onChangeField,
  onRevertSong,
}: OperationsSongEditorProps) {
  if (!draft) {
    return (
      <OperationsStatePanel
        title="No Song Selected"
        lines={[
          'Select a song from the Operations registry to edit its identity.',
        ]}
      />
    );
  }

  return (
    <section
      aria-label="Operations song identity editor"
      className="flex w-full flex-col border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      {/* EDITOR HEADER */}

      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <div className="min-w-0">
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            Song Identity
          </p>

          <p
            className="mt-1 truncate text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {isDirty
              ? 'Unsaved draft — local only'
              : 'In sync with registry'}
          </p>
        </div>

        {isDirty && (
          <button
            type="button"
            onClick={onRevertSong}
            className="shrink-0 border px-3 py-2 text-[7px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)]"
            style={{
              borderColor: 'var(--bora-border-strong)',
              color: 'var(--bora-text-muted)',
            }}
          >
            Revert
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,190px)_minmax(0,1fr)]">
        {/* ARTWORK PANE */}

        <div
          className="border-b p-4 sm:p-5 md:border-b-0 md:border-r"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor:
              'color-mix(in srgb, var(--bora-background-deep) 72%, transparent)',
          }}
        >
          <div
            className="mx-auto flex aspect-square w-full max-w-[150px] items-center justify-center overflow-hidden border"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor: 'var(--bora-background)',
            }}
          >
            {draft.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.cover_url}
                alt={`${draft.title} artwork`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="font-cinzel text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                No Artwork
              </span>
            )}
          </div>

          <p
            className="mt-3 text-center text-[6px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            Cover Artwork
          </p>

          <div className="mt-4">
            <OperationsField
              name="cover_url"
              label="Cover URL"
              value={draft.cover_url}
              placeholder="https://"
              onChange={(value) =>
                onChangeField('cover_url', value)
              }
            />
          </div>
        </div>

        {/* IDENTITY PANE */}

        <div className="p-4 sm:p-5">
          {/* IDENTITY */}

          <p
            className="text-[7px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Identity
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <OperationsField
                name="title"
                label="Title"
                value={draft.title}
                placeholder="Song title"
                onChange={(value) =>
                  onChangeField('title', value)
                }
              />
            </div>

            <div className="sm:col-span-2">
              <OperationsField
                name="artist"
                label="Artist"
                value={draft.artist}
                placeholder="Artist name"
                onChange={(value) =>
                  onChangeField('artist', value)
                }
              />
            </div>

            <OperationsField
              name="feature"
              label="Feature / Featured Artist"
              value={draft.feature}
              placeholder="Featured artist"
              onChange={(value) =>
                onChangeField('feature', value)
              }
            />

            <OperationsField
              name="release_date"
              label="Release Date"
              type="date"
              value={draft.release_date}
              onChange={(value) =>
                onChangeField('release_date', value)
              }
            />

            <OperationsField
              name="genre"
              label="Genre"
              value={draft.genre}
              placeholder="Genre"
              onChange={(value) =>
                onChangeField('genre', value)
              }
            />

            <OperationsField
              name="producer"
              label="Producer"
              value={draft.producer}
              placeholder="Producer"
              onChange={(value) =>
                onChangeField('producer', value)
              }
            />
          </div>

          {/* PLATFORM IDENTITY */}

          <p
            className="mt-6 text-[7px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Platform Identity
          </p>

          <div className="mt-3">
            <OperationsField
              name="youtube_id"
              label="YouTube ID"
              value={draft.youtube_id}
              placeholder="YouTube video ID"
              onChange={(value) =>
                onChangeField('youtube_id', value)
              }
            />
          </div>

          <p
            className="mt-2 text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            YouTube ID is stored on the Operations song record.
            Spotify ID and Boomplay ID are not stored yet.
          </p>

          {/* RECORD ID */}

          <div
            className="mt-6 flex items-center justify-between gap-3 border-t pt-3"
            style={{ borderColor: 'var(--bora-border)' }}
          >
            <span
              className="text-[6px] font-black uppercase tracking-[0.15em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              Record ID
            </span>

            <span
              className="truncate font-mono text-[7px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {draft.id || '—'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
