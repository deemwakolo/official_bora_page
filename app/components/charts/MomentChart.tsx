'use client';

import React from 'react';

// VISUAL CHART CARD — haijui Weekly/Monthly, inapokea data/config tu.
// WeeklyOP na MonthlyOP zote zinatumia component hii moja.
export interface MomentSong {
  rank: number;
  title: string;
  artist: string;
}

export interface MomentChartData {
  title: string;
  periodLabel: string;
  badge?: string;
  songs: MomentSong[];
}

interface MomentChartProps {
  data: MomentChartData;
  paneKey: string;
}

export default function MomentChart({
  data,
  paneKey,
}: MomentChartProps) {
  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-[1.75rem] border p-6 animate-[boraSectionIn_450ms_cubic-bezier(0.22,1,0.36,1)]"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--bora-surface-elevated) 72%, transparent)',
        borderColor:
          'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
        boxShadow:
          '0 25px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >

      {/* CARD HEADER */}
      <div className="flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <span
            className="flex h-11 w-11 items-center justify-center rounded-full border text-xl"
            style={{
              backgroundColor: 'var(--bora-gold-glow)',
              borderColor:
                'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
            }}
          >
            🏆
          </span>

          <div className="flex flex-col">

            <span className="font-cinzel text-sm font-bold tracking-[0.18em]">
              {data.title}
            </span>

            <span
              className="mt-1 text-[8px] font-bold uppercase tracking-[0.22em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              {data.periodLabel} CHART
            </span>

          </div>

        </div>

        {/* BADGE */}
        {data.badge && (
          <span
            className="rounded-full border px-3 py-1 text-[7px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text-muted)',
              borderColor: 'var(--bora-border)',
            }}
          >
            {data.badge}
          </span>
        )}

      </div>


      {/* SONG ROWS */}
      <div className="mt-6 flex flex-col gap-2">

        {data.songs.map((song) => (

          <div
            key={`${paneKey}-row-${song.rank}`}
            className="flex items-center gap-4 rounded-2xl border px-4 py-3"
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

            {/* SONG + ARTIST */}
            <div className="flex min-w-0 flex-1 flex-col">

              <span className="truncate font-cinzel text-[11px] font-bold tracking-[0.14em]">
                {song.title}
              </span>

              <span
                className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                {song.artist}
              </span>

            </div>

            {/* PLACEHOLDER SLEEVE */}
            <span
              className="h-8 w-8 shrink-0 rounded-lg border"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--bora-surface-elevated) 90%, transparent)',
                borderColor: 'var(--bora-border)',
              }}
            />

          </div>

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

    </div>
  );
}
