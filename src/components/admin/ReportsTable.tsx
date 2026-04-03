'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  Flame,
  Image as ImageIcon,
  MapPin,
  Printer,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { updateReportStatus } from '@/actions/reports'
import { cx } from '@/lib/cx'
import { getReportPriority } from '@/lib/report-priority'

const REVIEW_STATUS = 'në_shqyrtim'

type ReportStatus = 'hapur' | typeof REVIEW_STATUS | 'zgjidhur' | 'refuzuar'
type PriorityFilter = 'all' | 'overdue' | 'urgent' | 'medium' | 'normal'
type CategoryFilter = 'all' | 'ndricim' | 'kanalizim' | 'rruge' | 'mbeturina' | 'akses' | 'tjeter'
type SortOption = 'priority_desc' | 'newest' | 'oldest'
type PriorityLevel = 'overdue' | 'urgent' | 'medium' | 'normal'

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
  follow_up_count?: number | null
  last_follow_up_at?: string | null
}

interface Props {
  reports: Report[]
  onFocusReport?: (reportId: string) => void
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string; dot: string }> = {
  hapur: { label: 'Hapur', className: 'border-rose-500/20 bg-rose-500/10 text-rose-400', dot: 'bg-rose-400' },
  [REVIEW_STATUS]: { label: 'Në shqyrtim', className: 'border-amber-500/20 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400 animate-pulse' },
  zgjidhur: { label: 'Zgjidhur', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  refuzuar: { label: 'Refuzuar', className: 'border-slate-500/20 bg-slate-500/10 text-slate-400', dot: 'bg-slate-400' },
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  ndricim: { label: 'Ndriçim', emoji: '💡' },
  kanalizim: { label: 'Kanalizim', emoji: '🚧' },
  rruge: { label: 'Rrugë', emoji: '🛣️' },
  mbeturina: { label: 'Mbeturina', emoji: '🗑️' },
  akses: { label: 'Akses', emoji: '🚗' },
  tjeter: { label: 'Tjetër', emoji: '📋' },
}

const STATUS_FILTERS: { value: 'all' | ReportStatus; label: string }[] = [
  { value: 'all', label: 'Të gjitha' },
  { value: 'hapur', label: 'Hapur' },
  { value: REVIEW_STATUS, label: 'Në shqyrtim' },
  { value: 'zgjidhur', label: 'Zgjidhur' },
  { value: 'refuzuar', label: 'Refuzuar' },
]

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'Te gjitha nivelet' },
  { value: 'overdue', label: 'Prapambetur' },
  { value: 'urgent', label: 'Urgjent' },
  { value: 'medium', label: 'Mesatar' },
  { value: 'normal', label: 'Normal' },
]

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Të gjitha kategoritë' },
  { value: 'ndricim', label: 'Ndriçim' },
  { value: 'kanalizim', label: 'Kanalizim' },
  { value: 'rruge', label: 'Rrugë' },
  { value: 'mbeturina', label: 'Mbeturina' },
  { value: 'akses', label: 'Akses' },
  { value: 'tjeter', label: 'Tjetër' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'priority_desc', label: 'Prioriteti më i lartë' },
  { value: 'newest', label: 'Më të rejat' },
  { value: 'oldest', label: 'Më të vjetrat' },
]

