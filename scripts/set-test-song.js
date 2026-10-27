import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestSong() {
  // Target song: Joy - Diamond Platnumz (ID: 2a850219-819b-4ec6-b07f-eefe6c50acc0)
  // Let's update its youtube_id to a valid 11-char test video ID (e.g., 'dQw4w9WgXcQ' or a real sample ID)
  const targetSongId = '2a850219-819b-4ec6-b07f-eefe6c50acc0';
  const validYtId = 'kJQP7kiw5Fk'; // Despacito or similar stable test video ID (11 chars)

  console.log(`Updating song ${targetSongId} with verified YouTube ID: ${validYtId}...`);

  const { error } = await supabase
    .from('songs')
    .update({ youtube_id: validYtId })
    .eq('id', targetSongId);

  if (error) {
    console.error('Failed to update test song youtube_id:', error.message);
    process.exit(1);
  }

  console.log('Successfully updated test song with valid YouTube ID!');

  // Verify song data
  const { data: updatedSong, error: fetchError } = await supabase
    .from('songs')
    .select('id, title, artist, youtube_id')
    .eq('id', targetSongId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated song:', fetchError.message);
  } else {
    console.log('Verified Song Record:', updatedSong);
  }
}

setupTestSong();
