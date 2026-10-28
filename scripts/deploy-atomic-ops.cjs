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

async function verifyMigrationFile() {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0014_bora_engine_hourly_atomic_operations.sql');
  if (fs.existsSync(migrationPath)) {
    const stats = fs.statSync(migrationPath);
    console.log(`Migration 0014 found locally. Size: ${stats.size} bytes.`);
    console.log('To apply this migration, please execute its SQL content in your Supabase SQL Editor dashboard.');
  } else {
    console.log('Migration 0014 file not found.');
  }
}

verifyMigrationFile();
