// lib/admin-actions.ts
import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

/**
 * FETCH THE REGISTRY
 * Pulls the Sacred 20. If this returns an empty array, 
 * check your keys in lib/supabase.ts
 */
export async function getRegistry() {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('slot_number', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Registry Fetch Error:", error.message);
    return [];
  }
}

/**
 * UPDATE THE SACRED SLOT
 */
export async function updateSlot(formData: FormData) {
  // 1. Data Extraction
  const rawSlot = formData.get('slot_number');
  if (!rawSlot) throw new Error("Missing slot number.");

  const slot_number = parseInt(rawSlot as string);
  const title = (formData.get('title') as string) || 'Empty Slot';
  const artist = (formData.get('artist') as string) || 'Matitu Nation';
  const yt_views = Number(formData.get('yt_views')) || 0;
  const sp_plays = Number(formData.get('sp_plays')) || 0;
  const file = formData.get('cover') as File | null;
  
  let cover_url = (formData.get('existing_cover_url') as string) || '';

  // 2. Optimized Image Upload
  if (file && file.size > 0 && file.name !== 'undefined') {
    const fileExt = file.name.split('.').pop();
    const fileName = `slot_${slot_number}_${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bora-assets')
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('bora-assets')
        .getPublicUrl(filePath);
      cover_url = urlData.publicUrl;
    }
  }

  // 3. The Sacred Upsert
  // We use slot_number as the unique constraint to overwrite the row
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
    console.error("Update failed. Check RLS policies or keys:", error.message);
    throw new Error(error.message);
  }

  // 4. Force Next.js to refresh the data on the homepage
  revalidatePath('/');
  revalidatePath('/admin');

  return { success: true, data: data?.[0] };
}