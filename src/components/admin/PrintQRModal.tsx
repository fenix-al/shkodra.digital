'use client'

import { useState, useEffect } from 'react'
import { X, Printer } from 'lucide-react'
import QRCode from 'react-qr-code'
import { getQRToken } from '@/actions/qr'

interface Props {
  open: boolean
  onClose: () => void
  plateId: string
  plateNumber: string
  ownerName: string
  validFrom: string | null
  validUntil: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`
}

export default function PrintQRModal({ open, onClose, plateId, plateNumber, ownerName, validFrom, validUntil }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setToken(null)
    setTokenError(null)

    async function fetchToken() {
      const res = await getQRToken(plateId)
      if ('error' in res && res.error) {
        setTokenError(res.error)
      } else if ('token' in res && res.token) {
        setToken(res.token)
      }
    }

    fetchToken()
  }, [open, plateId])

  if (!open) return null

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — hidden when printing */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm print:hidden" onClick={onClose} aria-hidden />

      {/* Modal chrome — hidden when printing */}
      <div className="relative z-10 flex flex-col gap-4 items-center print:hidden">
        <div className="flex items-center justify-between w-full max-w-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pamje paraprake e printimit</p>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95">
            <X size={17} />
          </button>
        </div>

        <PrintCard token={token} tokenError={tokenError} plateNumber={plateNumber} ownerName={ownerName} validFrom={validFrom} validUntil={validUntil} />

        <button type="button" onClick={handlePrint} disabled={!token} className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
          <Printer size={16} />
          {token ? 'Printo Kartelën' : 'Duke gjeneruar kodin...'}
        </button>
      </div>

      {/* The actual print card — visible only when printing */}
      <div className="print-card hidden print:flex">
        <PrintCard token={token} tokenError={tokenError} plateNumber={plateNumber} ownerName={ownerName} validFrom={validFrom} validUntil={validUntil} forPrint />
      </div>
    </div>
  )
}

function PrintCard({ token, tokenError, plateNumber, ownerName, validFrom, validUntil, forPrint = false }: {
  token: string | null
  tokenError: string | null
  plateNumber: string
  ownerName: string
  validFrom: string | null
  validUntil: string | null
  forPrint?: boolean
}) {
  return (
    <div className={forPrint
      ? 'bg-white rounded-2xl p-8 flex flex-col items-center gap-5 shadow-none w-[340px]'
      : 'bg-white rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl w-[340px]'
    }>
      {/* Brand */}
      <div className="flex items-center gap-2 self-start">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-blue-500 to-emerald-500 flex items-center justify-center">
          <span className="text-white text-[8px] font-black">S</span>
        </div>
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">shkodra.digital</span>
      </div>

      {/* QR code — encodes HMAC token, same as citizen dashboard */}
      <div className="p-3 rounded-2xl bg-white border-2 border-slate-100 shadow-inner flex items-center justify-center" style={{ width: 186, height: 186 }}>
        {token ? (
          <QRCode value={token} size={160} bgColor="#ffffff" fgColor="#0f172a" level="M" />
        ) : tokenError ? (
          <p className="text-xs text-red-500 text-center px-2">{tokenError}</p>
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
        )}
      </div>

      {/* Plate number — large, license plate style */}
      <div className="w-full px-6 py-4 rounded-xl border-4 border-slate-800 bg-slate-900 flex items-center justify-center">
        <span className="font-mono font-black text-3xl tracking-[0.25em] text-white">{plateNumber}</span>
      </div>

      {/* Owner */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pronari</p>
        <p className="text-base font-bold text-slate-800 mt-0.5">{ownerName}</p>
      </div>

      {/* Validity */}
      {(validFrom || validUntil) && (
        <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Nga</p>
            <p className="text-sm font-bold text-slate-700">{formatDate(validFrom) || '—'}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Deri</p>
            <p className="text-sm font-bold text-slate-700">{formatDate(validUntil) || '—'}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-[9px] text-slate-300 text-center tracking-wide">Autorizim hyrjeje — Zona Pedestale Zdralës</p>
    </div>
  )
}