const NEXT_STATUSES: Partial<Record<ReportStatus, { value: ReportStatus; label: string; className: string }[]>> = {
  hapur: [
    { value: REVIEW_STATUS, label: 'Merr në shqyrtim', className: 'text-amber-400 hover:bg-amber-500/10' },
    { value: 'refuzuar', label: 'Refuzo', className: 'text-slate-400 hover:bg-white/5' },
  ],
  [REVIEW_STATUS]: [
    { value: 'zgjidhur', label: 'Shëno si zgjidhur', className: 'text-emerald-400 hover:bg-emerald-500/10' },
    { value: 'refuzuar', label: 'Refuzo', className: 'text-slate-400 hover:bg-white/5' },
  ],
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function csvEscape(value: string | number | null | undefined) {
  const stringValue = String(value ?? '')
  return `"${stringValue.replace(/"/g, '""')}"`
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getPriority(report: Report): { level: PriorityLevel; score: number; label: string; className: string } {
  const priority = getReportPriority(report)
  return {
    level: priority.level as PriorityLevel,
    score: priority.score,
    label: priority.label,
    className: priority.badgeClass,
  }
}

function buildWeeklyTrend(reports: Report[]) {
  const labels = ['Hen', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die']
  const now = new Date()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setUTCDate(now.getUTCDate() - (6 - index))
    date.setUTCHours(0, 0, 0, 0)
    return { key: date.toISOString().slice(0, 10), label: labels[date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1], count: 0 }
  })

  const map = new Map(days.map((day) => [day.key, day]))
  reports.forEach((report) => {
    const key = new Date(report.created_at).toISOString().slice(0, 10)
    const bucket = map.get(key)
    if (bucket) bucket.count += 1
  })

  return days
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'rose' | 'amber' | 'blue' | 'orange' }) {
  const toneClass = {
    slate: 'border-white/10 bg-white/[0.03] text-slate-300',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    orange: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
  }[tone]

  return (
    <div className={cx('rounded-3xl border backdrop-blur-md p-5', toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
    </div>
  )
}

function PrioritySummaryRow({ label, value, tone }: { label: string; value: number; tone: 'rose' | 'amber' | 'blue' | 'orange' }) {
  const className = {
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    orange: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
  }[tone]

  return (
    <div className={cx('flex items-center justify-between rounded-2xl border px-4 py-3', className)}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: ReturnType<typeof getPriority> }) {
  return (
    <div className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0', priority.className)}>
      {priority.level === 'urgent' ? <Flame size={10} /> : <Clock size={10} />}
      {priority.label}
    </div>
  )
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.refuzuar
  return (
    <div className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0', cfg.className)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </div>
  )
}

export default function ReportsTable({ reports: baseReports, onFocusReport }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority_desc')
  const [search, setSearch] = useState('')
  const [detailReportId, setDetailReportId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<string, ReportStatus>>({})
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryReportId = searchParams.get('reportId')
  const reports = useMemo(
    () =>
      baseReports.map((report) => {
        const pendingStatus = pendingStatusChanges[report.id]
        return pendingStatus ? { ...report, status: pendingStatus } : report
      }),
    [baseReports, pendingStatusChanges],
  )
  const detailReport = useMemo(
    () => reports.find((report) => report.id === (detailReportId ?? queryReportId)) ?? null,
    [detailReportId, queryReportId, reports],
  )

  useEffect(() => {
    if (queryReportId) {
      onFocusReport?.(queryReportId)
    }
  }, [onFocusReport, queryReportId])

  function openReportDetail(report: Report) {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set('reportId', report.id)
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false })
    onFocusReport?.(report.id)
    setDetailReportId(report.id)
  }

  function closeReportDetail() {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete('reportId')
    const query = nextSearchParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    setDetailReportId(null)
  }

  function handleStatusChange(reportId: string, newStatus: ReportStatus) {
    setOpenMenuId(null)
    startTransition(async () => {
      setPendingStatusChanges((current) => ({ ...current, [reportId]: newStatus }))
      try {
        await updateReportStatus(reportId, newStatus)
      } catch {
        setPendingStatusChanges((current) => {
          if (!(reportId in current)) return current
          const next = { ...current }
          delete next[reportId]
          return next
        })
        return
      }

      setPendingStatusChanges((current) => {
        if (!(reportId in current)) return current
        const next = { ...current }
        delete next[reportId]
        return next
      })
    })
  }

  const counts = useMemo(() => ({
    total: reports.length,
    hapur: reports.filter((r) => r.status === 'hapur').length,
    neShqyrtim: reports.filter((r) => r.status === REVIEW_STATUS).length,
    zgjidhur: reports.filter((r) => r.status === 'zgjidhur').length,
    prapambetur: reports.filter((r) => getPriority(r).level === 'overdue').length,
  }), [reports])

  const categorySummary = useMemo(() => {
    const total = reports.length || 1
    return Object.entries(CATEGORY_LABELS)
      .map(([value, config]) => {
        const count = reports.filter((report) => report.category === value).length
        return {
          value,
          label: config.label,
          emoji: config.emoji,
          count,
          width: `${Math.max(8, Math.round((count / total) * 100))}%`,
        }
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [reports])

  const weeklyTrend = useMemo(() => buildWeeklyTrend(reports), [reports])
  const weeklyPeak = useMemo(() => Math.max(1, ...weeklyTrend.map((item) => item.count)), [weeklyTrend])

  const prioritySummary = useMemo(() => {
    const summary = { overdue: 0, urgent: 0, medium: 0, normal: 0 }
    reports.forEach((report) => {
      summary[getPriority(report).level] += 1
    })
    return summary
  }, [reports])

  const filtered = useMemo(() => {
    const query = normalizeText(search)

    const result = reports.filter((report) => {
      if (statusFilter !== 'all' && report.status !== statusFilter) return false
      if (categoryFilter !== 'all' && report.category !== categoryFilter) return false
      if (priorityFilter !== 'all' && getPriority(report).level !== priorityFilter) return false

      if (!query) return true

      const haystack = normalizeText([
        report.description,
        report.reporter_name,
        CATEGORY_LABELS[report.category]?.label ?? report.category,
        STATUS_CONFIG[report.status]?.label ?? report.status,
      ].join(' '))

      return haystack.includes(query)
    })

    return [...result].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

      const priorityDelta = getPriority(b).score - getPriority(a).score
      if (priorityDelta !== 0) return priorityDelta
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [reports, statusFilter, categoryFilter, priorityFilter, search, sortBy])

  const exportRows = useMemo(() => filtered.map((report) => ({
    id: report.id,
    category: CATEGORY_LABELS[report.category]?.label ?? report.category,
    status: STATUS_CONFIG[report.status]?.label ?? report.status,
    priority: getPriority(report).label,
    reporter: report.reporter_name ?? 'Pa emër',
    description: report.description,
    followUps: Number(report.follow_up_count ?? 0),
    coordinates: report.latitude !== null && report.longitude !== null ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}` : 'Pa koordinata',
    date: formatDate(report.created_at),
  })), [filtered])

  const activeFiltersLabel = useMemo(() => {
    const labels = [
      `Statusi: ${STATUS_FILTERS.find((option) => option.value === statusFilter)?.label ?? 'Të gjitha'}`,
      `Kategoria: ${CATEGORY_FILTERS.find((option) => option.value === categoryFilter)?.label ?? 'Të gjitha kategoritë'}`,
            `Prioriteti: ${PRIORITY_FILTERS.find((option) => option.value === priorityFilter)?.label ?? 'Te gjitha nivelet'}`,
      `Renditja: ${SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Prioriteti më i lartë'}`,
    ]

    if (search.trim()) {
      labels.push(`Kërkimi: ${search.trim()}`)
    }

    return labels.join(' | ')
  }, [categoryFilter, priorityFilter, search, sortBy, statusFilter])

  const exportSummary = useMemo(() => ([
    { label: 'Raporte në eksport', value: filtered.length },
    { label: 'Prapambetura', value: filtered.filter((report) => getPriority(report).level === 'overdue').length },
    { label: 'Urgjente', value: filtered.filter((report) => getPriority(report).level === 'urgent').length },
    { label: 'Të zgjidhura', value: filtered.filter((report) => report.status === 'zgjidhur').length },
  ]), [filtered])

  function exportCsv() {
    const headers = ['ID', 'Kategoria', 'Statusi', 'Prioriteti', 'Raportuar Nga', 'Pershkrimi', 'Kujtesa', 'Latitude', 'Longitude', 'Data']
    const rows = filtered.map((report) => [
      report.id,
      CATEGORY_LABELS[report.category]?.label ?? report.category,
      STATUS_CONFIG[report.status]?.label ?? report.status,
      getPriority(report).label,
      report.reporter_name ?? '',
      report.description,
      Number(report.follow_up_count ?? 0),
      report.latitude ?? '',
      report.longitude ?? '',
      formatDate(report.created_at),
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `raporte-qytetare-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportExcel() {
    const headers = ['ID', 'Kategoria', 'Statusi', 'Prioriteti', 'Raportuar Nga', 'Përshkrimi', 'Ka Foto', 'Koordinatat', 'Data']
    const xmlRows = [
      ...exportSummary.map((item) => `
        <Row>
          <Cell ss:StyleID="label"><Data ss:Type="String">${escapeHtml(item.label)}</Data></Cell>
          <Cell ss:StyleID="value"><Data ss:Type="Number">${item.value}</Data></Cell>
        </Row>
      `),
      `<Row><Cell><Data ss:Type="String">${escapeHtml(activeFiltersLabel)}</Data></Cell></Row>`,
      '<Row />',
      `<Row>${headers.map((header) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeHtml(header)}</Data></Cell>`).join('')}</Row>`,
      ...exportRows.map((row) => `
        <Row>
          <Cell><Data ss:Type="String">${escapeHtml(row.id)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.category)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.status)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.priority)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.reporter)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.description)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.followUps)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.coordinates)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(row.date)}</Data></Cell>
        </Row>
      `),
    ].join('')

    const workbook = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:html="http://www.w3.org/TR/REC-html40">
        <Styles>
          <Style ss:ID="header">
            <Font ss:Bold="1" />
            <Interior ss:Color="#D9F99D" ss:Pattern="Solid" />
          </Style>
          <Style ss:ID="label">
            <Font ss:Bold="1" />
          </Style>
          <Style ss:ID="value">
            <NumberFormat ss:Format="0" />
          </Style>
        </Styles>
        <Worksheet ss:Name="Raportet">
          <Table>${xmlRows}</Table>
        </Worksheet>
      </Workbook>`

    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `raporte-qytetare-${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const logoUrl = `${window.location.origin}/municipality-shkoder-logo.svg`

    const summaryHtml = exportSummary.map((item) => `
      <div class="card">
        <div class="card-label">${escapeHtml(item.label)}</div>
        <div class="card-value">${item.value}</div>
      </div>
    `).join('')

    const rowsHtml = exportRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.priority)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.reporter)}</td>
        <td>${escapeHtml(row.followUps)}</td>
        <td>${escapeHtml(row.coordinates)}</td>
        <td>${escapeHtml(row.description)}</td>
      </tr>
    `).join('')

    const html = `
      <!doctype html>
      <html lang="sq">
        <head>
          <meta charset="utf-8" />
          <title>Raport zyrtar i raporteve qytetare</title>
          <style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { margin: 0; font-size: 28px; }
            h2 { margin: 0; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
            p { margin: 6px 0; }
            .muted { color: #475569; font-size: 12px; }
            .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
            .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 14px; background: #f8fafc; }
            .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; }
            .card-value { font-size: 28px; font-weight: 800; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; text-align: left; }
            th { background: #e2e8f0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
            .cover { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #cbd5e1; }
            .brand { display: flex; gap: 18px; align-items: center; }
            .brand img { width: 74px; height: auto; flex-shrink: 0; }
            .brand-copy { display: flex; flex-direction: column; gap: 2px; }
            .badge { border: 1px solid #94a3b8; border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 700; }
            .footer { margin-top: 18px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: #64748b; }
            @media print {
              body { margin: 16px; }
              .print-note { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="cover">
            <div class="brand">
              <img src="${logoUrl}" alt="Logo Bashkia Shkodër" />
              <div class="brand-copy">
                <h2>Bashkia Shkodër</h2>
                <h1>Raport Zyrtar i Raporteve Qytetare</h1>
                <p class="muted">Platforma Shkodra.digital</p>
              </div>
            </div>
            <div>
              <p class="muted">Gjeneruar më: ${escapeHtml(new Date().toLocaleString('sq-AL'))}</p>
              <p class="muted">${escapeHtml(activeFiltersLabel)}</p>
            </div>
          </div>

          <div class="summary">${summaryHtml}</div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Kategoria</th>
                <th>Prioriteti</th>
                <th>Statusi</th>
                <th>Raportuar nga</th>
                <th>Foto</th>
                <th>Koordinatat</th>
                <th>Përshkrimi</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="footer">
            <span>Dokument i gjeneruar automatikisht për përdorim administrativ dhe prezantime zyrtare.</span>
            <span>Totali në dokument: ${filtered.length}</span>
          </div>

          <p class="muted print-note">Përdor Print ose Save as PDF për të ruajtur dokumentin.</p>
        </body>
      </html>
    `

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    iframe.onload = () => {
      const frameWindow = iframe.contentWindow
      if (!frameWindow) return
      window.setTimeout(() => {
        frameWindow.focus()
        frameWindow.print()
      }, 250)
      window.setTimeout(() => {
        document.body.removeChild(iframe)
      }, 2000)
    }
    document.body.appendChild(iframe)
    iframe.srcdoc = html
  }

  return (
    <>
      {detailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeReportDetail} aria-hidden />
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_LABELS[detailReport.category]?.emoji ?? '📋'}</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{CATEGORY_LABELS[detailReport.category]?.label ?? detailReport.category}</h3>
                  <p className="text-xs text-slate-500">{formatDate(detailReport.created_at)}</p>
                </div>
              </div>
              <button type="button" onClick={closeReportDetail} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95">
                <X size={17} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={detailReport.status} />
                <PriorityBadge priority={getPriority(detailReport)} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Përshkrimi</p>
                <p className="text-sm text-slate-300 leading-relaxed">{detailReport.description}</p>
              </div>
              {detailReport.reporter_name && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Raportuar nga</p>
                  <p className="text-sm text-slate-300">{detailReport.reporter_name}</p>
                </div>
              )}
              {(detailReport.latitude && detailReport.longitude) && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <MapPin size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-xs font-mono text-slate-400">{detailReport.latitude.toFixed(5)}, {detailReport.longitude.toFixed(5)}</span>
                  </div>
                  <a href={`https://www.google.com/maps?q=${detailReport.latitude},${detailReport.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95 shrink-0">
                    <ExternalLink size={12} />
                    Hartë
                  </a>
                </div>
              )}
              {detailReport.photo_url && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Foto</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detailReport.photo_url} alt="Foto e raportit" className="w-full rounded-2xl object-cover max-h-64 border border-white/5" />
                </div>
              )}
              {NEXT_STATUSES[detailReport.status] && (
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  {NEXT_STATUSES[detailReport.status]!.map((ns) => (
                    <button key={ns.value} type="button" disabled={isPending} onClick={() => { handleStatusChange(detailReport.id, ns.value) }} className={cx('flex-1 py-2.5 rounded-xl text-xs font-bold border border-white/5 transition-all active:scale-95 disabled:opacity-40', ns.className)}>
                      {ns.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard label="Totali i Raporteve" value={counts.total} tone="slate" />
          <SummaryCard label="Të Hapura" value={counts.hapur} tone="rose" />
          <SummaryCard label="Në Shqyrtim" value={counts.neShqyrtim} tone="amber" />
          <SummaryCard label="Prapambetura" value={counts.prapambetur} tone="orange" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tendenca</p>
                <h3 className="text-sm font-semibold text-slate-200 mt-1">Raportet e 7 ditëve të fundit</h3>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                Kulmi: {weeklyPeak} raporte
              </div>
            </div>
            <div className="flex items-end gap-3 h-48">
              {weeklyTrend.map((item) => (
                <div key={item.key} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full rounded-t-2xl bg-gradient-to-t from-blue-400 to-emerald-400 shadow-[0_8px_25px_rgba(52,211,153,0.16)]" style={{ height: `${Math.max(12, Math.round((item.count / weeklyPeak) * 160))}px` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs text-slate-300">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Prioriteti</p>
                <h3 className="text-sm font-semibold text-slate-200 mt-1">Ngarkesa operative</h3>
              </div>
              <Flame size={18} className="text-rose-400" />
            </div>
            <div className="flex flex-col gap-3">
              <PrioritySummaryRow label="Prapambetur" value={prioritySummary.overdue} tone="orange" />
              <PrioritySummaryRow label="Urgjent" value={prioritySummary.urgent} tone="rose" />
              <PrioritySummaryRow label="Mesatar" value={prioritySummary.medium} tone="amber" />
              <PrioritySummaryRow label="Normal" value={prioritySummary.normal} tone="blue" />
            </div>
          </div>
        </div>

        {categorySummary.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shpërndarja</p>
                <h3 className="text-sm font-semibold text-slate-200 mt-1">Raportet sipas kategorive</h3>
              </div>
              <div className="text-xs text-slate-500">{reports.length} raporte gjithsej</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categorySummary.map((item) => (
                <div key={item.value} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span>{item.emoji}</span>
                      <span className="font-semibold">{item.label}</span>
                    </span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-slate-300">
                <SlidersHorizontal size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold">Kërko, filtro, rendit dhe eksporto</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <Search size={15} className="text-slate-500 shrink-0" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kërko në përshkrim ose raportues" className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none" />
                </label>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | ReportStatus)} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-200 focus:outline-none">
                  {STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>
                  ))}
                </select>

                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-200 focus:outline-none">
                  {CATEGORY_FILTERS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>
                  ))}
                </select>

                                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-slate-200 focus:outline-none">
                  {PRIORITY_FILTERS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <ArrowDownWideNarrow size={15} className="text-slate-500 shrink-0" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="w-full bg-transparent text-sm text-slate-200 focus:outline-none">
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setPriorityFilter('all'); setSortBy('priority_desc') }} className="px-4 py-3 rounded-2xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-all active:scale-95">
                Pastro filtrat
              </button>
              <button type="button" onClick={exportExcel} className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-sm font-bold text-emerald-300 hover:bg-emerald-400/15 transition-all active:scale-95">
                <FileSpreadsheet size={16} />
                Eksporto Excel
              </button>
              <button type="button" onClick={exportPdf} className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 text-sm font-bold text-slate-200 hover:bg-white/5 transition-all active:scale-95">
                <Printer size={16} />
                Eksporto PDF
              </button>
              <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-950 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all active:scale-95">
                <Download size={16} />
                Eksporto CSV
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>Në ekran: <span className="text-slate-300 font-semibold">{filtered.length}</span></span>
            <span>Totali: <span className="text-slate-300 font-semibold">{reports.length}</span></span>
            <span>Eksporti ndjek filtrat dhe renditjen aktuale</span>
          </div>
        </div>

        {(counts.hapur > 0 || counts.neShqyrtim > 0) && (
          <div className="flex gap-3 flex-wrap">
            {counts.hapur > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle size={13} className="text-rose-400" />
                <span className="text-xs font-bold text-rose-400">{counts.hapur} raporte të hapura</span>
              </div>
            )}
            {counts.neShqyrtim > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Clock size={13} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{counts.neShqyrtim} në shqyrtim</span>
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 backdrop-blur-md bg-white/[0.02] border border-white/5 rounded-3xl">
            <CheckCircle2 size={36} className="text-slate-700" />
            <p className="text-sm text-slate-500 font-semibold">Nuk ka raporte për këtë filtër.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((report) => {
              const cat = CATEGORY_LABELS[report.category] ?? { label: report.category, emoji: '📋' }
              const nextActions = NEXT_STATUSES[report.status]
              const priority = getPriority(report)

              return (
                <div key={report.id} className="group backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200 flex flex-col">
                  {report.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={report.photo_url} alt="" className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-white/[0.02] flex items-center justify-center">
                      <ImageIcon size={24} className="text-slate-700" />
                    </div>
                  )}

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{cat.label}</p>
                          <p className="text-[10px] text-slate-500">{formatDate(report.created_at)}</p>
                        </div>
                      </div>
                      <StatusBadge status={report.status} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PriorityBadge priority={priority} />
                      {priority.level === 'urgent' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-300">
                          <Sparkles size={10} />
                          Vëmendje
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed flex-1">{report.description}</p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-600">
                      {report.photo_url && <span className="flex items-center gap-1"><ImageIcon size={10} />Foto</span>}
                      {(report.latitude && report.longitude) && (
                        <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                          <MapPin size={10} />GPS
                        </a>
                      )}
                      {report.reporter_name && <span className="truncate max-w-[100px]">{report.reporter_name}</span>}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          openReportDetail(report)
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all active:scale-95"
                      >
                        <Eye size={11} />
                        Detaje
                      </button>

                      {nextActions && (
                        <div className="relative flex-1">
                          <button type="button" onClick={() => setOpenMenuId(openMenuId === report.id ? null : report.id)} disabled={isPending} className="w-full flex items-center justify-between gap-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all active:scale-95 disabled:opacity-40">
                            Ndrysho
                            <ChevronDown size={11} className={cx('transition-transform', openMenuId === report.id ? 'rotate-180' : '')} />
                          </button>
                          {openMenuId === report.id && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl backdrop-blur-xl bg-[#050914]/98 border border-white/10 shadow-2xl overflow-hidden z-10">
                              {nextActions.map((ns) => (
                                <button key={ns.value} type="button" onClick={() => handleStatusChange(report.id, ns.value)} className={cx('w-full text-left px-3 py-2.5 text-xs font-semibold transition-all', ns.className)}>
                                  {ns.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-slate-600 text-center">
          Duke shfaqur <span className="text-slate-400 font-semibold">{filtered.length}</span> nga <span className="text-slate-400 font-semibold">{reports.length}</span> raporte
        </p>
      </div>
    </>
  )
}

