import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountSettingsForm from '@/components/admin/AccountSettingsForm'

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

  return (
    <AccountSettingsForm
      profile={profile ?? { full_name: null, role: 'citizen' }}
      email={user.email ?? ''}
      zoneConfig={zoneConfig}
    />
  )
}
