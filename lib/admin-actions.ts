// lib/admin-actions.ts
import { supabase } from './supabase';

export async function getRegistry() {
  const { data } = await supabase
    .from('songs')
    .select('*')
    .order('slot_number', { ascending: true });
  return data || [];
}

export async function updateSlot(formData: FormData) {
  const slot_number = parseInt(formData.get('slot_number') as string);
  const title = formData.get('title') as string;
  const artist = formData.get('artist') as string;
  const yt = formData.get('yt_views') as string;
  const sp = formData.get('sp_plays') as string;
  const file = formData.get('cover') as File;

  let cover_url = '';

  // Only upload if a new file is provided
  if (file && file.size > 0) {
    const fileName = `${Date.now()}-slot-${slot_number}.${file.name.split('.').pop()}`;
    await supabase.storage.from('bora-assets').upload(`covers/${fileName}`, file);
    const { data } = supabase.storage.from('bora-assets').getPublicUrl(`covers/${fileName}`);
    cover_url = data.publicUrl;
  }

  // UPSERT: If slot_number exists, update it. If not, create it.
  const updateData: any = {
    slot_number,
    title,
    artist,
    yt_views: parseInt(yt) || 0,
    sp_plays: parseInt(sp) || 0,
    momentum_score: 100,
  };

  if (cover_url) updateData.cover_url = cover_url;

  const { error } = await supabase
    .from('songs')
    .upsert(updateData, { onConflict: 'slot_number' });

  if (error) throw error;
  return { success: true };
}