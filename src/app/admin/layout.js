import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <AdminShell profile={profile}>
      {children}
    </AdminShell>
  )
}
