'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, Timer, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { cx } from '@/lib/cx'

interface HourBucket {
  key: string
  label: string
  entries: number
  exits: number
}

interface Props {
  dailyData: HourBucket[]
  avgStayMinutes: number | null
  totalEntries7d: number
  totalExits7d: number
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-[22px] border border-white/6 bg-white/[0.03] px-5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      </div>
      <div className={cx('mt-3 text-4xl font-black tracking-tighter', color)}>{value}</div>
    </div>
  )
}

export default function AnalyticsPanel({ dailyData, avgStayMinutes, totalEntries7d, totalExits7d }: Props) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const peakHour = useMemo(
    () =>
      dailyData.reduce(
        (best, bucket) => ((bucket.entries + bucket.exits) > (best.entries + best.exits) ? bucket : best),
        dailyData[0] ?? { key: '', label: '', entries: 0, exits: 0 }
      ),
    [dailyData]
  )

  const chartData = useMemo(() => {
    const maxTotal = Math.max(1, ...dailyData.map((bucket) => bucket.entries + bucket.exits))
    return dailyData.map((bucket) => {
      const total = bucket.entries + bucket.exits
      return {
        ...bucket,
        total,
        height: total === 0 ? 8 : Math.max(12, Math.min(160, Math.round((total / maxTotal) * 160))),
      }
    })
  }, [dailyData])

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/5 bg-[#050914]/80 p-6 backdrop-blur-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Analitika</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white">7 ditët e fundit</h2>
        </div>
        <TrendingUp size={18} className="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Hyrje / 7d"
          value={totalEntries7d}
          icon={<ArrowDownToLine size={14} className="text-emerald-400" />}
          color="text-emerald-400"
        />
        <MiniStat
          label="Dalje / 7d"
          value={totalExits7d}
          icon={<ArrowUpFromLine size={14} className="text-rose-400" />}
          color="text-rose-400"
        />
        <MiniStat
          label="Qëndrim mesatar"
          value={avgStayMinutes != null ? formatDuration(avgStayMinutes) : '—'}
          icon={<Timer size={14} className="text-blue-400" />}
          color="text-blue-400"
        />
        <MiniStat
          label="Dita kulmore"
          value={peakHour?.label || '—'}
          icon={<TrendingUp size={14} className="text-amber-400" />}
          color="text-amber-400"
        />
      </div>

        <div className="mt-6 rounded-[24px] border border-white/5 bg-[#070d18]/90 px-5 py-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Shpërndarja sipas ditës</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-200">Volumi i skanimeve</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Kulmi {peakHour?.label || '—'}
            </div>
          </div>

        <div className="relative overflow-hidden">
          {hoveredDay !== null ? (
            <div className="absolute right-0 top-0 z-20 rounded-2xl border border-white/10 bg-[#08111d]/95 px-3 py-2 text-xs text-slate-200 shadow-2xl backdrop-blur-xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{chartData[hoveredDay].label}</div>
              <div className="mt-1">Hyrje: {chartData[hoveredDay].entries}</div>
              <div>Dalje: {chartData[hoveredDay].exits}</div>
              <div className="font-semibold text-white">Totali: {chartData[hoveredDay].total}</div>
            </div>
          ) : null}

          <div className="flex h-[220px] items-end gap-4 overflow-hidden rounded-[20px] border border-white/5 bg-[linear-gradient(180deg,rgba(8,16,28,0.7),rgba(5,9,20,0.96))] px-6 pb-6 pt-6">
            {chartData.map((bucket, index) => {
              const isPeak = bucket.total > 0 && bucket.total === (peakHour.entries + peakHour.exits)
              return (
                <button
                  key={bucket.key}
                  type="button"
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end bg-transparent"
                  onMouseEnter={() => setHoveredDay(index)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onFocus={() => setHoveredDay(index)}
                  onBlur={() => setHoveredDay(null)}
                  aria-label={`Statistikat e dites ${bucket.label}`}
                >
                  <div className="mb-2 flex h-[160px] items-end overflow-hidden">
                    <div
                      className={cx(
                        'w-full min-w-[30px] rounded-t-[14px] transition-all duration-300',
                        bucket.total === 0
                          ? 'bg-white/[0.06] group-hover:bg-white/[0.12]'
                          : isPeak
                            ? 'bg-gradient-to-t from-cyan-400 via-sky-400 to-emerald-300 shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                            : 'bg-gradient-to-t from-cyan-500/85 to-blue-300/95 group-hover:from-cyan-400 group-hover:to-sky-300'
                      )}
                      style={{ height: `${bucket.height}px` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {bucket.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
