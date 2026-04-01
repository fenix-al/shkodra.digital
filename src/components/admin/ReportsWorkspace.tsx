'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReportsGeoMap from './ReportsGeoMap'
import ReportsTable from './ReportsTable'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

interface Report {
  id: string
  category: string
  description: string
  status: 'hapur' | 'në_shqyrtim' | 'zgjidhur' | 'refuzuar'
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  reporter_name: string | null
  reporter_id?: string | null
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
    reporter_name: reporterName,
  }
}

function sortReports(reports: Report[]) {
  return [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default function ReportsWorkspace({ reports }: Props) {
  const [focusedSelection, setFocusedSelection] = useState<{ id: string; nonce: number } | null>(null)
  const [insertedReports, setInsertedReports] = useState<Record<string, Report>>({})
  const [reportOverrides, setReportOverrides] = useState<Record<string, Report>>({})
  const [removedIds, setRemovedIds] = useState<Record<string, true>>({})
  const baseReportIdsRef = useRef(new Set<string>())
  const reporterNamesRef = useRef(new Map<string, string | null>())
  const requestedReporterIdsRef = useRef(new Set<string>())

  useEffect(() => {
    baseReportIdsRef.current = new Set(reports.map((report) => report.id))
    const nextReporterNames = new Map<string, string | null>()
    reports.forEach((report) => {
      if (report.reporter_id) {
        nextReporterNames.set(report.reporter_id, report.reporter_name ?? null)
      }
    })
    reporterNamesRef.current = nextReporterNames
  }, [reports])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const resolveReporterName = async (reporterId: string | null | undefined) => {
      if (!reporterId || reporterNamesRef.current.has(reporterId) || requestedReporterIdsRef.current.has(reporterId)) return

      requestedReporterIdsRef.current.add(reporterId)
      const { data } = await supabase.from('profiles').select('full_name').eq('id', reporterId).maybeSingle()
      const fullName = data?.full_name ?? null
      reporterNamesRef.current.set(reporterId, fullName)

      setInsertedReports((current) => {
        const next = { ...current }
        Object.entries(next).forEach(([reportId, report]) => {
          if (report.reporter_id === reporterId && report.reporter_name !== fullName) {
            next[reportId] = { ...report, reporter_name: fullName }
          }
        })
        return next
      })

      setReportOverrides((current) => {
        const next = { ...current }
        Object.entries(next).forEach(([reportId, report]) => {
          if (report.reporter_id === reporterId && report.reporter_name !== fullName) {
            next[reportId] = { ...report, reporter_name: fullName }
          }
        })
        return next
      })
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

            setInsertedReports((current) => {
              if (!(deletedId in current)) return current
              const next = { ...current }
              delete next[deletedId]
              return next
            })
            setReportOverrides((current) => {
              if (!(deletedId in current)) return current
              const next = { ...current }
              delete next[deletedId]
              return next
            })
            setRemovedIds((current) => ({ ...current, [deletedId]: true }))
            return
          }

          const row = payload.new as RealtimeReportRow | null
          if (!row?.id) return

          const reporterName = row.reporter_id ? reporterNamesRef.current.get(row.reporter_id) ?? null : null
          const normalized = normalizeRealtimeReport(row, reporterName)

          setRemovedIds((current) => {
            if (!(row.id in current)) return current
            const next = { ...current }
            delete next[row.id]
            return next
          })

          setInsertedReports((current) => {
            if (!(row.id in current) && baseReportIdsRef.current.has(row.id)) return current
            return {
              ...current,
              [row.id]: normalized,
            }
          })

          setReportOverrides((current) => {
            if (!(baseReportIdsRef.current.has(row.id) || row.id in current)) return current
            return {
              ...current,
              [row.id]: normalized,
            }
          })

          void resolveReporterName(row.reporter_id)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const liveReports = useMemo(() => {
    const baseReports = reports
      .filter((report) => !removedIds[report.id])
      .map((report) => reportOverrides[report.id] ?? report)

    const extraReports = Object.values(insertedReports).filter((report) => !removedIds[report.id] && !baseReports.some((item) => item.id === report.id))
    return sortReports([...extraReports, ...baseReports])
  }, [insertedReports, removedIds, reportOverrides, reports])

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
