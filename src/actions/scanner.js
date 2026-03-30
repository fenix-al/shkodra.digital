'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { validateQRToken } from '@/lib/qr/token'
import { revalidatePath } from 'next/cache'

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
  const action = formData.get('action')?.toString() // 'ENTRY' | 'EXIT'

  if (!token) return { error: 'Kodi QR mungon.' }
  if (!['ENTRY', 'EXIT'].includes(action)) return { error: 'Veprimi është i pavlefshëm.' }

  let payload
  try {
    payload = validateQRToken(token)
  } catch (err) {
    return { error: err.message }
  }

  // Verify plate is still authorized in DB
  const { data: plate, error: plateError } = await supabase
    .from('authorized_plates')
    .select('id, plate_number, status, owner_name')
    .eq('id', payload.plate_id)
    .single()

  if (plateError || !plate) return { error: 'Targa nuk u gjet në sistem.' }
  if (plate.status !== 'approved') return { error: `Targa është me status: ${plate.status}.` }

  const { error: logError } = await supabase.from('scan_logs').insert({
    plate_id: plate.id,
    plate_number: plate.plate_number,
    officer_id: profile.id,
    action,
    scan_method: 'QR',
  })

  if (logError) return { error: 'Regjistrimi dështoi. Provo përsëri.' }

  revalidatePath('/police/skaner')
  revalidatePath('/admin/dashboard')

  return {
    success: true,
    action,
    plate_number: plate.plate_number,
    owner_name: plate.owner_name,
  }
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

  const { data: plate, error: plateError } = await supabase
    .from('authorized_plates')
    .select('id, plate_number, status, owner_name')
    .eq('plate_number', plate_number)
    .single()

  if (plateError || !plate) return { error: 'Targa nuk u gjet ose nuk është e autorizuar.' }
  if (plate.status !== 'approved') return { error: `Targa është me status: ${plate.status}.` }

  const { error: logError } = await supabase.from('scan_logs').insert({
    plate_id: plate.id,
    plate_number: plate.plate_number,
    officer_id: profile.id,
    action,
    scan_method: 'MANUAL',
  })

  if (logError) return { error: 'Regjistrimi dështoi. Provo përsëri.' }

  revalidatePath('/police/skaner')
  revalidatePath('/admin/dashboard')

  return {
    success: true,
    action,
    plate_number: plate.plate_number,
    owner_name: plate.owner_name,
  }
}
