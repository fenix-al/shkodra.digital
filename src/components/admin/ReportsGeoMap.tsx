'use client'

import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  ExternalLink,
  Layers3,
  MapPin,
  Navigation,
  Pause,
  Play,
  TimerReset,
  X,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import type { GeoReport } from './ReportsGeoMapCanvas'

type ReportStatus = 'hapur' | 'në_shqyrtim' | 'zgjidhur' | 'refuzuar'
type StatusFilter = 'all' | ReportStatus
type CategoryFilter = 'all' | 'ndricim' | 'kanalizim' | 'rruge' | 'mbeturina' | 'akses' | 'tjeter'
type MediaFilter = 'all' | 'with_photo' | 'without_photo'
type MapMode = 'cluster' | 'hybrid' | 'heatmap'
type DateFilter = 'all' | '24h' | '7d' | '30d' | '90d'
type PlaybackMode = 'off' | 'day' | 'week'

interface Report {
  id: string
  category: string
  description: string
  status: ReportStatus
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  reporter_name: string | null
}

interface Props {
  reports: Report[]
  externalSelection?: { id: string; nonce: number } | null
}

interface PlaybackFrame {
  key: string
  label: string
  cutoff: number
}

const MAP_CANVAS_CLASS = 'h-full min-h-[860px] w-full rounded-[28px]'

const LeafletMap = dynamic(() => import('./ReportsGeoMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className={`flex items-center justify-center border border-white/10 bg-[#06101c] text-sm text-slate-400 ${MAP_CANVAS_CLASS}`}>
      Duke ngarkuar harten interaktive...
    </div>
  ),
})

const CATEGORY_LABELS: Record<string, string> = {
  ndricim: 'Ndricim',
  kanalizim: 'Kanalizim',
  rruge: 'Rruge',
  mbeturina: 'Mbeturina',
  akses: 'Akses',
  tjeter: 'Tjeter',
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  hapur: 'Hapur',
  në_shqyrtim: 'Ne shqyrtim',
  zgjidhur: 'Zgjidhur',
  refuzuar: 'Refuzuar',
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Te gjitha statuset' },
  { value: 'hapur', label: 'Hapur' },
  { value: 'në_shqyrtim', label: 'Ne shqyrtim' },
  { value: 'zgjidhur', label: 'Zgjidhur' },
  { value: 'refuzuar', label: 'Refuzuar' },
]

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Te gjitha kategorite' },
  { value: 'ndricim', label: 'Ndricim' },
  { value: 'kanalizim', label: 'Kanalizim' },
  { value: 'rruge', label: 'Rruge' },
  { value: 'mbeturina', label: 'Mbeturina' },
  { value: 'akses', label: 'Akses' },
  { value: 'tjeter', label: 'Tjeter' },
]

const MEDIA_OPTIONS: { value: MediaFilter; label: string }[] = [
  { value: 'all', label: 'Te gjitha raportimet' },
  { value: 'with_photo', label: 'Vetem me foto' },
  { value: 'without_photo', label: 'Vetem pa foto' },
]

const MAP_MODE_OPTIONS: { value: MapMode; label: string }[] = [
  { value: 'cluster', label: 'Cluster' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'heatmap', label: 'Heatmap' },
]

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Gjithe koha' },
  { value: '24h', label: '24 oret e fundit' },
  { value: '7d', label: '7 ditet e fundit' },
  { value: '30d', label: '30 ditet e fundit' },
  { value: '90d', label: '90 ditet e fundit' },
]

const PLAYBACK_OPTIONS: { value: PlaybackMode; label: string }[] = [
  { value: 'off', label: 'Playback off' },
  { value: 'day', label: 'Playback ditor' },
  { value: 'week', label: 'Playback javor' },
]

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

