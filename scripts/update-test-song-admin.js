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

async function updateTestSong() {
  const targetSongId = '2a850219-819b-4ec6-b07f-eefe6c50acc0'; // Joy - Diamond Platnumz
  const validYtId = 'kJQP7kiw5Fk';

  console.log(`Updating test song ${targetSongId} with service role privileges...`);

  const { error } = await supabase
    .from('songs')
    .update({ youtube_id: validYtId })
    .eq('id', targetSongId);

  if (error) {
    console.error('Failed to update test song:', error.message);
    process.exit(1);
  }

  console.log('Successfully updated test song with verified YouTube ID!');

  const { data, error: fetchErr } = await supabase
    .from('songs')
    .select('id, title, artist, youtube_id')
    .eq('id', targetSongId)
    .single();

  if (fetchErr) {
    console.error('Error fetching updated record:', fetchErr.message);
  } else {
    console.log('Verified Database Record:', data);
  }
}

updateTestSong();
