import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CitizenLayout({ children }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Citizen chrome (navbar/bottom-nav) goes here in Sprint 4 */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
