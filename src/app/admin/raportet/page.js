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

  const { data: reports, error: reportsError } = await supabase
    .from('citizen_reports')
    .select('id, category, description, status, photo_url, latitude, longitude, created_at, reporter_id')
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch reporter names separately to avoid FK join dependency
  let reporterMap = {}
  if (reports && reports.length > 0) {
    const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))]
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', reporterIds)
    reporterMap = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p.full_name]))
  }

  const enriched = reports?.map((r) => ({
    ...r,
    reporter_name: reporterMap[r.reporter_id] ?? null,
  })) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Administrimi</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-1">Raportet e Qytetarëve</h1>
        <p className="text-sm text-slate-500 mt-0.5">Shqyrtoni dhe zgjidhni problemet e raportuara nga qytetarët.</p>
      </div>
      {reportsError && (
        <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-400">
          DB Error: {reportsError.message} (code: {reportsError.code})
        </div>
      )}
      <ReportsTable initialReports={enriched} />
    </div>
  )
}
