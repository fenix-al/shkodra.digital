'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultPathForRole } from '@/lib/auth/roles'

/**
 * Logs in a user with email and password.
 * Redirects to the role-appropriate dashboard on success.
 *
 * @param {Object} _prevState - unused (required by useActionState)
 * @param {FormData} formData
 */
export async function login(_prevState, formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ose fjalëkalimi është i gabuar.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(defaultPathForRole(profile?.role))
}

/**
 * Logs out the current user and redirects to login.
 */
export async function logout() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
