'use client';

import React, { useState, useEffect } from 'react';
import Chart from './Chart';
import { supabase } from '@/lib/supabase';

/**
 * BORA REGISTRY INTERFACE
 * Matches the "Matitu Nation" SQL schema for the Tanzanian music charts.
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

export default function ChartWrapper({ songs: initialSongs }: { songs: Song[] }) {
  // 1. Initialize state with a stable empty array to prevent Next.js hydration errors.
  const [songs, setSongs] = useState<Song[]>([]);

  // 2. Sync and Sort whenever the server provides fresh initialSongs.
  useEffect(() => {
    const sorted = [...initialSongs].sort((a, b) => {
      // Primary Sort: Fan Momentum (Uncapped).
      if (b.momentum_score !== a.momentum_score) {
        return b.momentum_score - a.momentum_score;
      }
      // Tie-breaker: Original Database Slot.
      return a.slot_number - b.slot_number;
    });
    setSongs(sorted);
  }, [initialSongs]);

  /**
   * BORA ENGINE: RAW MOMENTUM HANDLER
   * This logic allows votes to exceed 100 while managing active depreciation.
   */
  const handleVote = async (id: string, type: 'up' | 'down') => {
    // A. OPTIMISTIC UPDATE: Instant +1 or -1 point change for real-time feel.
    const updatedSongs = songs.map((song) => {
      if (song.id === id) {
        const currentScore = Number(song.momentum_score) || 0;
        return {
          ...song,
          // Momentum grows infinitely with upvotes and drops with downvotes.
          momentum_score: type === 'up' ? currentScore + 1 : currentScore - 1
        };
      }
      return song;
    });

    // B. RE-RANKING: Sort instantly based on the updated uncapped scores.
    const reRanked = [...updatedSongs].sort((a, b) => {
      if (b.momentum_score !== a.momentum_score) {
        return b.momentum_score - a.momentum_score;
      }
      return a.slot_number - b.slot_number;
    });

    setSongs(reRanked);

    /**
     * C. DATABASE SYNC: Targeting the UUID via the unified RPC handler.
     * Note: Ensure your Supabase RPC is named 'handle_song_vote' to match your strategic logic.
     */
    try {
      const { error } = await supabase.rpc('handle_song_vote', { 
        song_id: id, 
        vote_type: type 
      });

      if (error) throw error;
      console.log(`BORA_SIGNAL: ${type.toUpperCase()} registered for ID: ${id}`);
    } catch (err) {
      console.error("MATITU_CORE_SYNC_FAILURE:", err);
      // Optional: If sync fails, you could revert 'setSongs' to the original 'songs' state.
    }
  };

  return (
    <Chart 
      songs={songs} 
      onVote={handleVote} 
    />
  );
}