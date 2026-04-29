import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

/**
 * FETCH REGISTRY (SAFE + STABLE)
 */
export async function getRegistry() {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('slot_number', { ascending: true });

    if (error) {
      console.error("Supabase Error:", error.message);
      return [];
    }

    return data ?? [];
  } catch (error: any) {
    console.error("Registry Fetch Error:", error.message);
    return [];
  }
}

/**
 * UPDATE SLOT (HARDENED ENGINE VERSION)
 */
export async function updateSlot(formData: FormData) {
  try {
    const rawSlot = formData.get('slot_number');

    if (!rawSlot) throw new Error("Missing slot number");

    const slot_number = Number(rawSlot);

    // ⚠️ STRICT VALIDATION
    if (!Number.isInteger(slot_number) || slot_number <= 0) {
      throw new Error("Invalid slot number");
    }

    const title = String(formData.get('title') || 'Empty Slot');
    const artist = String(formData.get('artist') || 'Matitu Nation');

    const yt_views_raw = formData.get('yt_views');
    const sp_plays_raw = formData.get('sp_plays');
    const momentum_raw = formData.get('momentum_score');

    // ⚠️ STRICT NUMBER CHECK (no silent fallback)
    const yt_views = Number(yt_views_raw);
    const sp_plays = Number(sp_plays_raw);
    const momentum_score = Number(momentum_raw);

    if ([yt_views, sp_plays, momentum_score].some(v => Number.isNaN(v))) {
      throw new Error("Invalid numeric metrics provided");
    }

    let cover_url = String(formData.get('existing_cover_url') || '');

    const file = formData.get('cover') as File | null;

    // 📦 UPLOAD FIRST
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `slot_${slot_number}_${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bora-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('bora-assets')
        .getPublicUrl(filePath);

      cover_url = urlData.publicUrl;
    }

    // 🧠 DB WRITE
    const { data, error } = await supabase
      .from('songs')
      .upsert(
        {
          slot_number,
          title,
          artist,
          yt_views,
          sp_plays,
          momentum_score,
          cover_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slot_number' }
      )
      .select()
      .single(); // IMPORTANT FIX

    if (error) throw error;

    // 🔄 REFRESH UI
    revalidatePath('/');

    return {
      success: true,
      data
    };

  } catch (err: any) {
    console.error("Action Error:", err.message);

    return {
      success: false,
      error: err.message
    };
  }
}