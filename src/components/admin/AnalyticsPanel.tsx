import { TrendingUp, Timer, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { cx } from '@/lib/cx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HourBucket {
  hour: number      // 0–23
  entries: number
  exits: number
}

interface Props {
  hourlyData: HourBucket[]   // last 7 days, grouped by hour
  avgStayMinutes: number | null
  totalEntries7d: number
  totalExits7d: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsPanel({ hourlyData, avgStayMinutes, totalEntries7d, totalExits7d }: Props) {
  const maxCount = Math.max(1, ...hourlyData.map((b) => b.entries + b.exits))
  const peakHour = hourlyData.reduce((best, b) => (b.entries + b.exits > (best?.entries ?? 0) + (best?.exits ?? 0) ? b : best), hourlyData[0])

  return (
    <div className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Analitika</h2>
          <p className="text-sm font-semibold text-slate-300 mt-0.5">7 ditët e fundit</p>
        </div>
        <TrendingUp size={18} className="text-emerald-400" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Hyrje / 7d" value={totalEntries7d} icon={<ArrowDownToLine size={13} className="text-emerald-400" />} color="text-emerald-400" />
        <MiniStat label="Dalje / 7d" value={totalExits7d} icon={<ArrowUpFromLine size={13} className="text-rose-400" />} color="text-rose-400" />
        <MiniStat label="Qëndrim mesatar" value={avgStayMinutes != null ? formatDuration(avgStayMinutes) : '—'} icon={<Timer size={13} className="text-blue-400" />} color="text-blue-400" />
        <MiniStat label="Ora kulmore" value={peakHour ? formatHour(peakHour.hour) : '—'} icon={<TrendingUp size={13} className="text-amber-400" />} color="text-amber-400" />
      </div>

      {/* Peak hours bar chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Shpërndarja sipas orës (7 ditë)</p>
        <div className="flex items-end gap-[3px] h-28">
          {Array.from({ length: 24 }, (_, h) => {
            const bucket = hourlyData.find((b) => b.hour === h)
            const total = (bucket?.entries ?? 0) + (bucket?.exits ?? 0)
            const heightPct = maxCount > 0 ? (total / maxCount) * 100 : 0
            const isPeak = bucket && total === (peakHour ? (peakHour.entries + peakHour.exits) : 0) && total > 0

            return (
              <div key={h} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-[#050914] border border-white/10 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-200 whitespace-nowrap shadow-xl">
                    {formatHour(h)}<br />{total} skanime
                  </div>
                </div>
                {/* Bar */}
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={cx('w-full rounded-t-sm transition-all duration-500', total === 0 ? 'bg-white/[0.03]' : isPeak ? 'bg-gradient-to-t from-blue-400 to-emerald-400' : 'bg-white/20 group-hover:bg-white/30')}
                    style={{ height: total === 0 ? '4px' : `${Math.max(8, heightPct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {/* X-axis labels */}
        <div className="flex mt-2">
          {[0, 4, 8, 12, 16, 20].map((h) => (
            <div key={h} className="flex-1 text-[9px] text-slate-600 font-mono" style={{ marginLeft: h === 0 ? 0 : `${(h / 24) * 100}%`, position: h === 0 ? 'relative' : 'absolute' }}>
              {formatHour(h)}
            </div>
          ))}
        </div>
        <div className="relative flex mt-1 h-3">
          {[0, 4, 8, 12, 16, 20].map((h) => (
            <span key={h} className="absolute text-[9px] text-slate-600 font-mono" style={{ left: `${(h / 24) * 100}%` }}>
              {formatHour(h)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <span className={cx('text-xl font-black tracking-tighter', color)}>{value}</span>
    </div>
  )
}
