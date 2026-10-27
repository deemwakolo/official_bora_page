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
      const key = parts[0].trim().replace(/^\uFEFF/, '');
      const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const migrationFiles = [
  '0019_bora_engine_full_window_readiness.sql',
  '0020_bora_engine_bootstrap_full_window.sql',
  '0021_bora_engine_publish_eligibility.sql',
  '0022_add_song_youtube_id_mapping.sql',
  '0023_reconcile_engine_rpcs.sql',
  '0024_update_test_song_youtube_id.sql',
  '0025_reconcile_missing_engine_columns.sql'
];

async function runMigrations() {
  console.log('=== Starting Remote Supabase Migration & RPC Reconciliation ===\n');

  for (const file of migrationFiles) {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] Migration file not found: ${file}`);
      continue;
    }

    console.log(`Applying ${file}...`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    // Execute via RPC or direct query if available, or use pg/rpc wrapper
    // Since supabase-js doesn't have a direct raw query method unless an RPC exists, 
    // let's check if we can execute via a custom rpc or if we need a direct postgres client.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent }).catch(async (err) => {
      // Fallback: If exec_sql RPC doesn't exist, let's test a direct query or report instruction
      return { error: { message: 'exec_sql RPC not found. Direct SQL execution requires pg client or Supabase SQL editor.' } };
    });

    if (error) {
      console.error(`  -> Failed via RPC for ${file}: ${error.message}`);
      console.log(`  -> Note: Complex DDL migrations (like CREATE FUNCTION / ALTER TABLE) are best executed directly via Supabase SQL Editor or a direct Postgres connection.`);
    } else {
      console.log(`  -> Successfully applied ${file}!`);
    }
  }

  console.log('\n=== Migration pass completed ===');
}

runMigrations();
