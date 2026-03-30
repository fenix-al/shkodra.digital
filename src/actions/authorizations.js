'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { revalidatePath } from 'next/cache'

/**
 * Approves a plate authorization request.
 * @param {string} plateId
 */
export async function approvePlate(plateId) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  const { error } = await supabase
    .from('authorized_plates')
    .update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', plateId)

  if (error) throw new Error('Miratimi dështoi. Provo përsëri.')

  revalidatePath('/admin/autorizimet')
}

/**
 * Rejects a plate authorization request.
 * @param {string} plateId
 * @param {string} notes - reason for rejection
 */
export async function rejectPlate(plateId, notes) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  const { error } = await supabase
    .from('authorized_plates')
    .update({ status: 'rejected', notes })
    .eq('id', plateId)

  if (error) throw new Error('Refuzimi dështoi. Provo përsëri.')

  revalidatePath('/admin/autorizimet')
}

/**
 * Submits a new plate authorization request (by citizen).
 * @param {Object} _prevState
 * @param {FormData} formData
 */
export async function requestAuthorization(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN])

  const plate_number = formData.get('plate_number')?.toString().trim().toUpperCase()
  const owner_name = formData.get('owner_name')?.toString().trim()
  const vehicle_type = formData.get('vehicle_type')?.toString()

  if (!plate_number || !owner_name) {
    return { error: 'Targa dhe emri janë të detyrueshme.' }
  }

  const { error } = await supabase.from('authorized_plates').insert({
    owner_id: profile.id,
    plate_number,
    owner_name,
    vehicle_type,
    status: 'pending',
  })

  if (error?.code === '23505') {
    return { error: 'Kjo targë është tashmë e regjistruar.' }
  }
  if (error) {
    return { error: 'Kërkesa dështoi. Provo përsëri.' }
  }

  return { success: 'Kërkesa u dërgua. Do të njoftoheni pas shqyrtimit.' }
}
