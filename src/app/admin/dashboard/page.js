import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShieldCheck, Clock, Activity, ArrowUpRight, ChevronRight, Car } from 'lucide-react'
import OccupancyRealtime from '@/components/admin/OccupancyRealtime'
import AnalyticsPanel from '@/components/admin/AnalyticsPanel'

export const metadata = {
  title: 'Paneli Kryesor | Shkodra.digital',
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: entries },
    { count: exits },
    { data: zoneConfig },
    { count: activeCount },
    { count: pendingCount },
    { count: scansToday },
    { data: recentLogs },
    { data: weekLogs },
  ] = await Promise.all([
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).eq('action', 'ENTRY').gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).eq('action', 'EXIT').gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('zone_config').select('capacity, zone_name').single(),
    supabase.from('authorized_plates').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('authorized_plates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('scan_logs').select('plate_id, action, scanned_at, scan_method, authorized_plates(plate_number)').order('scanned_at', { ascending: false }).limit(8),
    supabase.from('scan_logs').select('plate_id, action, scanned_at').gte('scanned_at', sevenDaysAgo).order('scanned_at', { ascending: true }),
  ])

  const occupancy = Math.max(0, (entries ?? 0) - (exits ?? 0))
  const capacity  = zoneConfig?.capacity ?? 50
  const zoneName  = zoneConfig?.zone_name ?? 'Zona Zdralës'

  // ── Analytics calculations ──────────────────────────────────────────────────

  // Peak hours: group by hour of day
  const hourlyMap = new Map()
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { hour: h, entries: 0, exits: 0 })

  let totalEntries7d = 0
  let totalExits7d = 0

  for (const log of weekLogs ?? []) {
    const h = new Date(log.scanned_at).getHours()
    const bucket = hourlyMap.get(h)
    if (log.action === 'ENTRY') { bucket.entries++; totalEntries7d++ }
    if (log.action === 'EXIT')  { bucket.exits++;   totalExits7d++ }
  }
  const hourlyData = Array.from(hourlyMap.values())

  // Avg stay: pair ENTRY+EXIT per plate, take first EXIT after each ENTRY
  let avgStayMinutes = null
  const entryTimes = new Map()
  const stayDurations = []

  for (const log of weekLogs ?? []) {
    if (log.action === 'ENTRY') {
      entryTimes.set(log.plate_id, new Date(log.scanned_at).getTime())
    } else if (log.action === 'EXIT' && entryTimes.has(log.plate_id)) {
      const diff = (new Date(log.scanned_at).getTime() - entryTimes.get(log.plate_id)) / 60000
      if (diff > 0 && diff < 480) stayDurations.push(diff) // ignore > 8h (anomalies)
      entryTimes.delete(log.plate_id)
    }
  }
  if (stayDurations.length > 0) {
    avgStayMinutes = stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Targa Aktive"       value={activeCount ?? 0}  icon={<ShieldCheck size={20} className="text-emerald-400" />} trend="Të miratuara"   positive />
        <StatCard label="Kërkesa në Pritje"  value={pendingCount ?? 0} icon={<Clock size={20} className="text-amber-400" />}        trend="Presin miratim" />
        <StatCard label="Kapaciteti i Zonës" value={`${occupancy}/${capacity}`} icon={<Car size={20} className="text-blue-400" />} trend={`${Math.round((occupancy / capacity) * 100)}% e zënë`} />
        <StatCard label="Skanime Sot"        value={scansToday ?? 0}   icon={<Activity size={20} className="text-purple-400" />}    trend="Hyrje + Dalje" positive />
      </div>

      {/* ── Live occupancy (Realtime) ── */}
      <OccupancyRealtime
        initialOccupancy={occupancy}
        capacity={capacity}
        zoneName={zoneName}
      />

      {/* ── Recent scans ── */}
      <div className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Skanime të Fundit</h2>
          <a href="/admin/autorizimet" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">Shiko të gjitha <ChevronRight size={12} /></a>
        </div>
        <div className="divide-y divide-white/5">
          {(recentLogs?.length ?? 0) === 0 && (
            <p className="px-6 py-8 text-sm text-slate-500 text-center">Nuk ka skanime sot.</p>
          )}
          {recentLogs?.map((log) => (
            <div key={log.scanned_at + log.plate_id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${log.action === 'ENTRY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {log.action === 'ENTRY' ? '↓' : '↑'}
                </div>
                <div>
                  <p className="text-sm font-mono font-bold text-white">{log.authorized_plates?.plate_number ?? '—'}</p>
                  <p className="text-xs text-slate-500">{log.scan_method === 'QR' ? 'Skanim QR' : 'Manual'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold uppercase tracking-widest ${log.action === 'ENTRY' ? 'text-emerald-400' : 'text-rose-400'}`}>{log.action === 'ENTRY' ? 'Hyrje' : 'Dalje'}</p>
                <p className="text-xs text-slate-500">{String(new Date(log.scanned_at).getUTCHours()).padStart(2,'0')}:{String(new Date(log.scanned_at).getUTCMinutes()).padStart(2,'0')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Analytics ── */}
      <AnalyticsPanel
        hourlyData={hourlyData}
        avgStayMinutes={avgStayMinutes}
        totalEntries7d={totalEntries7d}
        totalExits7d={totalExits7d}
      />
    </div>
  )
}

function StatCard({ label, value, icon, trend, positive = false }) {
  return (
    <div className="bg-[#050914]/60 backdrop-blur-xl p-6 rounded-[28px] border border-white/5 shadow-lg group hover:border-emerald-500/20 transition-all duration-500">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">{icon}</div>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
          <ArrowUpRight size={12} />
          {positive ? 'Live' : 'Standby'}
        </div>
      </div>
      <div className="text-3xl font-black text-white tracking-tighter mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${positive ? 'text-emerald-500' : 'text-slate-500'}`}>{trend}</span>
        <ChevronRight size={14} className="text-slate-700" />
      </div>
    </div>
  )
}
