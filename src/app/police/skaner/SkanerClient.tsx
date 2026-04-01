'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { processQRScan, processManualScan } from '@/actions/scanner'
import { Camera, CameraOff, KeyboardIcon, CheckCircle2, XCircle, LogIn, LogOut, Users, Scan } from 'lucide-react'
import { cx } from '@/lib/cx'

type ScanAction = 'ENTRY' | 'EXIT'
type Tab = 'camera' | 'manual'

interface ScanResult {
  success?: boolean
  error?: string
  action?: ScanAction
  plate_number?: string
  owner_name?: string
}

interface LogRow {
  plate_id: string
  action: string
  scan_method: string
  scanned_at: string
  authorized_plates: { plate_number: string; owner_name: string } | null
}

interface Props {
  occupancy: number
  capacity: number
  zoneName: string
  recentLogs: LogRow[]
}

function useCameraScanner(onDetect: (text: string) => void, active: boolean, onCameraError: (message: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    if (!active) {
      readerRef.current?.reset()
      return
    }

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (result) onDetect(result.getText())
          if (err && err.name !== 'NotFoundException') {
            onCameraError('Kamera nuk mund të aksesohej. Lejo aksesin.')
          }
        }
      )
      .catch(() => onCameraError('Kamera nuk mund të aksesohej. Lejo aksesin.'))

    return () => {
      reader.reset()
    }
  }, [active, onCameraError, onDetect])

  return { videoRef }
}

