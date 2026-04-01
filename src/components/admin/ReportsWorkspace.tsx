'use client'

import { useState } from 'react'
import ReportsGeoMap from './ReportsGeoMap'
import ReportsTable from './ReportsTable'

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
}

interface Props {
  reports: Report[]
}

export default function ReportsWorkspace({ reports }: Props) {
  const [focusedSelection, setFocusedSelection] = useState<{ id: string; nonce: number } | null>(null)

  return (
    <>
      <ReportsGeoMap reports={reports} externalSelection={focusedSelection} />
      <ReportsTable
        initialReports={reports}
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
