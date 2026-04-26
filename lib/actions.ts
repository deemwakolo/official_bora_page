// lib/admin-actions.ts
import { supabase } from './supabase';

export async function injectSong(formData: FormData) {
  const file = formData.get('cover') as File;
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const yt = formData.get('yt_views') as string;
  const sp = formData.get('sp_plays') as string;

  // 1. Upload Image to bora-assets
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('bora-assets')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: urlData } = supabase.storage
    .from('bora-assets')
    .getPublicUrl(filePath);

  // 3. Inject into Database
  const { error: dbError } = await supabase.from('songs').insert({
    title,
    artist,
    cover_url: urlData.publicUrl,
    yt_views: parseInt(yt) || 0,
    sp_plays: parseInt(sp) || 0,
    momentum_score: 100, // New songs start hot
  });

  if (dbError) throw dbError;
  return { success: true };
}