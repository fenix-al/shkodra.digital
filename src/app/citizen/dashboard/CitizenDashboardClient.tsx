'use client'

import { useState } from 'react'
import { Car, QrCode, Clock, CheckCircle2, XCircle, Hourglass, PauseCircle, ChevronRight, X } from 'lucide-react'
import DynamicQR from '@/components/citizen/DynamicQR'
import { cx } from '@/lib/cx'

type PlateStatus = 'approved' | 'pending' | 'rejected' | 'suspended'
type VehicleType = 'car' | 'motorcycle' | 'delivery' | 'business' | null

interface Plate {
  id: string
  plate_number: string
  vehicle_type: VehicleType
  status: PlateStatus
  valid_from: string | null
  valid_until: string | null
  created_at: string
}

interface Props {
  plates: Plate[]
  ownerName: string
}

const STATUS_CONFIG: Record<PlateStatus, { label: string; icon: React.ElementType; className: string; dot: string }> = {
  approved:  { label: 'E autorizuar',  icon: CheckCircle2, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  pending:   { label: 'Në pritje',     icon: Hourglass,    className: 'border-amber-500/20 bg-amber-500/10 text-amber-400',       dot: 'bg-amber-400' },
  rejected:  { label: 'Refuzuar',      icon: XCircle,      className: 'border-rose-500/20 bg-rose-500/10 text-rose-400',          dot: 'bg-rose-400' },
  suspended: { label: 'Pezulluar',     icon: PauseCircle,  className: 'border-slate-500/20 bg-slate-500/10 text-slate-400',       dot: 'bg-slate-400' },
}

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Automobil', motorcycle: 'Motocikletë', delivery: 'Shpërndarje', business: 'Biznes',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`
}

export default function CitizenDashboardClient({ plates, ownerName }: Props) {
  const [qrPlate, setQrPlate] = useState<Plate | null>(null)

  const approvedPlates = plates.filter((p) => p.status === 'approved')

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto w-full">

      {/* ── Greeting ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Mirësevini</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-1">{ownerName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {approvedPlates.length > 0
            ? `Keni ${approvedPlates.length} mjet${approvedPlates.length > 1 ? 'e' : ''} të autorizuar`
            : 'Nuk keni mjete të autorizuara ende'}
        </p>
      </div>

      {/* ── Quick QR hint ── */}
      {approvedPlates.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
          <QrCode size={18} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-400">Trokitni mbi një mjet të autorizuar për të shfaqur kodin QR.</p>
        </div>
      )}

      {/* ── Plates list ── */}
      {plates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
            <Car size={28} className="text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">Nuk keni mjete të regjistruara</p>
            <p className="text-xs text-slate-600 mt-1">Kontaktoni administratën për të regjistruar mjetin tuaj.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mjetet tuaja</p>
          {plates.map((plate) => {
            const cfg = STATUS_CONFIG[plate.status]
            const Icon = cfg.icon
            const canShowQR = plate.status === 'approved'

            return (
              <button
                key={plate.id}
                type="button"
                onClick={() => canShowQR ? setQrPlate(plate) : undefined}
                disabled={!canShowQR}
                className={cx('w-full text-left group backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-all duration-200', canShowQR ? 'hover:bg-white/[0.06] hover:border-emerald-500/20 active:scale-[0.98] cursor-pointer' : 'cursor-default opacity-75')}
              >
                {/* Vehicle icon */}
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center shrink-0">
                  <Car size={20} className="text-slate-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base tracking-widest text-slate-100">{plate.plate_number}</span>
                    {canShowQR && <QrCode size={13} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {plate.vehicle_type && (
                      <span className="text-[10px] text-slate-500">{VEHICLE_LABELS[plate.vehicle_type] ?? plate.vehicle_type}</span>
                    )}
                    {plate.valid_until && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-600">
                        <Clock size={9} />
                        deri {formatDate(plate.valid_until)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={cx('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', cfg.className)}>
                    <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    <Icon size={10} />
                  </div>
                  {canShowQR && <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── QR Modal ── */}
      {qrPlate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setQrPlate(null)} aria-hidden />
          <div className="relative w-full max-w-sm backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-5 shadow-2xl">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kodi i aksesit</p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">Zona Zdralës</p>
              </div>
              <button type="button" onClick={() => setQrPlate(null)} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95">
                <X size={17} />
              </button>
            </div>

            <DynamicQR plateId={qrPlate.id} plateNumber={qrPlate.plate_number} />

            {qrPlate.valid_until && (
              <p className="text-[10px] text-slate-600 text-center">
                Autorizimi skadon më {formatDate(qrPlate.valid_until)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
