'use client';

import React from 'react';

import MomentChart, {
  MomentChartData,
  MomentSong,
} from './MomentChart';
import { SongMetadata } from './TapOP';

// WEEKLY OPERATOR — wiring layer ya WEEKLY chart.
// Hapa ndipo data source ya WEEKLY itaunganishwa baadaye
// (Supabase/API). Kwa sasa: placeholder data pekee.

// MOVEMENT — ▲ N / ▼ N / = / NEW
const weeklyMovement: MomentSong['movement'][] = [
  { kind: 'new' },
  { kind: 'up', delta: 3 },
  { kind: 'down', delta: 2 },
  { kind: 'same' },
  { kind: 'up', delta: 1 },
  { kind: 'new' },
  { kind: 'down', delta: 4 },
  { kind: 'same' },
  { kind: 'up', delta: 2 },
  { kind: 'new' },
];

// SONG METADATA — placeholder (haina score/points)
const weeklyMetadata = (
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

export const weeklyChartData: MomentChartData = {
  title: 'TOP 10 SONGS',
  periodLabel: 'WEEKLY',
  date: 'PLACEHOLDER WEEK',
  highlights: [
    {
      id: 'no-1',
      label: 'NUMBER ONE',
      value: 'PLACEHOLDER SONG 01',
    },
    {
      id: 'highest-jump',
      label: 'HIGHEST JUMP',
      value: 'PLACEHOLDER SONG 02',
      note: '▲ 3',
    },
    {
      id: 'steepest-fall',
      label: 'STEEPEST FALL',
      value: 'PLACEHOLDER SONG 07',
      note: '▼ 4',
    },
    {
      id: 'new-entry',
      label: 'NEW ENTRY',
      value: 'PLACEHOLDER SONG 06',
    },
  ],
  songs: weeklyMovement.map((movement, index) => ({
    rank: index + 1,
    movement,
    metadata: weeklyMetadata(index + 1),
  })),
};

export default function WeeklyOP() {
  return (
    <MomentChart
      paneKey="weekly"
      data={weeklyChartData}
    />
  );
}
