'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Car, CheckCircle2, Clock3, FileText, ShieldCheck, Siren, XCircle } from 'lucide-react'
import { markNotificationRead } from '@/actions/notifications'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { cx } from '@/lib/cx'

type NotificationTone = 'emerald' | 'amber' | 'rose' | 'blue' | 'slate'
type NotificationIcon = 'report' | 'camera' | 'car' | 'check' | 'clock' | 'shield' | 'x' | 'alert'

interface NotificationItem {
  id: string
  title?: string
  body?: string
  createdAt?: string
  href?: string | null
  tone?: NotificationTone
  icon?: NotificationIcon
  readAt?: string | null
  isUnread?: boolean
}

interface Props {
  currentUserId: string
  notificationCount?: number
  notifications?: NotificationItem[]
}

const TONE_DOT = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  blue: 'bg-blue-400',
  slate: 'bg-slate-400',
}

function NotificationGlyph({ icon = 'report' }: { icon?: NotificationIcon }) {
  const shared = { size: 14, className: 'text-slate-200' }

  switch (icon) {
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
    default:
      return <FileText {...shared} />
  }
}

function formatRelativeDate(iso?: string) {
  if (!iso) return 'Tani'

  const target = new Date(iso)
  const diffMs = Date.now() - target.getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} ore`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'Dje'
  if (diffDays < 7) return `${diffDays} dite`

  return target.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })
}

function normalizeRealtimeNotification(row: {
  id: string
  title?: string
  body?: string
  created_at?: string
  href?: string | null
  tone?: NotificationTone
  icon?: NotificationIcon
  read_at?: string | null
}) {
  return {
    id: row.id,
    title: row.title ?? 'Njoftim i ri',
    body: row.body ?? 'Keni nje perditesim te ri.',
    createdAt: row.created_at,
    href: row.href ?? '/citizen/dashboard',
    tone: row.tone ?? 'blue',
    icon: row.icon ?? 'report',
    readAt: row.read_at ?? null,
    isUnread: !row.read_at,
  } satisfies NotificationItem
}

export default function CitizenBell({ currentUserId, notificationCount = 0, notifications = [] }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([])
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>({})
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const baseUnreadIds = useMemo(
    () => new Set(notifications.filter((item) => item.isUnread ?? !item.readAt).map((item) => item.id)),
    [notifications],
  )

  const visibleNotifications = useMemo(() => {
    const items = new Map<string, NotificationItem>()

    for (const notification of [...liveNotifications, ...notifications]) {
      const readAt = readOverrides[notification.id]
      const nextNotification = readAt ? { ...notification, readAt, isUnread: false } : notification
      if (!items.has(nextNotification.id)) items.set(nextNotification.id, nextNotification)
    }

    return [...items.values()]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 6)
  }, [liveNotifications, notifications, readOverrides])

  const insertedUnreadCount = useMemo(
    () => liveNotifications.filter((item) => !baseUnreadIds.has(item.id) && !readOverrides[item.id] && (item.isUnread ?? !item.readAt)).length,
    [baseUnreadIds, liveNotifications, readOverrides],
  )

  const readBaseCount = useMemo(
    () => notifications.filter((item) => baseUnreadIds.has(item.id) && Boolean(readOverrides[item.id])).length,
    [baseUnreadIds, notifications, readOverrides],
  )

  const unreadCount = Math.max(0, notificationCount + insertedUnreadCount - readBaseCount)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel(`citizen_notifications_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_notifications' },
        (payload) => {
          const recipientId = payload.new?.recipient_id as string | null | undefined
          if (recipientId !== currentUserId) return

          const nextNotification = normalizeRealtimeNotification(payload.new as never)
          setLiveNotifications((current) => {
            if (current.some((item) => item.id === nextNotification.id) || notifications.some((item) => item.id === nextNotification.id)) {
              return current
            }

            return [nextNotification, ...current].slice(0, 20)
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_notifications' },
        (payload) => {
          const recipientId = payload.new?.recipient_id as string | null | undefined
          if (recipientId !== currentUserId) return

          const isUnreadNow = !payload.new?.read_at
          setLiveNotifications((current) => current.map((item) => (
            item.id === payload.new.id
              ? { ...item, readAt: payload.new.read_at ?? null, isUnread: isUnreadNow }
              : item
          )))

          if (!isUnreadNow) {
            setReadOverrides((current) => ({ ...current, [payload.new.id]: payload.new.read_at ?? new Date().toISOString() }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, notifications])

  function handleNotificationClick(notification: NotificationItem) {
    setOpen(false)

    if (notification.isUnread ?? !notification.readAt) {
      setPendingIds((current) => [...current, notification.id])
      startTransition(async () => {
        try {
          await markNotificationRead(notification.id)
          setReadOverrides((current) => ({ ...current, [notification.id]: new Date().toISOString() }))
        } finally {
          setPendingIds((current) => current.filter((id) => id !== notification.id))
        }
      })
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Hape njoftimet"
        onClick={() => setOpen((current) => !current)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-slate-300 transition-all active:scale-95 ${
          pathname === '/citizen/njoftimet'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-white'
        }`}
      >
        <Bell size={17} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[120] w-[min(92vw,22rem)] rounded-3xl border border-white/10 bg-[#050914]/98 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-2 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Njoftimet</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">Perditesimet e fundit</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {unreadCount} te palexuara
            </span>
          </div>

          <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
            {visibleNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-300">Asnje njoftim ende</p>
                <p className="mt-1 text-xs text-slate-500">Raportet dhe autorizimet do te shfaqen ketu.</p>
              </div>
            ) : (
              visibleNotifications.map((notification) => {
                const unread = notification.isUnread ?? !notification.readAt
                const isMarking = pendingIds.includes(notification.id)

                return (
                  <Link
                    key={notification.id}
                    href={notification.href ?? '/citizen/dashboard'}
                    onClick={() => handleNotificationClick(notification)}
                    className={cx(
                      'block rounded-2xl border px-3 py-3 transition-all',
                      unread ? 'border-white/10 bg-white/[0.05]' : 'border-white/5 bg-white/[0.03] opacity-90',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                        <NotificationGlyph icon={notification.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-100">{notification.title ?? 'Njoftim i ri'}</p>
                              {unread ? <span className={cx('h-2 w-2 rounded-full', TONE_DOT[notification.tone ?? 'blue'])} /> : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{notification.body ?? 'Keni nje perditesim te ri.'}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {formatRelativeDate(notification.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-widest text-slate-600">
                            {isMarking ? 'Duke ruajtur...' : unread ? 'I ri' : 'Lexuar'}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-400">Hape</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          <Link
            href="/citizen/njoftimet"
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-white/[0.06]"
          >
            Shiko te gjitha
          </Link>
        </div>
      ) : null}
    </div>
  )
}
