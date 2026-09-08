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

  onVote: (
    id: string,
    type: 'up' | 'down'
  ) => boolean | Promise<boolean>;
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

  // KUBADILISHA DATA MPYA YA CHART
  useEffect(() => {
    setLocalSongs(initialSongs);
  }, [initialSongs]);

  // FUNCTION YA KUSHUGHULIKIA KURA
  const handleVote = async (
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

          // KUONGEZA AU KUPUNZA SCORE
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
    // HAPA TUNASUBIRI DATABASE IKAMILISHE
    if (typeof onVote === 'function') {
      const success = await onVote(
        id.toString(),
        type
      );

      // KAMA DATABASE IMEKATAA
      // HATUANZISHI SUCCESS POPUP
      if (!success) {
        return;
      }
    }

    // POPUP INAANZA TU BAADA YA VOTE KUFANIKIWA
    setAlert({
      id: title,
      type,
      msg:
        type === 'up'
          ? 'SIGNAL BOOSTED'
          : 'SIGNAL DROPPED',
    });

    // POPUP/GATE INABAKI SEKUNDE 2
    setTimeout(() => {
      setAlert(null);
    }, 2000);
  };

  return (
    <>
      {/* POPUP YA KURA */}
      <VoteAlert alert={alert} />

      {/* CHART GUI */}
      <ChartGUI
        songs={localSongs.slice(0, 10)}
        onVote={handleVote}
      />
    </>
  );
}