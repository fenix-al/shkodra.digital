'use client'

import { useState, useTransition, useActionState } from 'react'
import { createUser, deleteUser, changePassword, generateResetLink } from '@/actions/users'
import { UserPlus, Trash2, Eye, EyeOff, KeyRound, Link2, X, ShieldCheck, Car, Users, Copy, Check } from 'lucide-react'
import { cx } from '@/lib/cx'

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'super_admin' | 'manager' | 'police' | 'citizen'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  temp_password: string | null
  created_at: string
}

interface Props {
  initialUsers: UserRow[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
  manager:     { label: 'Menaxher',    className: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
  police:      { label: 'Polici',      className: 'border-amber-500/20 bg-amber-500/10 text-amber-400' },
  citizen:     { label: 'Qytetar',     className: 'border-slate-500/20 bg-slate-500/10 text-slate-400' },
}

const ROLE_OPTIONS = [
  { value: 'citizen', label: 'Qytetar' },
  { value: 'police',  label: 'Polici' },
  { value: 'manager', label: 'Menaxher' },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: UserRow) => void }) {
  const [state, formAction, isPending] = useActionState(createUser, null)
  const [copied, setCopied] = useState(false)

  // Show result card after success
  if (state?.success) {
    function copyPassword() {
      navigator.clipboard.writeText(state.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div className="relative w-full max-w-sm backdrop-blur-xl bg-[#050914]/98 border border-emerald-500/30 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-400">Llogaria u krijua!</h3>
              <p className="text-xs text-slate-400 mt-0.5">{state.full_name} — {state.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fjalëkalimi i gjeneruar</p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/40 border border-white/10">
              <span className="flex-1 font-mono text-lg font-bold text-slate-100 tracking-widest">{state.password}</span>
              <button type="button" onClick={copyPassword} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors active:scale-95">
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Ruaj këtë fjalëkalim para se të mbyllësh.</p>
          </div>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95">
            U kuptua
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center">
              <UserPlus size={16} className="text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Shto Përdorues</h2>
              <p className="text-xs text-slate-500">Fjalëkalimi gjenerohet automatikisht</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95"><X size={17} /></button>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Emri i plotë *</label>
            <input name="full_name" type="text" required placeholder="Emri Mbiemri" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email *</label>
            <input name="email" type="email" required placeholder="email@example.com" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Roli</label>
            <select name="role" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none">
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value} className="bg-[#050914]">{r.label}</option>)}
            </select>
          </div>
          {state?.error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">{state.error}</div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/5 transition-all active:scale-95">Anulo</button>
            <button type="submit" disabled={isPending} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50">
              {isPending ? 'Duke krijuar...' : 'Krijo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(changePassword, null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Ndrysho Fjalëkalimin</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user.full_name ?? user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95"><X size={17} /></button>
        </div>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="userId" value={user.id} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fjalëkalimi i ri</label>
            <input name="password" type="text" required minLength={6} placeholder="Min. 6 karaktere" className="bg-black/40 border border-white/5 rounded-2xl py-3 px-4 font-mono text-sm text-slate-100 placeholder:text-slate-600 placeholder:font-sans focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          {state?.error && <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">{state.error}</div>}
          {state?.success && <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">{state.success}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/5 transition-all active:scale-95">Anulo</button>
            <button type="submit" disabled={isPending} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50">
              {isPending ? 'Duke ndryshuar...' : 'Ndrysho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reset Link Modal ─────────────────────────────────────────────────────────

function ResetLinkModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(generateResetLink, null)
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (state?.link) { navigator.clipboard.writeText(state.link); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Linku i Rivendosjes</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95"><X size={17} /></button>
        </div>
        {state?.success && state.link ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-400">Kopjo këtë link dhe dërgoje te qytetari:</p>
            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-black/40 border border-white/10">
              <span className="flex-1 text-xs font-mono text-emerald-400 break-all leading-relaxed">{state.link}</span>
              <button type="button" onClick={copyLink} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors active:scale-95">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Ky link skadon pas 1 ore.</p>
            <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95">Mbyll</button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="email" value={user.email} />
            <p className="text-sm text-slate-400">Gjenero një link të personalizuar rivendosjeje për <span className="text-slate-200 font-semibold">{user.email}</span>.</p>
            {state?.error && <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">{state.error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/5 transition-all active:scale-95">Anulo</button>
              <button type="submit" disabled={isPending} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50">
                {isPending ? 'Duke gjeneruar...' : 'Gjenero Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export default function UsersTable({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [addOpen, setAddOpen] = useState(false)
  const [changePassUser, setChangePassUser] = useState<UserRow | null>(null)
  const [resetLinkUser, setResetLinkUser] = useState<UserRow | null>(null)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  function toggleReveal(id: string) {
    setRevealedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function handleDelete(userId: string, name: string) {
    if (!confirm(`Fshi përdoruesin "${name}"? Ky veprim nuk mund të kthehet.`)) return
    startTransition(async () => {
      const res = await deleteUser(userId)
      if (!res?.error) setUsers((prev) => prev.filter((u) => u.id !== userId))
    })
  }

  const filtered = users.filter((u) => {
    const term = search.toLowerCase()
    return !term || (u.full_name ?? '').toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  })

  const counts = { total: users.length, citizen: users.filter(u => u.role === 'citizen').length, police: users.filter(u => u.role === 'police').length, manager: users.filter(u => u.role === 'manager' || u.role === 'super_admin').length }

  return (
    <>
      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onCreated={(u) => setUsers((prev) => [u, ...prev])} />}
      {changePassUser && <ChangePasswordModal user={changePassUser} onClose={() => setChangePassUser(null)} />}
      {resetLinkUser && <ResetLinkModal user={resetLinkUser} onClose={() => setResetLinkUser(null)} />}

      <div className="flex flex-col gap-5">

        {/* Summary pills */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5">
            <Users size={13} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-300">{counts.total} gjithsej</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-500/10 border border-slate-500/20">
            <Car size={13} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400">{counts.citizen} qytetarë</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <ShieldCheck size={13} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{counts.police} policë</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kërko emër ose email..." className="flex-1 bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-slate-900 bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] transition-all active:scale-95 shrink-0">
            <UserPlus size={15} />
            Shto Përdorues
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#050914]/80 backdrop-blur-2xl rounded-[28px] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Emri</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Roli</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Fjalëkalimi</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Regjistruar</th>
                  <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">Nuk u gjet asnjë përdorues.</td></tr>
                )}
                {filtered.map((user) => {
                  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.citizen
                  const revealed = revealedIds.has(user.id)

                  return (
                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400/20 to-emerald-400/20 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                            {(user.full_name?.[0] ?? user.email[0]).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-200">{user.full_name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-400 font-mono text-xs">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', cfg.className)}>
                          {cfg.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.temp_password ? (
                          <div className="flex items-center gap-2">
                            <span className={cx('font-mono text-sm text-slate-300 transition-all', revealed ? '' : 'blur-[3px] select-none')}>
                              {user.temp_password}
                            </span>
                            <button type="button" onClick={() => toggleReveal(user.id)} className="p-1 rounded-lg text-slate-600 hover:text-slate-300 transition-colors active:scale-95">
                              {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{formatDate(user.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => setChangePassUser(user)} title="Ndrysho fjalëkalimin" className="p-2 rounded-xl text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 border border-transparent hover:border-blue-500/20 transition-all active:scale-95">
                            <KeyRound size={14} />
                          </button>
                          <button type="button" onClick={() => setResetLinkUser(user)} title="Gjenero link rivendosjeje" className="p-2 rounded-xl text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20 transition-all active:scale-95">
                            <Link2 size={14} />
                          </button>
                          {user.role !== 'super_admin' && (
                            <button type="button" onClick={() => handleDelete(user.id, user.full_name ?? user.email)} disabled={isPending} title="Fshi përdoruesin" className="p-2 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all active:scale-95 disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01]">
            <p className="text-xs text-slate-500">Duke shfaqur <span className="text-slate-300 font-semibold">{filtered.length}</span> nga <span className="text-slate-300 font-semibold">{users.length}</span> përdorues</p>
          </div>
        </div>
      </div>
    </>
  )
}
