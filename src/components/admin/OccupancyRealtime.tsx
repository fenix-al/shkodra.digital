'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Activity } from 'lucide-react'
import { cx } from '@/lib/cx'

interface Props {
  initialOccupancy: number
  capacity: number
  zoneName: string
}

export default function OccupancyRealtime({ initialOccupancy, capacity, zoneName }: Props) {
  const [occupancy, setOccupancy] = useState(initialOccupancy)
  const [flash, setFlash] = useState<'entry' | 'exit' | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel('scan_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_logs' },
        (payload) => {
          const action = payload.new?.action as string
          if (action === 'ENTRY') {
            setOccupancy((n) => n + 1)
            setFlash('entry')
          } else if (action === 'EXIT') {
            setOccupancy((n) => Math.max(0, n - 1))
            setFlash('exit')
          }
          setTimeout(() => setFlash(null), 1000)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const pct = Math.min(100, Math.round((occupancy / capacity) * 100))
  const barColor = pct >= 90 ? 'from-rose-400 to-rose-500' : pct >= 70 ? 'from-amber-400 to-amber-500' : 'from-blue-400 to-emerald-400'
  const free = Math.max(0, capacity - occupancy)

  return (
    <div className={cx('bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border transition-all duration-500 p-6 mb-6', flash === 'entry' ? 'border-emerald-500/40 shadow-[0_0_30px_rgba(52,211,153,0.1)]' : flash === 'exit' ? 'border-rose-500/30' : 'border-white/5')}>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gjendja e Zonës — Live</h2>
          <p className="text-slate-300 font-semibold text-sm mt-0.5">{zoneName}</p>
        </div>
        <div className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-300', flash === 'entry' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : flash === 'exit' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'bg-white/[0.03] border-white/5 text-slate-500')}>
          <Activity size={10} className={flash ? 'animate-pulse' : ''} />
          {flash === 'entry' ? '+1 Hyrje' : flash === 'exit' ? '-1 Dalje' : 'Live'}
        </div>
      </div>

      <div className="flex items-end gap-4 mb-4">
        <span className="text-5xl font-black tracking-tighter text-slate-100">{occupancy}</span>
        <span className="text-slate-500 text-lg mb-1">/ {capacity} mjete</span>
        <span className={cx('ml-auto text-sm font-bold mb-1', free <= 5 ? 'text-rose-400' : free <= 15 ? 'text-amber-400' : 'text-emerald-400')}>
          {free} të lira
        </span>
      </div>

      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
        <div className={cx('h-full rounded-full bg-gradient-to-r transition-all duration-700', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-slate-600">0</span>
        <span className="text-[10px] font-bold text-slate-500">{pct}% e zënë</span>
        <span className="text-[10px] text-slate-600">{capacity}</span>
      </div>
    </div>
  )
}
