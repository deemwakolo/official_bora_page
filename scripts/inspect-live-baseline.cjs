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

async function inspectBaseline() {
  console.log('=== Inspecting Live Database Baseline ===\n');

  // Query pg_proc for engine functions
  const { data: rpcs, error: rpcError } = await supabase.rpc('exec_sql', {
    sql_query: `
      select
        p.proname,
        pg_get_function_identity_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as result_type,
        p.prosecdef as security_definer
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'admin_upsert_song',
          'bora_engine_readiness',
          'bora_engine_check_hour',
          'bora_engine_publish_eligibility'
        )
      order by p.proname, arguments;
    `
  });

  if (rpcError) {
    console.log('RPC inspection via exec_sql not direct (rpc missing). Running direct queries if possible or reporting.');
    // Fallback: check via standard table / rpc calls
    const { data: readinessTest } = await supabase.rpc('bora_engine_readiness', { p_closed_hour: null });
    console.log('bora_engine_readiness check:', readinessTest ? 'EXISTS' : 'ERROR');
  } else {
    console.log('Live RPC Signatures:', JSON.stringify(rpcs, null, 2));
  }
}

inspectBaseline();
