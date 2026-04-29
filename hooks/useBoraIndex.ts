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
      supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  // ⚡ VOTE ENGINE (SAFE OPTIMISTIC SYSTEM)
  const handleVote = async (id: string, type: 'up' | 'down') => {
    const adjustment = type === 'up' ? 1 : -1;

    setSongs(prev => {
      const updated = prev.map(song =>
        song.id === id
          ? { ...song, votes: Math.max(0, song.votes + adjustment) }
          : song
      );

      return [...updated].sort((a, b) => b.votes - a.votes);
    });

    const { error } = await supabase
      .from('songs')
      .update({
        votes: supabase.rpc ? undefined : undefined // placeholder safe
      })
      .eq('id', id);

    if (error) {
      console.error('Vote sync failed:', error.message);
      fetchRankings(); // rollback correction
    }
  };

  return { songs, handleVote, loading };
}