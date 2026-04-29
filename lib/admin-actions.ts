// lib/admin-actions.ts
import { supabase } from './supabase';

/**
 * FETCH THE REGISTRY
 * Gets all 20 slots in order for the Cockpit view.
 */
export async function getRegistry() {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('slot_number', { ascending: true });
  
  if (error) {
    console.error("Registry Fetch Error:", error.message);
    return [];
  }
  return data || [];
}

/**
 * UPDATE THE SACRED SLOT
 * This function takes the Cockpit form data and injects it into the database.
 */
export async function updateSlot(formData: FormData) {
  const slot_number = parseInt(formData.get('slot_number') as string);
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const yt_views = parseInt(formData.get('yt_views') as string) || 0;
  const sp_plays = parseInt(formData.get('sp_plays') as string) || 0;
  const file = formData.get('cover') as File | null;

  let cover_url = formData.get('existing_cover_url') as string || '';

  // 1. Image Upload Logic
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const fileName = `slot_${slot_number}_${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bora-assets')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Storage Upload Error:", uploadError.message);
    } else {
      const { data: urlData } = supabase.storage
        .from('bora-assets')
        .getPublicUrl(filePath);
      cover_url = urlData.publicUrl;
    }
  }

  // 2. The Upsert Logic
  // This matches the 'slot_number' and overwrites the existing row.
  const { data, error } = await supabase
    .from('songs')
    .upsert({
      slot_number,
      title,
      artist,
      yt_views,
      sp_plays,
      cover_url,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'slot_number' 
    })
    .select();

  if (error) {
    console.error("Database Update Error:", error.message);
    throw new Error(error.message);
  }

  return { success: true, data };
}