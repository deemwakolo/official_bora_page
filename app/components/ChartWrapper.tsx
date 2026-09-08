'use client';

import React, { useState, useEffect } from 'react';

import Chart from './Chart/Chart';

import { supabase } from '@/lib/supabase';

import { useMasterSound } from './components-themes/haptics/MasterSound';

import { useMasterHaptics } from './components-themes/haptics/MasterHaptics';

/**
 * BORA REGISTRY INTERFACE
 * Muundo wa taarifa za wimbo kutoka kwenye database.
 */
interface Song {
  id: string;
  slot_number: number;
  title: string;
  artist: string;
  cover_url: string;
  momentum_score: number;
  yt_views: number;
  sp_plays: number;
}

/**
 * COMPONENT KUU YA KUFUNGA DATABASE NA CHART GUI
 */
export default function ChartWrapper({
  songs: initialSongs,
}: {
  songs: Song[];
}) {
  // MASTER FEEDBACK SYSTEMS
  const {
    playVotePing,
    playShushaPing,
  } = useMasterSound();

  const {
    voteHaptic,
    shushaHaptic,
  } = useMasterHaptics();

  // STATE YA NYIMBO INAYOTUMIKA KWENYE CHART
  const [songs, setSongs] = useState<Song[]>([]);

  /**
   * DATA MPYA IKIFIKA KUTOKA SERVER
   * PANGA NYIMBO KWA MOMENTUM SCORE.
   */
  useEffect(() => {
    const sorted = [...initialSongs].sort((a, b) => {
      // SCORE KUBWA INAKUWA JUU
      if (b.momentum_score !== a.momentum_score) {
        return b.momentum_score - a.momentum_score;
      }

      // KAMA SCORE NI SAWA, TUMIA SLOT YA DATABASE
      return a.slot_number - b.slot_number;
    });

    setSongs(sorted);
  }, [initialSongs]);

  /**
   * BORA ENGINE:
   * HUSHUGHULIKIA KURA NA KUBADILISHA MOMENTUM.
   */
  const handleVote = async (
    id: string,
    type: 'up' | 'down'
  ) => {
    /**
     * HATUA YA ZERO:
     * FEEDBACK YA CLICK INAANZA MARA MOJA.
     *
     * SOUND + HAPTIC HAZISUBIRI DATABASE.
     */
    if (type === 'up') {
      playVotePing();
      voteHaptic();
    } else {
      playShushaPing();
      shushaHaptic();
    }

    /**
     * HATUA YA KWANZA:
     * HIFADHI NAFASI YA KILA WIMBO KABLA YA KURA.
     */
    const previousRanks = new Map<string, number>();

    songs.forEach((song, index) => {
      previousRanks.set(song.id, index + 1);
    });

    /**
     * HATUA YA PILI:
     * BADILISHA MOMENTUM INSTANTLY KWENYE UI.
     */
    const updatedSongs = songs.map((song) => {
      if (song.id === id) {
        const currentScore =
          Number(song.momentum_score) || 0;

        return {
          ...song,
          momentum_score:
            type === 'up'
              ? currentScore + 1
              : currentScore - 1,
        };
      }

      return song;
    });

    /**
     * HATUA YA TATU:
     * PANGA UPYA CHART KWA MOMENTUM MPYA.
     */
    const reRanked = [...updatedSongs].sort((a, b) => {
      if (b.momentum_score !== a.momentum_score) {
        return b.momentum_score - a.momentum_score;
      }

      return a.slot_number - b.slot_number;
    });

    /**
     * HATUA YA NNE:
     * WAPA KILA WIMBO RANK MPYA.
     */
    const rankedSongs = reRanked.map((song, index) => ({
      ...song,
      slot_number: index + 1,
    }));

    /**
     * UI INABADILIKA INSTANTLY.
     */
    setSongs(rankedSongs);

    /**
     * HATUA YA TANO:
     * TUMA KURA KWENYE DATABASE.
     */
    try {
      const { error } = await supabase.rpc(
        'handle_song_vote',
        {
          song_id: id,
          vote_type: type,
        }
      );

      if (error) {
        throw error;
      }

      /**
       * HATUA YA SITA:
       * VOTE IMEKUBALIWA NA DATABASE.
       *
       * HAPA HATUFANYI SOUND/HAPTIC TENA.
       *
       * FEEDBACK YA CLICK ILIKWISHA MWANZO.
       */

      /**
       * HATUA YA SABA:
       * HIFADHI RANK MPYA NA RANK YA ZAMANI.
       */
      const rankUpdates = rankedSongs
        .filter((song) => {
          const oldRank = previousRanks.get(song.id);

          return (
            oldRank !== undefined &&
            oldRank !== song.slot_number
          );
        })
        .map((song) => ({
          id: song.id,
          slot_number: song.slot_number,
          previous_rank:
            previousRanks.get(song.id) ?? null,
        }));

      /**
       * UPDATE KILA WIMBO ULIOBADILISHA NAFASI.
       */
      for (const update of rankUpdates) {
        const { error: rankError } = await supabase
          .from('songs')
          .update({
            slot_number: update.slot_number,
            previous_rank: update.previous_rank,
          })
          .eq('id', update.id);

        if (rankError) {
          console.error(
            'BORA_RANK_SYNC_FAILURE:',
            rankError
          );
        }
      }

      console.log(
        `BORA_SIGNAL: ${type.toUpperCase()} registered for ID: ${id}`
      );

      console.log(
        `BORA_RANK_SYNC: ${rankUpdates.length} chart positions updated.`
      );

      /**
       * MUHIMU:
       * SUCCESS INARUDI JUU.
       *
       * Chart.tsx ITAJUA KWAMBA DATABASE
       * IMEKUBALI KURA NA NDIPO ITAANZA
       * 2-SECOND POPUP.
       */
      return true;
    } catch (err) {
      console.error(
        'MATITU_CORE_SYNC_FAILURE:',
        err
      );

      /**
       * DATABASE HAJAKUBALI.
       * USIANZISHE SUCCESS POPUP.
       */
      return false;
    }
  };

  return (
    <Chart
      songs={songs}
      onVote={handleVote}
    />
  );
}