'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { generateQRToken } from '@/lib/qr/token'

/**
 * Generates a fresh AES-256-GCM QR token for one of the citizen's approved plates.
 * Called every 45s by the DynamicQR client component.
 *
 * @param {string} plateId
 * @returns {{ token: string } | { error: string }}
 */
export async function getQRToken(plateId) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN])

  // Verify the plate belongs to this citizen and is approved
  const { data: plate, error } = await supabase
    .from('authorized_plates')
    .select('id, plate_number, status, valid_until')
    .eq('id', plateId)
    .eq('owner_id', profile.id)
    .single()

  if (error || !plate) return { error: 'Targa nuk u gjet.' }
  if (plate.status !== 'approved') return { error: 'Targa nuk është e autorizuar.' }

  const today = new Date().toISOString().split('T')[0]
  if (plate.valid_until && today > plate.valid_until) return { error: 'Autorizimi ka skaduar.' }

  const token = generateQRToken({ plate_id: plate.id })
  return { token }
}

/**
 * Generates a QR token for admin/manager print modal.
 * Uses service client — no owner_id check needed.
 *
 * @param {string} plateId
 * @returns {{ token: string } | { error: string }}
 */
export async function getQRTokenAdmin(plateId) {
  const supabase = await createServerSupabaseClient()
  await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  const { createServiceSupabaseClient } = await import('@/lib/supabase/service')
  const service = createServiceSupabaseClient()

  const { data: plate, error } = await service
    .from('authorized_plates')
    .select('id, status, valid_until')
    .eq('id', plateId)
    .single()

  if (error || !plate) return { error: 'Targa nuk u gjet.' }

  const token = generateQRToken({ plate_id: plate.id })
  return { token }
}
