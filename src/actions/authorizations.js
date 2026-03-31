'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { generateRandomPassword } from '@/lib/utils/password'
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
 * Admin/Manager directly adds a plate as approved.
 * @param {Object} _prevState
 * @param {FormData} formData
 */
export async function addPlate(_prevState, formData) {
  // Verify role with session client first
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  const plate_number = formData.get('plate_number')?.toString().trim().toUpperCase()
  const owner_name   = formData.get('owner_name')?.toString().trim()
  const vehicle_type = formData.get('vehicle_type')?.toString() || null
  const valid_from   = formData.get('valid_from')?.toString() || null
  const valid_until  = formData.get('valid_until')?.toString() || null
  const email        = formData.get('email')?.toString().trim() || null

  if (!plate_number || !owner_name) {
    return { error: 'Targa dhe emri janë të detyrueshme.' }
  }

  const service = createServiceSupabaseClient()
  let owner_id = null
  let tempPassword = null

  // Optionally create a citizen account
  if (email) {
    tempPassword = generateRandomPassword()
    const { data: { user: newUser }, error: createError } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: owner_name },
    })

    if (createError) {
      if (createError.message.includes('already')) return { error: 'Ky email është tashmë i regjistruar.' }
      return { error: `Krijimi i llogarisë dështoi: ${createError.message}` }
    }

    await service.from('profiles').update({
      full_name: owner_name,
      role: 'citizen',
      temp_password: tempPassword,
    }).eq('id', newUser.id)

    owner_id = newUser.id
  }

  // Insert the plate
  const { error } = await service.from('authorized_plates').insert({
    plate_number,
    owner_name,
    vehicle_type,
    valid_from,
    valid_until,
    status: 'approved',
    ...(owner_id ? { owner_id } : {}),
  })

  if (error?.code === '23505') return { error: 'Kjo targë është tashmë e regjistruar.' }
  if (error) return { error: 'Shtimi dështoi. Provo përsëri.' }

  revalidatePath('/admin/autorizimet')
  revalidatePath('/admin/perdoruesit')

  return {
    success: 'Targa u shtua me sukses.',
    ...(email && tempPassword ? { createdUser: { email, password: tempPassword, full_name: owner_name } } : {}),
  }
}

/**
 * Bulk-import plates from CSV (admin/manager only).
 * @param {{ plate_number: string, owner_name: string, vehicle_type?: string, valid_from?: string, valid_until?: string }[]} rows
 */
export async function importPlates(rows) {
  // Verify role with session client first
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'Nuk ka të dhëna për të importuar.' }
  }

  const records = rows.map((r) => ({
    plate_number: r.plate_number.trim().toUpperCase(),
    owner_name:   r.owner_name.trim(),
    vehicle_type: r.vehicle_type || null,
    valid_from:   r.valid_from   || null,
    valid_until:  r.valid_until  || null,
    status:       'approved',
  }))

  // Use service client to bypass RLS for admin-inserted plates
  const service = createServiceSupabaseClient()
  const { error } = await service.from('authorized_plates').insert(records)

  if (error) return { error: `Importimi dështoi: ${error.message}` }

  revalidatePath('/admin/autorizimet')
  return { success: `${records.length} targa u importuan me sukses.` }
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
