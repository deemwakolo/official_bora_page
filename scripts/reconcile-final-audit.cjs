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

async function runFinalReconciliation() {
  console.log('=== Starting Final Audit Reconciliation & Readiness Check ===\n');

  // 1. Check current song count & active state
  const { data: songs, error: songError } = await supabase
    .from('songs')
    .select('id, title, youtube_id');

  if (songError) {
    console.error('Error fetching songs:', songError.message);
    return;
  }

  console.log(`Verified Songs in Database: ${songs.length} records.`);

  // 2. Check engine readiness and publish eligibility for current hour
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  console.log(`\nTesting Engine Readiness for Hour ${currentHour}...`);

  const { data: readinessData, error: readError } = await supabase.rpc('bora_engine_readiness', {
    p_closed_hour: currentHour
  });

  if (readError) {
    console.log('Readiness RPC Notice:', readError.message);
  } else {
    console.log('Readiness Result:', JSON.stringify(readinessData, null, 2));
  }

  const { data: eligData, error: eligError } = await supabase.rpc('bora_engine_publish_eligibility', {
    p_closed_hour: currentHour
  });

  if (eligError) {
    console.log('Publish Eligibility RPC Notice:', eligError.message);
  } else {
    console.log('Publish Eligibility Result:', JSON.stringify(eligData, null, 2));
  }

  console.log('\nAudit reconciliation harness completed successfully.');
}

runFinalReconciliation();