function formatShortDate(timestamp: number) {
  const d = new Date(timestamp)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function getWeekBounds(timestamp: number) {
  const date = new Date(timestamp)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  date.setUTCHours(0, 0, 0, 0)
  const start = date.getTime()
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1
  return { start, end }
}

function getDayBounds(timestamp: number) {
  const date = new Date(timestamp)
  date.setUTCHours(0, 0, 0, 0)
  const start = date.getTime()
  const end = start + 24 * 60 * 60 * 1000 - 1
  return { start, end }
}

function getPlaybackFrames(reports: GeoReport[], mode: PlaybackMode) {
  if (mode === 'off' || reports.length === 0) return []

  const framesMap = new Map<string, PlaybackFrame>()

  reports.forEach((report) => {
    const createdAt = new Date(report.created_at).getTime()
    if (Number.isNaN(createdAt)) return

    if (mode === 'day') {
      const { start, end } = getDayBounds(createdAt)
      framesMap.set(String(start), { key: String(start), label: formatShortDate(start), cutoff: end })
      return
    }

    const { start, end } = getWeekBounds(createdAt)
    framesMap.set(String(start), { key: String(start), label: `Java e ${formatShortDate(start)}`, cutoff: end })
  })

  return [...framesMap.values()].sort((a, b) => Number(a.key) - Number(b.key))
}

function getPriority(report: GeoReport) {
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') {
    return { label: 'Mbyllur', borderClass: 'border-slate-500/20 bg-slate-500/10 text-slate-300' }
  }

  const ageHours = Math.max(0, (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))
  let score = 1
  if (report.category === 'akses') score += 2
  if (report.category === 'ndricim') score += 1
  if (report.photo_url) score += 1
  if (ageHours >= 72) score += 2
  else if (ageHours >= 24) score += 1
  if (report.status === 'në_shqyrtim') score += 1

  if (score >= 5) return { label: 'Urgjent', borderClass: 'border-rose-500/20 bg-rose-500/10 text-rose-300' }
  if (score >= 3) return { label: 'Mesatar', borderClass: 'border-amber-500/20 bg-amber-500/10 text-amber-300' }
  return { label: 'Normal', borderClass: 'border-sky-500/20 bg-sky-500/10 text-sky-300' }
}

function getHeatIntensity(report: GeoReport) {
  if (report.status === 'zgjidhur' || report.status === 'refuzuar') return 0.2

  let intensity = 0.35
  if (report.category === 'akses') intensity += 0.25
  if (report.category === 'ndricim') intensity += 0.15
  if (report.photo_url) intensity += 0.1
  if (report.status === 'në_shqyrtim') intensity += 0.1
  return Math.min(intensity, 1)
}

function matchesDateWindow(createdAt: string, dateFilter: DateFilter) {
  if (dateFilter === 'all') return true
  const createdAtMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdAtMs)) return false
  const ageHours = (Date.now() - createdAtMs) / (1000 * 60 * 60)
  if (dateFilter === '24h') return ageHours <= 24
  if (dateFilter === '7d') return ageHours <= 24 * 7
  if (dateFilter === '30d') return ageHours <= 24 * 30
  return ageHours <= 24 * 90
}

