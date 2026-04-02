'use client'

import { useActionState } from 'react'
import { User, Lock, MapPin, CheckCircle, AlertCircle, Mail, Send } from 'lucide-react'
import { updateDeliverySettings, updateProfile, updateOwnPassword, updateZoneConfig } from '@/actions/settings'
import { cx } from '@/lib/cx'
import NotificationPreferencesCard from '@/components/shared/NotificationPreferencesCard'

interface AccountSettingsFormProps {
  profile: { full_name: string | null; role: string }
  email: string
  notificationPreferences?: {
    email_enabled?: boolean
    push_enabled?: boolean
    digest_frequency?: 'instant' | 'daily' | 'weekly'
  } | null
  deliverySettings?: {
    emailNotificationsEnabled?: boolean
    pushNotificationsEnabled?: boolean
    senderName?: string | null
    senderEmail?: string | null
    replyToEmail?: string | null
    footerSignature?: string | null
  } | null
  zoneConfig: { zone_name: string; capacity: number } | null
}

type FormState = { error?: string; success?: string }
const empty: FormState = {}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Menaxher',
  police: 'Oficer Policie',
  citizen: 'Qytetar',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  manager: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  police: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  citizen: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
}

function Toast({ state }: { state: FormState }) {
  if (!state.error && !state.success) return null
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm', state.success ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400')}>
      {state.success ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
      <span>{state.success ?? state.error}</span>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition-all duration-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'
const labelClass = 'mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500'

export default function AccountSettingsForm({
  profile,
  email,
  notificationPreferences,
  deliverySettings,
  zoneConfig,
}: AccountSettingsFormProps) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfile as (_s: FormState, fd: FormData) => Promise<FormState>, empty)
  const [passwordState, passwordAction, passwordPending] = useActionState(updateOwnPassword as (_s: FormState, fd: FormData) => Promise<FormState>, empty)
  const [zoneState, zoneAction, zonePending] = useActionState(updateZoneConfig as (_s: FormState, fd: FormData) => Promise<FormState>, empty)
  const [deliveryState, deliveryAction, deliveryPending] = useActionState(updateDeliverySettings as (_s: FormState, fd: FormData) => Promise<FormState>, empty)

  const isSuperAdmin = profile.role === 'super_admin'

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-[28px] border border-white/5 bg-[#050914]/80 p-6 backdrop-blur-2xl lg:p-8">
        <SectionHeader
          icon={<User size={18} className="text-blue-400" />}
          title="Informacioni i Llogarisë"
          subtitle="Ndryshoni emrin tuaj të plotë"
        />

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:flex-row">
          <div className="flex-1">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Email</p>
            <p className="text-sm font-mono text-slate-300">{email}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Roli</p>
            <span className={cx('inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest', ROLE_COLORS[profile.role] ?? ROLE_COLORS.citizen)}>
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
          <button type="submit" disabled={profilePending} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 px-6 py-3 text-sm font-bold text-slate-900 transition-all duration-200 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] active:scale-95 disabled:opacity-50">
            {profilePending ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
          </button>
        </form>
      </section>

      <NotificationPreferencesCard
        title="Preferencat personale"
        subtitle="Kontrolloni si doni t’i merrni njoftimet si përdorues i panelit."
        initialPreferences={notificationPreferences}
      />

      <section className="rounded-[28px] border border-white/5 bg-[#050914]/80 p-6 backdrop-blur-2xl lg:p-8">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <button type="submit" disabled={passwordPending} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition-all duration-200 hover:border-amber-500/30 hover:bg-white/10 active:scale-95 disabled:opacity-50">
            {passwordPending ? 'Duke ndryshuar...' : 'Ndrysho Fjalëkalimin'}
          </button>
        </form>
      </section>

      {isSuperAdmin ? (
        <section className="rounded-[28px] border border-white/5 bg-[#050914]/80 p-6 backdrop-blur-2xl lg:p-8">
          <SectionHeader
            icon={<Mail size={18} className="text-blue-400" />}
            title="Dërgimi Automatik i Email-it"
            subtitle="Konfiguro dërguesin dhe aktivizo dërgesat automatike për qytetarët"
          />

          <form action={deliveryAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <input type="checkbox" name="email_notifications_enabled" defaultChecked={deliverySettings?.emailNotificationsEnabled ?? false} className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/30" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Email automatik</p>
                  <p className="mt-1 text-xs text-slate-500">Dërgo veprimet e sistemit te llogaritë e qytetarëve.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <input type="checkbox" name="push_notifications_enabled" defaultChecked={deliverySettings?.pushNotificationsEnabled ?? false} className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/30" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">Push mobile</p>
                  <p className="mt-1 text-xs text-slate-500">Përgatit sistemin për njoftime në aplikacionin mobil.</p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sender_name" className={labelClass}>Emri i dërguesit</label>
                <input id="sender_name" name="sender_name" type="text" defaultValue={deliverySettings?.senderName ?? 'Bashkia Shkodër'} placeholder="Bashkia Shkodër" className={inputClass} />
              </div>
              <div>
                <label htmlFor="sender_email" className={labelClass}>Email i dërguesit</label>
                <input id="sender_email" name="sender_email" type="email" defaultValue={deliverySettings?.senderEmail ?? ''} placeholder="njoftime@shkodra.digital" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reply_to_email" className={labelClass}>Reply-to email</label>
                <input id="reply_to_email" name="reply_to_email" type="email" defaultValue={deliverySettings?.replyToEmail ?? ''} placeholder="support@shkodra.digital" className={inputClass} />
              </div>
              <div>
                <label htmlFor="footer_signature" className={labelClass}>Nënshkrimi</label>
                <input id="footer_signature" name="footer_signature" type="text" defaultValue={deliverySettings?.footerSignature ?? 'Shkodra.digital'} placeholder="Shkodra.digital" className={inputClass} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-300">Shënim</p>
              <p className="mt-1">Kjo ruan konfigurimin organizativ të email-it. Lidhja me provider SMTP/API bëhet në hapin tjetër, pa prekur UI-n ekzistuese.</p>
            </div>

            <Toast state={deliveryState} />
            <button type="submit" disabled={deliveryPending} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 px-6 py-3 text-sm font-bold text-slate-900 transition-all duration-200 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] active:scale-95 disabled:opacity-50">
              <Send size={16} />
              {deliveryPending ? 'Duke ruajtur...' : 'Ruaj konfigurimin e email-it'}
            </button>
          </form>
        </section>
      ) : null}

      {isSuperAdmin ? (
        <section className="rounded-[28px] border border-white/5 bg-[#050914]/80 p-6 backdrop-blur-2xl lg:p-8">
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
            <button type="submit" disabled={zonePending} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition-all duration-200 hover:border-emerald-500/30 hover:bg-white/10 active:scale-95 disabled:opacity-50">
              {zonePending ? 'Duke ruajtur...' : 'Ruaj Konfigurimin'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
