'use client';

import React, { useState, useEffect } from 'react';

import Chart from './Chart/Chart';

import { createClient } from '@/lib/supabase/client';

import {
  castSecureVote,
  newIdempotencyKey,
} from '@/lib/supabase/secure-vote';


import { useMasterSound } from './components-themes/haptics/MasterSound';

import { useMasterHaptics } from './components-themes/haptics/MasterHaptics';

/**
 * SECURE VOTING SWITCH (default OFF).
 *
 * Legacy `handle_song_vote` remains the default path. The hardened
 * `cast_vote_secure` path activates ONLY when NEXT_PUBLIC_BORA_SECURE_VOTING
 * is exactly 'true'. Missing, empty, or any other value keeps the existing
 * legacy behavior unchanged.
 */
const SECURE_VOTING = process.env.NEXT_PUBLIC_BORA_SECURE_VOTING === 'true';

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

const supabase = createClient();

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
  const [songs, setSongs] = useState<Song[]>(initialSongs);

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
      if (SECURE_VOTING) {
        /**
         * HARDENED PATH (default OFF; enabled only via
         * NEXT_PUBLIC_BORA_SECURE_VOTING === 'true').
         *
         * One idempotency key per user vote action; a guest Auth session is
         * ensured inside the helper. Accepted AND duplicate both count as
         * success. On ANY failure we throw and take the existing error path —
         * we NEVER fall back to handle_song_vote, which could double-count.
         */
        const result = await castSecureVote({
          songId: id,
          voteType: type,
          idempotencyKey: newIdempotencyKey(),
        });

        if (!result.ok) {
          throw new Error(
            `SECURE_VOTE_FAILED: ${result.reason}${
              result.code ? ` (${result.code})` : ''
            }`
          );
        }
      } else {
        /**
         * LEGACY PATH (default, unchanged).
         */
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
      }

      /**
       * HATUA YA SITA:
       * VOTE IMEKUBALIWA NA DATABASE.
       *
       * HAPA HATUFANYI SOUND/HAPTIC TENA.
       *
       * FEEDBACK YA CLICK ILIKWISHA MWANZO.
       */

      // Canonical ranks (slot_number / previous_rank) are no longer
      // persisted from the browser. Display order is derived client-side
      // from momentum_score (see reRanked/rankedSongs above). Persisting
      // ranks is an administrator-only concern (updateSlot) — see
      // migration 0019. The previous_rank movement indicator may show a
      // stale value until reload or an administrator updates ranks.

      console.log(
        `BORA_SIGNAL: ${type.toUpperCase()} registered for ID: ${id}`
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