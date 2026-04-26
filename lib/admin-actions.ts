// lib/admin-actions.ts
import { supabase } from './supabase';

// 1. GET ALL SONGS
export async function getRegistry() {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('momentum_score', { ascending: false });
  
  if (error) return [];
  return data;
}

// 2. INJECT NEW SONG
export async function injectSong(formData: FormData) {
  const file = formData.get('cover') as File;
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const yt = formData.get('yt_views') as string;
  const sp = formData.get('sp_plays') as string;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  await supabase.storage.from('bora-assets').upload(filePath, file);
  const { data: urlData } = supabase.storage.from('bora-assets').getPublicUrl(filePath);

  const { error: dbError } = await supabase.from('songs').insert({
    title,
    artist,
    cover_url: urlData.publicUrl,
    yt_views: parseInt(yt) || 0,
    sp_plays: parseInt(sp) || 0,
    momentum_score: 100,
  });

  if (dbError) throw dbError;
  return { success: true };
}

// 3. DELETE SONG
export async function deleteSong(id: string) {
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}