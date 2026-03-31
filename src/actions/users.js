'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { generateRandomPassword } from '@/lib/utils/password'
import { revalidatePath } from 'next/cache'

/**
 * Lists all users (auth + profiles joined).
 * Returns array ready for the UsersTable component.
 * Called directly from server components — not a useActionState action.
 */
export async function listUsers() {
  const service = createServiceSupabaseClient()

  const [{ data: { users: authUsers } }, { data: profiles }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 500 }),
    service.from('profiles').select('id, full_name, role, temp_password'),
  ])

  return (authUsers ?? []).map((u) => {
    const profile = profiles?.find((p) => p.id === u.id)
    return {
      id:            u.id,
      email:         u.email ?? '',
      full_name:     profile?.full_name ?? null,
      role:          profile?.role ?? 'citizen',
      temp_password: profile?.temp_password ?? null,
      created_at:    u.created_at,
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/**
 * Creates a new user account (admin/manager only).
 * Stores the generated password in profiles.temp_password.
 */
export async function createUser(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  const email     = formData.get('email')?.toString().trim()
  const full_name = formData.get('full_name')?.toString().trim()
  const role      = formData.get('role')?.toString() ?? 'citizen'

  if (!email || !full_name) return { error: 'Emri dhe emaili janë të detyrueshme.' }
  if (!['citizen', 'police', 'manager'].includes(role)) return { error: 'Roli është i pavlefshëm.' }

  const password = generateRandomPassword()
  const service  = createServiceSupabaseClient()

  const { data: { user }, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError) {
    if (createError.message.includes('already')) return { error: 'Ky email është tashmë i regjistruar.' }
    return { error: `Krijimi dështoi: ${createError.message}` }
  }

  // Update profile created by the handle_new_user trigger.
  // Trigger always sets role='citizen' — we must override it here.
  const { error: profileError } = await service
    .from('profiles')
    .update({ full_name, role, temp_password: password })
    .eq('id', user.id)

  if (profileError) {
    // Auth user was created but profile update failed — delete the orphan
    await service.auth.admin.deleteUser(user.id)
    return { error: `Profili nuk u krijua: ${profileError.message}` }
  }

  revalidatePath('/admin/perdoruesit')
  return { success: true, email, full_name, password }
}

/**
 * Deletes a user completely (auth + profile cascade).
 */
export async function deleteUser(userId) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.SUPER_ADMIN])

  const service = createServiceSupabaseClient()
  const { error } = await service.auth.admin.deleteUser(userId)

  if (error) return { error: 'Fshirja dështoi. Provo përsëri.' }

  revalidatePath('/admin/perdoruesit')
  return { success: 'Përdoruesi u fshi.' }
}

/**
 * Changes a user's password and updates temp_password in profiles.
 */
export async function changePassword(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.SUPER_ADMIN, ROLES.MANAGER])

  const userId      = formData.get('userId')?.toString()
  const newPassword = formData.get('password')?.toString().trim()

  if (!userId || !newPassword || newPassword.length < 6) {
    return { error: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }
  }

  const service = createServiceSupabaseClient()

  const { error } = await service.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { error: 'Ndryshimi dështoi. Provo përsëri.' }

  await service.from('profiles').update({ temp_password: newPassword }).eq('id', userId)

  revalidatePath('/admin/perdoruesit')
  return { success: 'Fjalëkalimi u ndryshua.' }
}

/**
 * Generates a password reset link for the given email.
 * Returns the link so admin can copy/send it.
 */
export async function generateResetLink(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.SUPER_ADMIN, ROLES.MANAGER])

  const email = formData.get('email')?.toString().trim()
  if (!email) return { error: 'Email mungon.' }

  const service = createServiceSupabaseClient()
  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) return { error: `Gjenerimi dështoi: ${error.message}` }

  return { success: true, link: data?.properties?.action_link ?? null }
}
