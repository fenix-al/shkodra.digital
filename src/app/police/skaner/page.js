import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Skaneri | Shkodra.digital',
}

export default async function SkanerPage() {
  const supabase = await createServerSupabaseClient()

  // Today's occupancy snapshot
  const today = new Date().toISOString().split('T')[0]
  const { count: entries } = await supabase
    .from('scan_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'ENTRY')
    .gte('scanned_at', `${today}T00:00:00Z`)

  const { count: exits } = await supabase
    .from('scan_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'EXIT')
    .gte('scanned_at', `${today}T00:00:00Z`)

  const occupancy = (entries ?? 0) - (exits ?? 0)

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold text-zinc-100">Skaneri i Zonës</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Brenda zonës tani:{' '}
        <span className="font-semibold text-emerald-400">{occupancy}</span>
      </p>
      {/* QRScanner + ManualSearch components — Sprint 3 */}
    </div>
  )
}
