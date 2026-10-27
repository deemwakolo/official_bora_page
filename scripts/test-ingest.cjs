const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runAlignedIngestionTest() {
  const songId = '2a850219-819b-4ec6-b07f-eefe6c50acc0';
  const hourIndex = Math.floor(Date.now() / 3600000);
  const uniqueObsId = `test-obs-${Date.now()}-1`;

  console.log(`\n=== Running Aligned BORA Engine Ingestion & Delta Test ===`);
  console.log(`Song ID: ${songId}`);
  console.log(`Hour Index: ${hourIndex}`);

  // 1. Insert Platform Observation with source_observation_id included
  console.log(`\n1. Upserting platform observation with live-compliant enums...`);
  const { error: obsErr } = await supabase
    .from('bora_engine_platform_observations')
    .upsert({
      song_id: songId,
      platform: 'youtube',
      hour_index: hourIndex,
      metric_type: 'views',
      observation_value: 1000500,
      value: 1000500,
      lifecycle: 'ACTIVE',
      source: 'EXTERNAL',
      source_system: 'youtube-data-api-v3',
      version: 1,
      source_observation_id: uniqueObsId,
      observed_at: new Date().toISOString()
    }, { onConflict: 'song_id,platform,hour_index,metric_type' });

  if (obsErr) {
    console.error('Platform observation upsert failed:', obsErr.message);
  } else {
    console.log('Platform observation upsert succeeded!');
  }

  // 2. Insert Hourly Input Coverage adhering to live status constraints
  console.log(`\n2. Upserting hourly input coverage ledger...`);
  const { error: covErr } = await supabase
    .from('bora_engine_hourly_input_coverage')
    .upsert({
      song_id: songId,
      hour_index: hourIndex,
      source_system: 'youtube-data-api-v3',
      source: 'youtube-data-api-v3',
      status: 'COMPLETE',
      input_type: 'api_poll',
      raw_value: 1000500,
      derived_delta: 500,
      currentness: 'fresh',
      source_identity: 'kJQP7kiw5Fk',
      updated_at: new Date().toISOString()
    }, { onConflict: 'song_id,hour_index,source_system' });

  if (covErr) {
    console.error('Hourly input coverage upsert failed:', covErr.message);
  } else {
    console.log('Hourly input coverage upsert succeeded!');
  }

  // 3. Fetch and display stored records
  const { data: storedObs, error: queryErr } = await supabase
    .from('bora_engine_platform_observations')
    .select('*')
    .eq('song_id', songId)
    .order('hour_index', { ascending: false })
    .limit(5);

  if (queryErr) {
    console.error('Query error:', queryErr.message);
  } else {
    console.log('\n--- Successfully Stored Observations Ledger ---');
    console.table(storedObs);
  }
}

runAlignedIngestionTest();
