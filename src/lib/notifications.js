import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const REPORT_CATEGORY_LABELS = {
  ndricim: 'Ndricim',
  kanalizim: 'Kanalizim',
  rruge: 'Rruge',
  mbeturina: 'Mbeturina',
  akses: 'Akses',
  tjeter: 'Tjeter',
}

const REPORT_STATUS_LABELS = {
  hapur: 'i hapur',
  në_shqyrtim: 'ne shqyrtim',
  zgjidhur: 'i zgjidhur',
  refuzuar: 'i refuzuar',
}

const PLATE_STATUS_LABELS = {
  pending: 'ne pritje',
  approved: 'miratuar',
  rejected: 'refuzuar',
  suspended: 'pezulluar',
}

const DEFAULT_CHANNELS_REQUESTED = {
  in_app: true,
  email: false,
  push: false,
}

const DEFAULT_CHANNELS_STATUS = {
  in_app: 'ready',
  email: 'disabled',
  push: 'disabled',
}

function asNotification(item) {
  return {
    audience: item.audience,
    body: item.body,
    channelsRequested: item.channelsRequested ?? DEFAULT_CHANNELS_REQUESTED,
    channelsStatus: item.channelsStatus ?? DEFAULT_CHANNELS_STATUS,
    createdAt: item.createdAt,
    href: item.href ?? null,
    icon: item.icon,
    id: item.id,
    isUnread: item.isUnread ?? !item.readAt,
    kind: item.kind ?? 'generic',
    metadata: item.metadata ?? {},
    readAt: item.readAt ?? null,
    tone: item.tone,
    title: item.title,
  }
}

function resolveNotificationHref({ audience, href, metadata, kind }) {
  const reportId = metadata?.reportId
  const plateId = metadata?.plateId

  if (audience === 'admin' && reportId) {
    return `/admin/raportet?reportId=${reportId}`
  }

  if (audience === 'admin' && (kind?.includes('authorization') || plateId)) {
    return '/admin/autorizimet'
  }

  return href ?? null
}

function sortNotifications(items, limit) {
  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

function isMissingNotificationsTable(error) {
  if (!error) return false
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || error.message?.includes('app_notifications')
    || error.message?.includes('app_notification_preferences')
  )
}

function getReportPriority(report) {
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') {
    return 'closed'
  }

  const ageHours = Math.max(0, (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))
  let score = 1

  if (report.category === 'akses') score += 2
  if (report.category === 'ndricim') score += 1
  if (report.photo_url) score += 1
  if (report.latitude !== null && report.longitude !== null) score += 1
  if (ageHours >= 72) score += 2
  else if (ageHours >= 24) score += 1
  if (report.status === 'në_shqyrtim') score += 1

  if (score >= 5) return 'urgent'
  if (score >= 3) return 'medium'
  return 'normal'
}

async function getNotificationPreferences(profileId) {
  const service = createServiceSupabaseClient()
  const { data, error } = await service
    .from('app_notification_preferences')
    .select('email_enabled, push_enabled')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error && !isMissingNotificationsTable(error)) {
    throw error
  }

  return {
    emailEnabled: data?.email_enabled ?? false,
    pushEnabled: data?.push_enabled ?? false,
  }
}

function getDeliveryStatus(preferences) {
  const emailConfigured = Boolean(process.env.NOTIFICATIONS_EMAIL_FROM)
  const pushConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

  const channelsRequested = {
    in_app: true,
    email: preferences.emailEnabled,
    push: preferences.pushEnabled,
  }

  const channelsStatus = {
    in_app: 'ready',
    email: preferences.emailEnabled ? (emailConfigured ? 'pending_provider' : 'awaiting_configuration') : 'disabled',
    push: preferences.pushEnabled ? (pushConfigured ? 'pending_provider' : 'awaiting_configuration') : 'disabled',
  }

  return { channelsRequested, channelsStatus }
}

function normalizeDbNotification(row, audience) {
  return asNotification({
    audience,
    body: row.body,
    channelsRequested: row.channels_requested,
    channelsStatus: row.channels_status,
    createdAt: row.created_at,
    href: resolveNotificationHref({ audience, href: row.href, metadata: row.metadata, kind: row.kind }),
    icon: row.icon,
    id: row.id,
    isUnread: !row.read_at,
    kind: row.kind,
    metadata: row.metadata,
    readAt: row.read_at,
    tone: row.tone,
    title: row.title,
  })
}

