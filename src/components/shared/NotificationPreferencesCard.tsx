'use client'

import { useActionState } from 'react'
import { BellRing, CheckCircle, AlertCircle, Mail, Smartphone } from 'lucide-react'
import { updateNotificationPreferences } from '@/actions/settings'
import { cx } from '@/lib/cx'

type FormState = { error?: string; success?: string }

interface Props {
  compact?: boolean
  title?: string
  subtitle?: string
  initialPreferences?: {
    email_enabled?: boolean
    push_enabled?: boolean
    digest_frequency?: 'instant' | 'daily' | 'weekly'
  } | null
}

const empty: FormState = {}

function Toast({ state }: { state: FormState }) {
  if (!state.error && !state.success) return null
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm', state.success ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300')}>
      {state.success ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
      <span>{state.success ?? state.error}</span>
    </div>
  )
}

export default function NotificationPreferencesCard({
  compact = false,
  title = 'Preferencat e njoftimeve',
  subtitle = 'Zgjidhni si doni t’i merrni përditësimet',
  initialPreferences,
}: Props) {
  const [state, action, pending] = useActionState(updateNotificationPreferences as (_s: FormState, fd: FormData) => Promise<FormState>, empty)

  return (
    <section className={cx('overflow-hidden border border-white/5 bg-[#050914]/80 backdrop-blur-2xl', compact ? 'rounded-[24px]' : 'rounded-[28px]')}>
      <div className={cx('border-b border-white/5', compact ? 'p-5' : 'p-6')}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <BellRing size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Njoftimet</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      <form action={action} className={cx('space-y-5', compact ? 'p-5' : 'p-6')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <input
              type="checkbox"
              name="email_enabled"
              defaultChecked={initialPreferences?.email_enabled ?? false}
              className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/30"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Mail size={14} className="text-blue-400" />
                Email
              </div>
              <p className="mt-1 text-xs text-slate-500">Merr njoftime në email për raportet dhe autorizimet.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <input
              type="checkbox"
              name="push_enabled"
              defaultChecked={initialPreferences?.push_enabled ?? false}
              className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/30"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Smartphone size={14} className="text-amber-400" />
                Push
              </div>
              <p className="mt-1 text-xs text-slate-500">Bazë gati për njoftime në aplikacionin mobil.</p>
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="digest_frequency" className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
            Frekuenca
          </label>
          <select
            id="digest_frequency"
            name="digest_frequency"
            defaultValue={initialPreferences?.digest_frequency ?? 'instant'}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 focus:outline-none"
          >
            <option value="instant" className="bg-slate-950">Menjëherë</option>
            <option value="daily" className="bg-slate-950">Përmbledhje ditore</option>
            <option value="weekly" className="bg-slate-950">Përmbledhje javore</option>
          </select>
        </div>

        <Toast state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] active:scale-95 disabled:opacity-50"
        >
          {pending ? 'Duke ruajtur...' : 'Ruaj preferencat'}
        </button>
      </form>
    </section>
  )
}
