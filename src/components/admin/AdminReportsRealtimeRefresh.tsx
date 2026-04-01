'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function AdminReportsRealtimeRefresh() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const refreshTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const queueRefresh = () => {
      if (refreshTimeoutRef.current !== null || isPending) return

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        startTransition(() => {
          router.refresh()
        })
      }, 180)
    }

    const channel = supabase
      .channel('admin_dashboard_reports_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citizen_reports' },
        () => {
          queueRefresh()
        },
      )
      .subscribe()

    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [isPending, router, startTransition])

  return null
}
