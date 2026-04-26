// lib/admin-actions.ts
// Ensure this path matches where your supabase.ts file is located.
// If supabase.ts is in the same 'lib' folder, use './supabase'
import { supabase } from './supabase';

export async function injectSong(formData: FormData) {
  const file = formData.get('cover') as File;
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const yt = formData.get('yt_views') as string;
  const sp = formData.get('sp_plays') as string;

  if (!file || !title || !artist) {
    throw new Error("Missing required fields: Title, Artist, or Cover Art.");
  }

  // 1. Upload Image to bora-assets
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('bora-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error("Storage Upload Error:", uploadError.message);
    throw uploadError;
  }

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
    momentum_score: 100, // Initial momentum for the Bora chart algorithm
  });

  if (dbError) {
    console.error("Database Injection Error:", dbError.message);
    throw dbError;
  }

  return { success: true };
}