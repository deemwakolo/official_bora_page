'use client';

import React from 'react';

import { MomentSong } from './MomentChart';

interface TopPerformersProps {
  songs: MomentSong[];
}

function Artwork({ src }: { src: string }) {
  const hasImg = src.trim().length > 0;

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border"
      style={{
        borderRadius: '0.5rem',
        backgroundColor: '#1c1c1e',
        borderColor: 'var(--bora-border)',
      }}
    >
      {hasImg ? (
        <span
          className="h-full w-full"
          style={{
            backgroundImage: "url('" + src + "')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <span
          className="font-cinzel text-[12px]"
          style={{
            color: 'var(--bora-gold)',
            opacity: 0.8,
          }}
        >
          {'\u266A'}
        </span>
      )}
    </span>
  );
}

function Column({
  label,
  song,
  stat,
}: {
  label: string;
  song: MomentSong | null;
  stat: string | null;
}) {
  return (
    <div
      className="min-w-0 flex-1 px-2 py-3 sm:px-5 sm:py-2"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      <div
        className="text-[7px] font-black uppercase tracking-[0.22em] sm:text-[8px] sm:tracking-[0.3em]"
        style={{ color: 'var(--bora-gold)' }}
      >
        {label}
      </div>

      {song ? (
        <div className="mt-2 flex min-w-0 items-center gap-2 sm:mt-3 sm:gap-3">
          <Artwork src={song.metadata.artwork} />

          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-[11px] font-bold leading-tight sm:text-[12px]"
              style={{ color: 'var(--bora-text)' }}
            >
              {song.metadata.title}
            </span>

            <span
              className="mt-0.5 block truncate text-[9px] sm:mt-1 sm:text-[10px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {song.metadata.artist}
            </span>
          </span>
        </div>
      ) : (
        <div
          className="mt-2 text-[12px] font-bold"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          &mdash;
        </div>
      )}

      <div
        className="mt-1.5 text-[8px] font-black uppercase tracking-[0.12em] sm:mt-2 sm:text-[9px] sm:tracking-[0.16em]"
        style={{
          color: stat
            ? 'var(--bora-gold)'
            : 'var(--bora-text-subtle)',
        }}
      >
        {stat ?? '\u2014'}
      </div>
    </div>
  );
}

export default function TopPerformers({
  songs,
}: TopPerformersProps) {
  let highRise: MomentSong | null = null;
  let highDelta = -1;

  for (const song of songs) {
    if (song.movement.kind !== 'up') continue;

    const delta = song.movement.delta ?? 0;

    if (delta > highDelta) {
      highDelta = delta;
      highRise = song;
    }
  }

  const debut =
    songs.find((song) => song.movement.kind === 'new') ?? null;

  /*
   * Long Stay requires historical chart-duration data.
   * MomentSong currently has no weeks-on-chart field.
   * Keep #1 as the temporary representative until
   * historical chart-duration data is available.
   */
  const longStay =
    songs.find((song) => song.rank === 1) ??
    songs[0] ??
    null;

  const highStat = highRise
    ? '\u25B2 ' + (highRise.movement.delta ?? 0)
    : null;

  const debutStat = debut ? 'NEW' : null;

  const longStat = longStay
    ? '#' + longStay.rank
    : null;

  return (
    <section
      className="mx-auto w-full max-w-5xl px-3 sm:px-4"
      aria-label="Top performers"
    >
      <div
        className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        style={
          {
            borderBottom: '1px solid var(--bora-border)',
            borderColor: 'var(--bora-border)',
          } as React.CSSProperties
        }
      >
        <Column
          label="Long Stay"
          song={longStay}
          stat={longStat}
        />

        <Column
          label="High Rise"
          song={highRise}
          stat={highStat}
        />

        <Column
          label="Debut"
          song={debut}
          stat={debutStat}
        />
      </div>
    </section>
  );
}