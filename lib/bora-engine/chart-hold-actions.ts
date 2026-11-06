'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';

import { authorizeBoraAdministrator } from '@/lib/administrator-authorization';
import { createClient } from '@/lib/supabase/server';

export async function getBoraChartHoldSongIds(): Promise<string[]> {
  const authorization = await authorizeBoraAdministrator();
  if (authorization.status !== 'authorized') {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bora_chart_hold')
    .select('song_id');

  if (error) {
    console.error('[bora-chart-hold] read failed:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.song_id)
    .filter((songId): songId is string => typeof songId === 'string');
}

export async function toggleBoraChartHoldSong(
  songId: string,
): Promise<{ success: boolean; held: boolean; error?: string }> {
  if (typeof songId !== 'string' || songId.trim().length === 0) {
    return { success: false, held: false, error: 'Missing song id.' };
  }

  const authorization = await authorizeBoraAdministrator();
  if (authorization.status !== 'authorized') {
    return {
      success: false,
      held: false,
      error: 'Administrator access is required to manage the chart hold.',
    };
  }

  const supabase = await createClient();
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user?.id) {
    return {
      success: false,
      held: false,
      error: 'Unable to verify the active administrator session.',
    };
  }

  const { data: existing, error: lookupError } = await supabase
    .from('bora_chart_hold')
    .select('song_id')
    .eq('song_id', songId)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    console.error('[bora-chart-hold] lookup failed:', lookupError.message);
    return {
      success: false,
      held: false,
      error: 'Unable to inspect the current chart hold state.',
    };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from('bora_chart_hold')
      .delete()
      .eq('song_id', songId);

    if (deleteError) {
      console.error('[bora-chart-hold] delete failed:', deleteError.message);
      return {
        success: false,
        held: true,
        error: 'Unable to remove the song from the chart hold.',
      };
    }

    revalidatePath('/admin/engine');
    revalidatePath('/');
    return { success: true, held: false };
  }

  const { error: insertError } = await supabase.from('bora_chart_hold').insert({
    song_id: songId,
    held_by: userData.user.id,
  });

  if (insertError) {
    console.error('[bora-chart-hold] insert failed:', insertError.message);
    return {
      success: false,
      held: false,
      error: 'Unable to add the song to the chart hold.',
    };
  }

  revalidatePath('/admin/engine');
  revalidatePath('/');
  return { success: true, held: true };
}
