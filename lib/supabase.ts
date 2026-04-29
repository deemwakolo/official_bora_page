// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Matitu Nation / Bora Project Credentials - STRICT UPDATE
const supabaseUrl = "https://ktngrhqhxiklfewmwmev.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0bmdyaHFoeGlrbGZld213bWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTc4NzUsImV4cCI6MjA5Mjc5Mzg3NX0.DeAe2vJrWIvLxpWpYJh9aEXJHhAg--6TIyPq_ySVDWc";

/**
 * ⚡ BORA ENGINE CLIENT
 * Explicit global fetch bypasses StackBlitz environment hanging issues.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    // Forces the native browser/node fetch for maximum compatibility
    fetch: (...args) => fetch(...args),
  },
});

// 🔍 BORA DIAGNOSTIC
console.log("BORA ENGINE: Supabase Client Initialized.");