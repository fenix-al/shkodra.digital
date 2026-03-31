import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'
import { ROLES } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import ReportsTable from '@/components/admin/ReportsTable'

export const metadata = {
  title: 'Raportet | Shkodra.digital',
}

export default async function RaportetPage() {
  const supabase = await createServerSupabaseClient()

  try {
    await requireRole(supabase, [ROLES.MANAGER, ROLES.SUPER_ADMIN])
  } catch {
    redirect('/login')
  }

  const { data: reports } = await supabase
    .from('citizen_reports')
    .select('id, category, description, status, photo_url, latitude, longitude, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const enriched = reports?.map((r) => ({
    ...r,
    reporter_name: r.profiles?.full_name ?? null,
    profiles: undefined,
  })) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Administrimi</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-1">Raportet e Qytetarëve</h1>
        <p className="text-sm text-slate-500 mt-0.5">Shqyrtoni dhe zgjidhni problemet e raportuara nga qytetarët.</p>
      </div>
      <ReportsTable initialReports={enriched} />
    </div>
  )
}
