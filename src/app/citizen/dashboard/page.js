import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { getCitizenNotifications } from '@/lib/notifications'
import CitizenDashboardClient from './CitizenDashboardClient'

export const metadata = {
  title: 'Paneli Im | Shkodra.digital',
}

export default async function CitizenDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN])

  const [{ data: plates }, { items: notifications, unreadCount }] = await Promise.all([
    supabase
      .from('authorized_plates')
      .select('id, plate_number, vehicle_type, status, valid_from, valid_until, created_at')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false }),
    getCitizenNotifications(supabase, profile.id),
  ])

  const { data: notificationPreferences } = await supabase
    .from('app_notification_preferences')
    .select('email_enabled, push_enabled, digest_frequency')
    .eq('profile_id', profile.id)
    .maybeSingle()

  return (
    <CitizenDashboardClient
      notifications={notifications}
      notificationsUnreadCount={unreadCount}
      notificationPreferences={notificationPreferences}
      plates={plates ?? []}
      ownerName={profile.full_name ?? 'Qytetar'}
    />
  )
}
