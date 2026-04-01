'use client'

import { useActionState } from 'react'
import { User, Lock, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { updateProfile, updateOwnPassword, updateZoneConfig } from '@/actions/settings'
import { cx } from '@/lib/cx'

interface AccountSettingsFormProps {
  profile: { full_name: string | null; role: string }
  email: string
  zoneConfig: { zone_name: string; capacity: number } | null
}

type FormState = { error?: string; success?: string }
const empty: FormState = {}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  manager:     'Menaxher',
  police:      'Oficer Policie',
  citizen:     'Qytetar',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  manager:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  police:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  citizen:     'text-slate-400 bg-slate-500/10 border-slate-500/20',
}

function Toast({ state }: { state: FormState }) {
  if (!state.error && !state.success) return null
  return (
    <div className={cx('flex items-center gap-3 px-4 py-3 rounded-2xl text-sm border', state.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400')}>
      {state.success ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
      <span>{state.success ?? state.error}</span>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
const labelClass = "block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2"

export default function AccountSettingsForm({ profile, email, zoneConfig }: AccountSettingsFormProps) {
  const [profileState,  profileAction,  profilePending]  = useActionState(updateProfile as (_s: FormState, fd: FormData) => Promise<FormState>, empty)
  const [passwordState, passwordAction, passwordPending] = useActionState(updateOwnPassword as (_s: FormState, fd: FormData) => Promise<FormState>, empty)
  const [zoneState,     zoneAction,     zonePending]     = useActionState(updateZoneConfig as (_s: FormState, fd: FormData) => Promise<FormState>, empty)

  const isSuperAdmin = profile.role === 'super_admin'

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Profile info ── */}
      <section className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 p-6 lg:p-8">
        <SectionHeader
          icon={<User size={18} className="text-blue-400" />}
          title="Informacioni i Llogarisë"
          subtitle="Ndryshoni emrin tuaj të plotë"
        />

        {/* Role + email (read-only) */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Email</p>
            <p className="text-sm font-mono text-slate-300">{email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Roli</p>
            <span className={cx('inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border', ROLE_COLORS[profile.role] ?? ROLE_COLORS.citizen)}>
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
        </div>

        <form action={profileAction} className="space-y-4">
          <div>
            <label htmlFor="full_name" className={labelClass}>Emri i Plotë</label>
            <input id="full_name" name="full_name" type="text" defaultValue={profile.full_name ?? ''} placeholder="Emri Mbiemri" required minLength={2} className={inputClass} />
          </div>
          <Toast state={profileState} />
          <button type="submit" disabled={profilePending} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-slate-900 text-sm font-bold hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all duration-200 active:scale-95 disabled:opacity-50">
            {profilePending ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
          </button>
        </form>
      </section>

      {/* ── Change password ── */}
      <section className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 p-6 lg:p-8">
        <SectionHeader
          icon={<Lock size={18} className="text-amber-400" />}
          title="Ndrysho Fjalëkalimin"
          subtitle="Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere"
        />

        <form action={passwordAction} className="space-y-4">
          <div>
            <label htmlFor="current_password" className={labelClass}>Fjalëkalimi Aktual</label>
            <input id="current_password" name="current_password" type="password" placeholder="••••••••" required className={inputClass} autoComplete="current-password" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new_password" className={labelClass}>Fjalëkalimi i Ri</label>
              <input id="new_password" name="new_password" type="password" placeholder="Min. 8 karaktere" required minLength={8} className={inputClass} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirm_password" className={labelClass}>Konfirmo Fjalëkalimin</label>
              <input id="confirm_password" name="confirm_password" type="password" placeholder="Përsërit fjalëkalimin" required minLength={8} className={inputClass} autoComplete="new-password" />
            </div>
          </div>
          <Toast state={passwordState} />
          <button type="submit" disabled={passwordPending} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-200 text-sm font-bold hover:bg-white/10 hover:border-amber-500/30 transition-all duration-200 active:scale-95 disabled:opacity-50">
            {passwordPending ? 'Duke ndryshuar...' : 'Ndrysho Fjalëkalimin'}
          </button>
        </form>
      </section>

      {/* ── Zone config — super_admin only ── */}
      {isSuperAdmin && (
        <section className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 p-6 lg:p-8">
          <SectionHeader
            icon={<MapPin size={18} className="text-emerald-400" />}
            title="Konfigurimi i Zonës"
            subtitle="Emri dhe kapaciteti i zonës Zdralë"
          />

          <form action={zoneAction} className="space-y-4">
            <div>
              <label htmlFor="zone_name" className={labelClass}>Emri i Zonës</label>
              <input id="zone_name" name="zone_name" type="text" defaultValue={zoneConfig?.zone_name ?? 'Zona Zdralës'} placeholder="p.sh. Zona Zdralës" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="capacity" className={labelClass}>Kapaciteti (Numri i vendeve)</label>
              <input id="capacity" name="capacity" type="number" defaultValue={zoneConfig?.capacity ?? 50} min={1} max={10000} required className={inputClass} />
            </div>
            <Toast state={zoneState} />
            <button type="submit" disabled={zonePending} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-200 text-sm font-bold hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-200 active:scale-95 disabled:opacity-50">
              {zonePending ? 'Duke ruajtur...' : 'Ruaj Konfigurimin'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
