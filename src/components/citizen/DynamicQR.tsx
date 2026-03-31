'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { getQRToken } from '@/actions/qr'
import { ShieldAlert } from 'lucide-react'

interface Props {
  plateId: string
  plateNumber: string
}

export default function DynamicQR({ plateId, plateNumber }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getQRToken(plateId).then((res) => {
      if ('error' in res) {
        setError(res.error)
      } else {
        setToken(res.token)
      }
    })
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
      {/* QR code */}
      <div className="p-5 rounded-3xl bg-white shadow-[0_0_20px_rgba(52,211,153,0.1)]">
        <QRCode value={token} size={220} bgColor="#ffffff" fgColor="#030712" level="M" />
      </div>

      {/* Plate number — large, clearly readable on printout */}
      <div className="px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
        <span className="font-mono font-black text-xl tracking-widest text-slate-100">{plateNumber}</span>
      </div>

      <p className="text-[10px] font-medium tracking-widest uppercase text-slate-600 text-center">
        Trego këtë kod te polici i zonës
      </p>
    </div>
  )
}
