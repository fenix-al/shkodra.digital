import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountSettingsForm from '@/components/admin/AccountSettingsForm'
import { getDeliverySettings } from '@/lib/notifications'

export const metadata = {
  title: 'Cilësimet | Shkodra.digital',
}

export default async function CilesiметPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: zoneConfig }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('zone_config').select('zone_name, capacity').limit(1).single(),
  ])

  const [{ data: notificationPreferences }, deliverySettings] = await Promise.all([
    supabase
      .from('app_notification_preferences')
      .select('email_enabled, push_enabled, digest_frequency')
      .eq('profile_id', user.id)
      .maybeSingle(),
    getDeliverySettings(),
  ])

  return (
    <AccountSettingsForm
      profile={profile ?? { full_name: null, role: 'citizen' }}
      email={user.email ?? ''}
      notificationPreferences={notificationPreferences}
      deliverySettings={deliverySettings}
      zoneConfig={zoneConfig}
    />
  )
}
