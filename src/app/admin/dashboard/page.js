import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShieldCheck, Clock, Activity, ArrowUpRight, ChevronRight, Car, Flame, Camera, FileText } from 'lucide-react'
import OccupancyRealtime from '@/components/admin/OccupancyRealtime'
import AnalyticsPanel from '@/components/admin/AnalyticsPanel'

export const metadata = {
  title: 'Paneli Kryesor | Shkodra.digital',
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: entries },
    { count: exits },
    { data: zoneConfig },
    { count: activeCount },
    { count: pendingCount },
    { count: scansToday },
    { data: recentLogs },
    { data: weekLogs },
    { data: reportRows },
  ] = await Promise.all([
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).eq('action', 'ENTRY').gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).eq('action', 'EXIT').gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('zone_config').select('capacity, zone_name').single(),
    supabase.from('authorized_plates').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('authorized_plates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('scan_logs').select('plate_id, action, scanned_at, scan_method, authorized_plates(plate_number)').order('scanned_at', { ascending: false }).limit(8),
    supabase.from('scan_logs').select('plate_id, action, scanned_at').gte('scanned_at', sevenDaysAgo).order('scanned_at', { ascending: true }),
    supabase
      .from('citizen_reports')
      .select('id, category, status, photo_url, latitude, longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(250),
  ])

  const occupancy = Math.max(0, (entries ?? 0) - (exits ?? 0))
  const capacity = zoneConfig?.capacity ?? 50
  const zoneName = zoneConfig?.zone_name ?? 'Zona Zdralës'

  const hourlyMap = new Map()
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { hour: h, entries: 0, exits: 0 })

  let totalEntries7d = 0
  let totalExits7d = 0

  for (const log of weekLogs ?? []) {
    const h = new Date(log.scanned_at).getHours()
    const bucket = hourlyMap.get(h)
    if (log.action === 'ENTRY') {
      bucket.entries++
      totalEntries7d++
    }
    if (log.action === 'EXIT') {
      bucket.exits++
      totalExits7d++
    }
  }
  const hourlyData = Array.from(hourlyMap.values())

  let avgStayMinutes = null
  const entryTimes = new Map()
  const stayDurations = []

  for (const log of weekLogs ?? []) {
    if (log.action === 'ENTRY') {
      entryTimes.set(log.plate_id, new Date(log.scanned_at).getTime())
    } else if (log.action === 'EXIT' && entryTimes.has(log.plate_id)) {
      const diff = (new Date(log.scanned_at).getTime() - entryTimes.get(log.plate_id)) / 60000
      if (diff > 0 && diff < 480) stayDurations.push(diff)
      entryTimes.delete(log.plate_id)
    }
  }

  if (stayDurations.length > 0) {
    avgStayMinutes = stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length
  }

  const reports = reportRows ?? []
  const reportStats = getReportAnalytics(reports)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Targa Aktive" value={activeCount ?? 0} icon={<ShieldCheck size={20} className="text-emerald-400" />} trend="Të miratuara" positive />
        <StatCard label="Kërkesa në Pritje" value={pendingCount ?? 0} icon={<Clock size={20} className="text-amber-400" />} trend="Presin miratim" />
        <StatCard label="Kapaciteti i Zonës" value={`${occupancy}/${capacity}`} icon={<Car size={20} className="text-blue-400" />} trend={`${Math.round((occupancy / capacity) * 100)}% e zënë`} />
        <StatCard label="Skanime Sot" value={scansToday ?? 0} icon={<Activity size={20} className="text-purple-400" />} trend="Hyrje + Dalje" positive />
      </div>

      <OccupancyRealtime initialOccupancy={occupancy} capacity={capacity} zoneName={zoneName} />

      <section className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Analitika e Raporteve</p>
            <h2 className="text-lg font-black tracking-tight text-white mt-1">Prioriteti dhe tendenca e qytetarëve</h2>
          </div>
          <a href="/admin/raportet" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
            Hape panelin e plotë <ChevronRight size={12} />
          </a>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Raporte Totale" value={reportStats.total} icon={<FileText size={20} className="text-blue-400" />} trend="Të regjistruara" positive={reportStats.total > 0} />
            <StatCard label="Urgjente Aktive" value={reportStats.urgentOpen} icon={<Flame size={20} className="text-rose-400" />} trend="Kërkojnë reagim" positive={reportStats.urgentOpen > 0} />
            <StatCard label="Me Foto" value={reportStats.withPhoto} icon={<Camera size={20} className="text-amber-400" />} trend="Prova vizuale" positive={reportStats.withPhoto > 0} />
            <StatCard label="Të Zgjidhura" value={`${reportStats.resolvedRate}%`} icon={<ShieldCheck size={20} className="text-emerald-400" />} trend={`${reportStats.resolved} raporte të mbyllura`} positive={reportStats.resolved > 0} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">7 ditët e fundit</p>
                  <h3 className="text-sm font-semibold text-slate-200 mt-1">Volumi i raportimeve</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                  Kulmi: {reportStats.weeklyPeak} raporte
                </div>
              </div>

              <div className="flex items-end gap-3 h-48">
                {reportStats.weeklyTrend.map((item) => (
                  <div key={item.key} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-2xl bg-gradient-to-t from-blue-400 to-emerald-400 shadow-[0_10px_30px_rgba(52,211,153,0.18)]"
                        style={{ height: `${Math.max(10, (item.count / reportStats.weeklyPeak) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
                    <span className="text-xs text-slate-300">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ngarkesa operative</p>
                  <h3 className="text-sm font-semibold text-slate-200 mt-1">Prioritetet aktive</h3>
                </div>
                <Flame size={18} className="text-rose-400" />
              </div>

              <div className="flex flex-col gap-3 mb-5">
                <PriorityRow label="Urgjente" value={reportStats.urgentOpen} tone="rose" />
                <PriorityRow label="Mesatare" value={reportStats.mediumOpen} tone="amber" />
                <PriorityRow label="Normale" value={reportStats.normalOpen} tone="blue" />
              </div>

              <div className="space-y-3">
                {reportStats.categorySummary.map((item) => (
                  <div key={item.value}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-300 font-semibold">{item.label}</span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: item.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Skanime të Fundit</h2>
          <a href="/admin/autorizimet" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
            Shiko të gjitha <ChevronRight size={12} />
          </a>
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
                <p className={`text-xs font-bold uppercase tracking-widest ${log.action === 'ENTRY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {log.action === 'ENTRY' ? 'Hyrje' : 'Dalje'}
                </p>
                <p className="text-xs text-slate-500">{String(new Date(log.scanned_at).getUTCHours()).padStart(2, '0')}:{String(new Date(log.scanned_at).getUTCMinutes()).padStart(2, '0')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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

function getReportPriority(report) {
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') {
    return 'closed'
  }

  const ageHours = Math.max(0, (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))
  let score = 1
  if (report.category === 'akses') score += 2
  if (report.category === 'ndricim') score += 1
  if (report.photo_url) score += 1
  if (report.latitude !== null && report.longitude !== null) score += 1
  if (ageHours >= 72) score += 2
  else if (ageHours >= 24) score += 1
  if (report.status === 'në_shqyrtim') score += 1

  if (score >= 5) return 'urgent'
  if (score >= 3) return 'medium'
  return 'normal'
}

function getReportAnalytics(reports) {
  const labels = ['Hen', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
  const now = new Date()
  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setUTCDate(now.getUTCDate() - (6 - index))
    date.setUTCHours(0, 0, 0, 0)
    const weekdayIndex = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1
    return {
      key: date.toISOString().slice(0, 10),
      label: labels[weekdayIndex],
      count: 0,
    }
  })

  const weeklyMap = new Map(weeklyTrend.map((item) => [item.key, item]))
  const categories = {
    ndricim: 'Ndriçim',
    kanalizim: 'Kanalizim',
    rruge: 'Rrugë',
    mbeturina: 'Mbeturina',
    akses: 'Akses',
    tjeter: 'Tjetër',
  }

  const priorityCounts = { urgent: 0, medium: 0, normal: 0 }
  const categoryCounts = Object.fromEntries(Object.keys(categories).map((key) => [key, 0]))

  for (const report of reports) {
    const key = new Date(report.created_at).toISOString().slice(0, 10)
    const bucket = weeklyMap.get(key)
    if (bucket) bucket.count += 1

    if (report.category in categoryCounts) {
      categoryCounts[report.category] += 1
    }

    const priority = getReportPriority(report)
    if (priority !== 'closed') {
      priorityCounts[priority] += 1
    }
  }

  const total = reports.length
  const resolved = reports.filter((report) => report.status === 'zgjidhur').length
  const withPhoto = reports.filter((report) => Boolean(report.photo_url)).length
  const weeklyPeak = Math.max(1, ...weeklyTrend.map((item) => item.count))

  const categorySummary = Object.entries(categories)
    .map(([value, label]) => {
      const count = categoryCounts[value]
      return {
        value,
        label,
        count,
        width: `${Math.max(8, Math.round((count / Math.max(1, total)) * 100))}%`,
      }
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  return {
    total,
    resolved,
    withPhoto,
    resolvedRate: total === 0 ? 0 : Math.round((resolved / total) * 100),
    urgentOpen: priorityCounts.urgent,
    mediumOpen: priorityCounts.medium,
    normalOpen: priorityCounts.normal,
    weeklyTrend,
    weeklyPeak,
    categorySummary,
  }
}

function PriorityRow({ label, value, tone }) {
  const classes = {
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  }

  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${classes[tone]}`}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  )
}
