import LoginForm from '@/components/shared/LoginForm'
import { Activity } from 'lucide-react'

export const metadata = {
  title: 'Hyr | Shkodra.digital',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#030712] px-4">

      {/* Decorative background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-10%] h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px]">

        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shadow-[0_8px_16px_-6px_rgba(52,211,153,0.5)]">
              <Activity size={22} className="text-white stroke-[2.5]" />
            </div>
            <div className="text-[22px] tracking-tight flex items-center">
              <span className="font-bold text-blue-400">shkodra</span>
              <span className="font-medium text-slate-300">.digital</span>
            </div>
          </div>
          <p className="text-sm text-slate-400">Sistemi Dixhital i Bashkisë Shkodër</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-base font-semibold tracking-tight text-slate-100">Hyrje në Sistem</h2>
            <p className="mt-0.5 text-xs text-slate-400">Autorizuar vetëm për personel të Bashkisë dhe qytetarë të regjistruar.</p>
          </div>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Platforma zyrtare e Bashkisë Shkodër &mdash; të gjitha të drejtat e rezervuara
        </p>

      </div>
    </div>
  )
}
