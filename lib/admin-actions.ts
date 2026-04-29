// lib/admin-actions.ts
import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

/**
 * FETCH THE REGISTRY
 * Pulls the Sacred 20 from the 'songs' table.
 */
export async function getRegistry() {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('slot_number', { ascending: true });
    
    if (error) {
      // Log the specific Postgres error code for debugging
      console.error(`Supabase Error [${error.code}]:`, error.message);
      return []; 
    }

    return data || [];
  } catch (error: any) {
    console.error("Connection Catch:", error.message);
    return [];
  }
}

/**
 * UPDATE THE SACRED SLOT
 */
export async function updateSlot(formData: FormData) {
  try {
    // 1. Data Extraction
    const rawSlot = formData.get('slot_number');
    if (!rawSlot) throw new Error("Missing slot number.");

    const slot_number = parseInt(rawSlot as string);
    const title = (formData.get('title') as string) || 'Empty Slot';
    const artist = (formData.get('artist') as string) || 'Matitu Nation';
    const yt_views = Number(formData.get('yt_views')) || 0;
    const sp_plays = Number(formData.get('sp_plays')) || 0;
    
    // Default momentum_score if not provided
    const momentum_score = Number(formData.get('momentum_score')) || 100;
    
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

      if (uploadError) {
        console.error("Storage Error:", uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from('bora-assets')
          .getPublicUrl(filePath);
        cover_url = urlData.publicUrl;
      }
    }

    // 3. The Sacred Upsert
    // Matches the exact schema you confirmed: id, slot_number, title, artist, etc.
    const { data, error } = await supabase
      .from('songs')
      .upsert({
        slot_number,
        title,
        artist,
        yt_views,
        sp_plays,
        momentum_score, // Added this to match your table
        cover_url,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'slot_number' 
      })
      .select();

    if (error) {
      console.error("Upsert failed:", error.message);
      throw new Error(error.message);
    }

    // 4. Force Cache Revalidation
    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: data?.[0] };
    
  } catch (err: any) {
    console.error("Action Error:", err.message);
    return { success: false, error: err.message };
  }
}