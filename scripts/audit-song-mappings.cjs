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
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function auditMappings() {
  console.log('=== Starting Song YouTube ID Mapping Audit ===\n');

  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, artist, youtube_id');

  if (error) {
    console.error('Failed to fetch songs for audit:', error.message);
    process.exit(1);
  }

  console.log(`Total songs found: ${songs.length}`);
  let missingCount = 0;
  let malformedCount = 0;

  for (const song of songs) {
    const hasId = Boolean(song.youtube_id && song.youtube_id.trim().length > 0);
    const isMalformed = hasId && !/^[\w-]{11}$/.test(song.youtube_id);

    if (!hasId) {
      missingCount++;
      console.log(`[MISSING MAPPING] Song ID: ${song.id} | "${song.title}" by ${song.artist}`);
    } else if (isMalformed) {
      malformedCount++;
      console.log(`[MALFORMED MAPPING] Song ID: ${song.id} | "${song.title}" | youtube_id: "${song.youtube_id}"`);
    }
  }

  console.log(`\nAudit Summary:`);
  console.log(`- Total Checked: ${songs.length}`);
  console.log(`- Missing Mappings: ${missingCount}`);
  console.log(`- Malformed Mappings: ${malformedCount}`);
  console.log(`- Fully Valid: ${songs.length - missingCount - malformedCount}`);
  console.log('=== Audit Complete ===');
}

auditMappings();
