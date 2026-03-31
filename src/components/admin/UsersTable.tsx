'use client'

import { useState, useTransition, useActionState } from 'react'
import { UserPlus, Trash2, Eye, EyeOff, KeyRound, Link2, X, ShieldCheck, Car, Users, Copy, Check } from 'lucide-react'

// Funksioni ndihmës për klasat CSS
const cx = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

// --- Shënim: Këto funksione janë shtuar këtu përkohësisht për kompilim. ---
// Në projektin tënd të vërtetë, fshiji këto dhe rikthe: 
// import { createUser, deleteUser, changePassword, generateResetLink } from '@/actions/users'
const createUser = async (prevState: any, formData: FormData) => {
  return new Promise<any>(resolve => setTimeout(() => resolve({ success: "Llogaria u krijua", password: "NewPassword123!", full_name: formData.get('full_name'), email: formData.get('email') }), 1000))
}
const deleteUser = async (userId: string) => { return new Promise<any>(resolve => setTimeout(() => resolve({ success: true }), 500)) }
const changePassword = async (prevState: any, formData: FormData) => { return new Promise<any>(resolve => setTimeout(() => resolve({ success: "Fjalëkalimi u ndryshua" }), 500)) }
const generateResetLink = async (prevState: any, formData: FormData) => { return new Promise<any>(resolve => setTimeout(() => resolve({ success: true, link: "https://shkodra.digital/reset?token=xyz123" }), 500)) }


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
  // Përdorim useState për t'i shpëtuar problemeve të useActionState në preview
  const [state, setState] = useState<any>(null)
  const [isPending, setIsPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await createUser(state, formData)
      setState(result)
      // Nuk shtojmë përdoruesin në listë automatikisht këtu për të evituar ID false
    } catch (err) {
      setState({ error: "Ndodhi një gabim" })
    } finally {
      setIsPending(false)
    }
  }

  // Show result card after success
  if (state?.success) {
    function copyPassword() {
      // ZGJIDHJA: Nxjerrim vlerën me ! meqë jemi brenda if (state?.success)
      navigator.clipboard.writeText(state!.password)
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
              <button type="button" onClick={copyPassword} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors active:scale-95 outline-none focus:ring-2 focus:ring-emerald-500/50">
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Ruaj këtë fjalëkalim para se të mbyllësh.</p>
          </div>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 outline-none hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]">
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-400 to-emerald-400 flex items-center justify-center shadow-[0_4px_10px_rgba(52,211,153,0.2)]">
              <UserPlus size={16} className="text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Shto Përdorues</h2>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">Auto-Fjalëkalim</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50"><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Emri i plotë *</label>
            <input name="full_name" type="text" required placeholder="Emri Mbiemri" className="bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:bg-black/60 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email *</label>
            <input name="email" type="email" required placeholder="email@example.com" className="bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:bg-black/60 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Roli</label>
            <div className="relative">
              <select name="role" className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 text-sm text-slate-100 focus:outline-none focus:bg-black/60 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none cursor-pointer">
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value} className="bg-[#050914]">{r.label}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          {state?.error && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-in fade-in zoom-in-95 duration-200">{state.error}</div>
          )}
          <div className="flex gap-3 pt-2 border-t border-white/5 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50">Anulo</button>
            <button type="submit" disabled={isPending} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:ring-2 focus:ring-emerald-500/50">
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
  const [state, setState] = useState<any>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await changePassword(state, formData)
      setState(result)
    } catch (err) {
      setState({ error: "Ndodhi një gabim" })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Ndrysho Fjalëkalimin</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{user.full_name ?? user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50"><X size={17} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="userId" value={user.id} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Fjalëkalimi i ri</label>
            <input name="password" type="text" required minLength={6} placeholder="Min. 6 karaktere" className="bg-black/40 border border-white/5 rounded-2xl py-3.5 px-4 font-mono text-sm text-slate-100 placeholder:text-slate-600 placeholder:font-sans focus:outline-none focus:bg-black/60 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          {state?.error && <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-in fade-in zoom-in-95 duration-200">{state.error}</div>}
          {state?.success && <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 animate-in fade-in zoom-in-95 duration-200">{state.success}</div>}
          <div className="flex gap-3 pt-2 border-t border-white/5 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50">Anulo</button>
            <button type="submit" disabled={isPending} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:ring-2 focus:ring-emerald-500/50">
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
  const [state, setState] = useState<any>(null)
  const [isPending, setIsPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await generateResetLink(state, formData)
      setState(result)
    } catch (err) {
      setState({ error: "Ndodhi një gabim" })
    } finally {
      setIsPending(false)
    }
  }

  function copyLink() {
    if (state?.link) { 
      navigator.clipboard.writeText(state.link); 
      setCopied(true); 
      setTimeout(() => setCopied(false), 2000) 
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md backdrop-blur-xl bg-[#050914]/98 border border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Linku i Rivendosjes</h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50"><X size={17} /></button>
        </div>
        {state?.success && state.link ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Kopjo linkun dhe dërgoja qytetarit:</p>
            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-black/40 border border-white/10">
              <span className="flex-1 text-xs font-mono text-emerald-400 break-all leading-relaxed">{state.link}</span>
              <button type="button" onClick={copyLink} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors active:scale-95 outline-none focus:ring-2 focus:ring-emerald-500/50">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Ky link skadon pas 1 ore.</p>
            <button type="button" onClick={onClose} className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 outline-none hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:ring-2 focus:ring-emerald-500/50">Mbyll</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="email" value={user.email} />
            <p className="text-sm text-slate-400 leading-relaxed">Gjenero një link të personalizuar rivendosjeje për <span className="text-slate-200 font-semibold">{user.email}</span>.</p>
            {state?.error && <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-in fade-in zoom-in-95 duration-200">{state.error}</div>}
            <div className="flex gap-3 pt-2 border-t border-white/5 mt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50">Anulo</button>
              <button type="submit" disabled={isPending} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-400 to-emerald-400 text-sm font-bold text-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 outline-none hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] focus:ring-2 focus:ring-emerald-500/50">
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

      <div className="flex flex-col gap-6">

        {/* Summary pills */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
            <Users size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{counts.total} gjithsej</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-500/10 border border-slate-500/20 hover:border-slate-500/30 transition-colors">
            <Car size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{counts.citizen} qytetarë</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30 transition-colors">
            <ShieldCheck size={14} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">{counts.police} policë</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md group">
             <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kërko emër ose email..." className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-4 pr-4 text-sm font-medium text-slate-100 placeholder:text-slate-600 focus:outline-none focus:bg-black/60 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
          </div>
          <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-slate-900 bg-gradient-to-r from-blue-400 to-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0 shrink-0 outline-none focus:ring-2 focus:ring-emerald-500/50">
            <UserPlus size={16} />
            Shto Përdorues
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#050914]/80 backdrop-blur-2xl rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Emri</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Email</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Roli</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Fjalëkalimi</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Regjistruar</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Users size={32} className="text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">Nuk u gjet asnjë përdorues me këtë kërkim.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((user) => {
                  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.citizen
                  const revealed = revealedIds.has(user.id)

                  return (
                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[14px] bg-gradient-to-b from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 shadow-inner">
                            {(user.full_name?.[0] ?? user.email[0]).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-slate-200">{user.full_name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-400">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest', cfg.className)}>
                          {cfg.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.temp_password ? (
                          <div className="flex items-center gap-2">
                            <span className={cx('font-mono text-xs font-bold text-slate-300 transition-all bg-black/40 px-2 py-1 rounded-md border border-white/5', revealed ? '' : 'blur-[4px] select-none text-transparent')}>
                              {user.temp_password}
                            </span>
                            <button type="button" onClick={() => toggleReveal(user.id)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors active:scale-95 outline-none focus:ring-2 focus:ring-slate-500/50">
                              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 font-mono pl-2">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500">{formatDate(user.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => setChangePassUser(user)} title="Ndrysho fjalëkalimin" className="p-2 rounded-xl text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 border border-transparent hover:border-blue-500/20 transition-all active:scale-95 outline-none">
                            <KeyRound size={15} />
                          </button>
                          <button type="button" onClick={() => setResetLinkUser(user)} title="Gjenero link rivendosjeje" className="p-2 rounded-xl text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20 transition-all active:scale-95 outline-none">
                            <Link2 size={15} />
                          </button>
                          {user.role !== 'super_admin' && (
                            <button type="button" onClick={() => handleDelete(user.id, user.full_name ?? user.email)} disabled={isPending} title="Fshi përdoruesin" className="p-2 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all active:scale-95 disabled:opacity-40 outline-none">
                              <Trash2 size={15} />
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
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Duke shfaqur <span className="text-emerald-400">{filtered.length}</span> nga <span className="text-slate-300">{users.length}</span> përdorues</p>
          </div>
        </div>
      </div>
    </>
  )
}