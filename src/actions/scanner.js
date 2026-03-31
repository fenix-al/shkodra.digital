'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { validateQRToken } from '@/lib/qr/token'
import { revalidatePath } from 'next/cache'

/** @returns {string} today as YYYY-MM-DD */
function today() {
  return new Date().toISOString().split('T')[0]
}

/**
 * @param {{ status: string, valid_from: string|null, valid_until: string|null }} plate
 * @returns {string|null} Albanian error message, or null if OK
 */
function checkPlateEligibility(plate) {
  if (plate.status !== 'approved') return 'Targa nuk është e autorizuar.'
  const t = today()
  if (plate.valid_from && t < plate.valid_from) return 'Autorizimi nuk ka filluar ende.'
  if (plate.valid_until && t > plate.valid_until) return 'Autorizimi ka skaduar.'
  return null
}

/**
 * Processes a QR scan from the police scanner.
 * Validates the token, checks plate authorization, and logs the action.
 *
 * @param {Object} _prevState
 * @param {FormData} formData
 */
export async function processQRScan(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.POLICE, ROLES.SUPER_ADMIN])

  const token = formData.get('token')?.toString()
  const action = formData.get('action')?.toString()

  if (!token) return { error: 'Kodi QR mungon.' }
  if (!['ENTRY', 'EXIT'].includes(action)) return { error: 'Veprimi është i pavlefshëm.' }

  // 1. Decrypt + validate expiry
  let payload
  try {
    payload = validateQRToken(token)
  } catch (err) {
    return { error: err.message }
  }

  // 2. Look up plate (service client bypasses RLS)
  const service = createServiceSupabaseClient()
  const { data: plate, error: plateError } = await service
    .from('authorized_plates')
    .select('id, plate_number, owner_name, status, valid_from, valid_until')
    .eq('id', payload.plate_id)
    .single()

  if (plateError || !plate) return { error: 'Targa nuk u gjet në sistem.' }

  const eligibilityError = checkPlateEligibility(plate)
  if (eligibilityError) return { error: eligibilityError }

  // 3. Log scan (immutable — no UPDATE/DELETE ever)
  const { error: logError } = await service.from('scan_logs').insert({
    plate_id: plate.id,
    officer_id: profile.id,
    action,
    scan_method: 'QR',
  })

  if (logError) return { error: 'Regjistrimi dështoi. Provo përsëri.' }

  revalidatePath('/police/skaner')
  revalidatePath('/admin/dashboard')

  return { success: true, action, plate_number: plate.plate_number, owner_name: plate.owner_name }
}

/**
 * Processes a manual plate lookup + entry/exit by police.
 *
 * @param {Object} _prevState
 * @param {FormData} formData
 */
export async function processManualScan(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.POLICE, ROLES.SUPER_ADMIN])

  const plate_number = formData.get('plate_number')?.toString().trim().toUpperCase()
  const action = formData.get('action')?.toString()

  if (!plate_number) return { error: 'Numri i targës mungon.' }
  if (!['ENTRY', 'EXIT'].includes(action)) return { error: 'Veprimi është i pavlefshëm.' }

  const service = createServiceSupabaseClient()
  const { data: plate, error: plateError } = await service
    .from('authorized_plates')
    .select('id, plate_number, owner_name, status, valid_from, valid_until')
    .eq('plate_number', plate_number)
    .single()

  if (plateError || !plate) return { error: 'Targa nuk u gjet ose nuk është e regjistruar.' }

  const eligibilityError = checkPlateEligibility(plate)
  if (eligibilityError) return { error: eligibilityError }

  const { error: logError } = await service.from('scan_logs').insert({
    plate_id: plate.id,
    officer_id: profile.id,
    action,
    scan_method: 'MANUAL',
  })

  if (logError) return { error: 'Regjistrimi dështoi. Provo përsëri.' }

  revalidatePath('/police/skaner')
  revalidatePath('/admin/dashboard')

  return { success: true, action, plate_number: plate.plate_number, owner_name: plate.owner_name }
}
