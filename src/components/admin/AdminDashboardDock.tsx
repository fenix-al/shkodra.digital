'use client'

import type { ReactNode } from 'react'
import { useMemo, useState, useTransition } from 'react'
import { Bell, Camera, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, ShieldCheck, Siren, XCircle } from 'lucide-react'
import { markNotificationRead } from '@/actions/notifications'
import { cx } from '@/lib/cx'

type NotificationTone = 'emerald' | 'amber' | 'rose' | 'blue' | 'slate'
type NotificationIcon = 'report' | 'camera' | 'car' | 'check' | 'clock' | 'shield' | 'x' | 'alert'

type NotificationItem = {
  id: string
  title: string
  body: string
  createdAt: string
  href?: string | null
  tone: NotificationTone
  icon: NotificationIcon
  readAt?: string | null
  isUnread?: boolean
}

type RecentScanItem = {
  key: string
  plateNumber: string
  action: string
  scanMethod: string
  timeLabel: string
}

type Props = {
  notifications: NotificationItem[]
  unreadCount: number
  recentScans: RecentScanItem[]
}

const TONE_CLASSES: Record<NotificationTone, { badge: string; dot: string }> = {
  emerald: { badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  amber: { badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  rose: { badge: 'border-rose-500/20 bg-rose-500/10 text-rose-300', dot: 'bg-rose-400' },
  blue: { badge: 'border-blue-500/20 bg-blue-500/10 text-blue-300', dot: 'bg-blue-400' },
  slate: { badge: 'border-white/10 bg-white/[0.03] text-slate-300', dot: 'bg-slate-400' },
}

function formatRelativeDate(iso: string) {
  const target = new Date(iso)
  const diffMs = Date.now() - target.getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min me pare`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} ore me pare`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'Dje'
  if (diffDays < 7) return `${diffDays} dite me pare`
  return target.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })
}

function NotificationIconGlyph({ icon, className }: { icon: NotificationIcon; className?: string }) {
  const shared = { size: 16, className }
  switch (icon) {
    case 'camera':
      return <Camera {...shared} />
    case 'check':
      return <CheckCircle2 {...shared} />
    case 'clock':
      return <Clock3 {...shared} />
    case 'shield':
      return <ShieldCheck {...shared} />
    case 'x':
      return <XCircle {...shared} />
    case 'alert':
      return <Siren {...shared} />
    case 'report':
    default:
      return <FileText {...shared} />
  }
}

function DockCard({
  title,
  subtitle,
  badge,
  href,
  hrefLabel,
  open,
  onToggle,
  children,
}: {
  title: string
  subtitle: string
  badge: string
  href: string
  hrefLabel: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/5 bg-[#050914]/80 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 p-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <ChevronDown className={cx('text-slate-400 transition-transform duration-300', open ? 'rotate-0' : '-rotate-90')} size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{subtitle}</p>
            <div className="mt-1 flex items-center gap-3">
              <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {badge}
              </span>
            </div>
          </div>
        </button>

        <a href={href} className="hidden items-center gap-1 text-xs text-emerald-400 transition-colors hover:text-emerald-300 sm:flex">
          {hrefLabel} <ChevronRight size={12} />
        </a>
      </div>

      {open ? <div className="p-5">{children}</div> : null}
    </section>
  )
}

export default function AdminDashboardDock({ notifications, unreadCount, recentScans }: Props) {
  const [openPanels, setOpenPanels] = useState({ notifications: true, scans: true })
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const [isPending, startTransition] = useTransition()

  const localUnreadCount = useMemo(
    () => localNotifications.filter((item) => item.isUnread ?? !item.readAt).length,
    [localNotifications]
  )
  const totalUnread = Math.max(unreadCount, localUnreadCount)

  function markSingle(id: string) {
    startTransition(async () => {
      try {
        await markNotificationRead(id)
        setLocalNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isUnread: false, readAt: new Date().toISOString() } : item))
        )
      } catch {
        // keep UI stable; full page remains the source of truth
      }
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <DockCard
        title="Njoftimet operative"
        subtitle="Veprimet ne pritje"
        badge={`${totalUnread} te palexuara`}
        href="/admin/njoftimet"
        hrefLabel="Shiko te gjitha"
        open={openPanels.notifications}
        onToggle={() => setOpenPanels((prev) => ({ ...prev, notifications: !prev.notifications }))}
      >
        <div className="space-y-3">
          {localNotifications.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-500">
              Asnje njoftim i ri per momentin.
            </div>
          ) : (
            localNotifications.slice(0, 4).map((notification) => {
              const tone = TONE_CLASSES[notification.tone] ?? TONE_CLASSES.slate
              const unread = notification.isUnread ?? !notification.readAt
              return (
                <div key={notification.id} className="rounded-[22px] border border-white/5 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className={cx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', tone.badge)}>
                      <NotificationIconGlyph icon={notification.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-100">{notification.title}</p>
                            {unread ? <span className={cx('h-2 w-2 rounded-full', tone.dot)} /> : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-400">{notification.body}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {formatRelativeDate(notification.createdAt)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {notification.href ? (
                          <a href={notification.href} onClick={() => unread && markSingle(notification.id)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                            Hape
                          </a>
                        ) : null}
                        {unread ? (
                          <button
                            type="button"
                            onClick={() => markSingle(notification.id)}
                            disabled={isPending}
                            className="text-[11px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300"
                          >
                            Sheno si lexuar
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Lexuar</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DockCard>

      <DockCard
        title="Skanime te fundit"
        subtitle="Rrjedha operative"
        badge={`${recentScans.length} ngjarje`}
        href="/admin/autorizimet"
        hrefLabel="Shiko te gjitha"
        open={openPanels.scans}
        onToggle={() => setOpenPanels((prev) => ({ ...prev, scans: !prev.scans }))}
      >
        <div className="space-y-3">
          {recentScans.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-500">
              Nuk ka skanime te reja sot.
            </div>
          ) : (
            recentScans.slice(0, 6).map((scan) => (
              <div key={scan.key} className="flex items-center justify-between gap-3 rounded-[22px] border border-white/5 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-black',
                      scan.action === 'ENTRY' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                    )}
                  >
                    {scan.action === 'ENTRY' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <p className="text-sm font-mono font-bold text-white">{scan.plateNumber}</p>
                    <p className="text-xs text-slate-500">{scan.scanMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cx('text-xs font-bold uppercase tracking-widest', scan.action === 'ENTRY' ? 'text-emerald-400' : 'text-rose-400')}>
                    {scan.action === 'ENTRY' ? 'Hyrje' : 'Dalje'}
                  </p>
                  <p className="text-xs text-slate-500">{scan.timeLabel}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DockCard>
    </div>
  )
}
