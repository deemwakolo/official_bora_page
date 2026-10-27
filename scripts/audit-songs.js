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

async function auditSongs() {
  const { data: songs, error } = await supabase.from('songs').select('id, title, artist, youtube_id');
  if (error) {
    console.error('Error fetching songs:', error.message);
    process.exit(1);
  }

  console.log(`Total songs found: ${songs.length}\n`);
  let validCount = 0;
  let missingCount = 0;
  let malformedCount = 0;

  const ytRegex = /^[a-zA-Z0-9_-]{11}$/;

  songs.forEach((s, idx) => {
    const yid = s.youtube_id;
    let status = 'VALID';
    if (!yid) {
      status = 'MISSING';
      missingCount++;
    } else if (!ytRegex.test(yid)) {
      status = 'MALFORMED';
      malformedCount++;
    } else {
      validCount++;
    }
    console.log(`${idx + 1}. [${status}] ID: ${s.id} | Title: ${s.title} by ${s.artist} | YT ID: ${yid || 'NONE'}`);
  });

  console.log(`\nAudit Summary: Valid: ${validCount} | Missing: ${missingCount} | Malformed: ${malformedCount}`);
}

auditSongs();
