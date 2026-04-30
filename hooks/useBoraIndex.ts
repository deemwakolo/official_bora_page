import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useBoraIndex() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * ⚡ THE ELITE 20 UI FILTER
   * Retrieves only the Top 20 point-earners from the 30-song pool.
   */
  const fetchRankings = useCallback(async () => {
    // Only set loading on initial fetch to prevent UI flickering during real-time updates
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('momentum_score', { ascending: false })
      .limit(20); // ⚡ STRICT UI LIMIT: The other 10 remain in the "Shadow Pool"

    if (error) {
      console.error('BORA_SYNC_ERROR:', error.message);
      return;
    }

    setSongs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRankings();

    /**
     * REAL-TIME ENGINE
     * When any song in the DB changes (votes, sync, or points), 
     * we re-fetch the Top 20 to see if the order or membership has shifted.
     */
    const channel = supabase
      .channel('bora-live-engine')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => {
          // Re-fetch ensures the UI strictly reflects the current Top 20 
          // point-leaders, even if the change happened to a song at Rank 21.
          fetchRankings();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  /**
   * ⚡ BORA PULSE (OPTIMISTIC VOTING)
   */
  const handleVote = async (id: string, type: 'up' | 'down') => {
    const adjustment = type === 'up' ? 1 : -1;

    // Optimistic Update: Only update if the song is currently in the visible Top 20
    setSongs(prev => {
      return prev.map(song =>
        song.id === id 
          ? { ...song, raw_votes: Math.max(0, (song.raw_votes || 0) + adjustment) } 
          : song
      );
    });

    const { error } = await supabase.rpc(
      type === 'up' ? 'increment_vote' : 'decrement_vote',
      { row_id: id }
    );

    if (error) {
      console.error('BORA_SYNC_ERROR:', error.message);
      fetchRankings(); 
    }
  };

  return { songs, handleVote, loading };
}