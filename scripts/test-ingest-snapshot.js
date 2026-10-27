import { SupabaseBoraEnginePersistence } from '../lib/bora-engine/persistence.ts';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const persistence = new SupabaseBoraEnginePersistence(supabase);

async function runIngestionTest() {
  const songId = '2a850219-819b-4ec6-b07f-eefe6c50acc0'; // Joy - Diamond Platnumz
  const videoId = 'kJQP7kiw5Fk';
  const now = new Date();
  
  const hourIndex = Math.floor(now.getTime() / 3600000);

  console.log(`\n--- Test 1: Ingesting Baseline Snapshot (1,000,000 views) ---`);
  const baselineTime = new Date(now.getTime() - 7200000).toISOString();
  const res1 = await persistence.persistYouTubeSnapshot({
    songId,
    videoId,
    value: '1000000',
    retrievedAt: baselineTime,
    hourIndex: hourIndex - 2,
    sourceSystem: 'youtube-data-api-v3',
    sourceObservationId: `obs-test-${Date.now()}-1`
  });
  console.log('Baseline Result:', res1);

  console.log(`\n--- Test 2: Ingesting Follow-up Snapshot with Growth (+500 views) ---`);
  const followupTime = new Date(now.getTime() - 3600000).toISOString();
  const res2 = await persistence.persistYouTubeSnapshot({
    songId,
    videoId,
    value: '1000500',
    retrievedAt: followupTime,
    hourIndex: hourIndex - 1,
    sourceSystem: 'youtube-data-api-v3',
    sourceObservationId: `obs-test-${Date.now()}-2`
  });
  console.log('Follow-up Result:', res2);

  const { data: obs, error: obsErr } = await supabase
    .from('bora_engine_platform_observations')
    .select('*')
    .eq('song_id', songId)
    .eq('platform', 'youtube')
    .eq('hour_index', hourIndex - 1)
    .single();

  if (obsErr) {
    console.error('Error querying platform observations projection:', obsErr.message);
  } else {
    console.log('\nVerified Platform Observation Projection:', obs);
  }
}

runIngestionTest();