export default function ReportsGeoMap({ reports, externalSelection = null }: Props) {
  const externalSelectedId = externalSelection?.id ?? null
  const geolocatedReports = useMemo(
    () =>
      reports
        .filter((report): report is GeoReport => report.latitude !== null && report.longitude !== null)
        .map((report) => ({ ...report, latitude: report.latitude as number, longitude: report.longitude as number })),
    [reports],
  )

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d')
  const [mapMode, setMapMode] = useState<MapMode>('hybrid')
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('off')
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(geolocatedReports[0]?.id ?? null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  const filteredReports = useMemo(
    () =>
      geolocatedReports.filter((report) => {
        if (statusFilter !== 'all' && report.status !== statusFilter) return false
        if (categoryFilter !== 'all' && report.category !== categoryFilter) return false
        if (mediaFilter === 'with_photo' && !report.photo_url) return false
        if (mediaFilter === 'without_photo' && report.photo_url) return false
        if (!matchesDateWindow(report.created_at, dateFilter)) return false
        return true
      }),
    [categoryFilter, dateFilter, geolocatedReports, mediaFilter, statusFilter],
  )

  const playbackFrames = useMemo(() => getPlaybackFrames(filteredReports, playbackMode), [filteredReports, playbackMode])
  const cappedPlaybackIndex = Math.min(playbackIndex, Math.max(playbackFrames.length - 1, 0))
  const activePlaybackFrame = playbackFrames[cappedPlaybackIndex] ?? null

  useEffect(() => {
    if (!isPlaying || playbackMode === 'off' || playbackFrames.length <= 1) return
    const intervalId = window.setInterval(() => {
      setPlaybackIndex((current) => {
        const maxIndex = playbackFrames.length - 1
        return current >= maxIndex ? 0 : current + 1
      })
    }, playbackMode === 'day' ? 1000 : 1400)

    return () => window.clearInterval(intervalId)
  }, [isPlaying, playbackFrames.length, playbackMode])

  const playbackReports = useMemo(() => {
    if (!activePlaybackFrame) return filteredReports
    return filteredReports.filter((report) => {
      const createdAt = new Date(report.created_at).getTime()
      return !Number.isNaN(createdAt) && createdAt <= activePlaybackFrame.cutoff
    })
  }, [activePlaybackFrame, filteredReports])

  const playbackAddedThisFrame = useMemo(() => {
    if (!activePlaybackFrame) return filteredReports.length

    const previousCutoff = cappedPlaybackIndex > 0 ? playbackFrames[cappedPlaybackIndex - 1]?.cutoff ?? null : null
    return filteredReports.filter((report) => {
      const createdAt = new Date(report.created_at).getTime()
      if (Number.isNaN(createdAt) || createdAt > activePlaybackFrame.cutoff) return false
      if (previousCutoff === null) return true
      return createdAt > previousCutoff
    }).length
  }, [activePlaybackFrame, cappedPlaybackIndex, filteredReports, playbackFrames])

  const playbackFrameSummary = useMemo(() => {
    if (playbackMode === 'off' || playbackFrames.length === 0) return []

    return playbackFrames.map((frame, index) => {
      const previousCutoff = index > 0 ? playbackFrames[index - 1]?.cutoff ?? null : null
      const total = filteredReports.filter((report) => {
        const createdAt = new Date(report.created_at).getTime()
        return !Number.isNaN(createdAt) && createdAt <= frame.cutoff
      }).length
      const added = filteredReports.filter((report) => {
        const createdAt = new Date(report.created_at).getTime()
        if (Number.isNaN(createdAt) || createdAt > frame.cutoff) return false
        if (previousCutoff === null) return true
        return createdAt > previousCutoff
      }).length

      return {
        label: frame.label,
        total,
        added,
      }
    })
  }, [filteredReports, playbackFrames, playbackMode])

  const externalReport = useMemo(
    () => geolocatedReports.find((report) => report.id === externalSelectedId) ?? null,
    [externalSelectedId, geolocatedReports],
  )

  const visibleReports = useMemo(() => {
    const baseReports = playbackMode === 'off' ? filteredReports : playbackReports
    if (!externalReport || baseReports.some((report) => report.id === externalReport.id)) return baseReports
    return [externalReport, ...baseReports]
  }, [externalReport, filteredReports, playbackMode, playbackReports])

  const effectiveSelectedId = useMemo(() => {
    if (externalSelectedId && visibleReports.some((report) => report.id === externalSelectedId)) return externalSelectedId
    if (selectedId && visibleReports.some((report) => report.id === selectedId)) return selectedId
    return visibleReports[0]?.id ?? null
  }, [externalSelectedId, selectedId, visibleReports])

  const selectedReport = useMemo(
    () => visibleReports.find((report) => report.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, visibleReports],
  )

  const heatLegend = useMemo(() => {
    const summary = { low: 0, medium: 0, high: 0, peak: 0 }
    visibleReports.forEach((report) => {
      const intensity = getHeatIntensity(report)
      if (intensity >= 0.75) summary.high += 1
      else if (intensity >= 0.45) summary.medium += 1
      else summary.low += 1
      if (intensity > summary.peak) summary.peak = intensity
    })
    return {
      ...summary,
      peakLabel:
        summary.peak >= 0.75 ? 'Vater e larte' : summary.peak >= 0.45 ? 'Ngarkese mesatare' : 'Shperndarje e ulet',
    }
  }, [visibleReports])

  const focusToken = externalSelection
    ? `external:${externalSelection.id}:${externalSelection.nonce}:${activePlaybackFrame?.key ?? 'all'}`
    : `manual:${focusNonce}:${activePlaybackFrame?.key ?? 'all'}`

  const playbackProgress = playbackFrames.length > 1 ? Math.round(((cappedPlaybackIndex + 1) / playbackFrames.length) * 100) : playbackFrames.length === 1 ? 100 : 0

  function exportPlaybackPresentation() {
    if (playbackMode === 'off' || playbackFrameSummary.length === 0) return

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1440,height=900')
    if (!popup) return

    const rowsHtml = playbackFrameSummary
      .map(
        (frame, index) => `
          <tr class="${index === cappedPlaybackIndex ? 'active' : ''}">
            <td>${escapeHtml(frame.label)}</td>
            <td>${frame.added}</td>
            <td>${frame.total}</td>
          </tr>
        `,
      )
      .join('')

    popup.document.write(`
      <!doctype html>
      <html lang="sq">
        <head>
          <meta charset="utf-8" />
          <title>Playback Prezantim | Shkodra.digital</title>
          <style>
            :root { color-scheme: dark; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              background: radial-gradient(circle at top, #132238 0%, #08111d 55%, #030712 100%);
              color: #e2e8f0;
              padding: 40px;
            }
            .shell {
              max-width: 1440px;
              margin: 0 auto;
              display: grid;
              gap: 24px;
            }
            .hero, .card {
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 28px;
              background: rgba(15, 23, 42, 0.72);
              box-shadow: 0 24px 80px rgba(0,0,0,0.35);
            }
            .hero { padding: 28px 32px; }
            .eyebrow {
              font-size: 12px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #94a3b8;
              font-weight: 700;
            }
            h1 {
              margin: 10px 0 8px;
              font-size: 42px;
              line-height: 1.05;
            }
            .subtitle {
              color: #cbd5e1;
              font-size: 16px;
              max-width: 920px;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 16px;
            }
            .stat {
              padding: 22px;
            }
            .label {
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.14em;
              font-size: 11px;
              font-weight: 700;
            }
            .value {
              margin-top: 10px;
              font-size: 42px;
              font-weight: 800;
            }
            .muted { color: #cbd5e1; font-size: 14px; }
            .grid {
              display: grid;
              grid-template-columns: 1.2fr 0.8fr;
              gap: 24px;
            }
            .card { padding: 24px; }
            .timeline {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
            }
            .timeline th, .timeline td {
              text-align: left;
              padding: 14px 12px;
              border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .timeline th {
              color: #94a3b8;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
            }
            .timeline tr.active {
              background: rgba(16, 185, 129, 0.12);
            }
            .pill {
              display: inline-flex;
              align-items: center;
              padding: 8px 12px;
              border-radius: 999px;
              border: 1px solid rgba(52,211,153,0.2);
              background: rgba(16,185,129,0.12);
              color: #6ee7b7;
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .bar {
              margin-top: 16px;
              height: 16px;
              border-radius: 999px;
              background: rgba(255,255,255,0.06);
              overflow: hidden;
            }
            .bar > div {
              height: 100%;
              width: ${playbackProgress}%;
              background: linear-gradient(90deg, #38bdf8 0%, #22c55e 50%, #fb7185 100%);
            }
            @media print {
              body { padding: 20px; background: white; color: #0f172a; }
              .hero, .card { box-shadow: none; background: white; border-color: #cbd5e1; }
              .timeline tr.active { background: #dcfce7; }
              .muted, .label, .timeline th { color: #475569; }
            }
          </style>
        </head>
        <body>
          <div class="shell">
            <section class="hero">
              <div class="eyebrow">Shkodra.digital</div>
              <h1>Playback i Raportimeve Qytetare</h1>
              <p class="subtitle">
                Prezantim vizual për studio dhe ekran të madh. Tregon si janë shtuar raportimet në kohë bazuar në filtrat aktivë të hartës.
              </p>
            </section>

            <section class="stats">
              <div class="card stat">
                <div class="label">Playback</div>
                <div class="value">${escapeHtml(PLAYBACK_OPTIONS.find((option) => option.value === playbackMode)?.label)}</div>
              </div>
              <div class="card stat">
                <div class="label">Frame Aktual</div>
                <div class="value">${escapeHtml(activePlaybackFrame?.label)}</div>
              </div>
              <div class="card stat">
                <div class="label">Raste te Shtuara</div>
                <div class="value">${playbackAddedThisFrame}</div>
                <div class="muted">Vetëm në këtë frame</div>
              </div>
              <div class="card stat">
                <div class="label">Raste ne Harte</div>
                <div class="value">${visibleReports.length}</div>
                <div class="muted">Nga ${filteredReports.length} raporte të filtruara</div>
              </div>
            </section>

            <section class="grid">
              <div class="card">
                <div class="eyebrow">Kontrolli Kohor</div>
                <h2 style="margin: 10px 0 8px;">Progress i playback-it</h2>
                <div class="pill">${playbackProgress}% e sekuencës</div>
                <div class="bar"><div></div></div>
                <p class="muted" style="margin-top: 16px;">
                  Filtrat aktivë: ${escapeHtml(DATE_OPTIONS.find((option) => option.value === dateFilter)?.label)} | ${escapeHtml(MAP_MODE_OPTIONS.find((option) => option.value === mapMode)?.label)} | ${escapeHtml(STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label)}
                </p>
              </div>
              <div class="card">
                <div class="eyebrow">Intensiteti</div>
                <h2 style="margin: 10px 0 8px;">Leximi i heatmap-it</h2>
                <div class="value" style="font-size: 30px;">${escapeHtml(heatLegend.peakLabel)}</div>
                <p class="muted">E ulët: ${heatLegend.low} | Mesatare: ${heatLegend.medium} | E lartë: ${heatLegend.high}</p>
              </div>
            </section>

            <section class="card">
              <div class="eyebrow">Timeline</div>
              <h2 style="margin: 10px 0 8px;">Ecuria e frame-ve</h2>
              <table class="timeline">
                <thead>
                  <tr>
                    <th>Frame</th>
                    <th>Raste të shtuara</th>
                    <th>Raste kumulative</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </section>
          </div>
        </body>
      </html>
    `)

    popup.document.close()
  }

  if (geolocatedReports.length === 0) {
    return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">Nuk ka ende raporte me koordinata.</div>
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
      {fullscreenPhoto && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
              <button type="button" onClick={() => setFullscreenPhoto(null)} className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/15">
                <X size={16} />
                Mbyll
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fullscreenPhoto} alt="Foto e raportit ne madhesi te plote" className="max-h-[92vh] max-w-[92vw] rounded-3xl border border-white/10 object-contain shadow-2xl" />
            </div>,
            document.body,
          )
        : null}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
            <Navigation size={18} className="text-emerald-300" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Harta Operative</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-100">Raportet me koordinata</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Me koordinata: <span className="font-semibold text-slate-300">{geolocatedReports.length}</span></span>
          <span>Ne harte: <span className="font-semibold text-slate-300">{filteredReports.length}</span></span>
          <span>Periudha: <span className="font-semibold text-slate-300">{DATE_OPTIONS.find((option) => option.value === dateFilter)?.label}</span></span>
          <span>Pamja: <span className="font-semibold text-slate-300">{MAP_MODE_OPTIONS.find((option) => option.value === mapMode)?.label}</span></span>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-white/10 bg-black/20 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6 xl:w-full">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none">
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)} className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none">
            {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
          </select>
          <select value={mediaFilter} onChange={(e) => setMediaFilter(e.target.value as MediaFilter)} className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none">
            {MEDIA_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#050914] px-4 py-3">
            <CalendarRange size={16} className="text-slate-500" />
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="w-full bg-transparent text-sm text-slate-200 focus:outline-none">
              {DATE_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
            </select>
          </label>
          <select value={mapMode} onChange={(e) => setMapMode(e.target.value as MapMode)} className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none">
            {MAP_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
          </select>
          <button type="button" onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setMediaFilter('all'); setDateFilter('30d'); setMapMode('hybrid'); setPlaybackMode('off'); setPlaybackIndex(0); setIsPlaying(false) }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5">Pastro filtrat</button>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-white/10 bg-black/20 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[220px_1fr]">
          <select value={playbackMode} onChange={(e) => { const nextMode = e.target.value as PlaybackMode; setPlaybackMode(nextMode); setPlaybackIndex(0); setIsPlaying(false) }} className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none">
            {PLAYBACK_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
          </select>

          <div className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3">
            {playbackMode === 'off' ? (
              <p className="text-sm text-slate-400">Playback eshte i fikur. Aktivizoje per te pare raportet sipas dites ose javes.</p>
            ) : playbackFrames.length === 0 ? (
              <p className="text-sm text-slate-400">Nuk ka mjaftueshem te dhena per playback me filtrat aktuale.</p>
            ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Kuadri aktual: {activePlaybackFrame?.label}</p>
                      <p className="mt-1 text-sm text-slate-300">{visibleReports.length} raporte te shfaqura nga {filteredReports.length} ne total</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setIsPlaying(false); setPlaybackIndex((current) => Math.max(0, current - 1)) }} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.06]"><ChevronLeft size={14} />Mbrapa</button>
                    <button type="button" onClick={() => setIsPlaying((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-400/15">{isPlaying ? <Pause size={14} /> : <Play size={14} />}{isPlaying ? 'Ndalo' : 'Luaj'}</button>
                    <button type="button" onClick={() => { setIsPlaying(false); setPlaybackIndex((current) => Math.min(playbackFrames.length - 1, current + 1)) }} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.06]">Para<ChevronRight size={14} /></button>
                    <button type="button" onClick={() => { setIsPlaying(false); setPlaybackIndex(0) }} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.06]"><TimerReset size={14} />Reset</button>
                    <button type="button" onClick={exportPlaybackPresentation} className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300 transition-all hover:bg-blue-500/15">Eksporto playback</button>
                  </div>
                </div>
                <input type="range" min={0} max={Math.max(playbackFrames.length - 1, 0)} value={cappedPlaybackIndex} onChange={(e) => { setIsPlaying(false); setPlaybackIndex(Number(e.target.value)) }} className="w-full accent-emerald-400" />
                <div className="flex items-center justify-between text-[11px] text-slate-500"><span>Fillimi</span><span>{playbackProgress}%</span><span>Gjendja aktuale</span></div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-300/80">Shtuar ne frame</p>
                    <p className="mt-1 text-2xl font-black text-emerald-200">{playbackAddedThisFrame}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Kumulative</p>
                    <p className="mt-1 text-2xl font-black text-slate-100">{visibleReports.length}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-amber-300/80">Frames</p>
                    <p className="mt-1 text-2xl font-black text-amber-200">{playbackFrames.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {visibleReports.length === 0 ? (
        <div className="mt-5 rounded-[28px] border border-white/10 bg-[#06101c] p-10 text-center text-slate-400">Nuk ka raporte me koordinata per filtrat aktuale.</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="flex h-full min-h-[860px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#06101c]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Harte e Plote Interaktive</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-200">Cluster, heatmap, zoom, pan dhe fokus te pika e zgjedhur</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-400"><Layers3 size={13} />{MAP_MODE_OPTIONS.find((option) => option.value === mapMode)?.label} aktiv</div>
            </div>
            <div className="flex-1">
              <LeafletMap reports={visibleReports} selectedId={effectiveSelectedId} focusNonce={focusToken} mapMode={mapMode} className={MAP_CANVAS_CLASS} onSelect={setSelectedId} />
            </div>
          </div>

          {selectedReport && (
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Raporti i Zgjedhur</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-100">{CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category}</h3>
                  </div>
                  <div className={cx('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', getPriority(selectedReport).borderClass)}>{getPriority(selectedReport).label}</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{selectedReport.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-slate-500">Statusi</p><p className="mt-1 font-semibold text-slate-200">{STATUS_LABELS[selectedReport.status]}</p></div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-slate-500">Data</p><p className="mt-1 font-semibold text-slate-200">{formatDate(selectedReport.created_at)}</p></div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-slate-500">Raportuar nga</p><p className="mt-1 font-semibold text-slate-200">{selectedReport.reporter_name ?? 'Anonim'}</p></div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-slate-500">Media</p><p className="mt-1 font-semibold text-slate-200">{selectedReport.photo_url ? 'Ka foto' : 'Pa foto'}</p></div>
                  <div className="col-span-2 rounded-2xl border border-white/5 bg-black/20 p-3"><p className="text-slate-500">Koordinatat</p><p className="mt-1 font-mono font-semibold text-slate-200">{selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}</p></div>
                </div>
                {selectedReport.photo_url && (
                  <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Foto</p><button type="button" onClick={() => setFullscreenPhoto(selectedReport.photo_url)} className="text-xs font-semibold text-emerald-300 transition-colors hover:text-emerald-200">Hape full-screen</button></div>
                    <button type="button" onClick={() => setFullscreenPhoto(selectedReport.photo_url)} className="mt-2 block w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedReport.photo_url} alt="Foto e raportit" className="h-48 w-full rounded-2xl border border-white/5 object-cover transition-all hover:scale-[1.01]" />
                    </button>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setSelectedId(selectedReport.id); setFocusNonce((current) => current + 1) }} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-400/15"><Crosshair size={13} />Fokuso ne harte</button>
                  <a href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-300 transition-all hover:bg-blue-500/15"><ExternalLink size={13} />Hape ne Google Maps</a>
                  <a href={`https://www.openstreetmap.org/?mlat=${selectedReport.latitude}&mlon=${selectedReport.longitude}#map=18/${selectedReport.latitude}/${selectedReport.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.05]"><MapPin size={13} />Hape ne OpenStreetMap</a>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Legjenda dinamike</p>
                <div className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="h-3 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 to-rose-400" />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400"><span>E ulet</span><span>Mesatare</span><span>E larte</span></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-200"><p className="text-[10px] uppercase tracking-widest text-sky-300/80">E ulet</p><p className="mt-1 text-lg font-black">{heatLegend.low}</p></div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-200"><p className="text-[10px] uppercase tracking-widest text-amber-300/80">Mesatare</p><p className="mt-1 text-lg font-black">{heatLegend.medium}</p></div>
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-200"><p className="text-[10px] uppercase tracking-widest text-rose-300/80">E larte</p><p className="mt-1 text-lg font-black">{heatLegend.high}</p></div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs text-slate-300"><span className="text-slate-500">Leximi aktual:</span> {heatLegend.peakLabel}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
