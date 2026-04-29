// lib/admin-actions.ts
import { supabase } from './supabase';

/**
 * FETCH THE REGISTRY
 * Pulls all 20 slots from the database.
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
 * Validates and injects data into the specific slot (1-20).
 */
export async function updateSlot(formData: FormData) {
  // 1. Precise Extraction
  const rawSlot = formData.get('slot_number');
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const yt_views = formData.get('yt_views');
  const sp_plays = formData.get('sp_plays');
  const file = formData.get('cover') as File | null;

  // 2. Validation Check
  if (!rawSlot) {
    console.error("Error: slot_number is missing from the form submission.");
    throw new Error("Missing slot number.");
  }

  const slot_number = parseInt(rawSlot as string);
  let cover_url = (formData.get('existing_cover_url') as string) || '';

  console.log(`Initalizing Update for Slot #${slot_number}: ${title}`);

  // 3. Image Upload Logic (Optimized)
  if (file && file.size > 0 && file.name !== 'undefined') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `slot_${slot_number}_${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bora-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn("Storage Upload Warning:", uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from('bora-assets')
          .getPublicUrl(filePath);
        cover_url = urlData.publicUrl;
      }
    } catch (err) {
      console.error("Image processing skipped due to error.");
    }
  }

  // 4. The Upsert Logic
  // Using 'onConflict' to ensure we only ever have 20 rows.
  const { data, error } = await supabase
    .from('songs')
    .upsert({
      slot_number: slot_number,
      title: title || 'Empty Slot',
      artist: artist || 'Matitu Nation',
      yt_views: Number(yt_views) || 0,
      sp_plays: Number(sp_plays) || 0,
      cover_url: cover_url,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'slot_number' 
    })
    .select();

  if (error) {
    console.error("Supabase Database Error:", error.message);
    throw new Error(`Database Update Failed: ${error.message}`);
  }

  console.log("Sacred Slot Updated Successfully:", data);
  return { success: true, data };
}