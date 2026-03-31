'use client'

import { useEffect, useRef, useState } from 'react'
import { X, PlusCircle, Car, UserPlus, Copy, Check } from 'lucide-react'

// Funksioni ndihmës për klasat CSS
const cx = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

// 1. Përcakto tipin në mënyrë eksplicite
type AddPlateState = { 
  error?: string; 
  success?: string; 
  createdUser?: { email: string; password: string; full_name: string; };
}

// Shënim: Funksioni 'addPlate' është shtuar këtu përkohësisht për kompilim.
// Në projektin tënd të vërtetë, fshije këtë dhe rikthe: import { addPlate } from '@/actions/authorizations'
const addPlate = async (prevState: AddPlateState, formData: FormData): Promise<AddPlateState> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const email = formData.get('email') as string;
      const owner_name = formData.get('owner_name') as string;
      
      if (email) {
        resolve({ 
          success: "Targa dhe llogaria u krijuan me sukses (Pamje Paraprake)",
          createdUser: { email, password: "SecurePass2026!", full_name: owner_name }
        });
      } else {
        resolve({ success: "Targa u shtua me sukses (Pamje Paraprake)" });
      }
    }, 1000)
  });
}

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

export default function AddPlateModal({ open, onClose }: Props) {
  // Përdorim useState në vend të useActionState për përputhshmëri në preview
  const [state, setState] = useState<AddPlateState>({})
  const [isPending, setIsPending] = useState(false)
  
  const [createAccount, setCreateAccount] = useState(false)
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setState({})
    
    const formData = new FormData(e.currentTarget)
    try {
      const result = await addPlate(state, formData)
      setState(result)
    } catch (err) {
      setState({ error: "Ndodhi një gabim gjatë lidhjes me serverin." })
    } finally {
      setIsPending(false)
    }
  }

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
      setState({})
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
              <button type="button" onClick={copyPassword} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors active:scale-95 outline-none focus:ring-2 focus:ring-emerald-500/50">
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Ruaj këtë fjalëkalim para se të mbyllësh.</p>
          </div>
          <button type="button" onClick={handleDone} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-emerald-500/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]">U kuptua, mbyll</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { onClose(); setState({}); }} aria-hidden />

      <div className="relative w-full max-w-md backdrop-blur-xl bg-[#050914]/95 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(52,211,153,0.2)]">
              <Car size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Shto Targë të Re</h2>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold mt-0.5">Miratim i Menjëhershëm</p>
            </div>
          </div>
          <button type="button" onClick={() => { onClose(); setState({}); }} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50"><X size={18} /></button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Numri i Targës *</label>
            <input name="plate_number" type="text" required placeholder="p.sh. AB286AB" maxLength={10} className="bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-sm font-mono font-bold text-white placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 focus:ring-4 focus:ring-emerald-500/5 transition-all uppercase" style={{textTransform: 'uppercase'}} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Emri i Pronarit *</label>
            <input name="owner_name" type="text" required placeholder="Emri dhe mbiemri" className="bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Lloji i Mjetit</label>
            <div className="relative">
              <select name="vehicle_type" className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none cursor-pointer">
                {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-[#050914] text-slate-200">{t.label}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Vlefshme Nga</label>
              <input name="valid_from" type="date" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 focus:ring-4 focus:ring-emerald-500/5 transition-all [color-scheme:dark]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Vlefshme Deri</label>
              <input name="valid_until" type="date" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 focus:ring-4 focus:ring-emerald-500/5 transition-all [color-scheme:dark]" />
            </div>
          </div>

          {/* Optional: create citizen account */}
          <div className="pt-2">
            <button type="button" onClick={() => setCreateAccount((v) => !v)} className={cx('w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all duration-300 outline-none focus:ring-2 focus:ring-blue-500/30', createAccount ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200')}>
              <div className="flex items-center gap-3">
                <div className={cx('p-1.5 rounded-lg transition-colors', createAccount ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400')}><UserPlus size={16} /></div>
                <span className="text-xs font-bold tracking-wide">Krijo llogari qytetari</span>
              </div>
              <span className={cx('text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md transition-colors', createAccount ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500')}>{createAccount ? 'Po' : 'Jo'}</span>
            </button>

            {createAccount && (
              <div className="mt-4 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email i Qytetarit *</label>
                <input name="email" type="email" required={createAccount} placeholder="emri@email.com" className="bg-black/40 border border-blue-500/20 rounded-2xl py-3.5 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/60 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                <p className="text-[10px] text-slate-500 mt-1 ml-1 leading-relaxed">Fjalëkalimi do të gjenerohet automatikisht dhe do të shfaqet pasi të shtosh targën.</p>
              </div>
            )}
          </div>

          {state?.error && <div className="px-4 py-3 mt-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-in fade-in zoom-in-95 duration-200">{state.error}</div>}
          {state?.success && !state?.createdUser && <div className="px-4 py-3 mt-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 animate-in fade-in zoom-in-95 duration-200">{state.success}</div>}

          <div className="flex gap-3 pt-3 mt-2 border-t border-white/5">
            <button type="button" onClick={() => { onClose(); setState({}); }} className="flex-1 py-3.5 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50">Anulo</button>
            <button type="submit" disabled={isPending} className={cx('flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none focus:ring-2 focus:ring-emerald-500/50', 'bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_25px_rgba(52,211,153,0.3)] hover:-translate-y-0.5')}>
              <PlusCircle size={18} />
              {isPending ? 'Duke shtuar...' : 'Shto Targën'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}