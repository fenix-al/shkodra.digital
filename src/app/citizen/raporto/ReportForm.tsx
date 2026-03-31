'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { submitReport } from '@/actions/reports'
import { MapPin, Camera, AlertTriangle, Loader2, CheckCircle2, X, Upload } from 'lucide-react'
import { cx } from '@/lib/cx'

const CATEGORIES = [
  { value: 'ndricim',        label: 'Ndriçim i dëmtuar',    emoji: '💡' },
  { value: 'kanalizim',      label: 'Problem kanalizimi',    emoji: '🚧' },
  { value: 'rruge',          label: 'Rrugë e dëmtuar',       emoji: '🛣️' },
  { value: 'mbeturina',      label: 'Mbeturina / papastërti', emoji: '🗑️' },
  { value: 'akses',          label: 'Bllokadë aksesi',        emoji: '🚗' },
  { value: 'tjeter',         label: 'Tjetër',                 emoji: '📋' },
]

const initialState = { error: undefined, success: undefined }

export default function ReportForm() {
  const [state, formAction, isPending] = useActionState(submitReport, initialState)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const latRef = useRef<HTMLInputElement>(null)
  const lngRef = useRef<HTMLInputElement>(null)

  // Clear form on success
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setPreview(null)
      setCoords(null)
      setGeoStatus('idle')
      setSelectedCategory('')
      if (latRef.current) latRef.current.value = ''
      if (lngRef.current) lngRef.current.value = ''
    }
  }, [state?.success])

  function requestLocation() {
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        if (latRef.current) latRef.current.value = String(lat)
        if (lngRef.current) lngRef.current.value = String(lng)
        setGeoStatus('ok')
      },
      () => setGeoStatus('denied')
    )
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  function clearPhoto() {
    setPreview(null)
    const input = formRef.current?.querySelector('input[name="photo"]') as HTMLInputElement | null
    if (input) input.value = ''
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto w-full">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Raporto</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-1">Raporto Problem</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ndihmoni të mbajmë zonën të sigurt dhe të pastër.</p>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-5">

        {/* ── Category ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kategoria *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <label key={cat.value} className={cx('flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98]', selectedCategory === cat.value ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.06] hover:border-white/10')}>
                <input type="radio" name="category" value={cat.value} required className="sr-only" onChange={() => setSelectedCategory(cat.value)} />
                <span className="text-base leading-none">{cat.emoji}</span>
                <span className="text-xs font-semibold leading-tight">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Description ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Përshkrimi *</label>
          <textarea name="description" required rows={4} placeholder="Përshkruani problemin në detaje..." maxLength={500} className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all resize-none" />
        </div>

        {/* ── Photo ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Foto (opsionale)</label>
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Foto e zgjedhur" className="w-full h-full object-cover" />
              <button type="button" onClick={clearPhoto} className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all active:scale-95">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-white/10 cursor-pointer hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                <Camera size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">Trokitni për të zgjedhur foto</span>
              <input type="file" name="photo" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoChange} />
            </label>
          )}
        </div>

        {/* ── Location ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vendndodhja (opsionale)</label>
          <input ref={latRef} type="hidden" name="latitude" />
          <input ref={lngRef} type="hidden" name="longitude" />

          {geoStatus === 'ok' && coords ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <MapPin size={15} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-400">Vendndodhja u regjistrua</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
              </div>
              <button type="button" onClick={() => { setCoords(null); setGeoStatus('idle'); if (latRef.current) latRef.current.value = ''; if (lngRef.current) lngRef.current.value = '' }} className="ml-auto p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors active:scale-95">
                <X size={12} />
              </button>
            </div>
          ) : geoStatus === 'denied' ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              <p className="text-xs text-rose-400">Aksesi i lokacionit u refuzua. Lejo nga cilësimet.</p>
            </div>
          ) : (
            <button type="button" onClick={requestLocation} disabled={geoStatus === 'loading'} className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/5 bg-white/[0.03] text-sm font-semibold text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all active:scale-95 disabled:opacity-50">
              {geoStatus === 'loading'
                ? <><Loader2 size={15} className="animate-spin" />Duke gjetur vendndodhjen...</>
                : <><MapPin size={15} /><Upload size={0} className="hidden" />Shto vendndodhjen</>
              }
            </button>
          )}
        </div>

        {/* ── Feedback ── */}
        {state?.error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle size={15} className="text-rose-400 shrink-0" />
            <p className="text-xs font-medium text-rose-400">{state.error}</p>
          </div>
        )}
        {state?.success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <p className="text-xs font-medium text-emerald-400">{state.success}</p>
          </div>
        )}

        {/* ── Submit ── */}
        <button type="submit" disabled={isPending} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-slate-900 bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all active:scale-95 disabled:opacity-50">
          {isPending
            ? <><Loader2 size={16} className="animate-spin" />Duke dërguar...</>
            : <><AlertTriangle size={16} />Dërgo Raportin</>
          }
        </button>
      </form>
    </div>
  )
}
