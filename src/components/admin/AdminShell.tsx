'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Camera, Car, CheckCircle2, Clock3, FileText, Menu, ShieldCheck, Siren, X, XCircle } from 'lucide-react'
import { markNotificationRead } from '@/actions/notifications'
import AdminSidebar from './AdminSidebar'
import { cx } from '@/lib/cx'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/admin'

interface NotificationPreview {
  id: string
  title: string
  body: string
  createdAt: string
  href?: string | null
  tone: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate'
  icon: 'report' | 'camera' | 'car' | 'check' | 'clock' | 'shield' | 'x' | 'alert'
  readAt?: string | null
  isUnread?: boolean
  metadata?: {
    reportId?: string | null
    plateId?: string | null
    photoUrl?: string | null
  } | null
  kind?: string | null
}

interface AdminShellProps {
  profile: UserProfile | null
  currentUserId: string
  notificationCount?: number
  notifications?: NotificationPreview[]
  children: React.ReactNode
}

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Paneli Kryesor',
  '/admin/autorizimet': 'Menaxhimi i Autorizimeve',
  '/admin/raportet': 'Raportet',
  '/admin/perdoruesit': 'Përdoruesit',
  '/admin/cilesimet': 'Cilësimet',
}

const TONE_DOTS = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  blue: 'bg-blue-400',
  slate: 'bg-slate-400',
}

