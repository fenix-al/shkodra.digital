import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import CitizenDashboardClient from './CitizenDashboardClient'

export const metadata = {
  title: 'Paneli Im | Shkodra.digital',
}

export default async function CitizenDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN])

  const { data: plates } = await supabase
    .from('authorized_plates')
    .select('id, plate_number, vehicle_type, status, valid_from, valid_until, created_at')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <CitizenDashboardClient
      plates={plates ?? []}
      ownerName={profile.full_name ?? 'Qytetar'}
    />
  )
}
