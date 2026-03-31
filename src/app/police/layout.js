import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import { Activity, Shield } from 'lucide-react'
import LogoutButton from '@/components/shared/LogoutButton'

export const metadata = {
  title: 'Policia | Shkodra.digital',
}

export default async function PoliceLayout({ children }) {
  const supabase = await createServerSupabaseClient()

  let profile
  try {
    const session = await requireRole(supabase, [ROLES.POLICE, ROLES.SUPER_ADMIN])
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5">
            <Shield size={12} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">{profile.full_name ?? 'Oficer'}</span>
          </div>
          <LogoutButton compact />
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
