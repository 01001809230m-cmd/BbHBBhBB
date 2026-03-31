import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Supabase Client Creation Failed: Missing environment variables.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Preserve the old Admin setup variables directly from the migration
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '01148766696m@gmail.com'
export const TEACHER_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '201000623768'
export const DEV_PHONE = '201001809230'

// Paymob keys moved securely to the Node.js Backend
