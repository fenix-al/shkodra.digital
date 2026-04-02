'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireRole, ROLES } from '@/lib/auth/roles'
import { revalidatePath } from 'next/cache'

/**
 * Updates the logged-in admin's own full_name.
 */
export async function updateProfile(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  const { user } = await requireRole(supabase, [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.POLICE])

  const full_name = formData.get('full_name')?.toString().trim()
  if (!full_name || full_name.length < 2) return { error: 'Emri duhet të ketë të paktën 2 karaktere.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name })
    .eq('id', user.id)

  if (error) return { error: 'Përditësimi dështoi. Provo përsëri.' }

  revalidatePath('/admin/cilesimet')
  return { success: 'Profili u përditësua.' }
}

/**
 * Changes the logged-in admin's own password.
 * Re-authenticates with the current password first to prevent session hijacking.
 */
export async function updateOwnPassword(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.POLICE])

  const currentPassword = formData.get('current_password')?.toString()
  const newPassword     = formData.get('new_password')?.toString().trim()
  const confirmPassword = formData.get('confirm_password')?.toString().trim()

  if (!currentPassword || !newPassword || !confirmPassword) return { error: 'Të gjitha fushat janë të detyrueshme.' }
  if (newPassword.length < 8) return { error: 'Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere.' }
  if (newPassword !== confirmPassword) return { error: 'Fjalëkalimet nuk përputhen.' }

  // Re-authenticate with current password to verify ownership
  const { data: { user } } = await supabase.auth.getUser()
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (authError) return { error: 'Fjalëkalimi aktual është i gabuar.' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: 'Ndryshimi dështoi. Provo përsëri.' }

  return { success: 'Fjalëkalimi u ndryshua me sukses.' }
}

/**
 * Updates zone name and capacity. Super Admin only.
 */
export async function updateZoneConfig(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.SUPER_ADMIN])

  const zone_name = formData.get('zone_name')?.toString().trim()
  const capacity  = parseInt(formData.get('capacity')?.toString() ?? '0', 10)

  if (!zone_name || zone_name.length < 2) return { error: 'Emri i zonës është i detyrueshëm.' }
  if (!capacity || capacity < 1 || capacity > 10000) return { error: 'Kapaciteti duhet të jetë mes 1 dhe 10 000.' }

  // zone_config has a single row — update it; if missing, upsert
  const service = createServiceSupabaseClient()
  const { data: existing } = await service.from('zone_config').select('id').limit(1).single()

  if (existing) {
    const { error } = await service.from('zone_config').update({ zone_name, capacity }).eq('id', existing.id)
    if (error) return { error: 'Ruajtja dështoi. Provo përsëri.' }
  } else {
    const { error } = await service.from('zone_config').insert({ zone_name, capacity })
    if (error) return { error: 'Ruajtja dështoi. Provo përsëri.' }
  }

  revalidatePath('/admin/cilesimet')
  revalidatePath('/admin/dashboard')
  return { success: 'Konfigurimi i zonës u ruajt.' }
}

export async function updateNotificationPreferences(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.POLICE, ROLES.CITIZEN])

  const emailEnabled = formData.get('email_enabled') === 'on'
  const pushEnabled = formData.get('push_enabled') === 'on'
  const digestFrequency = formData.get('digest_frequency')?.toString() ?? 'instant'

  if (!['instant', 'daily', 'weekly'].includes(digestFrequency)) {
    return { error: 'Frekuenca e njoftimeve nuk është e vlefshme.' }
  }

  const { error } = await supabase
    .from('app_notification_preferences')
    .upsert({
      profile_id: profile.id,
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
      digest_frequency: digestFrequency,
    })

  if (error) return { error: 'Ruajtja e preferencave dështoi. Provo përsëri.' }

  if (profile.role === ROLES.CITIZEN) {
    revalidatePath('/citizen/dashboard')
  } else {
    revalidatePath('/admin/cilesimet')
    revalidatePath('/admin/dashboard')
  }

  return { success: 'Preferencat e njoftimeve u ruajtën.' }
}

export async function updateDeliverySettings(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.SUPER_ADMIN])

  const emailNotificationsEnabled = formData.get('email_notifications_enabled') === 'on'
  const pushNotificationsEnabled = formData.get('push_notifications_enabled') === 'on'
  const senderName = formData.get('sender_name')?.toString().trim() || null
  const senderEmail = formData.get('sender_email')?.toString().trim() || null
  const replyToEmail = formData.get('reply_to_email')?.toString().trim() || null
  const footerSignature = formData.get('footer_signature')?.toString().trim() || null

  if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    return { error: 'Email-i i dërguesit nuk është i vlefshëm.' }
  }

  if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
    return { error: 'Reply-to email nuk është i vlefshëm.' }
  }

  const service = createServiceSupabaseClient()
  const { data: existing } = await service.from('app_delivery_settings').select('id').limit(1).maybeSingle()

  const payload = {
    email_notifications_enabled: emailNotificationsEnabled,
    push_notifications_enabled: pushNotificationsEnabled,
    sender_name: senderName,
    sender_email: senderEmail,
    reply_to_email: replyToEmail,
    footer_signature: footerSignature,
  }

  const { error } = existing?.id
    ? await service.from('app_delivery_settings').update(payload).eq('id', existing.id)
    : await service.from('app_delivery_settings').insert(payload)

  if (error) return { error: 'Ruajtja e konfigurimit të email-it dështoi. Provo përsëri.' }

  revalidatePath('/admin/cilesimet')
  revalidatePath('/admin/dashboard')
  revalidatePath('/citizen/dashboard')
  return { success: 'Konfigurimi i email-it u ruajt.' }
}
