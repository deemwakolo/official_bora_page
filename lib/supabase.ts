// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Hardwired keys (Replace the text in quotes with your actual Supabase keys)
const supabaseUrl = "https://your-actual-project-url.supabase.co";
const supabaseAnonKey = "your-actual-anon-key-string";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);