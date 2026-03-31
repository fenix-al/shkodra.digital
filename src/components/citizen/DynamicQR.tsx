'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { getQRToken } from '@/actions/qr'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface Props {
  plateId: string
  plateNumber: string
}

export default function DynamicQR({ plateId, plateNumber }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchToken() {
      const res = await getQRToken(plateId)
      if (!mounted) return
      if ('error' in res && res.error) {
        setError(res.error)
      } else if ('token' in res && res.token) {
        setToken(res.token)
      }
    }

    fetchToken()
    return () => { mounted = false }
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
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Duke gjeneruar kodin...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5">

      {/* QR code */}
      <div className="relative p-5 rounded-3xl bg-white shadow-[0_0_40px_rgba(52,211,153,0.15)]">
        <QRCode value={token} size={220} bgColor="#ffffff" fgColor="#030712" level="M" />
      </div>

      {/* Plate number */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Targa e Mjetit</p>
        <div className="px-6 py-2.5 rounded-2xl bg-black/40 border border-white/10">
          <span className="font-mono font-black text-2xl tracking-[0.15em] text-slate-100 uppercase">{plateNumber}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck size={14} className="text-emerald-400" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-400">Trego këtë kod te policia</p>
      </div>

    </div>
  )
}
