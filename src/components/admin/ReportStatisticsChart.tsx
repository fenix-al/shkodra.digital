'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react'

type TrendPoint = {
  key: string
  label: string
  count: number
}

type ChartStatChange = {
  value: string
  positive: boolean
}

type ChartStatTone = 'blue' | 'emerald' | 'amber'

type ReportStatisticsChartProps = {
  weeklyTrend: TrendPoint[]
  weeklyOpenTrend: TrendPoint[]
  weeklyResolvedTrend: TrendPoint[]
  totalReports: number
  averagePerDay: number
  totalOpen: number
  totalResolved: number
  weeklyPeak: number
}

function formatValue(value: number | string) {
  if (typeof value === 'number' && value % 1 !== 0) {
    return value.toFixed(1)
  }
  return String(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('sq-AL', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function buildSeriesPath(points: Array<[number, number]>) {
  if (points.length === 0) return ''
  let path = `M ${points[0][0]},${points[0][1]} `

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const midX = (previous[0] + current[0]) / 2
    path += `C ${midX},${previous[1]} ${midX},${current[1]} ${current[0]},${current[1]} `
  }

  return path
}

function buildAreaPath(path: string, width: number, height: number) {
  return `${path} L ${width},${height} L 0,${height} Z`
}

function ChartStat({
  icon,
  label,
  value,
  change,
  tone = 'blue',
}: {
  icon: ReactNode
  label: string
  value: number | string
  change?: ChartStatChange
  tone?: ChartStatTone
}) {
  const tones = {
    blue: {
      badge: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
      delta: 'text-emerald-400 bg-emerald-500/10',
    },
    emerald: {
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      delta: 'text-emerald-400 bg-emerald-500/10',
    },
    amber: {
      badge: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
      delta: 'text-amber-300 bg-amber-500/10',
    },
  }

  return (
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${tones[tone].badge}`}>
        {icon}
      </div>
      <div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="flex items-end gap-3">
          <span className="text-3xl font-black tracking-tighter text-white">{formatValue(value)}</span>
          {change ? (
            <span className={`mb-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tones[tone].delta}`}>
              {change.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {change.value}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function ReportStatisticsChart({
  weeklyTrend,
  weeklyOpenTrend,
  weeklyResolvedTrend,
  totalReports,
  averagePerDay,
  totalOpen,
  totalResolved,
  weeklyPeak,
}: ReportStatisticsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgWidth = 1000
  const svgHeight = 300
  const chartMax = Math.max(10, weeklyPeak, ...weeklyOpenTrend.map((item) => item.count), ...weeklyResolvedTrend.map((item) => item.count))
  const yAxisLabels = useMemo(() => {
    const top = chartMax
    const middle = Math.max(1, Math.round(chartMax / 2))
    return [top, middle, 0]
  }, [chartMax])

  const getX = (index: number) => (index / Math.max(1, weeklyTrend.length - 1)) * svgWidth
  const getY = (value: number) => svgHeight - (value / chartMax) * svgHeight

  const totalPoints: Array<[number, number]> = weeklyTrend.map((item, index) => [getX(index), getY(item.count)])
  const openPoints: Array<[number, number]> = weeklyOpenTrend.map((item, index) => [getX(index), getY(item.count)])
  const resolvedPoints: Array<[number, number]> = weeklyResolvedTrend.map((item, index) => [getX(index), getY(item.count)])

  const totalPath = buildSeriesPath(totalPoints)
  const openPath = buildSeriesPath(openPoints)
  const resolvedPath = buildSeriesPath(resolvedPoints)

  const totalAreaPath = buildAreaPath(totalPath, svgWidth, svgHeight)
  const openAreaPath = buildAreaPath(openPath, svgWidth, svgHeight)
  const resolvedAreaPath = buildAreaPath(resolvedPath, svgWidth, svgHeight)

  const xLabels = weeklyTrend.map((item, index) => ({
    label: item.label,
    value: item.count,
    position: (index / Math.max(1, weeklyTrend.length - 1)) * 100,
  }))
  const hoveredPoint =
    hoveredIndex === null
      ? null
      : {
          label: weeklyTrend[hoveredIndex]?.label ?? '',
          position: xLabels[hoveredIndex]?.position ?? 0,
          total: weeklyTrend[hoveredIndex]?.count ?? 0,
          open: weeklyOpenTrend[hoveredIndex]?.count ?? 0,
          resolved: weeklyResolvedTrend[hoveredIndex]?.count ?? 0,
          totalY: totalPoints[hoveredIndex]?.[1] ?? svgHeight,
        }

  return (
    <div className="relative w-full overflow-hidden rounded-[32px] border border-white/5 bg-[#050914]/80 p-6 shadow-2xl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes drawLine {
              from { stroke-dashoffset: 3000; }
              to { stroke-dashoffset: 0; }
            }
            .report-chart-draw {
              stroke-dasharray: 3000;
              animation: drawLine 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
          `,
        }}
      />

      <div className="pointer-events-none absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-cyan-500/5 blur-[120px]" />

      <div className="mb-10 flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Statistikat e Raporteve</h2>

          <div className="flex flex-wrap gap-6">
            <ChartStat
              icon={<Activity size={20} />}
              label="Raporte Totale"
              value={totalReports}
              change={{ value: `${formatCompact(weeklyPeak)} kulmi`, positive: true }}
              tone="blue"
            />

            <div className="mx-1 hidden h-12 w-px bg-white/5 lg:block" />

            <ChartStat
              icon={<Clock3 size={20} />}
              label="Te Hapura"
              value={totalOpen}
              change={{ value: `${formatValue(averagePerDay)} mes`, positive: true }}
              tone="emerald"
            />

            <div className="mx-1 hidden h-12 w-px bg-white/5 lg:block" />

            <ChartStat
              icon={<CheckCircle2 size={20} />}
              label="Te Zgjidhura"
              value={totalResolved}
              change={{ value: `${formatCompact(totalResolved)} ne jave`, positive: false }}
              tone="amber"
            />
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs text-slate-400">
          Kulmi: {weeklyPeak} raporte
        </div>
      </div>

      <div className="relative h-[320px] w-full">
        <div className="absolute bottom-10 left-0 top-0 z-10 flex w-12 flex-col justify-between font-mono text-[10px] font-bold text-slate-500">
          {yAxisLabels.map((label, index) => (
            <span key={`${label}-${index}`} className={index === 0 ? '-mt-1.5' : index === yAxisLabels.length - 1 ? 'mb-0' : ''}>
              {formatCompact(label)}
            </span>
          ))}
        </div>

        <div className="absolute bottom-10 left-14 right-4 top-0 border-b border-l border-white/[0.05]">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <div className="h-px w-full border-t border-dashed border-white/[0.05]" />
            <div className="h-px w-full border-t border-dashed border-white/[0.05]" />
            <div className="h-px w-full border-t border-dashed border-white/[0.05]" />
          </div>

          {hoveredPoint ? (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#07101d]/95 px-3 py-2 shadow-2xl backdrop-blur-xl"
              style={{
                left: `${hoveredPoint.position}%`,
                top: `max(8px, calc(${(hoveredPoint.totalY / svgHeight) * 100}% - 88px))`,
              }}
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{hoveredPoint.label}</div>
              <div className="space-y-1 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span>Raporte: {hoveredPoint.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Te hapura: {hoveredPoint.open}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Te zgjidhura: {hoveredPoint.resolved}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="absolute inset-0 z-10 flex">
            {xLabels.map((item, index) => (
              <button
                key={`${item.label}-${index}-hover`}
                type="button"
                aria-label={`Shiko statistikat per ${item.label}`}
                className="h-full flex-1 bg-transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
              />
            ))}
          </div>

          <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="reports-blue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="reports-green-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="reports-amber-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d={resolvedAreaPath} fill="url(#reports-amber-fill)" className="animate-in fade-in duration-700" />
            <path d={openAreaPath} fill="url(#reports-green-fill)" className="animate-in fade-in duration-700 delay-150" />
            <path d={totalAreaPath} fill="url(#reports-blue-fill)" className="animate-in fade-in duration-700 delay-300" />

            <path d={resolvedPath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" className="report-chart-draw" />
            <path d={openPath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" className="report-chart-draw" />
            <path d={totalPath} fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" className="report-chart-draw" />
          </svg>

          {[
            { color: 'bg-blue-400 shadow-[0_0_15px_#38bdf8]', value: weeklyTrend[weeklyTrend.length - 1]?.count ?? 0 },
            { color: 'bg-emerald-400 shadow-[0_0_15px_#10b981]', value: weeklyOpenTrend[weeklyOpenTrend.length - 1]?.count ?? 0 },
            { color: 'bg-amber-400 shadow-[0_0_15px_#f59e0b]', value: weeklyResolvedTrend[weeklyResolvedTrend.length - 1]?.count ?? 0 },
          ].map((dot, index) => (
            <div
              key={dot.color}
              className={`absolute h-3.5 w-3.5 rounded-full border-2 border-[#050914] ${dot.color} animate-in zoom-in duration-500`}
              style={{
                right: '-7px',
                top: `calc(${(1 - dot.value / chartMax) * 100}% - 7px)`,
                animationDelay: `${900 + index * 120}ms`,
              }}
            />
          ))}
        </div>

        <div className="absolute bottom-0 left-14 right-4 flex h-8 items-end">
          {xLabels.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="absolute -translate-x-1/2 text-[10px] font-bold text-slate-500"
              style={{ left: `${item.position}%` }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
