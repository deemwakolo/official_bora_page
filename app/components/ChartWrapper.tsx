'use client';

import React, { useState, useEffect } from 'react';
import Chart from './Chart';
import { supabase } from '@/lib/supabase';

// Structured to match your "Wipe and Rebuild" SQL schema
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

export default function ChartWrapper({ songs: initialSongs }: { songs: Song[] }) {
  // 1. Initialize state. We use an empty array initially to avoid hydration mismatches.
  const [songs, setSongs] = useState<Song[]>([]);

  // 2. Sync and Sort on mount/update
  useEffect(() => {
    const sorted = [...initialSongs].sort((a, b) => {
      // Primary Sort: Momentum Score (Highest first)
      if (b.momentum_score !== a.momentum_score) {
        return b.momentum_score - a.momentum_score;
      }
      // Tie-breaker: Original Slot Number (Lowest first)
      return a.slot_number - b.slot_number;
    });
    setSongs(sorted);
  }, [initialSongs]);

  /**
   * BORA ENGINE: OPTIMISTIC SIGNAL HANDLER
   * This provides the "Instant Rank Movement" feel.
   */
  const handleVote = async (id: string, type: 'up' | 'down') => {
    // A. OPTIMISTIC UPDATE: 1 Click = Exact 1 Integer Change
    const updatedSongs = songs.map((song) => {
      if (song.id === id) {
        const currentScore = Number(song.momentum_score) || 0;
        return {
          ...song,
          momentum_score: type === 'up' ? currentScore + 1 : currentScore - 1
        };
      }
      return song;
    });

    // B. RE-RANKING: Sort again so the voted song moves up/down instantly
    const reRanked = [...updatedSongs].sort((a, b) => {
      if (b.momentum_score !== a.momentum_score) {
        return b.momentum_score - a.momentum_score;
      }
      return a.slot_number - b.slot_number;
    });

    setSongs(reRanked);

    // C. DATABASE SYNC: Targeting the UUID via RPC
    try {
      const { error } = await supabase.rpc(
        type === 'up' ? 'increment_vote' : 'decrement_vote',
        { row_id: id }
      );

      if (error) throw error;
      console.log(`BORA_SIGNAL: Vote registered for ID ${id}`);
    } catch (err) {
      console.error("MATITU_CORE_SYNC_FAILURE:", err);
      // Optional: Roll back to previous state if sync fails
      // setSongs(songs); 
    }
  };

  return (
    <Chart 
      songs={songs} 
      onVote={handleVote} 
    />
  );
}