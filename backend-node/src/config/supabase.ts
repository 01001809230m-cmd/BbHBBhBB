import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// تحذير: هذا المفتاح يستخدم في الباك إند فقط ولا يتم إرساله للفرونت أبداً
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);
