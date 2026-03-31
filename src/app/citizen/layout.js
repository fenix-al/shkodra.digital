import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import { Activity, LayoutDashboard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import LogoutButton from '@/components/shared/LogoutButton'

export const metadata = {
  title: 'Shkodra.digital',
}

export default async function CitizenLayout({ children }) {
  const supabase = await createServerSupabaseClient()

  let profile
  try {
    const session = await requireRole(supabase, [ROLES.CITIZEN])
    profile = session.profile
  } catch {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#030712]/90 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shrink-0">
            <Activity size={13} className="text-slate-900" />
          </div>
          <span className="text-sm font-semibold">
            <span className="text-blue-400">shkodra</span><span className="text-slate-400">.digital</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:block">{profile.full_name ?? ''}</span>
          <LogoutButton compact />
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 flex flex-col pb-24">
        {children}
      </main>

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-[#030712]/95 border-t border-white/5 px-4 py-2 flex items-center justify-around">
        <Link href="/citizen/dashboard" className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-slate-500 hover:text-slate-200 transition-all active:scale-95 group">
          <LayoutDashboard size={20} className="group-hover:text-emerald-400 transition-colors" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">Paneli</span>
        </Link>
        <Link href="/citizen/raporto" className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-slate-500 hover:text-slate-200 transition-all active:scale-95 group">
          <AlertTriangle size={20} className="group-hover:text-amber-400 transition-colors" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">Raporto</span>
        </Link>
      </nav>
    </div>
  )
}
