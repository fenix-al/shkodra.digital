'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { revalidatePath } from 'next/cache'

/**
 * Submits a new citizen issue report with photo and geolocation.
 *
 * @param {Object} _prevState
 * @param {FormData} formData
 */
export async function submitReport(_prevState, formData) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN])

  const category = formData.get('category')?.toString()
  const description = formData.get('description')?.toString().trim()
  const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude')) : null
  const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude')) : null
  const photo = formData.get('photo')

  if (!category || !description) {
    return { error: 'Kategoria dhe përshkrimi janë të detyrueshme.' }
  }

  let photo_url = null
  if (photo && photo.size > 0) {
    const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase()
    const fileName = `${profile.id}/${Date.now()}.${ext}`

    // Convert File → Buffer for reliable Node.js server-side upload
    const arrayBuffer = await photo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(fileName, buffer, { contentType: photo.type || 'image/jpeg' })

    if (uploadError) return { error: `Ngarkimi i fotos dështoi: ${uploadError.message}` }

    const { data: { publicUrl } } = supabase.storage
      .from('report-photos')
      .getPublicUrl(uploadData.path)

    photo_url = publicUrl
  }

  const { error } = await supabase.from('citizen_reports').insert({
    reporter_id: profile.id,
    category,
    description,
    latitude,
    longitude,
    photo_url,
    status: 'hapur',
  })

  if (error) return { error: 'Raporti dështoi të dërgohet. Provo përsëri.' }

  revalidatePath('/citizen/dashboard')

  return { success: 'Raporti u dërgua me sukses. Faleminderit!' }
}

/**
 * Updates the status of a citizen report (manager only).
 *
 * @param {string} reportId
 * @param {string} status - 'në_shqyrtim' | 'zgjidhur' | 'refuzuar'
 */
export async function updateReportStatus(reportId, status) {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])

  const validStatuses = ['në_shqyrtim', 'zgjidhur', 'refuzuar']
  if (!validStatuses.includes(status)) throw new Error('Status i pavlefshëm.')

  const update = {
    status,
    ...(status === 'zgjidhur' || status === 'refuzuar'
      ? { resolved_by: profile.id, resolved_at: new Date().toISOString() }
      : {}),
  }

  const { error } = await supabase
    .from('citizen_reports')
    .update(update)
    .eq('id', reportId)

  if (error) throw new Error('Ndryshimi i statusit dështoi.')

  revalidatePath('/admin/raportet')
}
