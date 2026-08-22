import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function connectSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('⚠️  Supabase env vars missing — KV metadata will be skipped');
    return null;
  }
  supabase = createClient(url, key);
  console.log('✅ Supabase client initialized');
  return supabase;
}

export function getSupabase() {
  return supabase;
}
