// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Your unique project address and security key
const supabaseUrl = "https://ktngrhqhxiklfewmwmwv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0bmdyaHFoeGlrbGZld213bWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTc4NzUsImV4cCI6MjA5Mjc5Mzg3NX0.DeAe2vJrWIvLxpWpYJh9aEXJHhAg--6TIyPq_ySVDWc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);