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

async function deploy() {
  console.log('=== Deploying Missing Migrations to Live Supabase ===\n');

  const migrationFiles = [
    '0019_bora_engine_database_readiness.sql',
    '0020_bora_engine_readiness_rpc.sql',
    '0021_bora_engine_publish_eligibility.sql',
    '0022_add_song_youtube_id_mapping.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', file);
    if (!fs.existsSync(filePath)) {
      console.log(`Migration file not found locally: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing migration: ${file}...`);
    
    // Supabase JS client doesn't have direct raw SQL execution unless via RPC or postgres extension.
    // If rpc(exec_sql) doesn't exist, we can check if we need to run it via REST or note it.
    // Let's test if an exec_sql rpc exists or if we can run statements.
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.log(`Note on ${file}: direct SQL execution via 'exec_sql' RPC not available (${error.message}).`);
      console.log(`Please apply ${file} via Supabase SQL Editor if needed.`);
    } else {
      console.log(`Successfully applied ${file}`);
    }
  }
}

deploy();
