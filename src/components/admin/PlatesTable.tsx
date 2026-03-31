'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { Search, CheckCircle2, XCircle, Car, Clock, RotateCcw, PlusCircle, Upload, Printer } from 'lucide-react'
import { approvePlate, rejectPlate } from '@/actions/authorizations'
import { cx } from '@/lib/cx'
import type { AuthorizedPlate, PlateStatus } from '@/types/admin'
import AddPlateModal from './AddPlateModal'
import ImportPlatesModal from './ImportPlatesModal'
import PrintQRModal from './PrintQRModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterValue = 'all' | PlateStatus

interface PlatesTableProps {
  initialPlates: AuthorizedPlate[]
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PlateStatus, { label: string; className: string; dot: string }> = {
  approved: { label: 'Miratuar', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  pending:  { label: 'Në Pritje', className: 'border-amber-500/20 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  rejected: { label: 'Refuzuar', className: 'border-rose-500/20 bg-rose-500/10 text-rose-400', dot: 'bg-rose-400' },
  suspended:{ label: 'Pezulluar', className: 'border-slate-500/20 bg-slate-500/10 text-slate-400', dot: 'bg-slate-400' },
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Të Gjitha' },
  { value: 'pending', label: 'Në Pritje' },
  { value: 'approved', label: 'Të Miratuara' },
  { value: 'rejected', label: 'Refuzuara' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}.${mm} ${hh}:${min}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlatesTable({ initialPlates }: PlatesTableProps) {
  const [filter, setFilter] = useState<FilterValue>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [printPlate, setPrintPlate] = useState<AuthorizedPlate | null>(null)

  const [optimisticPlates, updateOptimisticPlates] = useOptimistic(
    initialPlates,
    (current, { id, newStatus }: { id: string; newStatus: PlateStatus }) =>
      current.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
  )

  function handleApprove(id: string) {
    startTransition(async () => {
      updateOptimisticPlates({ id, newStatus: 'approved' })
      await approvePlate(id)
    })
  }

  function handleReject(id: string) {
    startTransition(async () => {
      updateOptimisticPlates({ id, newStatus: 'rejected' })
      await rejectPlate(id, 'Refuzuar nga operatori')
    })
  }

  function resetFilters() {
    setFilter('all')
    setSearchTerm('')
  }

  const filtered = optimisticPlates.filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter
    const term = searchTerm.toLowerCase()
    const matchesSearch = !term || p.plate_number.toLowerCase().includes(term) || p.owner_name.toLowerCase().includes(term)
    return matchesFilter && matchesSearch
  })

  const hasActiveFilters = filter !== 'all' || searchTerm !== ''

  return (
    <>
      <AddPlateModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportPlatesModal open={importOpen} onClose={() => setImportOpen(false)} />
      {printPlate && <PrintQRModal open={!!printPlate} onClose={() => setPrintPlate(null)} plateNumber={printPlate.plate_number} ownerName={printPlate.owner_name} validFrom={printPlate.valid_from} validUntil={printPlate.valid_until} />}

    <div className="bg-[#050914]/80 backdrop-blur-2xl rounded-[32px] border border-white/5 shadow-2xl overflow-hidden flex flex-col">

      {/* ── Controls ── */}
      <div className="p-5 lg:p-6 flex flex-col gap-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">

          {/* Search */}
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" aria-hidden />
            <input type="search" placeholder="Kërko targë ose emër pronari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} aria-label="Kërko autorizime" className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-slate-100 transition-all active:scale-95">
              <Upload size={14} />
              Importo CSV
            </button>
            <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-900 bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all active:scale-95">
              <PlusCircle size={14} />
              Shto Targë
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div role="group" aria-label="Filtro sipas statusit" className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto self-start">
          {FILTERS.map(({ value, label }) => (
            <FilterTab key={value} label={label} active={filter === value} onClick={() => setFilter(value)} />
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01]">
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Targa</th>
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Pronari</th>
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest hidden md:table-cell">Lloji</th>
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Data</th>
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Statusi</th>
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest hidden xl:table-cell">Hyrja e fundit</th>
              <th scope="col" className="px-6 py-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest text-right">Veprime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((plate) => (
              <tr key={plate.id} className="group hover:bg-white/[0.02] transition-colors">

                <td className="px-6 py-5">
                  <div className="inline-block px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono font-bold text-white text-lg shadow-inner tracking-wider">{plate.plate_number}</div>
                </td>

                <td className="px-6 py-5">
                  <span className="font-semibold text-sm text-slate-200">{plate.owner_name}</span>
                </td>

                <td className="px-6 py-5 hidden md:table-cell">
                  <span className="text-sm text-slate-500">{plate.vehicle_type ?? '—'}</span>
                </td>

                <td className="px-6 py-5 hidden lg:table-cell">
                  <span className="text-sm text-slate-500">{formatDate(plate.created_at)}</span>
                </td>

                <td className="px-6 py-5">
                  <StatusBadge status={plate.status} />
                </td>

                <td className="px-6 py-5 hidden xl:table-cell">
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    {plate.last_entry_at ? (
                      <>
                        <Clock size={13} className="text-emerald-500/60 shrink-0" />
                        <span>{formatTime(plate.last_entry_at)}</span>
                      </>
                    ) : (
                      <span className="text-slate-600">Asnjë hyrje</span>
                    )}
                  </div>
                </td>

                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {plate.status === 'pending' ? (
                      <>
                        <button type="button" onClick={() => handleApprove(plate.id)} disabled={isPending} aria-label={`Miratonim targën ${plate.plate_number}`} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-emerald-950 transition-all duration-300 active:scale-95 disabled:opacity-40">
                          <CheckCircle2 size={17} />
                        </button>
                        <button type="button" onClick={() => handleReject(plate.id)} disabled={isPending} aria-label={`Refuzojmë targën ${plate.plate_number}`} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-300 active:scale-95 disabled:opacity-40">
                          <XCircle size={17} />
                        </button>
                      </>
                    ) : plate.status === 'approved' ? (
                      <button type="button" onClick={() => setPrintPlate(plate)} aria-label={`Printo QR për ${plate.plate_number}`} className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all duration-300 active:scale-95">
                        <Printer size={17} />
                      </button>
                    ) : null}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <Car size={36} className="text-slate-700" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-400">Nuk u gjet asnjë targë</p>
              <p className="text-xs text-slate-600 mt-1">Provo të ndryshosh filtrat ose termin e kërkimit.</p>
            </div>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all active:scale-95">
                <RotateCcw size={13} />
                Rivendos filtrat
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-5 lg:p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <p className="text-xs text-slate-500 font-medium">
          Duke shfaqur <span className="text-slate-300 font-semibold">{filtered.length}</span> nga <span className="text-slate-300 font-semibold">{optimisticPlates.length}</span> rekorde
        </p>
        <div className="flex gap-2">
          <button type="button" className="px-4 py-2 rounded-xl border border-white/5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all active:scale-95">Para</button>
          <button type="button" className="px-4 py-2 rounded-xl border border-white/5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all active:scale-95">Pas</button>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PlateStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.rejected
  return (
    <div className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest', cfg.className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full animate-pulse', cfg.dot)} />
      {cfg.label}
    </div>
  )
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cx('rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap active:scale-95', active ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300')}>
      {label}
    </button>
  )
}
