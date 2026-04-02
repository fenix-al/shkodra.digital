'use client'

import { useState } from 'react'
import { Car, QrCode, Clock, CheckCircle2, XCircle, Hourglass, PauseCircle, ChevronRight, X } from 'lucide-react'
import DynamicQR from '@/components/citizen/DynamicQR'
import NotificationsPanel from '@/components/shared/NotificationsPanel'
import NotificationPreferencesCard from '@/components/shared/NotificationPreferencesCard'
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
  notificationsUnreadCount: number
  notificationPreferences?: {
    email_enabled?: boolean
    push_enabled?: boolean
    digest_frequency?: 'instant' | 'daily' | 'weekly'
  } | null
  notifications: {
    id: string
    title: string
    body: string
    createdAt: string
    href?: string | null
    tone: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate'
    icon: 'report' | 'camera' | 'car' | 'check' | 'clock' | 'shield' | 'x' | 'alert'
    readAt?: string | null
    isUnread?: boolean
    channelsStatus?: {
      email?: string
      push?: string
    } | null
  }[]
}

const STATUS_CONFIG: Record<PlateStatus, { label: string; icon: React.ElementType; className: string; dot: string }> = {
  approved: { label: 'E autorizuar', icon: CheckCircle2, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  pending: { label: 'Në pritje', icon: Hourglass, className: 'border-amber-500/20 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  rejected: { label: 'Refuzuar', icon: XCircle, className: 'border-rose-500/20 bg-rose-500/10 text-rose-400', dot: 'bg-rose-400' },
  suspended: { label: 'Pezulluar', icon: PauseCircle, className: 'border-slate-500/20 bg-slate-500/10 text-slate-400', dot: 'bg-slate-400' },
}

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Automobil',
  motorcycle: 'Motocikletë',
  delivery: 'Shpërndarje',
  business: 'Biznes',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`
}

export default function CitizenDashboardClient({ plates, ownerName, notifications, notificationsUnreadCount, notificationPreferences }: Props) {
  const [qrPlate, setQrPlate] = useState<Plate | null>(null)

  const approvedPlates = plates.filter((p) => p.status === 'approved')

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Mirësevini</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-100">{ownerName}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {approvedPlates.length > 0
            ? `Keni ${approvedPlates.length} mjet${approvedPlates.length > 1 ? 'e' : ''} të autorizuar`
            : 'Nuk keni mjete të autorizuara ende'}
        </p>
      </div>

      {approvedPlates.length > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
          <QrCode size={18} className="shrink-0 text-emerald-400" />
          <p className="text-xs text-slate-400">Trokitni mbi një mjet të autorizuar për të shfaqur kodin QR.</p>
        </div>
      ) : null}

      <NotificationsPanel
        title="Njoftimet tuaja"
        subtitle="Statusi i kërkesave dhe raporteve"
        notifications={notifications}
        unreadCount={notificationsUnreadCount}
        emptyMessage="Kur të dërgoni raportime ose kërkesa për autorizim, përditësimet do të shfaqen këtu."
        enableReadActions
        compact
      />

      <NotificationPreferencesCard
        compact
        title="Preferencat"
        subtitle="Zgjidhni si doni t’i merrni njoftimet në aplikacion"
        initialPreferences={notificationPreferences}
      />

      {plates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
            <Car size={28} className="text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">Nuk keni mjete të regjistruara</p>
            <p className="mt-1 text-xs text-slate-600">Kontaktoni administratën për të regjistruar mjetin tuaj.</p>
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
                onClick={() => (canShowQR ? setQrPlate(plate) : undefined)}
                disabled={!canShowQR}
                className={cx('group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-md transition-all duration-200', canShowQR ? 'cursor-pointer hover:border-emerald-500/20 hover:bg-white/[0.06] active:scale-[0.98]' : 'cursor-default opacity-75')}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
                  <Car size={20} className="text-slate-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black tracking-widest text-slate-100">{plate.plate_number}</span>
                    {canShowQR ? <QrCode size={13} className="text-emerald-400/60 transition-colors group-hover:text-emerald-400" /> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {plate.vehicle_type ? <span className="text-[10px] text-slate-500">{VEHICLE_LABELS[plate.vehicle_type] ?? plate.vehicle_type}</span> : null}
                    {plate.valid_until ? (
                      <span className="flex items-center gap-1 text-[10px] text-slate-600">
                        <Clock size={9} />
                        deri {formatDate(plate.valid_until)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className={cx('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', cfg.className)}>
                    <span className={cx('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                    <Icon size={10} />
                  </div>
                  {canShowQR ? <ChevronRight size={14} className="text-slate-600 transition-colors group-hover:text-slate-400" /> : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {qrPlate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setQrPlate(null)} aria-hidden />
          <div className="relative flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/10 bg-[#050914]/98 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex w-full items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kodi i aksesit</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-200">Zona Zdralës</p>
              </div>
              <button type="button" onClick={() => setQrPlate(null)} className="rounded-xl p-2 text-slate-500 transition-all hover:bg-white/5 hover:text-slate-300 active:scale-95">
                <X size={17} />
              </button>
            </div>

            <DynamicQR plateId={qrPlate.id} plateNumber={qrPlate.plate_number} />

            {qrPlate.valid_until ? (
              <p className="text-center text-[10px] text-slate-600">Autorizimi skadon më {formatDate(qrPlate.valid_until)}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
