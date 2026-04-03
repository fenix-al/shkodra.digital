import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ShieldCheck, Clock, Activity, ArrowUpRight, ChevronRight, Car, Flame, FileText } from 'lucide-react'
import OccupancyRealtime from '@/components/admin/OccupancyRealtime'
import AdminReportsRealtimeRefresh from '@/components/admin/AdminReportsRealtimeRefresh'
import AnalyticsPanel from '@/components/admin/AnalyticsPanel'
import AdminDashboardDock from '@/components/admin/AdminDashboardDock'
import ReportStatisticsChart from '@/components/admin/ReportStatisticsChart'
import { getAdminNotifications } from '@/lib/notifications'

export const metadata = {
  title: 'Paneli Kryesor | Shkodra.digital',
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    notificationsResult,
  ] = await Promise.all([
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).eq('action', 'ENTRY').gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).eq('action', 'EXIT').gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('zone_config').select('capacity, zone_name').single(),
    supabase.from('authorized_plates').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('authorized_plates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('scan_logs').select('*', { count: 'exact', head: true }).gte('scanned_at', `${today}T00:00:00Z`),
    supabase.from('scan_logs').select('plate_id, action, scanned_at, scan_method, authorized_plates(plate_number)').order('scanned_at', { ascending: false }).limit(8),
    supabase.from('scan_logs').select('plate_id, action, scanned_at').gte('scanned_at', sevenDaysAgo).order('scanned_at', { ascending: true }),
    supabase.from('citizen_reports').select('id, category, status, photo_url, latitude, longitude, created_at, follow_up_count, last_follow_up_at').order('created_at', { ascending: false }).limit(250),
    getAdminNotifications(supabase, user?.id ?? null, { limit: 6 }),
  ])

  const notifications = notificationsResult.items
  const notificationsUnreadCount = notificationsResult.unreadCount
  const occupancy = Math.max(0, (entries ?? 0) - (exits ?? 0))
  const capacity = zoneConfig?.capacity ?? 50
  const zoneName = zoneConfig?.zone_name ?? 'Zona Zdrales'

  const dayLabels = ['Hen', 'Mar', 'Mer', 'Enj', 'Pre', 'Sht', 'Die']
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setUTCDate(now.getUTCDate() - (6 - index))
    date.setUTCHours(0, 0, 0, 0)
    const weekdayIndex = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1
    return {
      key: date.toISOString().slice(0, 10),
      label: dayLabels[weekdayIndex],
      entries: 0,
      exits: 0,
    }
  })
  const dailyMap = new Map(dailyTrend.map((item) => [item.key, item]))

  let totalEntries7d = 0
  let totalExits7d = 0

  for (const log of weekLogs ?? []) {
    const key = new Date(log.scanned_at).toISOString().slice(0, 10)
    const bucket = dailyMap.get(key)
    if (!bucket) continue
    if (log.action === 'ENTRY') {
      bucket.entries += 1
      totalEntries7d += 1
    }
    if (log.action === 'EXIT') {
      bucket.exits += 1
      totalExits7d += 1
    }
  }

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
  const recentScans = (recentLogs ?? []).map((log) => ({
    key: `${log.scanned_at}-${log.plate_id}`,
    plateNumber: log.authorized_plates?.plate_number ?? '-',
    action: log.action,
    scanMethod: log.scan_method === 'QR' ? 'Skanim QR' : 'Manual',
    timeLabel: `${String(new Date(log.scanned_at).getUTCHours()).padStart(2, '0')}:${String(new Date(log.scanned_at).getUTCMinutes()).padStart(2, '0')}`,
  }))

  return (
    <div className="flex flex-col gap-6">
      <AdminReportsRealtimeRefresh />

      <section className="overflow-hidden rounded-[28px] border border-white/5 bg-[#050914]/80 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Analitika e Raporteve</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-white">Prioriteti dhe tendenca e qytetareve</h2>
          </div>
          <a href="/admin/raportet" className="flex items-center gap-1 text-xs text-emerald-400 transition-colors hover:text-emerald-300">
            Hape panelin e plote <ChevronRight size={12} />
          </a>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Raporte Totale" value={reportStats.total} icon={<FileText size={20} className="text-blue-400" />} trend="Te regjistruara" positive={reportStats.total > 0} />
            <StatCard label="Urgjente Aktive" value={reportStats.urgentOpen} icon={<Flame size={20} className="text-rose-400" />} trend="Kerkojne reagim" positive={reportStats.urgentOpen > 0} />
            <StatCard label="Te Hapura" value={reportStats.openTotal} icon={<Flame size={20} className="text-amber-400" />} trend="Ne proces" positive={reportStats.openTotal > 0} />
            <StatCard label="Te Zgjidhura" value={`${reportStats.resolvedRate}%`} icon={<ShieldCheck size={20} className="text-emerald-400" />} trend={`${reportStats.resolved} raporte te mbyllura`} positive={reportStats.resolved > 0} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">7 ditet e fundit</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-100">Volumi i raportimeve</h3>
                  <p className="mt-1 text-xs text-slate-500">Linja tregon ritmin ditor te raporteve ne javen e fundit.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                  Kulmi: {reportStats.weeklyPeak} raporte
                </div>
              </div>

              <ReportStatisticsChart
                weeklyTrend={reportStats.weeklyTrend}
                weeklyOpenTrend={reportStats.weeklyOpenTrend}
                weeklyResolvedTrend={reportStats.weeklyResolvedTrend}
                totalReports={reportStats.total}
                averagePerDay={Math.round((reportStats.total / Math.max(1, reportStats.weeklyTrend.length)) * 10) / 10}
                totalOpen={reportStats.openTotal}
                totalResolved={reportStats.resolved}
                weeklyPeak={reportStats.weeklyPeak}
              />
            </div>

            <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ngarkesa operative</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-200">Prioritetet aktive</h3>
                </div>
                <Flame size={18} className="text-rose-400" />
              </div>

              <div className="mb-5 flex flex-col gap-3">
                <PriorityRow label="Prapambetura" value={reportStats.overdueOpen} tone="orange" />
                <PriorityRow label="Urgjente" value={reportStats.urgentOpen} tone="rose" />
                <PriorityRow label="Mesatare" value={reportStats.mediumOpen} tone="amber" />
                <PriorityRow label="Normale" value={reportStats.normalOpen} tone="blue" />
              </div>

              <div className="space-y-3">
                {reportStats.categorySummary.map((item) => (
                  <div key={item.value}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{item.label}</span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: item.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/5 bg-[#050914]/80 backdrop-blur-2xl">
        <div className="border-b border-white/5 p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pedonalja</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-white">Skanimi i QR kodeve dhe targave te lejuara</h2>
          <p className="mt-1 text-sm text-slate-500">Monitorimi operativ i hyrjeve, daljeve dhe kapacitetit te automjeteve me autorizim ne pedonale.</p>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Leje Aktive" value={activeCount ?? 0} icon={<ShieldCheck size={20} className="text-emerald-400" />} trend="Autorizime ne fuqi" positive />
            <StatCard label="Kerkesa Ne Shqyrtim" value={pendingCount ?? 0} icon={<Clock size={20} className="text-amber-400" />} trend="Ne pritje te vendimit" />
            <StatCard label="Kapaciteti Operativ" value={`${occupancy}/${capacity}`} icon={<Car size={20} className="text-blue-400" />} trend={`${Math.round((occupancy / capacity) * 100)}% e zene`} />
            <StatCard label="Skanime Te Dites" value={scansToday ?? 0} icon={<Activity size={20} className="text-purple-400" />} trend="Hyrje dhe dalje" positive />
          </div>

          <OccupancyRealtime initialOccupancy={occupancy} capacity={capacity} zoneName={zoneName} />
        </div>
      </section>

      <AnalyticsPanel
        dailyData={dailyTrend}
        avgStayMinutes={avgStayMinutes}
        totalEntries7d={totalEntries7d}
        totalExits7d={totalExits7d}
      />

      <AdminDashboardDock
        notifications={notifications}
        unreadCount={notificationsUnreadCount}
        recentScans={recentScans}
      />
    </div>
  )
}

function StatCard({ label, value, icon, trend, positive = false }) {
  return (
    <div className="group rounded-[28px] border border-white/5 bg-[#050914]/60 p-6 shadow-lg transition-all duration-500 hover:border-emerald-500/20 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tighter ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
          <ArrowUpRight size={12} />
          {positive ? 'Live' : 'Standby'}
        </div>
      </div>
      <div className="mb-1 text-3xl font-black tracking-tighter text-white">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${positive ? 'text-emerald-500' : 'text-slate-500'}`}>{trend}</span>
        <ChevronRight size={14} className="text-slate-700" />
      </div>
    </div>
  )
}

function getReportPriority(report) {
  if (Number(report.follow_up_count ?? 0) > 0 && report.status !== 'zgjidhur' && report.status !== 'refuzuar') return 'overdue'
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') return 'closed'

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
  const labels = ['Hen', 'Mar', 'Mer', 'Enj', 'Pre', 'Sht', 'Die']
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
    ndricim: 'Ndricim',
    kanalizim: 'Kanalizim',
    rruge: 'Rruge',
    mbeturina: 'Mbeturina',
    akses: 'Akses',
    tjeter: 'Tjeter',
  }

  const priorityCounts = { overdue: 0, urgent: 0, medium: 0, normal: 0 }
  const categoryCounts = Object.fromEntries(Object.keys(categories).map((key) => [key, 0]))
  const resolvedByDay = new Map()
  const openByDay = new Map()

  for (const report of reports) {
    const key = new Date(report.created_at).toISOString().slice(0, 10)
    const bucket = weeklyMap.get(key)
    if (bucket) bucket.count += 1
    if (report.status === 'zgjidhur') resolvedByDay.set(key, (resolvedByDay.get(key) ?? 0) + 1)
    if (report.status !== 'zgjidhur' && report.status !== 'refuzuar') {
      openByDay.set(key, (openByDay.get(key) ?? 0) + 1)
    }

    if (report.category in categoryCounts) categoryCounts[report.category] += 1

    const priority = getReportPriority(report)
    if (priority !== 'closed') priorityCounts[priority] += 1
  }

  const total = reports.length
  const resolved = reports.filter((report) => report.status === 'zgjidhur').length
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
    openTotal: priorityCounts.overdue + priorityCounts.urgent + priorityCounts.medium + priorityCounts.normal,
    overdueOpen: priorityCounts.overdue,
    resolvedRate: total === 0 ? 0 : Math.round((resolved / total) * 100),
    urgentOpen: priorityCounts.urgent,
    mediumOpen: priorityCounts.medium,
    normalOpen: priorityCounts.normal,
    weeklyTrend,
    weeklyResolvedTrend: weeklyTrend.map((item) => ({ ...item, count: resolvedByDay.get(item.key) ?? 0 })),
    weeklyOpenTrend: weeklyTrend.map((item) => ({ ...item, count: openByDay.get(item.key) ?? 0 })),
    weeklyPeak,
    categorySummary,
  }
}

function PriorityRow({ label, value, tone }) {
  const classes = {
    orange: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
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
