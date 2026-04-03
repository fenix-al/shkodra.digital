import { BellRing, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole, ROLES } from '@/lib/auth/roles'
import { getCitizenNotifications } from '@/lib/notifications'
import NotificationsPanel from '@/components/shared/NotificationsPanel'

export const metadata = {
  title: 'Njoftimet | Shkodra.digital',
}

export default async function CitizenNotificationsPage() {
  const supabase = await createServerSupabaseClient()
  const { profile } = await requireRole(supabase, [ROLES.CITIZEN])

  const { items: notifications, unreadCount } = await getCitizenNotifications(supabase, profile.id, { limit: 50 })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <BellRing size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Inbox qytetar</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Njoftimet tuaja</h1>
            <p className="mt-1 text-sm text-slate-400">Ketu shihni te gjitha perditesimet per raportet, autorizimet dhe veprimet e Bashkise.</p>
          </div>
        </div>

        <Link
          href="/citizen/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <ChevronLeft size={14} />
          Kthehu
        </Link>
      </div>

      <NotificationsPanel
        title="Inbox i plote"
        subtitle="Njoftimet e aplikacionit"
        notifications={notifications}
        unreadCount={unreadCount}
        emptyMessage="Sapo te kete perditesime per raportet ose autorizimet, ato do te shfaqen ketu."
        enableReadActions
      />
    </div>
  )
}
