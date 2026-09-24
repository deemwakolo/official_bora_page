'use client';

import type { OperationsDataState } from '../OperationsOP';

import type { OperationsSong } from '../config/operations';

import OperationsStatePanel from './OperationsStatePanel';

interface OperationsAssetsProps {
  state: OperationsDataState;
  error: string | null;
  songs: OperationsSong[];
  onRetry: () => void;
}

/*
 * BORA OPERATIONS ASSETS WORKSPACE
 *
 * Inaonyesha covers zilizopo kweli kwenye Operations song records.
 * HAKUNA upload ya kubuni: storage service haijaunganishwa kwenye
 * stage hii, kwa hiyo hakuna "upload successful" inayoonyeshwa.
 */
export default function OperationsAssets({
  state,
  error,
  songs,
  onRetry,
}: OperationsAssetsProps) {
  if (state === 'loading') {
    return (
      <OperationsStatePanel
        title="Reading Operations Assets"
        lines={[
          'Artwork referenced by Operations songs is being read.',
        ]}
      />
    );
  }

  if (state === 'error') {
    return (
      <OperationsStatePanel
        tone="error"
        title="Operations Assets Unavailable"
        lines={[
          error ?? 'Operations data source unavailable.',
          'Nothing is displayed because no asset reference was read.',
        ]}
        onRetry={onRetry}
      />
    );
  }

  const assets = songs.filter(
    (song) => song.cover_url.trim().length > 0
  );

  if (assets.length === 0) {
    return (
      <OperationsStatePanel
        title="No Cover Assets"
        lines={[
          'No Operations song currently references cover artwork.',
          'Assets appear here from real song records only.',
        ]}
      />
    );
  }

  return (
    <div
      className="w-full border"
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
          Artwork Assets
        </p>

        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {assets.length}{' '}
          {assets.length === 1 ? 'cover asset' : 'cover assets'}{' '}
          referenced by Operations songs
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-4">
        {assets.map((song) => (
          <div
            key={song.id}
            className="border p-3"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-background)',
            }}
          >
            <div
              className="aspect-square overflow-hidden border"
              style={{
                borderColor: 'var(--bora-border-strong)',
                backgroundColor: 'var(--bora-background-deep)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={song.cover_url}
                alt={`${song.title} cover artwork`}
                className="h-full w-full object-cover"
              />
            </div>

            <p
              className="mt-2 truncate text-[7px] font-black uppercase tracking-[0.12em]"
              style={{ color: 'var(--bora-text)' }}
            >
              {song.title || 'Untitled entry'}
            </p>

            <p
              className="mt-1 truncate text-[6px] uppercase tracking-[0.1em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              {song.artist || 'Unknown artist'}
            </p>
          </div>
        ))}
      </div>

      <div
        className="border-t px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <p
          className="text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Assets listed here are the cover files already referenced
          by Operations songs. Asset upload is not connected in this
          stage.
        </p>
      </div>
    </div>
  );
}
