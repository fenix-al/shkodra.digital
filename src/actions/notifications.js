'use server'

import { revalidatePath } from 'next/cache'
import { requireRole, ROLES } from '@/lib/auth/roles'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

function isMissingNotificationsTable(error) {
  if (!error) return false
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || error.message?.includes('app_notifications')
  )
}

export async function markNotificationRead(notificationId) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.POLICE])
  const service = createServiceSupabaseClient()
  const now = new Date().toISOString()

  const matchAdminScope = profile.role === ROLES.MANAGER || profile.role === ROLES.SUPER_ADMIN
    ? service.from('app_notifications').update({ read_at: now }).eq('id', notificationId).or(`recipient_id.eq.${profile.id},recipient_role.eq.admin`).is('read_at', null)
    : service.from('app_notifications').update({ read_at: now }).eq('id', notificationId).eq('recipient_id', profile.id).is('read_at', null)

  const { error } = await matchAdminScope

  if (error && !isMissingNotificationsTable(error)) {
    throw new Error('Shenjimi i njoftimit deshtoi.')
  }

  revalidatePath('/citizen/dashboard')
  revalidatePath('/citizen/njoftimet')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/njoftimet')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN, ROLES.MANAGER, ROLES.SUPER_ADMIN, ROLES.POLICE])
  const service = createServiceSupabaseClient()
  const now = new Date().toISOString()

  const updateQuery = profile.role === ROLES.MANAGER || profile.role === ROLES.SUPER_ADMIN
    ? service.from('app_notifications').update({ read_at: now }).or(`recipient_id.eq.${profile.id},recipient_role.eq.admin`).is('read_at', null)
    : service.from('app_notifications').update({ read_at: now }).eq('recipient_id', profile.id).is('read_at', null)

  const { error } = await updateQuery

  if (error && !isMissingNotificationsTable(error)) {
    throw new Error('Shenjimi i njoftimeve deshtoi.')
  }

  revalidatePath('/citizen/dashboard')
  revalidatePath('/citizen/njoftimet')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/njoftimet')
  return { success: true }
}
