import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import { listUsers } from '@/actions/users'
import UsersTable from '@/components/admin/UsersTable'

export const metadata = {
  title: 'Përdoruesit | Shkodra.digital',
}

export default async function PerdoruesitPage() {
  const supabase = await createServerSupabaseClient()

  try {
    await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])
  } catch {
    redirect('/login')
  }

  const users = await listUsers()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Administrimi</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-1">Menaxhimi i Përdoruesve</h1>
        <p className="text-sm text-slate-500 mt-0.5">Shto, ndrysho ose fshi llogaritë e qytetarëve, policëve dhe menaxherëve.</p>
      </div>
      <UsersTable initialUsers={users} />
    </div>
  )
}
