import { createClient } from '@supabase/supabase-js'
import env from '../env'

const supabaseUrl = env.supabase.url
const supabaseAnonKey = env.supabase.anonKey

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
