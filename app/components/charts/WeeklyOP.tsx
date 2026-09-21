'use client';

import React from 'react';

import MomentChart, {
  MomentChartData,
} from './MomentChart';

// WEEKLY OPERATOR — wiring layer ya WEEKLY chart.
// Hapa ndipo data source ya WEEKLY itaunganishwa baadaye
// (Supabase/API). Kwa sasa: placeholder data pekee.
export const weeklyChartData: MomentChartData = {
  title: 'TOP 10 SONGS',
  periodLabel: 'WEEKLY',
  badge: 'PLACEHOLDER',
  songs: [
    {
      rank: 1,
      title: 'PLACEHOLDER SONG 01',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 2,
      title: 'PLACEHOLDER SONG 02',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 3,
      title: 'PLACEHOLDER SONG 03',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 4,
      title: 'PLACEHOLDER SONG 04',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 5,
      title: 'PLACEHOLDER SONG 05',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 6,
      title: 'PLACEHOLDER SONG 06',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 7,
      title: 'PLACEHOLDER SONG 07',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 8,
      title: 'PLACEHOLDER SONG 08',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 9,
      title: 'PLACEHOLDER SONG 09',
      artist: 'PLACEHOLDER ARTIST',
    },
    {
      rank: 10,
      title: 'PLACEHOLDER SONG 10',
      artist: 'PLACEHOLDER ARTIST',
    },
  ],
};

export default function WeeklyOP() {
  return (
    <MomentChart
      paneKey="weekly"
      data={weeklyChartData}
    />
  );
}
