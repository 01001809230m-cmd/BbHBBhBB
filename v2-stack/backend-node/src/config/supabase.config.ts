import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isValidKey = (key: string) => 
  key && (key.startsWith('eyJ') || key.startsWith('sb_publishable_') || key.startsWith('sb_secret_'));

if (!supabaseUrl || !isValidKey(supabaseServiceKey)) {
  console.warn('⚠️ Invalid or Missing Supabase Service Role Key! Admin operations will fail.');
  console.info('👉 Please update SUPABASE_SERVICE_ROLE_KEY in .env to a valid JWT or "sb_secret_" key.');
}

export const supabase = (supabaseUrl && isValidKey(supabaseServiceKey)) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (null as any); 
