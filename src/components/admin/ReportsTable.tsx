'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Clock, Eye, MapPin, Image as ImageIcon, ChevronDown, X } from 'lucide-react'
import { updateReportStatus } from '@/actions/reports'
import { cx } from '@/lib/cx'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'hapur' | 'në_shqyrtim' | 'zgjidhur' | 'refuzuar'

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
  initialReports: Report[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string; dot: string }> = {
  hapur:         { label: 'Hapur',       className: 'border-rose-500/20 bg-rose-500/10 text-rose-400',     dot: 'bg-rose-400' },
  në_shqyrtim:   { label: 'Në shqyrtim', className: 'border-amber-500/20 bg-amber-500/10 text-amber-400',  dot: 'bg-amber-400 animate-pulse' },
  zgjidhur:      { label: 'Zgjidhur',    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  refuzuar:      { label: 'Refuzuar',    className: 'border-slate-500/20 bg-slate-500/10 text-slate-400',  dot: 'bg-slate-400' },
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  ndricim:   { label: 'Ndriçim',     emoji: '💡' },
  kanalizim: { label: 'Kanalizim',   emoji: '🚧' },
  rruge:     { label: 'Rrugë',       emoji: '🛣️' },
  mbeturina: { label: 'Mbeturina',   emoji: '🗑️' },
  akses:     { label: 'Akses',       emoji: '🚗' },
  tjeter:    { label: 'Tjetër',      emoji: '📋' },
}

const FILTERS: { value: 'all' | ReportStatus; label: string }[] = [
  { value: 'all',        label: 'Të gjitha' },
  { value: 'hapur',      label: 'Hapur' },
  { value: 'në_shqyrtim', label: 'Në shqyrtim' },
  { value: 'zgjidhur',   label: 'Zgjidhur' },
  { value: 'refuzuar',   label: 'Refuzuar' },
]

const NEXT_STATUSES: Partial<Record<ReportStatus, { value: ReportStatus; label: string; className: string }[]>> = {
  hapur:       [{ value: 'në_shqyrtim', label: 'Merr në shqyrtim', className: 'text-amber-400 hover:bg-amber-500/10' }, { value: 'refuzuar', label: 'Refuzo', className: 'text-slate-400 hover:bg-white/5' }],
  në_shqyrtim: [{ value: 'zgjidhur', label: 'Shëno si zgjidhur', className: 'text-emerald-400 hover:bg-emerald-500/10' }, { value: 'refuzuar', label: 'Refuzo', className: 'text-slate-400 hover:bg-white/5' }],
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd  = String(d.getUTCDate()).padStart(2, '0')
  const mm  = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh  = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsTable({ initialReports }: Props) {
  const [reports, setReports] = useState(initialReports)
  const [filter, setFilter] = useState<'all' | ReportStatus>('all')
  const [detailReport, setDetailReport] = useState<Report | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(reportId: string, newStatus: ReportStatus) {
    setOpenMenuId(null)
    startTransition(async () => {
      // Optimistic update
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: newStatus } : r))
      try {
        await updateReportStatus(reportId, newStatus)
      } catch {
        // Revert on failure
        setReports(initialReports)
      }
    })
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter)

  const counts = {
    hapur: reports.filter((r) => r.status === 'hapur').length,
    në_shqyrtim: reports.filter((r) => r.status === 'në_shqyrtim').length,
  }

  return (
    <>
      {/* Detail modal */}
      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetailReport(null)} aria-hidden />
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_LABELS[detailReport.category]?.emoji ?? '📋'}</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{CATEGORY_LABELS[detailReport.category]?.label ?? detailReport.category}</h3>
                  <p className="text-xs text-slate-500">{formatDate(detailReport.created_at)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDetailReport(null)} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95">
                <X size={17} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Përshkrimi</p>
                <p className="text-sm text-slate-300 leading-relaxed">{detailReport.description}</p>
              </div>
              {detailReport.reporter_name && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Raportuar nga</p>
                  <p className="text-sm text-slate-300">{detailReport.reporter_name}</p>
                </div>
              )}
              {(detailReport.latitude && detailReport.longitude) && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <MapPin size={14} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-mono text-slate-400">{detailReport.latitude.toFixed(5)}, {detailReport.longitude.toFixed(5)}</span>
                </div>
              )}
              {detailReport.photo_url && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Foto</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detailReport.photo_url} alt="Foto e raportit" className="w-full rounded-2xl object-cover max-h-64 border border-white/5" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <StatusBadge status={detailReport.status} />
              </div>
              {NEXT_STATUSES[detailReport.status] && (
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  {NEXT_STATUSES[detailReport.status]!.map((ns) => (
                    <button key={ns.value} type="button" disabled={isPending} onClick={() => { handleStatusChange(detailReport.id, ns.value); setDetailReport((r) => r ? { ...r, status: ns.value } : null) }} className={cx('flex-1 py-2.5 rounded-xl text-xs font-bold border border-white/5 transition-all active:scale-95 disabled:opacity-40', ns.className)}>
                      {ns.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Summary pills */}
        {(counts.hapur > 0 || counts.në_shqyrtim > 0) && (
          <div className="flex gap-3 flex-wrap">
            {counts.hapur > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle size={13} className="text-rose-400" />
                <span className="text-xs font-bold text-rose-400">{counts.hapur} raporte të hapura</span>
              </div>
            )}
            {counts.në_shqyrtim > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Clock size={13} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{counts.në_shqyrtim} në shqyrtim</span>
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 p-1.5 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto self-start">
          {FILTERS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={cx('px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap active:scale-95', filter === value ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300')}>
              {label}
            </button>
          ))}
        </div>

        {/* Reports grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 backdrop-blur-md bg-white/[0.02] border border-white/5 rounded-3xl">
            <CheckCircle2 size={36} className="text-slate-700" />
            <p className="text-sm text-slate-500 font-semibold">Nuk ka raporte për këtë filtër.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((report) => {
              const cat = CATEGORY_LABELS[report.category] ?? { label: report.category, emoji: '📋' }
              const cfg = STATUS_CONFIG[report.status]
              const nextActions = NEXT_STATUSES[report.status]

              return (
                <div key={report.id} className="group backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200 flex flex-col">
                  {/* Photo */}
                  {report.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={report.photo_url} alt="" className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-white/[0.02] flex items-center justify-center">
                      <ImageIcon size={24} className="text-slate-700" />
                    </div>
                  )}

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{cat.label}</p>
                          <p className="text-[10px] text-slate-500">{formatDate(report.created_at)}</p>
                        </div>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed flex-1">{report.description}</p>

                    {/* Meta icons */}
                    <div className="flex items-center gap-3 text-[10px] text-slate-600">
                      {report.photo_url && <span className="flex items-center gap-1"><ImageIcon size={10} />Foto</span>}
                      {report.latitude && <span className="flex items-center gap-1"><MapPin size={10} />GPS</span>}
                      {report.reporter_name && <span className="truncate max-w-[100px]">{report.reporter_name}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button type="button" onClick={() => setDetailReport(report)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all active:scale-95">
                        <Eye size={11} />
                        Detaje
                      </button>

                      {nextActions && (
                        <div className="relative flex-1">
                          <button type="button" onClick={() => setOpenMenuId(openMenuId === report.id ? null : report.id)} disabled={isPending} className="w-full flex items-center justify-between gap-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all active:scale-95 disabled:opacity-40">
                            Ndrysho
                            <ChevronDown size={11} className={cx('transition-transform', openMenuId === report.id ? 'rotate-180' : '')} />
                          </button>
                          {openMenuId === report.id && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl backdrop-blur-xl bg-[#050914]/98 border border-white/10 shadow-2xl overflow-hidden z-10">
                              {nextActions.map((ns) => (
                                <button key={ns.value} type="button" onClick={() => handleStatusChange(report.id, ns.value)} className={cx('w-full text-left px-3 py-2.5 text-xs font-semibold transition-all', ns.className)}>
                                  {ns.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-slate-600 text-center">
          Duke shfaqur <span className="text-slate-400 font-semibold">{filtered.length}</span> nga <span className="text-slate-400 font-semibold">{reports.length}</span> raporte
        </p>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.refuzuar
  return (
    <div className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0', cfg.className)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </div>
  )
}
