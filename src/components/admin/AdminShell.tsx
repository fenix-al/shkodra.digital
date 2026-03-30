'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import type { UserProfile } from '@/types/admin'

interface AdminShellProps {
  profile: UserProfile | null
  children: React.ReactNode
}

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Paneli Kryesor',
  '/admin/autorizimet': 'Menaxhimi i Autorizimeve',
  '/admin/raportet': 'Raportet',
  '/admin/perdoruesit': 'Përdoruesit',
  '/admin/cilesimet': 'Cilësimet',
}

export default function AdminShell({ profile, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <div className="flex h-screen w-full bg-[#030712] text-slate-100 overflow-hidden font-sans">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div aria-hidden onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" />
      )}

      <AdminSidebar profile={profile} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background glows */}
        <div aria-hidden className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Header */}
        <header className="h-20 shrink-0 flex items-center justify-between px-6 lg:px-8 border-b border-white/5 backdrop-blur-md z-10">
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
            <div className="w-9 h-9 rounded-full border border-white/10 bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:border-emerald-500/50 hover:shadow-[0_0_12px_rgba(52,211,153,0.2)] transition-all duration-200">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
