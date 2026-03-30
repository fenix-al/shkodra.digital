import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Paneli Im | Shkodra.digital',
}

export default async function CitizenDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: plates } = await supabase
    .from('authorized_plates')
    .select('id, plate_number, status, vehicle_type')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-zinc-100">Paneli Im</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Targat tuaja dhe kodi QR i aksesit
      </p>
      {/* QR display + plate list — Sprint 4 */}
      <pre className="mt-4 text-xs text-zinc-500">
        {JSON.stringify(plates, null, 2)}
      </pre>
    </div>
  )
}
