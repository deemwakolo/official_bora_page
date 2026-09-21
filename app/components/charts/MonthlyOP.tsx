'use client';

import React from 'react';

import MomentChart, {
  MomentChartData,
  MomentSong,
} from './MomentChart';
import { SongMetadata } from './TapOP';

// MONTHLY OPERATOR — wiring layer ya MONTHLY chart.
// Hapa ndipo data source ya MONTHLY itaunganishwa baadaye
// (Supabase/API). Kwa sasa: placeholder data pekee.

// MOVEMENT — ▲ N / ▼ N / = / NEW
const monthlyMovement: MomentSong['movement'][] = [
  { kind: 'up', delta: 2 },
  { kind: 'new' },
  { kind: 'same' },
  { kind: 'down', delta: 1 },
  { kind: 'up', delta: 5 },
  { kind: 'same' },
  { kind: 'new' },
  { kind: 'down', delta: 3 },
  { kind: 'up', delta: 1 },
  { kind: 'down', delta: 2 },
];

// SONG METADATA — placeholder (haina score/points)
const monthlyMetadata = (
  rank: number
): SongMetadata => ({
  title: `PLACEHOLDER SONG ${String(rank).padStart(2, '0')}`,
  artist: 'PLACEHOLDER ARTIST',
  feature: '—',
  producer: 'PLACEHOLDER PRODUCER',
  releaseDate: 'PLACEHOLDER DATE',
  genre: 'PLACEHOLDER GENRE',
  artwork: '',
  youtube: '',
  spotify: '',
  boomplay: '',
});

export const monthlyChartData: MomentChartData = {
  title: 'TOP 10 SONGS',
  periodLabel: 'MONTHLY',
  date: 'PLACEHOLDER MONTH',
  highlights: [
    {
      id: 'no-1',
      label: 'NUMBER ONE',
      value: 'PLACEHOLDER SONG 01',
    },
    {
      id: 'highest-jump',
      label: 'HIGHEST JUMP',
      value: 'PLACEHOLDER SONG 05',
      note: '▲ 5',
    },
    {
      id: 'steepest-fall',
      label: 'STEEPEST FALL',
      value: 'PLACEHOLDER SONG 08',
      note: '▼ 3',
    },
    {
      id: 'new-entry',
      label: 'NEW ENTRY',
      value: 'PLACEHOLDER SONG 07',
    },
  ],
  songs: monthlyMovement.map((movement, index) => ({
    rank: index + 1,
    movement,
    metadata: monthlyMetadata(index + 1),
  })),
};

export default function MonthlyOP() {
  return (
    <MomentChart
      paneKey="monthly"
      data={monthlyChartData}
    />
  );
}
