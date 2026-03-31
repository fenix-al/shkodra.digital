'use client'

import { useState, useRef, useTransition } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { importPlates } from '@/actions/authorizations'
import { cx } from '@/lib/cx'

interface ParsedRow {
  plate_number: string
  owner_name: string
  vehicle_type: string
  valid_from: string
  valid_until: string
  _error?: string
}

interface Props {
  open: boolean
  onClose: () => void
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
// Expected columns (with header row):
//   Targa | Emri | Lloji | Data fillimit | Data mbarimit
// OR without header, positional: col0=Targa, col1=Emri, col2=Lloji, col3=valid_from, col4=valid_until
// Date formats accepted: DD.MM.YYYY or YYYY-MM-DD

function parseDate(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  // DD.MM.YYYY → YYYY-MM-DD
  const ddmmyyyy = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  return ''
}

// Parse "DD.MM.YYYY-DD.MM.YYYY" range (as seen in the spreadsheet)
function parseDateRange(raw: string): { from: string; until: string } {
  const parts = raw.split('-')
  if (parts.length === 2) {
    return { from: parseDate(parts[0]), until: parseDate(parts[1]) }
  }
  // could be "DD.MM.YYYY - DD.MM.YYYY" with spaces
  const spaceParts = raw.split(' - ')
  if (spaceParts.length === 2) {
    return { from: parseDate(spaceParts[0]), until: parseDate(spaceParts[1]) }
  }
  return { from: '', until: '' }
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  // Detect if first line is a header
  const firstCell = lines[0].split(/[,;]/, 1)[0].trim().toLowerCase()
  const hasHeader = firstCell === 'targa' || firstCell === 'plate' || firstCell === 'plate_number'
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map((line, i) => {
    const cols = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ''))
    const plate_number = (cols[0] ?? '').toUpperCase()
    const owner_name   = cols[1] ?? ''

    // col2 may be vehicle type OR a date range
    let vehicle_type = ''
    let valid_from   = ''
    let valid_until  = ''

    if (cols.length === 5) {
      // Targa, Emri, Lloji, valid_from, valid_until
      vehicle_type = cols[2] ?? ''
      valid_from   = parseDate(cols[3])
      valid_until  = parseDate(cols[4])
    } else if (cols.length === 4) {
      // Targa, Emri, DateRange, Lloji  OR  Targa, Emri, Lloji, DateRange
      const col2range = parseDateRange(cols[2])
      if (col2range.from) {
        valid_from   = col2range.from
        valid_until  = col2range.until
        vehicle_type = cols[3] ?? ''
      } else {
        vehicle_type = cols[2]
        const col3range = parseDateRange(cols[3])
        valid_from   = col3range.from
        valid_until  = col3range.until
      }
    } else if (cols.length === 3) {
      // Targa, Emri, DateRange
      const range = parseDateRange(cols[2])
      valid_from  = range.from
      valid_until = range.until
    }

    const _error = !plate_number ? `Rreshti ${i + 1}: targa mungon` : !owner_name ? `Rreshti ${i + 1}: emri mungon` : undefined
    return { plate_number, owner_name, vehicle_type, valid_from, valid_until, _error }
  })
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const header = 'Targa,Emri i plotë,Lloji,Data fillimit,Data mbarimit'
  const example = [
    'AB286AB,Kastriot Kruja,car,2026-03-06,2026-12-31',
    'AB095SX,Arnold Lici,car,2026-03-06,2026-12-31',
    'AB688PP,Ymerjon Dashi,,2026-03-06,2026-12-31',
  ].join('\n')
  const blob = new Blob([header + '\n' + example], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'shembull-importim-targa.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPlatesModal({ open, onClose }: Props) {
  const [rows, setRows]       = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult]   = useState<{ error?: string; success?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function handleFile(file: File) {
    setResult(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRows(parseCSV(text))
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleConfirm() {
    const valid = rows.filter((r) => !r._error)
    if (valid.length === 0) return

    startTransition(async () => {
      const res = await importPlates(valid)
      setResult(res)
      if (res?.success) {
        setTimeout(() => { setRows([]); setFileName(''); onClose() }, 1200)
      }
    })
  }

  function reset() {
    setRows([])
    setFileName('')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const validRows   = rows.filter((r) => !r._error)
  const invalidRows = rows.filter((r) => r._error)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-2xl backdrop-blur-xl bg-[#050914]/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-7 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={17} className="text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Importo nga Excel / CSV</h2>
              <p className="text-xs text-slate-500">Ngarko skedarin dhe konfirmo importimin</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95">
            <X size={17} />
          </button>
        </div>

        <div className="p-7 flex flex-col gap-5 overflow-y-auto">

          {/* Template download */}
          <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 self-start text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            <Download size={13} />
            Shkarko shembullin CSV
          </button>

          {/* Drop zone */}
          {rows.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500/40 hover:bg-white/[0.02] transition-all group"
            >
              <Upload size={28} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-400">Tërhiq skedarin këtu ose klikoni</p>
                <p className="text-xs text-slate-600 mt-1">Pranohet .csv — kolona: Targa, Emri, Lloji, Data fillimit, Data mbarimit</p>
              </div>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={15} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-300">{fileName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-400 font-semibold">{validRows.length} të vlefshme</span>
                  {invalidRows.length > 0 && <span className="text-xs text-rose-400 font-semibold">{invalidRows.length} me gabim</span>}
                  <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">Ndrysho</button>
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-auto rounded-2xl border border-white/5 max-h-64">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Targa</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Emri</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Data fillimit</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Data mbarimit</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Statusi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((r, i) => (
                      <tr key={i} className={cx('transition-colors', r._error ? 'bg-rose-500/5' : 'hover:bg-white/[0.02]')}>
                        <td className="px-4 py-2.5 font-mono font-bold text-white">{r.plate_number || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-300">{r.owner_name || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400">{r.valid_from || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400">{r.valid_until || '—'}</td>
                        <td className="px-4 py-2.5">
                          {r._error
                            ? <span className="flex items-center gap-1 text-rose-400"><AlertCircle size={11} />{r._error}</span>
                            : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={11} />OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Feedback */}
          {result?.error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">{result.error}</div>
          )}
          {result?.success && (
            <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">{result.success}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-7 pt-0">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all active:scale-95">
            Anulo
          </button>
          {validRows.length > 0 && (
            <button type="button" onClick={handleConfirm} disabled={isPending} className={cx('flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50', 'bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]')}>
              <Upload size={16} />
              {isPending ? 'Duke importuar...' : `Importo ${validRows.length} targa`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
