import { createServerSupabaseClient } from '@/lib/supabase/server'
import SkanerClient from './SkanerClient'

export const metadata = {
  title: 'Skaneri | Shkodra.digital',
}

export default async function SkanerPage() {
  const supabase = await createServerSupabaseClient()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: entries },
    { count: exits },
    { data: recentLogs },
    { data: zoneConfig },
  ] = await Promise.all([
    supabase
      .from('scan_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'ENTRY')
      .gte('scanned_at', `${today}T00:00:00Z`),
    supabase
      .from('scan_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'EXIT')
      .gte('scanned_at', `${today}T00:00:00Z`),
    supabase
      .from('scan_logs')
      .select('plate_id, action, scan_method, scanned_at, authorized_plates(plate_number, owner_name)')
      .gte('scanned_at', `${today}T00:00:00Z`)
      .order('scanned_at', { ascending: false })
      .limit(10),
    supabase
      .from('zone_config')
      .select('capacity, zone_name')
      .single(),
  ])

  const occupancy = (entries ?? 0) - (exits ?? 0)
  const capacity  = zoneConfig?.capacity ?? 50
  const zoneName  = zoneConfig?.zone_name ?? 'Zona Zdrales'

  return (
    <SkanerClient
      occupancy={occupancy}
      capacity={capacity}
      zoneName={zoneName}
      recentLogs={recentLogs ?? []}
    />
  )
}
