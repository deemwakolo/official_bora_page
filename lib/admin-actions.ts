// lib/admin-actions.ts
import { supabase } from './supabase';

/**
 * FETCH THE REGISTRY
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
 */
export async function updateSlot(formData: FormData) {
  // 1. Precise Extraction & Validation
  const rawSlot = formData.get('slot_number');
  if (!rawSlot) {
    console.error("Error: slot_number is missing.");
    throw new Error("Missing slot number.");
  }

  const slot_number = parseInt(rawSlot as string);
  const title = (formData.get('title') as string) || 'Empty Slot';
  const artist = (formData.get('artist') as string) || 'Matitu Nation';
  const yt_views = Number(formData.get('yt_views')) || 0;
  const sp_plays = Number(formData.get('sp_plays')) || 0;
  const file = formData.get('cover') as File | null;
  
  // Start with existing cover URL if no new file is provided
  let cover_url = (formData.get('existing_cover_url') as string) || '';

  // 2. Image Upload Logic
  if (file && file.size > 0 && file.name !== 'undefined') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `slot_${slot_number}_${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bora-assets')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('bora-assets')
          .getPublicUrl(filePath);
        cover_url = urlData.publicUrl;
      }
    } catch (err) {
      console.error("Image upload failed, proceeding with text update.");
    }
  }

  // 3. The Clean Upsert
  // We DO NOT include the 'id' here. We let 'onConflict: slot_number' 
  // do the work of finding the right row to overwrite.
  const { data, error } = await supabase
    .from('songs')
    .upsert(
      {
        slot_number,
        title,
        artist,
        yt_views,
        sp_plays,
        cover_url,
        updated_at: new Date().toISOString(),
      }, 
      { onConflict: 'slot_number' }
    )
    .select();

  if (error) {
    console.error("Supabase Database Error:", error.message);
    // If you see this in the console, check your RLS policies again
    throw new Error(error.message);
  }

  return { success: true, data: data[0] };
}