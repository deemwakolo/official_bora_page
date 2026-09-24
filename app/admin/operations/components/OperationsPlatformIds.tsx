'use client';

import type { OperationsDataState } from '../OperationsOP';

import type { OperationsSong } from '../config/operations';

import OperationsStatePanel from './OperationsStatePanel';

interface OperationsPlatformIdsProps {
  state: OperationsDataState;
  error: string | null;
  songs: OperationsSong[];
  onRetry: () => void;
}

/*
 * BORA OPERATIONS PLATFORM IDS WORKSPACE
 *
 * Platform identity mapping inatumia kile kilichothibitishwa pekee:
 * youtube_id iliyopo kwenye Operations song record.
 *
 * Spotify ID na Boomplay ID HAZIPO kwenye data model, kwa hiyo
 * hazibuniwi hapa — na hakuna mapping inayoandikwa kutoka room hii.
 */
export default function OperationsPlatformIds({
  state,
  error,
  songs,
  onRetry,
}: OperationsPlatformIdsProps) {
  if (state === 'loading') {
    return (
      <OperationsStatePanel
        title="Reading Platform Identities"
        lines={[
          'Platform identity mapping is being read from the Operations registry.',
        ]}
      />
    );
  }

  if (state === 'error') {
    return (
      <OperationsStatePanel
        tone="error"
        title="Platform IDs Unavailable"
        lines={[
          error ?? 'Operations data source unavailable.',
          'Nothing is displayed because no platform identity was read.',
        ]}
        onRetry={onRetry}
      />
    );
  }

  if (songs.length === 0) {
    return (
      <OperationsStatePanel
        title="No Platform Identities"
        lines={[
          'No Operations song record exists to map platform identity against.',
        ]}
      />
    );
  }

  const mapped = songs.filter(
    (song) => song.youtube_id.trim().length > 0
  ).length;

  return (
    <div
      className="w-full border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      {/* HEADER */}

      <div
        className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <div className="min-w-0">
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Platform Identity Mapping
          </p>

          <p
            className="mt-1 text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            YouTube ID read from the Operations song record
          </p>
        </div>

        <p
          className="text-[6px] font-black uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {mapped} of {songs.length} mapped
        </p>
      </div>

      {/* COLUMN LABELS (sm+) */}

      <div
        className="hidden grid-cols-[minmax(0,1fr)_minmax(0,240px)_90px] gap-3 border-b px-4 py-2 sm:grid sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <span
          className="text-[6px] font-black uppercase tracking-[0.15em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Song
        </span>

        <span
          className="text-[6px] font-black uppercase tracking-[0.15em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          YouTube ID
        </span>

        <span
          className="text-right text-[6px] font-black uppercase tracking-[0.15em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Identity
        </span>
      </div>

      {/* ROWS */}

      {songs.map((song) => {
        const hasYoutubeId =
          song.youtube_id.trim().length > 0;

        return (
          <div
            key={song.id}
            className="grid grid-cols-1 gap-2 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)_90px] sm:items-center sm:gap-3 sm:px-5"
            style={{ borderColor: 'var(--bora-border)' }}
          >
            <div className="min-w-0">
              <p
                className="truncate text-[8px] font-black uppercase tracking-[0.1em]"
                style={{ color: 'var(--bora-text)' }}
              >
                {song.title || 'Untitled entry'}
              </p>

              <p
                className="mt-1 truncate text-[7px] uppercase tracking-[0.08em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {song.artist || 'Unknown artist'}
              </p>
            </div>

            <p
              className="truncate font-mono text-[8px]"
              style={{
                color: hasYoutubeId
                  ? 'var(--bora-text-muted)'
                  : 'var(--bora-text-subtle)',
              }}
            >
              {hasYoutubeId ? song.youtube_id : 'Not set'}
            </p>

            <p
              className="text-[6px] font-black uppercase tracking-[0.14em] sm:text-right"
              style={{
                color: hasYoutubeId
                  ? 'var(--bora-gold)'
                  : 'var(--bora-text-subtle)',
              }}
            >
              {hasYoutubeId ? 'Mapped' : 'Not Set'}
            </p>
          </div>
        );
      })}

      {/* NOTE */}

      <div
        className="border-t px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <p
          className="text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Spotify ID and Boomplay ID are not stored in the Operations
          data model yet. No platform identity is written from this
          room.
        </p>
      </div>
    </div>
  );
}
