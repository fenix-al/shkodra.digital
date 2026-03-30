'use client'

import { useActionState, useState } from 'react'
import { login } from '@/actions/auth'
import { AlertCircle, Loader2, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react'

const initialState = null

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="space-y-4" noValidate>

      {/* Error banner */}
      {state?.error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      {/* Email field */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-medium tracking-widest uppercase text-slate-400">
          Emaili
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input id="email" name="email" type="email" autoComplete="email" required disabled={pending} placeholder="emri@bashkia-shkoder.gov.al" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 backdrop-blur-md transition-all duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium tracking-widest uppercase text-slate-400">
          Fjalëkalimi
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={pending} placeholder="••••••••" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-12 text-sm text-slate-100 placeholder:text-slate-600 backdrop-blur-md transition-all duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200 hover:text-slate-300 active:scale-95">
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Submit button */}
      <button type="submit" disabled={pending} className="relative w-full overflow-hidden rounded-xl px-4 py-3 bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-semibold text-[#030712] transition-all duration-200 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Duke hyrë...</span>
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            <span>Hyr në Sistem</span>
          </>
        )}
      </button>

    </form>
  )
}