function formatRelativeDate(iso: string) {
  const target = new Date(iso)
  const diffMs = Date.now() - target.getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} ore`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'Dje'
  if (diffDays < 7) return `${diffDays} dite`

  return target.toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
  })
}

function NotificationGlyph({ icon }: { icon: NotificationPreview['icon'] }) {
  const shared = { size: 14, className: 'text-slate-200' }

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

function resolveNotificationHref(notification: {
  href?: string | null
  kind?: string | null
  metadata?: NotificationPreview['metadata']
}) {
  if (notification.metadata?.reportId) {
    return `/admin/raportet?reportId=${notification.metadata.reportId}`
  }

  if (notification.kind?.includes('authorization') || notification.metadata?.plateId) {
    return '/admin/autorizimet'
  }

  return notification.href ?? null
}

function normalizeRealtimeNotification(row: {
  id: string
  title: string
  body: string
  created_at: string
  href?: string | null
  tone: NotificationPreview['tone']
  icon: NotificationPreview['icon']
  read_at?: string | null
  metadata?: NotificationPreview['metadata']
  kind?: string | null
}) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    href: resolveNotificationHref({ href: row.href, kind: row.kind, metadata: row.metadata }),
    tone: row.tone,
    icon: row.icon,
    readAt: row.read_at ?? null,
    isUnread: !row.read_at,
    metadata: row.metadata ?? null,
    kind: row.kind ?? null,
  } satisfies NotificationPreview
}

export default function AdminShell({ profile, currentUserId, notificationCount = 0, notifications = [], children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [liveNotifications, setLiveNotifications] = useState<NotificationPreview[]>([])
  const [readOverrides, setReadOverrides] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin'

  const baseUnreadIds = useMemo(
    () => new Set(notifications.filter((item) => item.isUnread ?? !item.readAt).map((item) => item.id)),
    [notifications],
  )

  const visibleNotifications = useMemo(() => {
    const items = new Map<string, NotificationPreview>()

    for (const notification of [...liveNotifications, ...notifications]) {
      const readAt = readOverrides[notification.id]
      const nextNotification = readAt
        ? { ...notification, readAt, isUnread: false }
        : notification

      if (!items.has(nextNotification.id)) {
        items.set(nextNotification.id, nextNotification)
      }
    }

    return [...items.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
        setNotificationOpen(false)
      }
    }

    if (notificationOpen) {
      document.addEventListener('mousedown', handlePointerDown)
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [notificationOpen])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel(`admin_notifications_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_notifications' },
        (payload) => {
          const recipientId = payload.new?.recipient_id as string | null | undefined
          const recipientRole = payload.new?.recipient_role as string | null | undefined
          const isRelevant = recipientRole === 'admin' || recipientId === currentUserId
          if (!isRelevant) return

          const nextNotification = normalizeRealtimeNotification(payload.new as never)

          setLiveNotifications((current) => {
            if (current.some((item) => item.id === nextNotification.id) || notifications.some((item) => item.id === nextNotification.id)) {
              return current
            }

            return [nextNotification, ...current].slice(0, 6)
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_notifications' },
        (payload) => {
          const recipientId = payload.new?.recipient_id as string | null | undefined
          const recipientRole = payload.new?.recipient_role as string | null | undefined
          const isRelevant = recipientRole === 'admin' || recipientId === currentUserId
          if (!isRelevant) return

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

  function handleNotificationClick(notification: NotificationPreview) {
    setNotificationOpen(false)

    startTransition(async () => {
      if (notification.isUnread ?? !notification.readAt) {
        await markNotificationRead(notification.id)
        setReadOverrides((current) => ({ ...current, [notification.id]: new Date().toISOString() }))
      }

      if (notification.href) {
        router.push(notification.href)
      }
    })
  }

  return (
    <div className="flex h-screen w-full bg-[#030712] text-slate-100 overflow-hidden font-sans">
      {sidebarOpen && (
        <div aria-hidden onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" />
      )}

      <AdminSidebar profile={profile} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div aria-hidden className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <header className="relative z-40 h-20 shrink-0 flex items-center justify-between px-6 lg:px-8 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Hap menunë" className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95">
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 className="text-xl font-bold tracking-tight text-white">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              SISTEMI_ONLINE: ZONA_ZDRALE
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                aria-label="Njoftimet operative"
                onClick={() => setNotificationOpen((current) => !current)}
                className="relative flex items-center justify-center w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:border-emerald-500/20 transition-all duration-200"
              >
                <Bell size={17} />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center shadow-[0_0_14px_rgba(244,63,94,0.4)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>

              {notificationOpen ? (
                <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[360px] max-w-[calc(100vw-32px)] rounded-[28px] border border-white/10 bg-[#050914]/96 p-3 shadow-[0_20px_80px_rgba(2,6,23,0.65)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3 pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Njoftimet</p>
                      <h3 className="mt-1 text-sm font-semibold text-white">Veprimet e fundit</h3>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {unreadCount} te reja
                    </div>
                  </div>

                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {visibleNotifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-300">Asnje njoftim i ri</p>
                        <p className="mt-1 text-xs text-slate-500">Kur te hyjne raporte ose kerkesa te reja, do t&apos;i shihni ketu.</p>
                      </div>
                    ) : (
                      visibleNotifications.map((notification) => {
                        const unread = notification.isUnread ?? !notification.readAt

                        return (
                          <div
                            key={notification.id}
                            role="button"
                            tabIndex={0}
                            aria-disabled={isPending}
                            onClick={() => {
                              if (isPending) return
                              handleNotificationClick(notification)
                            }}
                            onKeyDown={(event) => {
                              if (isPending) return
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleNotificationClick(notification)
                              }
                            }}
                            className={cx(
                              'w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200',
                              unread ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-white/5 bg-white/[0.03]',
                              isPending ? 'opacity-60' : 'cursor-pointer',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                                <NotificationGlyph icon={notification.icon} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-sm font-semibold text-slate-100">{notification.title}</p>
                                  <div className="flex items-center gap-2">
                                    {unread ? <span className={cx('h-2 w-2 rounded-full', TONE_DOTS[notification.tone])} /> : null}
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{formatRelativeDate(notification.createdAt)}</span>
                                  </div>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{notification.body}</p>
                                {notification.metadata?.photoUrl ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setPreviewImageUrl(notification.metadata?.photoUrl ?? null)
                                    }}
                                    className="mt-3 block w-full overflow-hidden rounded-xl border border-white/10"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={notification.metadata.photoUrl}
                                      alt="Preview e raportit"
                                      className="h-16 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                                    />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <a
                    href="/admin/dashboard"
                    className="mt-3 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
                  >
                    Hape panelin e plote
                  </a>
                </div>
              ) : null}
            </div>

            <div className="w-9 h-9 rounded-full border border-white/10 bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:border-emerald-500/50 hover:shadow-[0_0_12px_rgba(52,211,153,0.2)] transition-all duration-200">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-0">
          {children}
        </div>
      </main>

      {previewImageUrl ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Mbyll preview"
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setPreviewImageUrl(null)}
          />
          <div className="relative z-[91] w-full max-w-5xl">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 z-[92] flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/50 text-slate-200 transition-colors hover:text-white"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Foto e raportit"
              className="max-h-[88vh] w-full rounded-[28px] border border-white/10 bg-[#020617] object-contain shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
