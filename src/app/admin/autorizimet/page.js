import { createServerSupabaseClient } from '@/lib/supabase/server'
import PlatesTable from '@/components/admin/PlatesTable'

export const metadata = {
  title: 'Autorizimet | Shkodra.digital',
}

export default async function AutorizimetPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: plates }, { data: entries }] = await Promise.all([
    supabase
      .from('authorized_plates')
      .select('id, plate_number, owner_name, vehicle_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('scan_logs')
      .select('plate_id, scanned_at')
      .eq('action', 'ENTRY')
      .order('scanned_at', { ascending: false })
      .limit(1000),
  ])

  const lastEntryMap = {}
  entries?.forEach((e) => {
    if (!lastEntryMap[e.plate_id]) lastEntryMap[e.plate_id] = e.scanned_at
  })

  const enrichedPlates = plates?.map((p) => ({ ...p, last_entry_at: lastEntryMap[p.id] ?? null })) ?? []

  return <PlatesTable initialPlates={enrichedPlates} />
}
