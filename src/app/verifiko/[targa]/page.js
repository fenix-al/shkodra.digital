import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { CheckCircle2, XCircle, Clock, Car, Activity, ShieldAlert } from 'lucide-react'
import VerifyTimestamp from './VerifyTimestamp'

export async function generateMetadata({ params }) {
  return { title: `Verifikimi i Targës ${params.targa} | Shkodra.digital` }
}

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`
}

const VEHICLE_LABELS = {
  car: 'Automobil', motorcycle: 'Motocikletë', delivery: 'Mjet shpërndarjeje', business: 'Mjet biznesi',
}

export default async function VeritikoPage({ params }) {
  const plateNumber = params.targa.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const service = createServiceSupabaseClient()
  const { data: plate } = await service
    .from('authorized_plates')
    .select('plate_number, owner_name, vehicle_type, status, valid_from, valid_until')
    .eq('plate_number', plateNumber)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const isExpired = plate?.valid_until && today > plate.valid_until
  const notStarted = plate?.valid_from && today < plate.valid_from
  const isAuthorized = plate?.status === 'approved' && !isExpired && !notStarted

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-5">

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center">
          <Activity size={15} className="text-slate-900" />
        </div>
        <span className="text-base font-semibold">
          <span className="text-blue-400">shkodra</span><span className="text-slate-400">.digital</span>
        </span>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-5">

        {!plate ? (
          /* ── Not found ── */
          <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <ShieldAlert size={28} className="text-rose-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-100">Targa nuk u gjet</h1>
              <p className="text-sm text-slate-500 mt-1">Targa <span className="font-mono font-bold text-slate-300">{plateNumber}</span> nuk është e regjistruar në sistem.</p>
            </div>
            <div className="w-full px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-400 text-center">E paautorizuar</p>
            </div>
          </div>
        ) : (
          /* ── Found ── */
          <>
            {/* Status banner */}
            <div className={`flex flex-col items-center gap-3 p-6 rounded-3xl border ${isAuthorized ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
              {isAuthorized
                ? <CheckCircle2 size={44} className="text-emerald-400" />
                : <XCircle size={44} className="text-rose-400" />
              }
              <div className="text-center">
                <p className={`text-xl font-black tracking-tight ${isAuthorized ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isAuthorized ? 'E autorizuar' : isExpired ? 'Autorizimi ka skaduar' : notStarted ? 'Nuk ka filluar ende' : 'E paautorizuar'}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">Zona Pedestale Zdralës</p>
              </div>
            </div>

            {/* Plate card */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
              {/* Plate number */}
              <div className="flex items-center justify-center px-6 py-4 rounded-2xl bg-slate-900 border-2 border-slate-700">
                <span className="font-mono font-black text-3xl tracking-[0.2em] text-white">{plate.plate_number}</span>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Pronari</span>
                  <span className="text-sm font-semibold text-slate-200">{plate.owner_name}</span>
                </div>

                {plate.vehicle_type && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Mjeti</span>
                    <div className="flex items-center gap-1.5">
                      <Car size={13} className="text-slate-500" />
                      <span className="text-sm text-slate-300">{VEHICLE_LABELS[plate.vehicle_type] ?? plate.vehicle_type}</span>
                    </div>
                  </div>
                )}

                {(plate.valid_from || plate.valid_until) && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Vlefshmëria</span>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className={isExpired ? 'text-rose-400' : 'text-slate-500'} />
                      <span className={`text-sm font-mono ${isExpired ? 'text-rose-400' : 'text-slate-300'}`}>
                        {formatDate(plate.valid_from) ?? '—'} → {formatDate(plate.valid_until) ?? '—'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Statusi</span>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${isAuthorized ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAuthorized ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    {isAuthorized ? 'Aktive' : 'Joaktive'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Timestamp — client only to avoid hydration mismatch */}
        <VerifyTimestamp />
      </div>
    </div>
  )
}
