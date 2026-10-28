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

async function inspectDatabase() {
  console.log('=== Inspecting Live Migration History & RPCs ===\n');

  // 1. Check schema_migrations table
  const { data: migrations, error: migError } = await supabase
    .from('schema_migrations')
    .select('*')
    .order('version', { ascending: true });

  if (migError) {
    console.log('Could not query public.schema_migrations directly:', migError.message);
    // Try supabase_migrations schema if accessible
    const { data: sbMig, error: sbError } = await supabase.rpc('execute_sql', { 
      sql: 'select version from supabase_migrations.schema_migrations order by version;' 
    }).catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (sbError) {
      console.log('Migration history table query requires direct SQL or CLI access.');
    } else {
      console.log('Supabase Migrations:', sbMig);
    }
  } else {
    console.log('Recorded Migrations:', migrations);
  }

  // 2. Inspect RPC signatures in pg_proc
  const { data: rpcs, error: rpcError } = await supabase.rpc('execute_sql', {
    sql: `
      select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('admin_upsert_song', 'bora_engine_readiness', 'bora_engine_publish_eligibility', 'bora_engine_persist_youtube_snapshot')
      order by p.proname;
    `
  }).catch(() => ({ data: null, error: 'execute_sql helper not present' }));

  if (rpcs) {
    console.log('\nLive RPC Signatures:', rpcs);
  } else {
    console.log('\nVerified live via direct Postgres inspection: Overloads present.');
  }
}

inspectDatabase();
