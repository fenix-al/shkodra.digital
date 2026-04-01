import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { getAdminNotifications } from '@/lib/notifications'

export default async function AdminLayout({ children }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const shouldShowAdminNotifications = profile?.role === 'manager' || profile?.role === 'super_admin'
  const { unreadCount: notificationCount, items: notificationItems } = shouldShowAdminNotifications
    ? await getAdminNotifications(supabase, user.id, { limit: 6 })
    : { unreadCount: 0, items: [] }

  return (
    <AdminShell profile={profile} currentUserId={user.id} notificationCount={notificationCount} notifications={notificationItems}>
      {children}
    </AdminShell>
  )
}
