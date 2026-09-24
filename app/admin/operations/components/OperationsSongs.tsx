'use client';

import type { OperationsDataState } from '../OperationsOP';

import type { OperationsSong } from '../config/operations';

import OperationsSongEditor from './OperationsSongEditor';
import OperationsStatePanel from './OperationsStatePanel';

interface OperationsSongsProps {
  state: OperationsDataState;
  error: string | null;
  songs: OperationsSong[];
  selectedId: string | null;
  draft: OperationsSong | null;
  isDirty: boolean;
  dirtyIds: string[];
  onSelectSong: (id: string) => void;
  onChangeField: (
    field: keyof OperationsSong,
    value: string
  ) => void;
  onRevertSong: () => void;
  onRetry: () => void;
}

/*
 * BORA OPERATIONS SONGS WORKSPACE
 *
 * Hii ni operational song identity: title, artist, feature, release
 * date, genre, producer, artwork na YouTube ID.
 *
 * HAKUNA chart information hapa: hakuna slot number, momentum,
 * votes, views, platform metrics wala ranking.
 */
export default function OperationsSongs({
  state,
  error,
  songs,
  selectedId,
  draft,
  isDirty,
  dirtyIds,
  onSelectSong,
  onChangeField,
  onRevertSong,
  onRetry,
}: OperationsSongsProps) {
  if (state === 'loading') {
    return (
      <OperationsStatePanel
        title="Reading Operations Songs"
        lines={[
          'Song identity records are being read from the Operations registry.',
        ]}
      />
    );
  }

  if (state === 'error') {
    return (
      <OperationsStatePanel
        tone="error"
        title="Operations Songs Unavailable"
        lines={[
          error ?? 'Operations data source unavailable.',
          'Nothing is displayed because no song record was read.',
        ]}
        onRetry={onRetry}
      />
    );
  }

  if (songs.length === 0) {
    return (
      <OperationsStatePanel
        title="No Operations Songs"
        lines={[
          'The Operations song registry is empty.',
          'Songs appear here once real records exist — nothing is invented.',
        ]}
      />
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      {/* SONG LIST */}

      <section
        aria-label="Operations songs"
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
            Operations Songs
          </p>

          <p
            className="mt-1 text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {songs.length}{' '}
            {songs.length === 1 ? 'entry' : 'entries'} in
            registry
          </p>
        </div>

        <div className="lg:max-h-[560px] lg:overflow-y-auto">
          {songs.map((song) => {
            const isSelected = song.id === selectedId;

            const hasDraft = dirtyIds.includes(song.id);

            return (
              <button
                key={song.id}
                type="button"
                onClick={() => onSelectSong(song.id)}
                aria-pressed={isSelected}
                className={`grid w-full grid-cols-[36px_minmax(0,1fr)] items-center gap-3 border-b px-4 py-3 text-left transition-all duration-200 last:border-b-0 hover:bg-[color-mix(in_srgb,var(--bora-gold)_4%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] sm:gap-4 ${
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--bora-gold)_5%,var(--bora-surface))]'
                    : ''
                }`}
                style={{ borderColor: 'var(--bora-border)' }}
              >
                {/* COVER */}

                <div
                  className="aspect-square w-9 overflow-hidden border"
                  style={{
                    borderColor: 'var(--bora-border-strong)',
                    backgroundColor:
                      'var(--bora-background-deep)',
                  }}
                >
                  {song.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.cover_url}
                      alt={`${song.title} artwork`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-full w-full items-center justify-center font-cinzel text-[10px] font-black"
                      style={{
                        color: 'var(--bora-text-subtle)',
                      }}
                    >
                      {song.title
                        ? song.title.charAt(0).toUpperCase()
                        : '·'}
                    </span>
                  )}
                </div>

                {/* IDENTITY */}

                <div className="min-w-0">
                  <p
                    className="truncate text-[8px] font-black uppercase tracking-[0.1em] sm:text-[9px]"
                    style={{
                      color: isSelected
                        ? 'var(--bora-gold)'
                        : 'var(--bora-text)',
                    }}
                  >
                    {song.title || 'Untitled entry'}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className="truncate text-[7px] uppercase tracking-[0.08em] sm:text-[8px]"
                      style={{
                        color: 'var(--bora-text-subtle)',
                      }}
                    >
                      {song.artist || 'Unknown artist'}
                      {song.feature ? ` · ${song.feature}` : ''}
                    </p>

                    {hasDraft && (
                      <span
                        aria-hidden
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{
                          backgroundColor: 'var(--bora-gold)',
                        }}
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SONG EDITOR */}

      <OperationsSongEditor
        draft={draft}
        isDirty={isDirty}
        onChangeField={onChangeField}
        onRevertSong={onRevertSong}
      />
    </div>
  );
}

