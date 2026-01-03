import { createClient } from '@supabase/supabase-js'
import env from '../env'

const supabaseUrl = env.supabase.url
const supabaseAnonKey = env.supabase.anonKey

// Check if Supabase is properly configured
if (!env.supabase.isConfigured) {
  console.warn('⚠️ Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
}

// Create client (will use placeholders if not configured, but operations will fail gracefully)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to check if Supabase is ready to use
export function isSupabaseConfigured(): boolean {
  return env.supabase.isConfigured
}

// Helper to get configuration error message
export function getSupabaseConfigError(): string | null {
  if (!env.supabase.isConfigured) {
    return 'Database connection is not configured. Please contact support or check your environment settings.';
  }
  return null;
}
