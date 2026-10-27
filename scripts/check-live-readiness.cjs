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

async function checkReadiness() {
  console.log('=== Checking Live Engine Readiness & Publish Eligibility ===\n');

  // Test with null or recent hour index
  const testHour = Math.floor(Date.now() / (1000 * 60 * 60));
  
  console.log(`Calling bora_engine_readiness with hour: ${testHour}`);
  const { data: readinessData, error: readinessError } = await supabase.rpc('bora_engine_readiness', {
    p_closed_hour: testHour
  });

  if (readinessError) {
    console.log('Readiness RPC Error:', readinessError.message);
  } else {
    console.log('Readiness Result:', JSON.stringify(readinessData, null, 2));
  }

  console.log(`\nCalling bora_engine_publish_eligibility with hour: ${testHour}`);
  const { data: eligData, error: eligError } = await supabase.rpc('bora_engine_publish_eligibility', {
    closed_hour: testHour
  });

  if (eligError) {
    console.log('Publish Eligibility RPC Error:', eligError.message);
  } else {
    console.log('Publish Eligibility Result:', JSON.stringify(eligData, null, 2));
  }
}

checkReadiness();
