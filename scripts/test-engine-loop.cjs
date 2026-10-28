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

async function testEngineLoop() {
  const testHour = Math.floor(Date.now() / (1000 * 60 * 60));
  console.log(`=== Testing Engine Execution Loop for Hour: ${testHour} ===\n`);

  // 1. Test claim hour RPC
  console.log('1. Calling bora_engine_claim_hour...');
  const { data: claimData, error: claimError } = await supabase.rpc('bora_engine_claim_hour', {
    p_closed_hour: testHour,
    p_worker_id: 'cli-stage04-operator'
  });

  if (claimError) {
    console.log('Claim Hour RPC Notice:', claimError.message);
  } else {
    console.log('Claim Result:', JSON.stringify(claimData, null, 2));
  }

  // 2. Test load hour RPC
  console.log('\n2. Calling bora_engine_load_hour...');
  const { data: loadData, error: loadError } = await supabase.rpc('bora_engine_load_hour', {
    p_closed_hour: testHour
  });

  if (loadError) {
    console.log('Load Hour RPC Error:', loadError.message);
  } else {
    console.log('Load Result Summary:', typeof loadData === 'object' ? JSON.stringify(loadData, null, 2).substring(0, 300) + '...' : loadData);
  }

  // 3. Test publish eligibility gate
  console.log('\n3. Calling bora_engine_publish_eligibility...');
  const { data: eligData, error: eligError } = await supabase.rpc('bora_engine_publish_eligibility', {
    p_closed_hour: testHour
  });

  if (eligError) {
    console.log('Publish Eligibility RPC Error:', eligError.message);
  } else {
    console.log('Publish Eligibility Result:', JSON.stringify(eligData, null, 2));
  }
}

testEngineLoop();
