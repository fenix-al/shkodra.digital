'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { generateQRToken } from '@/lib/qr/token'

/**
 * Generates an HMAC QR token for a plate.
 * Works for citizens (own plates only) and managers/admins (any plate).
 *
 * @param {string} plateId
 * @returns {{ token: string } | { error: string }}
 */
export async function getQRToken(plateId) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN, ROLES.MANAGER, ROLES.SUPER_ADMIN])

  let query = supabase
    .from('authorized_plates')
    .select('id')
    .eq('id', plateId)

  // Citizens can only get tokens for their own plates
  if (profile.role === ROLES.CITIZEN) {
    query = query.eq('owner_id', profile.id)
  }

  const { data: plate, error } = await query.single()

  if (error || !plate) return { error: 'Targa nuk u gjet.' }

  const token = generateQRToken({ plate_id: plate.id })
  return { token }
}
