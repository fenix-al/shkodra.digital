'use client'

import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import ReportsGeoMap from './ReportsGeoMap'
import ReportsTable from './ReportsTable'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type ReportStatus = ComponentProps<typeof ReportsGeoMap>['reports'][number]['status']

interface Report {
  id: string
  category: string
  description: string
  status: ReportStatus
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  reporter_name: string | null
  reporter_id?: string | null
  follow_up_count?: number | null
  last_follow_up_at?: string | null
}

interface RealtimeReportRow {
  id: string
  category: string
  description: string
  status: Report['status']
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  reporter_id: string | null
  follow_up_count: number | null
  last_follow_up_at: string | null
}

interface ProfileRow {
  id: string
  full_name: string | null
}

interface Props {
  reports: Report[]
}

function normalizeRealtimeReport(row: RealtimeReportRow, reporterName: string | null): Report {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    status: row.status,
    photo_url: row.photo_url,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: row.created_at,
    reporter_id: row.reporter_id,
    follow_up_count: row.follow_up_count,
    last_follow_up_at: row.last_follow_up_at,
    reporter_name: reporterName,
  }
}

function sortReports(reports: Report[]) {
  return [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default function ReportsWorkspace({ reports }: Props) {
  const [focusedSelection, setFocusedSelection] = useState<{ id: string; nonce: number } | null>(null)
  const [currentReports, setCurrentReports] = useState<Report[]>(() => sortReports(reports))
  const reporterNamesRef = useRef<Map<string, string | null>>(new Map())
  const reportsRef = useRef<Report[]>(sortReports(reports))

  useEffect(() => {
    const nextNames = new Map<string, string | null>()
    reportsRef.current = sortReports(reports)

    reportsRef.current.forEach((report) => {
      if (report.reporter_id) {
        nextNames.set(report.reporter_id, report.reporter_name ?? null)
      }
    })

    reporterNamesRef.current = nextNames
  }, [reports])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    async function fetchReporterNames(ids: string[]) {
      const uniqueIds = [...new Set(ids.filter(Boolean))]
      if (uniqueIds.length === 0) return new Map<string, string | null>()

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uniqueIds)

      return new Map((data as ProfileRow[] | null ?? []).map((item) => [item.id, item.full_name ?? null]))
    }

    async function syncLatestReports() {
      const { data: rows } = await supabase
        .from('citizen_reports')
        .select('id, category, description, status, photo_url, latitude, longitude, created_at, reporter_id, follow_up_count, last_follow_up_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!rows) return

      const names = reporterNamesRef.current
      const missingReporterIds = [...new Set(
        rows
          .map((row) => row.reporter_id)
          .filter((id): id is string => Boolean(id) && !names.has(id)),
      )]

      if (missingReporterIds.length > 0) {
        const fetchedReporterNames = await fetchReporterNames(missingReporterIds)
        fetchedReporterNames.forEach((value, key) => names.set(key, value))
      }

      const nextReports = rows.map((row) =>
        normalizeRealtimeReport(
          row as RealtimeReportRow,
          row.reporter_id ? names.get(row.reporter_id) ?? null : null,
        ),
      )

      const sortedReports = sortReports(nextReports)
      reportsRef.current = sortedReports
      setCurrentReports(sortedReports)
    }

    const channel = supabase
      .channel('citizen_reports_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citizen_reports' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id ?? '')
            if (!deletedId) return

            setCurrentReports((prev) => {
              const next = prev.filter((report) => report.id !== deletedId)
              reportsRef.current = next
              return next
            })
            return
          }

          const row = payload.new as RealtimeReportRow | null
          if (!row?.id) return

          const names = reporterNamesRef.current
          let reporterName = row.reporter_id ? names.get(row.reporter_id) ?? null : null

          if (row.reporter_id && !names.has(row.reporter_id)) {
            const fetchedReporterNames = await fetchReporterNames([row.reporter_id])
            reporterName = fetchedReporterNames.get(row.reporter_id) ?? null
            names.set(row.reporter_id, reporterName)
          }

          const normalized = normalizeRealtimeReport(row, reporterName)
          setCurrentReports((prev) => {
            const existing = prev.some((report) => report.id === normalized.id)
            const next = existing
              ? prev.map((report) => (report.id === normalized.id ? normalized : report))
              : [normalized, ...prev]
            const sorted = sortReports(next)
            reportsRef.current = sorted
            return sorted
          })
        },
      )
      .subscribe()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncLatestReports()
      }
    }, 2500)

    return () => {
      window.clearInterval(intervalId)
      void supabase.removeChannel(channel)
    }
  }, [])

  const liveReports = useMemo(() => sortReports(currentReports), [currentReports])

  return (
    <>
      <ReportsGeoMap reports={liveReports} externalSelection={focusedSelection} />
      <ReportsTable
        reports={liveReports}
        onFocusReport={(reportId) => {
          setFocusedSelection((current) => ({
            id: reportId,
            nonce: (current?.nonce ?? 0) + 1,
          }))
        }}
      />
    </>
  )
}
