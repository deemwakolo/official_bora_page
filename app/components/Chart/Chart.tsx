'use client';

import React, { useState, useEffect } from 'react';

import VoteAlert from './VoteAlert';
import ChartGUI from './ChartGUI';

// STRUCTURE YA TAARIFA ZA KILA WIMBO KWENYE CHART
interface Song {
  id?: string | number;
  slot_number?: number;
  title: string;
  artist?: string;
  cover_url: string;
  youtube_id?: string;
  momentum_score?: number;
  yt_rank?: number;
  sp_rank?: number;

  // NAFASI YA WIMBO KWENYE CHART YA AWALI
  previous_rank?: number | null;
}

// TAARIFA AMBAZO KURA INAPOKEA
interface KuraProps {
  songs: Song[];
  onVote: (id: string, type: 'up' | 'down') => void;
}

// COMPONENT KUU INAYOSIMAMIA CHART NA KURA
export default function Kura({
  songs: initialSongs = [],
  onVote,
}: KuraProps) {

  // HII NDIO LIST INAYOONYESHWA KWENYE UI
  const [localSongs, setLocalSongs] =
    useState<Song[]>(initialSongs);

  // STATE YA POPUP YA KURA
  const [alert, setAlert] = useState<{
    id: string;
    type: 'up' | 'down';
    msg: string;
  } | null>(null);

  // KUBADILISHA DATA MPYA YA CHART NA KUHIFADHI RANK YA AWALI
// DATA MPYA IKIFIKA, HIFADHI DATA YA DATABASE KAMA ILIVYO
// PREVIOUS_RANK SASA INATOKA KWENYE DATABASE
useEffect(() => {
  setLocalSongs(initialSongs);
}, [initialSongs]);

  // FUNCTION YA KUSHUGHULIKIA KURA
  const handleVote = (
    id: string | number | undefined,
    title: string,
    type: 'up' | 'down'
  ) => {

    // KAMA HAKUNA ID HATUENDELEI
    if (!id) return;

    // KUBADILISHA POWER SCORE MARA MOJA KWENYE UI
    setLocalSongs((currentSongs) =>
      currentSongs.map((song) => {

        // KUTAFUTA WIMBO ULIOPIGIWA KURA
        if (song.id === id) {

          // KUPATA SCORE YA SASA
          const currentScore =
            Number(song.momentum_score) || 0;

          // KUONGEZA AU KUPUNGUZA SCORE
          return {
            ...song,
            momentum_score:
              type === 'up'
                ? currentScore + 1
                : currentScore - 1,
          };
        }

        return song;
      })
    );

    // KUTUMA KURA KWENYE COMPONENT YA JUU
    if (typeof onVote === 'function') {
      onVote(id.toString(), type);
    }

    // KUONYESHA POPUP YA SIGNAL
    setAlert({
      id: title,
      type,
      msg:
        type === 'up'
          ? 'SIGNAL BOOSTED'
          : 'SIGNAL DROPPED',
    });

    // KUFUNGA POPUP BAADA YA SEKUNDE 1.5
    setTimeout(() => {
      setAlert(null);
    }, 1500);
  };

  return (
    <>
      {/* POPUP YA KURA */}
      <VoteAlert alert={alert} />

      {/* CHART GUI — INAPOKEA RANK YA SASA NA PREVIOUS RANK */}
      <ChartGUI
        songs={localSongs.slice(0, 10)}
        onVote={handleVote}
      />
    </>
  );
}