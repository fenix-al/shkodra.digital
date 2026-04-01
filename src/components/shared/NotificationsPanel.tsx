'use client'

import { useState, useTransition } from 'react'
import { Bell, Camera, Car, CheckCircle2, ChevronRight, Clock3, FileText, ShieldCheck, Siren, XCircle } from 'lucide-react'
import { markAllNotificationsRead, markNotificationRead } from '@/actions/notifications'
import { cx } from '@/lib/cx'

type NotificationTone = 'emerald' | 'amber' | 'rose' | 'blue' | 'slate'
type NotificationIcon = 'report' | 'camera' | 'car' | 'check' | 'clock' | 'shield' | 'x' | 'alert'

interface NotificationItem {
  id: string
  title: string
  body: string
  createdAt: string
  href?: string | null
  tone: NotificationTone
  icon: NotificationIcon
  readAt?: string | null
  isUnread?: boolean
  channelsStatus?: {
    email?: string
    push?: string
  } | null
}

interface NotificationsPanelProps {
  title: string
  subtitle: string
  notifications: NotificationItem[]
  emptyMessage: string
  actionHref?: string
  actionLabel?: string
  compact?: boolean
  unreadCount?: number
  enableReadActions?: boolean
}

const TONE_CLASSES: Record<NotificationTone, { badge: string; dot: string; card: string; unreadRing: string }> = {
  emerald: {
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    card: 'border-emerald-500/10 bg-emerald-500/[0.04]',
    dot: 'bg-emerald-400',
    unreadRing: 'ring-emerald-400/20',
  },
  amber: {
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    card: 'border-amber-500/10 bg-amber-500/[0.04]',
    dot: 'bg-amber-400',
    unreadRing: 'ring-amber-400/20',
  },
  rose: {
    badge: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    card: 'border-rose-500/10 bg-rose-500/[0.04]',
    dot: 'bg-rose-400',
    unreadRing: 'ring-rose-400/20',
  },
  blue: {
    badge: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    card: 'border-blue-500/10 bg-blue-500/[0.04]',
    dot: 'bg-blue-400',
    unreadRing: 'ring-blue-400/20',
  },
  slate: {
    badge: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    card: 'border-white/5 bg-white/[0.03]',
    dot: 'bg-slate-400',
    unreadRing: 'ring-white/10',
  },
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

  return target.toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function NotificationIconGlyph({ icon, className }: { icon: NotificationIcon; className?: string }) {
  const shared = { size: 16, className }

  switch (icon) {
    case 'camera':
      return <Camera {...shared} />
    case 'car':
      return <Car {...shared} />
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

function getDeliveryHint(notification: NotificationItem) {
  if (notification.channelsStatus?.email === 'awaiting_configuration') {
    return 'Email ne pritje konfigurimi'
  }
  if (notification.channelsStatus?.push === 'awaiting_configuration') {
    return 'Push ne pritje konfigurimi'
  }
  return null
}

export default function NotificationsPanel({
  title,
  subtitle,
  notifications,
  emptyMessage,
  actionHref,
  actionLabel,
  compact = false,
  unreadCount = 0,
  enableReadActions = false,
}: NotificationsPanelProps) {
  const [items, setItems] = useState(notifications)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const computedUnread = items.filter((item) => item.isUnread ?? !item.readAt).length
  const totalUnread = Math.max(unreadCount, computedUnread)

  function markSingle(id: string) {
    setPendingIds((prev) => [...prev, id])
    startTransition(async () => {
      try {
        await markNotificationRead(id)
        setItems((prev) => prev.map((item) => (
          item.id === id ? { ...item, isUnread: false, readAt: new Date().toISOString() } : item
        )))
      } finally {
        setPendingIds((prev) => prev.filter((item) => item !== id))
      }
    })
  }

  function markEverything() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((item) => ({ ...item, isUnread: false, readAt: new Date().toISOString() })))
    })
  }

  return (
    <section className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
            <Bell size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{subtitle}</p>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {totalUnread} te palexuara
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {enableReadActions && totalUnread > 0 ? (
            <button
              type="button"
              onClick={markEverything}
              disabled={isPending}
              className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-500/15 disabled:opacity-50"
            >
              Lexoji te gjitha
            </button>
          ) : null}

          {actionHref && actionLabel ? (
            <a href={actionHref} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
              {actionLabel} <ChevronRight size={12} />
            </a>
          ) : null}
        </div>
      </div>

      <div className={cx('p-6', compact ? 'space-y-3' : 'space-y-4')}>
        {items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center">
            <p className="text-sm font-semibold text-slate-300">Asnje njoftim i ri</p>
            <p className="mt-1 text-xs text-slate-500">{emptyMessage}</p>
          </div>
        ) : (
          items.map((notification) => {
            const tone = TONE_CLASSES[notification.tone] ?? TONE_CLASSES.slate
            const unread = notification.isUnread ?? !notification.readAt
            const isMarking = pendingIds.includes(notification.id)
            const deliveryHint = getDeliveryHint(notification)

            return (
              <div
                key={notification.id}
                className={cx(
                  'rounded-[24px] border px-4 py-4 transition-all duration-200',
                  tone.card,
                  unread ? `ring-1 ${tone.unreadRing}` : 'opacity-90',
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cx('w-10 h-10 shrink-0 rounded-2xl border flex items-center justify-center', tone.badge)}>
                    <NotificationIconGlyph icon={notification.icon} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-100">{notification.title}</p>
                          {unread ? <span className={cx('w-2 h-2 rounded-full', tone.dot)} /> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-400 leading-relaxed">{notification.body}</p>
                        {deliveryHint ? (
                          <p className="mt-2 text-[11px] text-slate-500 uppercase tracking-widest">{deliveryHint}</p>
                        ) : null}
                      </div>

                      <div
                        suppressHydrationWarning
                        className="shrink-0 flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                      >
                        <span className={cx('w-1.5 h-1.5 rounded-full', tone.dot)} />
                        {formatRelativeDate(notification.createdAt)}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      {notification.href ? (
                        <a href={notification.href} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                          Hape
                        </a>
                      ) : null}

                      {enableReadActions && unread ? (
                        <button
                          type="button"
                          onClick={() => markSingle(notification.id)}
                          disabled={isMarking}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-emerald-500/20 hover:text-emerald-300 disabled:opacity-50"
                        >
                          {isMarking ? 'Duke ruajtur...' : 'Sheno si lexuar'}
                        </button>
                      ) : (
                        <span className="text-[11px] uppercase tracking-widest text-slate-600">
                          {unread ? 'Ne pritje' : 'Lexuar'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
