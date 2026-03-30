'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTransition } from 'react'
import { Activity, Car, Users, LayoutDashboard, Settings, LogOut, FileText, X } from 'lucide-react'
import { logout } from '@/actions/auth'
import { cx } from '@/lib/cx'
import type { UserProfile } from '@/types/admin'

interface AdminSidebarProps {
  profile: UserProfile | null
  mobileOpen: boolean
  onMobileClose: () => void
}

const NAV_LINKS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Paneli Kryesor' },
  { href: '/admin/autorizimet', icon: Car, label: 'Autorizimet' },
  { href: '/admin/raportet', icon: FileText, label: 'Raportet' },
  { href: '/admin/perdoruesit', icon: Users, label: 'Përdoruesit' },
  { href: '/admin/cilesimet', icon: Settings, label: 'Cilësimet' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Menaxher',
  police: 'Oficer Policie',
  citizen: 'Qytetar',
}

export default function AdminSidebar({ profile, mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => { await logout() })
  }

  return (
    <aside className={cx(
      'flex flex-col border-r border-white/5 bg-[#050914]/50 backdrop-blur-xl shrink-0 transition-transform duration-300',
      'fixed inset-y-0 left-0 z-50 w-72',
      'lg:relative lg:translate-x-0',
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    )}>

      {/* Brand mark + mobile close */}
      <div className="flex items-center justify-between px-8 pt-8 pb-6">
        <Link href="/admin/dashboard" onClick={onMobileClose} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shadow-[0_8px_16px_-6px_rgba(52,211,153,0.5)] transition-transform duration-300 group-hover:-translate-y-0.5">
            <Activity size={22} className="text-white stroke-[2.5]" />
          </div>
          <div className="text-xl tracking-tight">
            <span className="font-bold text-blue-400">shkodra</span>
            <span className="font-medium text-slate-300">.digital</span>
          </div>
        </Link>
        <button type="button" onClick={onMobileClose} aria-label="Mbyll menunë" className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all active:scale-95">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1" aria-label="Navigimi kryesor">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} onClick={onMobileClose} aria-current={active ? 'page' : undefined} className={cx('flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group', active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300')}>
              <Icon size={18} className={cx('transition-colors', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400')} />
              <span className="font-semibold text-sm tracking-wide">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User chip + logout */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {profile.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{profile.full_name ?? 'Admin'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{ROLE_LABELS[profile.role] ?? profile.role}</p>
            </div>
          </div>
        )}
        <button type="button" onClick={handleLogout} disabled={pending} aria-label="Dil nga sistemi" className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-300 active:scale-95 disabled:opacity-50">
          <LogOut size={18} />
          <span className="font-semibold text-sm">{pending ? 'Duke dalë...' : 'Dil nga Sistemi'}</span>
        </button>
      </div>
    </aside>
  )
}
