import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL / anon key eksik. .env.example dosyasini .env olarak kopyalayip kendi degerlerinle doldur.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
