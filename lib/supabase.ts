import { createClient } from '@supabase/supabase-js';

/**
 * ⚡ BORA ENGINE - SUPABASE CLIENT
 * Production-safe initialization layer
 */

// ALWAYS move these to .env.local in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

/**
 * 🔍 ENGINE INIT LOG
 */
console.log("BORA ENGINE: Supabase Client Initialized.");