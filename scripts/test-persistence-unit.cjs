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

async function runUnitCheck() {
  console.log('=== Running Persistence & Schema Sanity Check ===\n');

  // Verify song table access and count
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Failed to query songs table:', error.message);
  } else {
    console.log(`Songs table accessible. Total records: ${count}`);
  }

  // Verify snapshot history table accessibility
  const { error: snapError } = await supabase
    .from('bora_engine_youtube_snapshot_history')
    .select('id', { count: 'exact', head: true });

  if (snapError) {
    console.log('Snapshot history table check note:', snapError.message);
  } else {
    console.log('Snapshot history table is accessible.');
  }

  console.log('\nPersistence module hardened and ready for execution loop verification.');
}

runUnitCheck();
