'use client'

import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { useMemo, useState } from 'react'
import { Crosshair, ExternalLink, Layers3, MapPin, Navigation, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import type { GeoReport } from './ReportsGeoMapCanvas'

type ReportStatus = 'hapur' | 'në_shqyrtim' | 'zgjidhur' | 'refuzuar'
type StatusFilter = 'all' | ReportStatus
type CategoryFilter = 'all' | 'ndricim' | 'kanalizim' | 'rruge' | 'mbeturina' | 'akses' | 'tjeter'
type MediaFilter = 'all' | 'with_photo' | 'without_photo'

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

const LeafletMap = dynamic(() => import('./ReportsGeoMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] w-full items-center justify-center rounded-[28px] border border-white/10 bg-[#06101c] text-sm text-slate-400">
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

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
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
  const [selectedId, setSelectedId] = useState<string | null>(geolocatedReports[0]?.id ?? null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  const filteredReports = useMemo(() => {
    return geolocatedReports.filter((report) => {
      if (statusFilter !== 'all' && report.status !== statusFilter) return false
      if (categoryFilter !== 'all' && report.category !== categoryFilter) return false
      if (mediaFilter === 'with_photo' && !report.photo_url) return false
      if (mediaFilter === 'without_photo' && report.photo_url) return false
      return true
    })
  }, [categoryFilter, geolocatedReports, mediaFilter, statusFilter])

  const externalReport = useMemo(
    () => geolocatedReports.find((report) => report.id === externalSelectedId) ?? null,
    [externalSelectedId, geolocatedReports],
  )

  const visibleReports = useMemo(() => {
    if (!externalReport || filteredReports.some((report) => report.id === externalReport.id)) {
      return filteredReports
    }

    return [externalReport, ...filteredReports]
  }, [externalReport, filteredReports])

  const effectiveSelectedId = useMemo(() => {
    if (externalSelectedId && visibleReports.some((report) => report.id === externalSelectedId)) {
      return externalSelectedId
    }
    if (selectedId && visibleReports.some((report) => report.id === selectedId)) {
      return selectedId
    }
    return visibleReports[0]?.id ?? null
  }, [externalSelectedId, selectedId, visibleReports])

  const selectedReport = useMemo(
    () => visibleReports.find((report) => report.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, visibleReports],
  )

  const focusToken = externalSelection
    ? `external:${externalSelection.id}:${externalSelection.nonce}`
    : `manual:${focusNonce}`

  if (geolocatedReports.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <MapPin size={18} className="text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Harta e Raporteve</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-100">Nuk ka ende raporte me koordinata</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Sapo qytetaret te dergojne raporte me vendndodhje, ketu do te shfaqet harta interaktive me zoom, tiles reale dhe clustering.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
      {fullscreenPhoto && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setFullscreenPhoto(null)}
                className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/15"
              >
                <X size={16} />
                Mbyll
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullscreenPhoto}
                alt="Foto e raportit ne madhesi te plote"
                className="max-h-[92vh] max-w-[92vw] rounded-3xl border border-white/10 object-contain shadow-2xl"
              />
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
          <span>Tiles: <span className="font-semibold text-slate-300">OpenStreetMap</span></span>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Filtrat e Hartes</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-200">Perditesojne pikat live pa prekur tabelen</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:w-[960px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value as MediaFilter)}
              className="rounded-2xl border border-white/10 bg-[#050914] px-4 py-3 text-sm text-slate-200 focus:outline-none"
            >
              {MEDIA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setStatusFilter('all')
                setCategoryFilter('all')
                setMediaFilter('all')
              }}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
            >
              Pastro filtrat
            </button>
          </div>
        </div>
      </div>

      {visibleReports.length === 0 ? (
        <div className="mt-5 rounded-[28px] border border-white/10 bg-[#06101c] p-10 text-center text-slate-400">
          Nuk ka raporte me koordinata per filtrat aktuale.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#06101c]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Harte e Plote Interaktive</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-200">Cluster, zoom, pan dhe fokus te pika e zgjedhur</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-400">
                <Layers3 size={13} />
                Cluster aktiv
              </div>
            </div>
            <LeafletMap
              reports={visibleReports}
              selectedId={effectiveSelectedId}
              focusNonce={focusToken}
              onSelect={setSelectedId}
            />
          </div>

          {selectedReport && (
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Raporti i Zgjedhur</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-100">
                      {CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category}
                    </h3>
                  </div>
                  <div className={cx('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', getPriority(selectedReport).borderClass)}>
                    {getPriority(selectedReport).label}
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-300">{selectedReport.description}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-slate-500">Statusi</p>
                    <p className="mt-1 font-semibold text-slate-200">{STATUS_LABELS[selectedReport.status]}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-slate-500">Data</p>
                    <p className="mt-1 font-semibold text-slate-200">{formatDate(selectedReport.created_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-slate-500">Raportuar nga</p>
                    <p className="mt-1 font-semibold text-slate-200">{selectedReport.reporter_name ?? 'Anonim'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-slate-500">Media</p>
                    <p className="mt-1 font-semibold text-slate-200">{selectedReport.photo_url ? 'Ka foto' : 'Pa foto'}</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-slate-500">Koordinatat</p>
                    <p className="mt-1 font-mono font-semibold text-slate-200">
                      {selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}
                    </p>
                  </div>
                </div>

                {selectedReport.photo_url && (
                  <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">Foto</p>
                      <button
                        type="button"
                        onClick={() => setFullscreenPhoto(selectedReport.photo_url)}
                        className="text-xs font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
                      >
                        Hape full-screen
                      </button>
                    </div>
                    <button type="button" onClick={() => setFullscreenPhoto(selectedReport.photo_url)} className="mt-2 block w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedReport.photo_url}
                        alt="Foto e raportit"
                        className="h-48 w-full rounded-2xl border border-white/5 object-cover transition-all hover:scale-[1.01]"
                      />
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(selectedReport.id)
                      setFocusNonce((current) => current + 1)
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-400/15"
                  >
                    <Crosshair size={13} />
                    Fokuso ne harte
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-300 transition-all hover:bg-blue-500/15"
                  >
                    <ExternalLink size={13} />
                    Hape ne Google Maps
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedReport.latitude}&mlon=${selectedReport.longitude}#map=18/${selectedReport.latitude}/${selectedReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.05]"
                  >
                    <MapPin size={13} />
                    Hape ne OpenStreetMap
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Legjenda</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="inline-flex items-center gap-2 text-slate-300">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    Urgjent
                  </div>
                  <div className="inline-flex items-center gap-2 text-slate-300">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    Mesatar
                  </div>
                  <div className="inline-flex items-center gap-2 text-slate-300">
                    <span className="h-3 w-3 rounded-full bg-sky-400" />
                    Normal
                  </div>
                  <div className="inline-flex items-center gap-2 text-slate-300">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    Mbyllur
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
