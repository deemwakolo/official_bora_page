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

async function run() {
  console.log('=== Verifying Database Connection & RPC status ===');
  
  // Test if bora_engine_readiness exists
  const { data, error } = await supabase.rpc('bora_engine_readiness', { p_closed_hour: null });
  if (error) {
    console.log('Readiness RPC status check error:', error.message);
  } else {
    console.log('Readiness RPC is ACTIVE.');
  }

  // Test bora_engine_publish_eligibility
  const { data: eligData, error: eligError } = await supabase.rpc('bora_engine_publish_eligibility', { p_closed_hour: 498090 });
  if (eligError) {
    console.log('Publish Eligibility RPC status check error:', eligError.message);
  } else {
    console.log('Publish Eligibility RPC is ACTIVE:', eligData);
  }
}

run();
