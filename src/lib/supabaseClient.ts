import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL / anon key eksik. .env.example dosyasını .env olarak kopyalayıp kendi değerlerinle doldur.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
