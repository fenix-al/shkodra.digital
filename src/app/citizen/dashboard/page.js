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

  const [{ data: plates }, { data: reports }, { items: notifications, unreadCount }] = await Promise.all([
    supabase
      .from('authorized_plates')
      .select('id, plate_number, vehicle_type, status, valid_from, valid_until, created_at')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('citizen_reports')
      .select('id, category, description, status, created_at, photo_url, follow_up_count, last_follow_up_at')
      .eq('reporter_id', profile.id)
      .in('status', ['hapur', 'në_shqyrtim'])
      .order('created_at', { ascending: false })
      .limit(10),
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
      reports={reports ?? []}
      ownerName={profile.full_name ?? 'Qytetar'}
    />
  )
}
