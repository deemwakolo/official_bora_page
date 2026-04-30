import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useBoraIndex() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⚡ Stable fetch function
  const fetchRankings = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('votes', { ascending: false });

    if (error) {
      console.error('BORA ENGINE ERROR:', error.message);
      setLoading(false);
      return;
    }

    setSongs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRankings();

    // REAL-TIME CHANNEL
    const channel = supabase
      .channel('bora-live-engine')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => {
          // lightweight refresh instead of full spam updates
          fetchRankings();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchRankings]);

  // ⚡ VOTE ENGINE (SAFE OPTIMISTIC SYSTEM)
  const handleVote = async (id: string, type: 'up' | 'down') => {
    const adjustment = type === 'up' ? 1 : -1;

    // Optimistic UI Update: Immediate response for the user
    setSongs(prev => {
      const updated = prev.map(song =>
        song.id === id
          ? { ...song, votes: Math.max(0, (song.votes || 0) + adjustment) }
          : song
      );

      return [...updated].sort((a, b) => b.votes - a.votes);
    });

    /** 
     * FIX: Replaced .update() with .rpc() to solve the TypeScript build error.
     * This calls a Postgres function to handle the math on the server.
     */
    const { error } = await supabase.rpc(
      type === 'up' ? 'increment_votes' : 'decrement_votes',
      { row_id: id }
    );

    if (error) {
      console.error('BORA_SYNC_ERROR:', error.message);
      // Rollback to actual database state if the sync fails
      fetchRankings(); 
    }
  };

  return { songs, handleVote, loading };
}