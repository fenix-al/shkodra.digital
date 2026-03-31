'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/actions/auth'
import { cx } from '@/lib/cx'

interface Props {
  compact?: boolean
}

export default function LogoutButton({ compact = false }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logout()
    })
  }

  if (compact) {
    return (
      <button type="button" onClick={handleLogout} disabled={isPending} aria-label="Dil" className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-rose-400 transition-all active:scale-95 disabled:opacity-40">
        <LogOut size={15} />
      </button>
    )
  }

  return (
    <button type="button" onClick={handleLogout} disabled={isPending} className={cx('flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all active:scale-95 disabled:opacity-40')}>
      <LogOut size={15} />
      {isPending ? 'Duke dalë...' : 'Dil'}
    </button>
  )
}
