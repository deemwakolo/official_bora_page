'use client';

import React, { useState } from 'react';

import TapGUI from './TapGUI';
import {
  SongMetadata,
  TapTarget,
} from './TapOP';

// ===== CHART = PERFORMANCE INFORMATION =====
// Rank, artwork, title, artist, movement, period/date, highlights.
// HAKUNA BORA score/points/K/XP hapa.

export type MovementKind =
  | 'up'
  | 'down'
  | 'same'
  | 'new';

export interface Movement {
  kind: MovementKind;
  delta?: number;
}

export interface ChartHighlight {
  id: string;
  label: string;
  value: string;
  note?: string;
}

export interface MomentSong {
  rank: number;
  movement: Movement;
  metadata: SongMetadata;
}

export interface MomentChartData {
  title: string;
  periodLabel: string;
  date: string;
  badge?: string;
  highlights: ChartHighlight[];
  songs: MomentSong[];
}

interface MomentChartProps {
  data: MomentChartData;
  paneKey: string;
}

// CHART HEADER — BORA / TOP 10 SONGS / PERIOD CHART / DATE
export function MomentChartHeader({
  data,
}: {
  data: MomentChartData;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 text-center">

      <span
        className="font-cinzel text-[10px] font-black uppercase tracking-[0.42em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        BORA
      </span>

      <h2 className="mt-2 font-cinzel text-[22px] font-black uppercase leading-none tracking-[0.14em]">
        {data.title}
      </h2>

      <div
        className="mt-3 text-[9px] font-black uppercase tracking-[0.3em]"
        style={{ color: 'var(--bora-gold)' }}
      >
        {data.periodLabel} CHART
      </div>

      <div
        className="mt-1 text-[8px] font-bold uppercase tracking-[0.24em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        {data.date}
      </div>

    </div>
  );
}

// MOVEMENT — ▲ N / ▼ N / = / NEW
function MovementBadge({
  movement,
}: {
  movement: Movement;
}) {
  const base =
    'shrink-0 text-[9px] font-black uppercase tracking-[0.14em]';

  if (movement.kind === 'up') {
    return (
      <span
        className={base}
        style={{ color: 'var(--bora-gold)' }}
      >
        ▲ {movement.delta ?? 0}
      </span>
    );
  }

  if (movement.kind === 'down') {
    return (
      <span
        className={base}
        style={{ color: 'var(--bora-red)' }}
      >
        ▼ {movement.delta ?? 0}
      </span>
    );
  }

  if (movement.kind === 'new') {
    return (
      <span
        className={base}
        style={{ color: 'var(--bora-gold)' }}
      >
        NEW
      </span>
    );
  }

  return (
    <span
      className={base}
      style={{ color: 'var(--bora-text-subtle)' }}
    >
      =
    </span>
  );
}

export default function MomentChart({
  data,
  paneKey,
}: MomentChartProps) {
  const [selected, setSelected] =
    useState<TapTarget | null>(null);

  const openTap = (song: MomentSong) => {
    setSelected({
      rank: song.rank,
      metadata: song.metadata,
    });
  };

  const closeTap = () => setSelected(null);

  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-[1.75rem] border p-4 animate-[boraSectionIn_450ms_cubic-bezier(0.22,1,0.36,1)] sm:p-6"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--bora-surface-elevated) 72%, transparent)',
        borderColor:
          'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
        boxShadow:
          '0 25px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >

      {/* CHART HIGHLIGHTS */}
      <div>

        <div className="mb-3 flex items-center gap-3">

          <span
            className="h-[1px] flex-1"
            style={{
              backgroundColor: 'var(--bora-border)',
            }}
          />

          <span
            className="text-[8px] font-black uppercase tracking-[0.3em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            CHART HIGHLIGHTS
          </span>

          <span
            className="h-[1px] flex-1"
            style={{
              backgroundColor: 'var(--bora-border)',
            }}
          />

        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

          {data.highlights.map((highlight) => (

            <div
              key={highlight.id}
              className="rounded-2xl border px-3 py-3"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--bora-surface-elevated) 60%, transparent)',
                borderColor: 'var(--bora-border)',
              }}
            >

              <span
                className="block text-[7px] font-black uppercase tracking-[0.2em]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                {highlight.label}
              </span>

              <span className="mt-2 block truncate font-cinzel text-[11px] font-bold tracking-[0.1em]">
                {highlight.value}
              </span>

              {highlight.note && (
                <span
                  className="mt-1 block text-[8px] font-black uppercase tracking-[0.18em]"
                  style={{ color: 'var(--bora-gold)' }}
                >
                  {highlight.note}
                </span>
              )}

            </div>

          ))}

        </div>

      </div>

      {/* TOP 10 LABEL */}
      <div className="mb-3 mt-6 flex items-center justify-between">

        <span className="text-[9px] font-black uppercase tracking-[0.28em]">
          TOP 10
        </span>

        <span
          className="text-[8px] font-bold uppercase tracking-[0.22em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {data.periodLabel}
        </span>

      </div>

      {/* SONG ROWS */}
      <div className="flex flex-col gap-2">


        {data.songs.map((song) => (

          <button
            key={`${paneKey}-row-${song.rank}`}
            type="button"
            onClick={() => openTap(song)}
            aria-label={`Open song info: ${song.metadata.title}`}
            className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-opacity active:opacity-70"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--bora-surface-elevated) 60%, transparent)',
              borderColor: 'var(--bora-border)',
            }}
          >

            {/* RANK */}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-black"
              style={{
                backgroundColor: 'var(--bora-gold-glow)',
                borderColor:
                  'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
                color: 'var(--bora-gold)',
              }}
            >
              {song.rank}
            </span>

            {/* COVER ARTWORK */}
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--bora-surface-elevated) 90%, transparent)',
                borderColor: 'var(--bora-border)',
              }}
            >
              {song.metadata.artwork ? (
                <span
                  className="h-full w-full"
                  style={{
                    backgroundImage: `url('${song.metadata.artwork}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              ) : (
                <span
                  className="font-cinzel text-[13px]"
                  style={{ color: 'var(--bora-gold)' }}
                >
                  ♪
                </span>
              )}
            </span>

            {/* SONG + ARTIST */}
            <span className="flex min-w-0 flex-1 flex-col">

              <span className="truncate font-cinzel text-[11px] font-bold tracking-[0.14em]">
                {song.metadata.title}
              </span>

              <span
                className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                {song.metadata.artist}
              </span>

            </span>

            {/* MOVEMENT */}
            <MovementBadge movement={song.movement} />

          </button>

        ))}

      </div>

      {/* CARD FOOTER */}
      {/*
      <div
        className="mt-5 flex items-center justify-between border-t pt-4"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >

        <span
          className="text-[8px] font-bold uppercase tracking-[0.22em]"
          style={{
            color: 'var(--bora-text-subtle)',
          }}
        >
          CHART DATA ITAUNGANISHWA BAADAYE — TOP 10 SONGS
        </span>

      </div>
      */}

      {/* TAP — METADATA YA SONG ILIYOCHAGULIWA */}
      <TapGUI
        song={selected}
        onClose={closeTap}
      />

    </div>
  );
}

