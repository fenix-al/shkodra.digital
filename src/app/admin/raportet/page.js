import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Raportet | Shkodra.digital',
}

export default async function RaportetPage() {
  const supabase = await createServerSupabaseClient()

  const { data: reports } = await supabase
    .from('citizen_reports')
    .select('id, category, description, status, created_at, photo_url')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
        Raportet e Qytetarëve
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Shqyrtoni dhe zgjidhni problemet e raportuara
      </p>
      {/* ReportsTable component — Sprint 5 */}
      <pre className="mt-4 text-xs text-zinc-500">
        {JSON.stringify(reports?.slice(0, 3), null, 2)}
      </pre>
    </div>
  )
}
