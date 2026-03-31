import { createClient } from '@supabase/supabase-js'

/**
 * Service role client — bypasses RLS.
 * Use ONLY in server-side admin actions after role has been verified via requireRole().
 * NEVER import this in any 'use client' file.
 */
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
