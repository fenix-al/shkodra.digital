'use client'

import { useState, useEffect } from 'react'
// Zëvendësojmë react-qr-code me një implementim të thjeshtë me Canvas ose SVG për pamjen paraprake
import { ShieldAlert } from 'lucide-react'

// --- Shënim: Funksioni 'getQRToken' është shtuar këtu përkohësisht për kompilim. ---
// Në projektin tënd të vërtetë, fshije këtë dhe rikthe: 
// import { getQRToken } from '@/actions/qr'
const getQRToken = async (plateId: string) => {
  return new Promise<{ token?: string; error?: string }>(resolve => 
    setTimeout(() => resolve({ token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwbGF0ZV9pZCI6IiR7cGxhdGVJZH0ifQ.simulated_token_for_preview` }), 1000)
  )
}

interface Props {
  plateId: string
  plateNumber: string
}

// Një komponent i thjeshtë zëvendësues për QR kodin në mungesë të librarisë së jashtme
function SimpleQRPlaceholder({ value, size }: { value: string, size: number }) {
  return (
    <div 
      className="bg-white flex items-center justify-center border-8 border-white rounded-lg relative overflow-hidden"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png')] bg-contain bg-center opacity-80 mix-blend-multiply" />
      <div className="absolute inset-0 border-4 border-dashed border-emerald-500/50 opacity-50 rounded-lg pointer-events-none" />
    </div>
  )
}

export default function DynamicQR({ plateId, plateNumber }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      try {
        // Presim për funksionin asinkron për të shmangur gabimin .then() në TypeScript
        const res = await getQRToken(plateId);
        
        if (!mounted) return;

        if ('error' in res && res.error) {
          setError(res.error);
        } else if ('token' in res && res.token) {
          setToken(res.token);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError("Ndodhi një gabim gjatë marrjes së kodit.");
      }
    }

    fetchToken();

    // Cleanup function për t'u siguruar që nuk përditësojmë state nëse komponenti është mbyllur
    return () => { mounted = false; };
  }, [plateId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5 animate-in fade-in duration-300">
        <ShieldAlert size={28} className="text-rose-400" />
        <p className="text-sm font-semibold text-rose-400 text-center">{error}</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin shadow-[0_0_15px_rgba(52,211,153,0.2)]" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Duke gjeneruar kodin...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Decorative background glow for the QR code */}
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-[40px] rounded-full" />
        
        {/* QR code container */}
        <div className="relative p-4 rounded-3xl bg-white shadow-[0_10px_40px_rgba(52,211,153,0.15)] border-4 border-white/5 transition-transform hover:scale-[1.02] duration-300">
          
          {/* Zëvendësuam QRCode me komponentin tonë të thjeshtë për kompilim */}
          <SimpleQRPlaceholder value={token} size={220} />
          
          {/* Scanning line animation overlay (subtle) */}
          <div className="absolute inset-4 border-2 border-transparent overflow-hidden rounded-2xl pointer-events-none">
            <div className="w-full h-[2px] bg-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      {/* Plate number label */}
      <div className="flex flex-col items-center gap-1.5 mt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Targa e Mjetit</p>
        <div className="px-6 py-2.5 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
          <span className="font-mono font-black text-2xl tracking-[0.15em] text-slate-100 uppercase">{plateNumber}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <ShieldAlert size={14} className="text-emerald-400" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 text-center">
          Trego këtë kod te policia
        </p>
      </div>
      
    </div>
  )
}