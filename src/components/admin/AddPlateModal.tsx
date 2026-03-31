'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { X, PlusCircle, Car, UserPlus, Copy, Check } from 'lucide-react'
import { addPlate } from '@/actions/authorizations'
import { cx } from '@/lib/cx'

interface Props {
  open: boolean
  onClose: () => void
}

const VEHICLE_TYPES = [
  { value: '',            label: '— Zgjidh llojin —' },
  { value: 'car',         label: 'Automobil' },
  { value: 'motorcycle',  label: 'Motocikletë' },
  { value: 'delivery',    label: 'Mjet shpërndarjeje' },
  { value: 'business',    label: 'Mjet biznesi' },
]

const initialState = { error: undefined as string | undefined, success: undefined as string | undefined, createdUser: undefined as { email: string; password: string; full_name: string } | undefined }

export default function AddPlateModal({ open, onClose }: Props) {
  const [state, formAction, isPending] = useActionState(addPlate, initialState)
  const [createAccount, setCreateAccount] = useState(false)
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // If success with no user created, auto-close
  useEffect(() => {
    if (state?.success && !state?.createdUser) {
      formRef.current?.reset()
      setCreateAccount(false)
      setTimeout(onClose, 800)
    }
  }, [state?.success, state?.createdUser, onClose])

  if (!open) return null

  // Success screen — show generated password
  if (state?.success && state?.createdUser) {
    function copyPassword() {
      navigator.clipboard.writeText(state.createdUser!.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    function handleDone() {
      formRef.current?.reset()
      setCreateAccount(false)
      onClose()
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleDone} aria-hidden />
        <div className="relative w-full max-w-md backdrop-blur-xl bg-[#050914]/98 border border-emerald-500/30 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><UserPlus size={20} className="text-emerald-400" /></div>
            <div>
              <h3 className="text-sm font-bold text-emerald-400">Targa dhe llogaria u krijuan!</h3>
              <p className="text-xs text-slate-400 mt-0.5">{state.createdUser.full_name} — {state.createdUser.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fjalëkalimi i gjeneruar</p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/40 border border-white/10">
              <span className="flex-1 font-mono text-lg font-bold text-slate-100 tracking-widest">{state.createdUser.password}</span>
              <button type="button" onClick={copyPassword} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors active:scale-95">
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Ruaj këtë fjalëkalim para se të mbyllësh.</p>
          </div>
          <button type="button" onClick={handleDone} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95">U kuptua, mbyll</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-md backdrop-blur-xl bg-[#050914]/95 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shrink-0">
              <Car size={17} className="text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Shto Targë të Re</h2>
              <p className="text-xs text-slate-500">Targa do të miratohet menjëherë</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95"><X size={17} /></button>
        </div>

        {/* Form */}
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Numri i Targës *</label>
            <input name="plate_number" type="text" required placeholder="p.sh. AB286AB" maxLength={10} className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm font-mono font-bold text-white placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all uppercase" style={{textTransform: 'uppercase'}} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Emri i Pronarit *</label>
            <input name="owner_name" type="text" required placeholder="Emri dhe mbiemri" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lloji i Mjetit</label>
            <select name="vehicle_type" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none">
              {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-[#050914]">{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vlefshme Nga</label>
              <input name="valid_from" type="date" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all [color-scheme:dark]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vlefshme Deri</label>
              <input name="valid_until" type="date" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all [color-scheme:dark]" />
            </div>
          </div>

          {/* Optional: create citizen account */}
          <div className="pt-1">
            <button type="button" onClick={() => setCreateAccount((v) => !v)} className={cx('w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200', createAccount ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.04] hover:text-slate-200')}>
              <div className="flex items-center gap-2">
                <UserPlus size={15} />
                <span className="text-xs font-semibold">Krijo llogari qytetari</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{createAccount ? 'Po' : 'Jo'}</span>
            </button>

            {createAccount && (
              <div className="mt-3 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email i Qytetarit *</label>
                <input name="email" type="email" required={createAccount} placeholder="emri@email.com" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all" />
                <p className="text-[10px] text-slate-600">Fjalëkalimi do të gjenerohet automatikisht dhe do të shfaqet pas shtimit.</p>
              </div>
            )}
          </div>

          {state?.error && <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">{state.error}</div>}
          {state?.success && !state?.createdUser && <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">{state.success}</div>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all active:scale-95">Anulo</button>
            <button type="submit" disabled={isPending} className={cx('flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50', 'bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]')}>
              <PlusCircle size={16} />
              {isPending ? 'Duke shtuar...' : 'Shto Targën'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
