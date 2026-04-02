'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireRole, ROLES } from '@/lib/auth/roles'
import { createNotification, REPORT_CATEGORY_LABELS } from '@/lib/notifications'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

const ALLOWED_CATEGORIES = new Set([
  'ndricim',
  'kanalizim',
  'rruge',
  'mbeturina',
  'akses',
  'tjeter',
])

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024

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
  const latitudeRaw = formData.get('latitude')
  const longitudeRaw = formData.get('longitude')
  const photo = formData.get('photo')

  const latitude = latitudeRaw ? parseFloat(latitudeRaw.toString()) : null
  const longitude = longitudeRaw ? parseFloat(longitudeRaw.toString()) : null

  if (!category || !description) {
    return { error: 'Kategoria dhe përshkrimi janë të detyrueshme.' }
  }

  if (!ALLOWED_CATEGORIES.has(category)) {
    return { error: 'Kategoria e raportit nuk është e vlefshme.' }
  }

  if (description.length < 10) {
    return { error: 'Përshkrimi duhet të ketë të paktën 10 shkronja.' }
  }

  if (description.length > 500) {
    return { error: 'Përshkrimi nuk mund të kalojë 500 shkronja.' }
  }

  if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return { error: 'Latitude nuk është e vlefshme.' }
  }

  if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return { error: 'Longitude nuk është e vlefshme.' }
  }

  let photo_url = null
  let uploadedPath = null

  if (photo instanceof File && photo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(photo.type)) {
      return { error: 'Lejohen vetëm foto JPG, PNG, WEBP ose HEIC.' }
    }

    if (photo.size > MAX_PHOTO_SIZE_BYTES) {
      return { error: 'Fotoja është shumë e madhe. Maksimumi është 8MB.' }
    }

    const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const fileName = `${profile.id}/${randomUUID()}.${ext || 'jpg'}`

    const arrayBuffer = await photo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(fileName, buffer, { contentType: photo.type || 'image/jpeg' })

    if (uploadError) {
      return { error: `Ngarkimi i fotos dështoi: ${uploadError.message}` }
    }

    uploadedPath = uploadData.path

    const { data: { publicUrl } } = supabase.storage
      .from('report-photos')
      .getPublicUrl(uploadData.path)

    photo_url = publicUrl
  } else if (photo && photo !== 'undefined') {
    return { error: 'Skedari i fotos nuk u lexua siç duhet.' }
  }

  const { data: insertedReport, error } = await supabase
    .from('citizen_reports')
    .insert({
      reporter_id: profile.id,
      category,
      description,
      latitude,
      longitude,
      photo_url,
      status: 'hapur',
    })
    .select('id, category')
    .single()

  if (error) {
    if (uploadedPath) {
      const serviceSupabase = createServiceSupabaseClient()
      await serviceSupabase.storage.from('report-photos').remove([uploadedPath])
    }

    return { error: 'Raporti dështoi të dërgohet. Provo përsëri.' }
  }

  const categoryLabel = REPORT_CATEGORY_LABELS[category] ?? category

  await Promise.all([
    createNotification({
      recipientId: profile.id,
      actorId: profile.id,
      title: 'Konfirmim i marrjes së raportit',
      body: `Kërkesa juaj për ${categoryLabel.toLowerCase()} u regjistrua me sukses dhe është në pritje të verifikimit nga Bashkia Shkodër.`,
      href: '/citizen/dashboard',
      tone: 'blue',
      icon: photo_url ? 'camera' : 'report',
      kind: 'report_submitted',
      metadata: { reportId: insertedReport?.id ?? null, category, photoUrl: photo_url },
    }),
    createNotification({
      recipientRole: 'admin',
      actorId: profile.id,
      title: 'Raport i ri qytetar',
      body: `${categoryLabel} i ri${photo_url ? ' me foto' : ''} pret verifikim ne panelin e raporteve.`,
      href: `/admin/raportet?reportId=${insertedReport?.id ?? ''}`,
      tone: photo_url ? 'amber' : 'blue',
      icon: photo_url ? 'camera' : 'report',
      kind: 'admin_report_submitted',
      metadata: { reportId: insertedReport?.id ?? null, category, photoUrl: photo_url },
    }),
  ])

  revalidatePath('/citizen/dashboard')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/raportet')

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

  const { data: existingReport, error: existingReportError } = await supabase
    .from('citizen_reports')
    .select('id, reporter_id, category, photo_url')
    .eq('id', reportId)
    .single()

  if (existingReportError || !existingReport) throw new Error('Raporti nuk u gjet.')

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

  const categoryLabel = REPORT_CATEGORY_LABELS[existingReport.category] ?? existingReport.category
  const statusMessages = {
    në_shqyrtim: {
      body: `Raporti per ${categoryLabel.toLowerCase()} po trajtohet nga drejtoria perkatese.`,
      icon: 'clock',
      title: 'Raporti po trajtohet',
      tone: 'amber',
    },
    zgjidhur: {
      body: `Raporti per ${categoryLabel.toLowerCase()} u zgjidh dhe u mbyll nga bashkia.`,
      icon: 'check',
      title: 'Raporti u zgjidh',
      tone: 'emerald',
    },
    refuzuar: {
      body: `Raporti per ${categoryLabel.toLowerCase()} u mbyll me status refuzuar. Mund te raportoni perseri nese duhet sqarim shtese.`,
      icon: 'x',
      title: 'Raporti u mbyll',
      tone: 'rose',
    },
  }

  await createNotification({
    recipientId: existingReport.reporter_id,
    actorId: profile.id,
    title: statusMessages[status].title,
    body: statusMessages[status].body,
    href: '/citizen/dashboard',
    tone: statusMessages[status].tone,
    icon: statusMessages[status].icon,
    kind: 'report_status_changed',
    metadata: { reportId, category: existingReport.category, status, photoUrl: existingReport.photo_url ?? null },
  })

  revalidatePath('/admin/raportet')
  revalidatePath('/admin/dashboard')
  revalidatePath('/citizen/dashboard')
}
