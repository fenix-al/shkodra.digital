import { BellRing, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole, ROLES } from '@/lib/auth/roles'
import { getAdminNotifications } from '@/lib/notifications'
import NotificationsPanel from '@/components/shared/NotificationsPanel'

export const metadata = {
  title: 'Njoftimet | Shkodra.digital',
}

export default async function AdminNotificationsPage() {
  const supabase = await createServerSupabaseClient()

  let user
  try {
    const session = await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])
    user = session.user
  } catch {
    redirect('/login')
  }

  const { items: notifications, unreadCount } = await getAdminNotifications(supabase, user.id, { limit: 80 })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <BellRing size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Inbox administrativ</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Njoftimet operative</h1>
            <p className="mt-1 text-sm text-slate-400">Ketu shihni raportet e reja, ndryshimet e statusit dhe kerkesat qe kerkojne veprim.</p>
          </div>
        </div>

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <ChevronLeft size={14} />
          Kthehu te paneli
        </Link>
      </div>

      <NotificationsPanel
        title="Inbox i plote"
        subtitle="Veprimet qe kerkojne reagim"
        notifications={notifications}
        unreadCount={unreadCount}
        emptyMessage="Kur te hyjne raporte te reja ose kerkesa ne pritje, do t'i shihni ketu."
        enableReadActions
      />
    </div>
  )
}
