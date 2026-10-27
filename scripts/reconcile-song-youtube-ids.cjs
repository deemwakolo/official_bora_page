const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim().replace(/^\uFEFF/, '');
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = value;
    }
  });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function reconcile() {
  console.log('=== Reconciling Song YouTube IDs ===\n');

  // Fetch all songs with placeholder youtube_ids
  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, youtube_id');

  if (error) {
    console.error('Failed to fetch songs:', error.message);
    process.exit(1);
  }

  let updatedCount = 0;
  for (const song of songs) {
    if (song.youtube_id && !/^[\w-]{11}$/.test(song.youtube_id)) {
      // Generate a deterministic or fallback 11-char valid placeholder ID format (e.g. BORA_ + first 6 hex of uuid)
      const cleanHex = song.id.replace(/-/g, '').substring(0, 6);
      const newYouTubeId = `BORA${cleanHex}`; // Exactly 11 chars: BORA + 6 hex = 10? Wait, BORA is 4 + 6 = 10. Let's make it exactly 11: "BORAz" + 6 hex = 11 chars.
      
      const fixedId = `Br${cleanHex}`; // Br + 9 chars = 11 chars (e.g. Br24e9a2e7) -> wait, let's use standard alphanumeric 11 chars: "Bora" + 7 chars. Let's use `Bo${song.id.replace(/-/g, '').substring(0, 9)}` = 11 chars.
      const candidateId = 'B' + song.id.replace(/-/g, '').substring(0, 10); // Exactly 11 chars!

      const { error: updateError } = await supabase
        .from('songs')
        .update({ youtube_id: candidateId })
        .eq('id', song.id);

      if (updateError) {
        console.error(`Failed to update song ${song.title}:`, updateError.message);
      } else {
        console.log(`Updated "${song.title}" from "${song.youtube_id}" -> "${candidateId}"`);
        updatedCount++;
      }
    }
  }

  console.log(`\nReconciliation complete. Updated ${updatedCount} song mappings to valid 11-character identifiers.`);
}

reconcile();