async function getCitizenNotificationsFallback(supabase, userId, { limit = 8 } = {}) {
  const [{ data: reports }, { data: plates }] = await Promise.all([
    supabase
      .from('citizen_reports')
      .select('id, category, status, photo_url, created_at, resolved_at')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('authorized_plates')
      .select('id, plate_number, status, vehicle_type, created_at, approved_at, valid_until')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const items = []

  for (const report of reports ?? []) {
    const categoryLabel = REPORT_CATEGORY_LABELS[report.category] ?? report.category

    if (report.status === 'hapur') {
      items.push(asNotification({
        audience: 'citizen',
        body: `Raporti per ${categoryLabel.toLowerCase()} u regjistrua dhe pret verifikim nga bashkia.`,
        createdAt: report.created_at,
        icon: 'report',
        id: `citizen-report-${report.id}`,
        metadata: { reportId: report.id, photoUrl: report.photo_url ?? null },
        title: 'Raporti juaj u pranua',
        tone: 'blue',
      }))
      continue
    }

    if (report.status === 'në_shqyrtim') {
      items.push(asNotification({
        audience: 'citizen',
        body: `Raporti per ${categoryLabel.toLowerCase()} eshte marre ne shqyrtim nga drejtoria perkatese.`,
        createdAt: report.created_at,
        icon: 'clock',
        id: `citizen-report-review-${report.id}`,
        metadata: { reportId: report.id, photoUrl: report.photo_url ?? null },
        title: 'Raporti po trajtohet',
        tone: 'amber',
      }))
      continue
    }

    items.push(asNotification({
      audience: 'citizen',
      body: `Raporti per ${categoryLabel.toLowerCase()} u mbyll me status ${REPORT_STATUS_LABELS[report.status]}.`,
      createdAt: report.resolved_at ?? report.created_at,
      icon: report.status === 'zgjidhur' ? 'check' : 'x',
      id: `citizen-report-final-${report.id}`,
      metadata: { reportId: report.id, photoUrl: report.photo_url ?? null },
      title: report.status === 'zgjidhur' ? 'Raporti u zgjidh' : 'Raporti u mbyll',
      tone: report.status === 'zgjidhur' ? 'emerald' : 'rose',
    }))
  }

  for (const plate of plates ?? []) {
    if (plate.status === 'pending') {
      items.push(asNotification({
        audience: 'citizen',
        body: `Kerkesa per targen ${plate.plate_number} eshte ne pritje te miratimit.`,
        createdAt: plate.created_at,
        icon: 'car',
        id: `citizen-plate-pending-${plate.id}`,
        title: 'Kerkesa eshte regjistruar',
        tone: 'amber',
      }))
      continue
    }

    if (plate.status === 'approved') {
      items.push(asNotification({
        audience: 'citizen',
        body: plate.valid_until
          ? `Targa ${plate.plate_number} u miratua. Autorizimi vlen deri me ${new Date(plate.valid_until).toLocaleDateString('sq-AL')}.`
          : `Targa ${plate.plate_number} u miratua dhe mund te perdoret per akses.`,
        createdAt: plate.approved_at ?? plate.created_at,
        icon: 'shield',
        id: `citizen-plate-approved-${plate.id}`,
        title: 'Autorizimi u miratua',
        tone: 'emerald',
      }))
      continue
    }

    items.push(asNotification({
      audience: 'citizen',
      body: `Targa ${plate.plate_number} eshte aktualisht ${PLATE_STATUS_LABELS[plate.status]}.`,
      createdAt: plate.created_at,
      icon: plate.status === 'rejected' ? 'x' : 'alert',
      id: `citizen-plate-${plate.status}-${plate.id}`,
      title: plate.status === 'rejected' ? 'Autorizimi u refuzua' : 'Autorizimi ndryshoi',
      tone: plate.status === 'rejected' ? 'rose' : 'slate',
    }))
  }

  const sorted = sortNotifications(items, limit)

  return {
    count: items.length,
    items: sorted,
    source: 'fallback',
    unreadCount: sorted.filter((item) => item.isUnread).length,
  }
}

async function getAdminNotificationsFallback(supabase, { limit = 10 } = {}) {
  const [{ data: reports }, { data: plates }] = await Promise.all([
    supabase
      .from('citizen_reports')
      .select('id, category, status, photo_url, latitude, longitude, created_at, reporter_id')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('authorized_plates')
      .select('id, plate_number, owner_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const reporterIds = [...new Set((reports ?? []).map((report) => report.reporter_id).filter(Boolean))]
  let reporterNames = new Map()

  if (reporterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', reporterIds)

    reporterNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? 'Qytetar']))
  }

  const items = []

  for (const plate of plates ?? []) {
    if (plate.status !== 'pending') continue
    items.push(asNotification({
      audience: 'admin',
      body: `Kerkese e re per targen ${plate.plate_number} nga ${plate.owner_name}.`,
      createdAt: plate.created_at,
      href: '/admin/autorizimet',
      icon: 'car',
      id: `admin-plate-pending-${plate.id}`,
      metadata: { plateId: plate.id, plateNumber: plate.plate_number },
      title: 'Kerkese e re per autorizim',
      tone: 'amber',
    }))
  }

  for (const report of reports ?? []) {
    if (report.status === 'zgjidhur' || report.status === 'refuzuar') continue

    const priority = getReportPriority(report)
    const categoryLabel = REPORT_CATEGORY_LABELS[report.category] ?? report.category
    const reporterName = reporterNames.get(report.reporter_id) ?? 'Qytetar'

    items.push(asNotification({
      audience: 'admin',
      body: priority === 'urgent'
        ? `${categoryLabel} nga ${reporterName} kerkon reagim te shpejte.`
        : `${categoryLabel} i ri nga ${reporterName}${report.photo_url ? ' me foto' : ''}.`,
      createdAt: report.created_at,
      href: `/admin/raportet?reportId=${report.id}`,
      icon: priority === 'urgent' ? 'alert' : (report.photo_url ? 'camera' : 'report'),
      id: `admin-report-${report.id}`,
      metadata: { reportId: report.id, category: report.category, photoUrl: report.photo_url ?? null },
      title: priority === 'urgent' ? 'Raport urgent ne pritje' : 'Raport i ri qytetar',
      tone: priority === 'urgent' ? 'rose' : (priority === 'medium' ? 'amber' : 'blue'),
    }))
  }

  const sorted = sortNotifications(items, limit)

  return {
    count: items.length,
    items: sorted,
    source: 'fallback',
    unreadCount: sorted.filter((item) => item.isUnread).length,
  }
}

async function getCitizenNotificationsFromDb(supabase, userId, { limit = 8 } = {}) {
  const [{ data: rows, error }, { count: unreadCount, error: countError }] = await Promise.all([
    supabase
      .from('app_notifications')
      .select('id, title, body, href, tone, icon, kind, metadata, channels_requested, channels_status, read_at, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null),
  ])

  if (error || countError) {
    throw error ?? countError
  }

  const items = (rows ?? []).map((row) => normalizeDbNotification(row, 'citizen'))

  return {
    count: items.length,
    items,
    source: 'database',
    unreadCount: unreadCount ?? items.filter((item) => item.isUnread).length,
  }
}

async function getAdminNotificationsFromDb(supabase, userId, { limit = 10 } = {}) {
  const [sharedQuery, personalQuery, sharedUnreadQuery, personalUnreadQuery] = await Promise.all([
    supabase
      .from('app_notifications')
      .select('id, title, body, href, tone, icon, kind, metadata, channels_requested, channels_status, read_at, created_at')
      .eq('recipient_role', 'admin')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('app_notifications')
      .select('id, title, body, href, tone, icon, kind, metadata, channels_requested, channels_status, read_at, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_role', 'admin')
      .is('read_at', null),
    supabase
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null),
  ])

  const possibleError = sharedQuery.error ?? personalQuery.error ?? sharedUnreadQuery.error ?? personalUnreadQuery.error
  if (possibleError) throw possibleError

  const merged = [...(sharedQuery.data ?? []), ...(personalQuery.data ?? [])]
  const deduped = Array.from(new Map(merged.map((row) => [row.id, row])).values())
  const items = sortNotifications(deduped.map((row) => normalizeDbNotification(row, 'admin')), limit)

  return {
    count: deduped.length,
    items,
    source: 'database',
    unreadCount: (sharedUnreadQuery.count ?? 0) + (personalUnreadQuery.count ?? 0),
  }
}

export async function getCitizenNotifications(supabase, userId, options = {}) {
  try {
    return await getCitizenNotificationsFromDb(supabase, userId, options)
  } catch (error) {
    if (!isMissingNotificationsTable(error)) throw error
    return getCitizenNotificationsFallback(supabase, userId, options)
  }
}

export async function getAdminNotifications(supabase, userIdOrOptions, maybeOptions) {
  const userId = typeof userIdOrOptions === 'string' ? userIdOrOptions : null
  const options = typeof userIdOrOptions === 'string' ? (maybeOptions ?? {}) : (userIdOrOptions ?? {})

  if (userId) {
    try {
      return await getAdminNotificationsFromDb(supabase, userId, options)
    } catch (error) {
      if (!isMissingNotificationsTable(error)) throw error
    }
  }

  return getAdminNotificationsFallback(supabase, options)
}

export async function createNotification({
  actorId = null,
  body,
  href = null,
  icon = 'report',
  kind = 'generic',
  metadata = {},
  recipientId = null,
  recipientRole = null,
  title,
  tone = 'blue',
}) {
  const service = createServiceSupabaseClient()
  let channelsRequested = DEFAULT_CHANNELS_REQUESTED
  let channelsStatus = DEFAULT_CHANNELS_STATUS

  if (recipientId) {
    try {
      const preferences = await getNotificationPreferences(recipientId)
      const delivery = getDeliveryStatus(preferences)
      channelsRequested = delivery.channelsRequested
      channelsStatus = delivery.channelsStatus
    } catch (error) {
      if (!isMissingNotificationsTable(error)) throw error
    }
  }

  const { error } = await service
    .from('app_notifications')
    .insert({
      actor_id: actorId,
      body,
      channels_requested: channelsRequested,
      channels_status: channelsStatus,
      href,
      icon,
      kind,
      metadata,
      recipient_id: recipientId,
      recipient_role: recipientRole,
      title,
      tone,
    })

  if (error && !isMissingNotificationsTable(error)) {
    throw error
  }
}