export default function SkanerClient({ occupancy, capacity, zoneName, recentLogs }: Props) {
  const [tab, setTab] = useState<Tab>('camera')
  const [action, setAction] = useState<ScanAction>('ENTRY')
  const [manualPlate, setManualPlate] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [cameraActive, setCameraActive] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)
  const actionRef = useRef<ScanAction>('ENTRY')

  useEffect(() => {
    actionRef.current = action
  }, [action])

  useEffect(() => {
    return () => {
      if (resultTimeout.current) clearTimeout(resultTimeout.current)
    }
  }, [])

  function showResult(r: ScanResult) {
    setResult(r)
    if (resultTimeout.current) clearTimeout(resultTimeout.current)
    resultTimeout.current = setTimeout(() => setResult(null), 5000)
  }

  const handleQRDetected = useCallback((token: string) => {
    if (processingRef.current) return
    processingRef.current = true
    setCameraActive(false)

    const fd = new FormData()
    fd.set('token', token)
    fd.set('action', actionRef.current)

    startTransition(async () => {
      const res = await processQRScan({}, fd)
      showResult(res as ScanResult)

      setTimeout(() => {
        processingRef.current = false
        setCameraActive(true)
      }, 3000)
    })
  }, [])

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message)
  }, [])

  const { videoRef } = useCameraScanner(handleQRDetected, tab === 'camera' && cameraActive, handleCameraError)

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualPlate || isPending) return

    const fd = new FormData()
    fd.set('plate_number', manualPlate)
    fd.set('action', action)

    startTransition(async () => {
      const res = await processManualScan({}, fd)
      showResult(res as ScanResult)
      if ((res as ScanResult).success) setManualPlate('')
    })
  }

  const occupancyPct = Math.min(100, Math.round((occupancy / capacity) * 100))
  const occupancyColor = occupancyPct >= 90 ? 'bg-rose-500' : occupancyPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="flex flex-col flex-1 max-w-lg mx-auto w-full px-4 py-5 gap-5">
      <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{zoneName}</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black tracking-tighter text-slate-100">{occupancy}</span>
            <span className="text-sm text-slate-500">/ {capacity} mjete</span>
          </div>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={cx('h-full rounded-full transition-all duration-500', occupancyColor)} style={{ width: `${occupancyPct}%` }} />
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-center shrink-0">
          <Users size={20} className="text-slate-400" />
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
        <button type="button" onClick={() => setAction('ENTRY')} className={cx('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95', action === 'ENTRY' ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300')}>
          <LogIn size={16} />
          Hyrje
        </button>
        <button type="button" onClick={() => setAction('EXIT')} className={cx('flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95', action === 'EXIT' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300')}>
          <LogOut size={16} />
          Dalje
        </button>
      </div>

      {result && (
        <div className={cx('flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all', result.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30')}>
          {result.success
            ? <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
            : <XCircle size={22} className="text-rose-400 shrink-0" />
          }
          <div>
            {result.success ? (
              <>
                <p className="text-sm font-bold text-emerald-400">{result.action === 'ENTRY' ? 'Hyrje e regjistruar' : 'Dalje e regjistruar'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{result.plate_number} - {result.owner_name}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-rose-400">{result.error}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 self-center">
        <button type="button" onClick={() => setTab('camera')} className={cx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95', tab === 'camera' ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300')}>
          <Camera size={13} />
          Kamera
        </button>
        <button type="button" onClick={() => setTab('manual')} className={cx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95', tab === 'manual' ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300')}>
          <KeyboardIcon size={13} />
          Manual
        </button>
      </div>

      {tab === 'camera' && (
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black aspect-square w-full">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {!cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                {cameraActive && !isPending && (
                  <div className="absolute left-2 right-2 h-0.5 bg-emerald-400/60 animate-[scan_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
                )}
              </div>
            </div>
          )}

          {isPending && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Scan size={32} className="text-emerald-400 animate-pulse" />
                <p className="text-sm font-semibold text-slate-300">Duke verifikuar...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <CameraOff size={32} className="text-slate-600" />
              <p className="text-sm text-slate-500">{cameraError}</p>
              <button type="button" onClick={() => { setCameraError(null); setCameraActive(false); setTimeout(() => setCameraActive(true), 100) }} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all active:scale-95">
                Provo Përsëri
              </button>
            </div>
          )}

          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
              <span className={cx('w-1.5 h-1.5 rounded-full', cameraActive && !isPending ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
              <span className="text-[10px] font-semibold text-slate-400">
                {isPending ? 'Duke verifikuar...' : cameraActive ? 'Skanon...' : 'Në pritje'}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Numri i Targës</label>
            <input type="text" value={manualPlate} onChange={(e) => setManualPlate(e.target.value.toUpperCase())} placeholder="p.sh. AB286AB" maxLength={10} autoComplete="off" autoCapitalize="characters" className="bg-black/40 border border-white/5 rounded-2xl py-4 px-5 text-xl font-mono font-bold text-white placeholder:text-slate-700 placeholder:font-normal placeholder:text-base focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all tracking-widest text-center uppercase" />
          </div>
          <button type="submit" disabled={!manualPlate || isPending} className={cx('w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40', action === 'ENTRY' ? 'bg-emerald-500 text-emerald-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-rose-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]')}>
            {isPending ? 'Duke regjistruar...' : action === 'ENTRY' ? 'Regjistro Hyrje' : 'Regjistro Dalje'}
          </button>
        </form>
      )}

      {recentLogs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Skanimi i sotëm</p>
          <div className="flex flex-col gap-1.5">
            {recentLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={cx('w-6 h-6 rounded-lg flex items-center justify-center shrink-0', log.action === 'ENTRY' ? 'bg-emerald-500/15' : 'bg-rose-500/15')}>
                    {log.action === 'ENTRY'
                      ? <LogIn size={11} className="text-emerald-400" />
                      : <LogOut size={11} className="text-rose-400" />
                    }
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-200">{log.authorized_plates?.plate_number ?? '—'}</p>
                    <p className="text-[10px] text-slate-500">{log.authorized_plates?.owner_name ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">{String(new Date(log.scanned_at).getUTCHours()).padStart(2, '0')}:{String(new Date(log.scanned_at).getUTCMinutes()).padStart(2, '0')}</p>
                  <p className={cx('text-[10px] font-semibold', log.scan_method === 'QR' ? 'text-blue-400' : 'text-slate-500')}>{log.scan_method}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
