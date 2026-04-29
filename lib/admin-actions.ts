// lib/admin-actions.ts
import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

/**
 * FETCH THE REGISTRY
 */
export async function getRegistry() {
  try {
    // We add a timestamp query parameter to the select if we want to 
    // absolutely force Supabase to bypass any edge caching.
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('slot_number', { ascending: true });
    
    if (error) {
      console.error("Supabase Error:", error.message);
      return [];
    }

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
  try {
    const rawSlot = formData.get('slot_number');
    if (!rawSlot) throw new Error("Missing slot number.");

    const slot_number = parseInt(rawSlot as string);
    const title = (formData.get('title') as string) || 'Empty Slot';
    const artist = (formData.get('artist') as string) || 'Matitu Nation';
    const yt_views = Number(formData.get('yt_views')) || 0;
    const sp_plays = Number(formData.get('sp_plays')) || 0;
    const momentum_score = Number(formData.get('momentum_score')) || 100;
    
    const file = formData.get('cover') as File | null;
    let cover_url = (formData.get('existing_cover_url') as string) || '';

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

    const { data, error } = await supabase
      .from('songs')
      .upsert({
        slot_number,
        title,
        artist,
        yt_views,
        sp_plays,
        momentum_score,
        cover_url,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'slot_number' 
      })
      .select();

    if (error) throw error;

    // This is the most important part for your version of Next.js
    revalidatePath('/');
    
    return { success: true, data: data?.[0] };
    
  } catch (err: any) {
    console.error("Action Error:", err.message);
    return { success: false, error: err.message };
  }
}