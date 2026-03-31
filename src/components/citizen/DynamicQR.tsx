'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'react-qr-code'
import { getQRToken } from '@/actions/qr'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import { cx } from '@/lib/cx'

const REFRESH_INTERVAL_MS = 45_000 // 45s — before 60s expiry

interface Props {
  plateId: string
  plateNumber: string
}

export default function DynamicQR({ plateId, plateNumber }: Props) {
  const [token, setToken]       = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [isPulsing, setIsPulsing] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(45)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refresh() {
    const res = await getQRToken(plateId)
    if ('error' in res) {
      setError(res.error)
      setToken(null)
    } else {
      setToken(res.token)
      setError(null)
      // Pulse animation on refresh
      setIsPulsing(true)
      setTimeout(() => setIsPulsing(false), 600)
      // Reset countdown
      setSecondsLeft(45)
    }
  }

  useEffect(() => {
    refresh()

    // Refresh token every 45s
    timerRef.current = setInterval(refresh, REFRESH_INTERVAL_MS)

    // Countdown display
    countRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 45 : s - 1))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5">
        <ShieldAlert size={28} className="text-rose-400" />
        <p className="text-sm font-semibold text-rose-400 text-center">{error}</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR code container */}
      <div className={cx('relative p-5 rounded-3xl bg-white transition-all duration-300', isPulsing ? 'scale-95 shadow-[0_0_40px_rgba(52,211,153,0.4)]' : 'scale-100 shadow-[0_0_20px_rgba(52,211,153,0.1)]')}>
        <QRCode
          value={token}
          size={220}
          bgColor="#ffffff"
          fgColor="#030712"
          level="M"
        />
        {/* Pulse overlay on refresh */}
        {isPulsing && (
          <div className="absolute inset-0 rounded-3xl bg-emerald-400/20 animate-ping" />
        )}
      </div>

      {/* Plate number */}
      <div className="px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
        <span className="font-mono font-black text-xl tracking-widest text-slate-100">{plateNumber}</span>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <RefreshCw size={11} className={secondsLeft <= 5 ? 'text-amber-400 animate-spin' : 'text-slate-600'} />
        <span>
          Rifresohet në{' '}
          <span className={cx('font-bold', secondsLeft <= 5 ? 'text-amber-400' : 'text-slate-400')}>
            {secondsLeft}s
          </span>
        </span>
      </div>

      <p className="text-[10px] font-medium tracking-widest uppercase text-slate-600 text-center">
        Trego këtë kod te polici i zonës
      </p>
    </div>
  )
}
