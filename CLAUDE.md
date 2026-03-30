@AGENTS.md

# SHKODRA.DIGITAL — ARCHITECTURE LAW
# This file is the absolute law of this codebase. No code may be written that violates these rules.

---

## 0. SECURITY DIRECTIVE — ZERO TRUST (OVERRIDES EVERYTHING)

**Security is the #1 priority. It overrides performance, developer convenience, and feature velocity.**

This is a government-grade system managing physical access control for public infrastructure. A security breach is not a bug — it is a liability that affects real people and real institutions.

### Core Principle: Zero Trust
Every layer of the stack treats all input as hostile until proven otherwise.

**NEVER TRUST:**
- Client-provided metadata (`raw_user_meta_data` is attacker-controlled)
- Client-provided role or user ID values — always derive from the server session
- URL parameters for access decisions
- HTTP headers that can be spoofed
- Any value that arrives from outside the server boundary

**ABSOLUTE RULES:**
1. **Role is assigned server-side only.** The `handle_new_user` trigger ALWAYS hardcodes `'citizen'`. Role elevation is performed exclusively via the Supabase service role key in a Server Function, never through the Auth API metadata.
2. **RLS is the final safety net, not the only guard.** Every Server Function must call `requireRole()` before any mutation. RLS and application-level checks must both pass.
3. **SECURITY DEFINER functions must set `search_path`.** All plpgsql functions with `SECURITY DEFINER` MUST include `SET search_path = public` to prevent search-path injection attacks.
4. **Scan logs are immutable.** No UPDATE or DELETE policy exists on `scan_logs`. Ever. It is a legal audit trail.
5. **Citizen reports cannot be edited by the reporter.** Once submitted, only managers/super_admins may change the status. This prevents tampering with evidence.
6. **If a feature cannot be implemented securely, it is not built.** Security is never a compromise. A missing feature is better than a compromised system.

---

## 1. PROJECT IDENTITY

- **Name:** Shkodra.digital (Shkodra OS)
- **Purpose:** Digital City Operating System — Phase 1: Zdralë Pedestrian Zone Access Control & Citizen Reporting
- **Language:** ALL UI text, labels, error messages, and copy MUST be in Albanian (Shqip). No English strings visible to end-users.
- **Presentation bar:** The finished product must be impressive enough to present to the Prime Minister of Albania. UI quality is non-negotiable.

---

## 2. TECH STACK — LOCKED

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `src/app` directory. No Pages Router. |
| Runtime | React 19 | React Compiler enabled (`reactCompiler: true` in next.config.mjs) |
| Database | Supabase (PostgreSQL) | All queries via `@supabase/ssr` server client |
| Auth | Supabase Auth | Session managed via `@supabase/ssr` cookie helpers |
| Styling | Tailwind CSS v4 + shadcn/ui | Dark mode default. No inline styles. No CSS-in-JS. |
| Icons | lucide-react | Only. No other icon libraries. |
| QR Generation | react-qr-code | For citizen QR display |
| QR Scanning | @zxing/library | For police scanner (camera-based) |
| Deployment | Hostinger (Node.js) | `next start` via GitHub CI/CD. No Vercel-specific APIs. |

**Forbidden additions:** Do not add any library not listed above without explicit instruction.

---

## 3. USER ROLES (RBAC) — ENFORCED AT EVERY LAYER

Roles are stored in `profiles.role` (Supabase) and enforced via:
1. **Middleware** (`src/middleware.js`) — redirect unauthorized users before page loads
2. **Server Functions** — re-check role on every mutation. Never trust the client.
3. **Supabase RLS policies** — database-level enforcement. The final safety net.

| Role | Value | Capabilities |
|---|---|---|
| Super Admin | `super_admin` | Full system access. Create/delete Manager and Police accounts. View all logs. Configure global settings. |
| Manager | `manager` | Approve/reject plate authorization requests. View analytics (avg stay, peak hours). Manage citizen reports. |
| Police Officer | `police` | Access scanner + manual plate search. Register Entry/Exit. View today's active logs. **Cannot** edit authorizations. |
| Citizen | `citizen` | View own authorized vehicles. Display dynamic QR. Submit geo-tagged issue reports with photos. |

**Rule:** Any Server Function that mutates data MUST verify the caller's role. Throw an `Unauthorized` error if the role check fails. Never rely on client-passed role values.

---

## 4. FOLDER STRUCTURE — CANONICAL

```
src/
├── app/
│   ├── (auth)/                    # Route group — no URL segment. Login only.
│   │   └── login/page.js          # → /login
│   ├── admin/                     # → /admin/* (manager + super_admin)
│   │   ├── layout.js
│   │   ├── dashboard/page.js      # → /admin/dashboard
│   │   ├── autorizimet/page.js    # → /admin/autorizimet
│   │   └── raportet/page.js       # → /admin/raportet
│   ├── citizen/                   # → /citizen/* (citizen)
│   │   ├── layout.js
│   │   ├── dashboard/page.js      # → /citizen/dashboard
│   │   └── raporto/page.js        # → /citizen/raporto
│   ├── police/                    # → /police/* (police + super_admin)
│   │   ├── layout.js
│   │   └── skaner/page.js         # → /police/skaner
│   ├── api/                       # Route handlers (webhooks, external integrations only)
│   ├── globals.css
│   ├── layout.js                  # Root layout
│   └── page.js                    # Public landing / redirect
├── components/
│   ├── ui/                        # shadcn/ui generated components (do not edit manually)
│   └── shared/                    # App-specific shared components
├── lib/
│   ├── supabase/
│   │   ├── server.js              # createServerClient() helper
│   │   └── client.js              # createBrowserClient() helper
│   ├── auth/
│   │   └── roles.js               # Role check helpers: requireRole(), getSession()
│   ├── qr/
│   │   └── token.js               # QR token generation + validation logic
│   └── utils.js                   # cn() and other shared utils
├── actions/                       # All Server Functions ('use server' files)
│   ├── auth.js
│   ├── authorizations.js
│   ├── scanner.js
│   └── reports.js
└── proxy.js                       # RBAC route protection (Next.js 16: middleware → proxy)
```

**Rules:**
- Route groups `(auth)`, `(citizen)`, `(police)`, `(admin)` each have their own layout with role-appropriate chrome.
- Server Functions live in `src/actions/`. Never define `'use server'` functions inside page or component files.
- Supabase clients are only instantiated via `src/lib/supabase/server.js` (for server) and `src/lib/supabase/client.js` (for browser). Never call `createClient()` directly in a component or action.

---

## 5. UI/UX DESIGN SYSTEM — 2026 STANDARD (NON-NEGOTIABLE)

### Theme
- **Mode:** Dark mode only. No light mode toggle.
- **Base background:** `#030712` (ultra dark)
- **Panel/surface background:** `#050914`
- **Primary gradient:** `from-blue-400 to-emerald-400` — used on logos, icons, key CTAs, and accent elements
- **Danger/Alert:** `rose-500`
- **Text — primary:** `slate-100`
- **Text — secondary/muted:** `slate-400`
- **Micro-labels:** `tracking-widest uppercase text-xs` (e.g., field labels, status badges)
- **Border:** `border-white/10` (1px, subtle)

### Glassmorphism (Apple/Palantir Standard)
Every card, panel, modal, and elevated surface MUST use:
```
backdrop-blur-md bg-white/5 border border-white/10
```
For deeper elevation (modals, dropdowns): `backdrop-blur-xl bg-white/[0.04]`

### Buttons & Interactive Elements
- **Primary CTA:** gradient background `bg-gradient-to-r from-blue-400 to-emerald-400`, dark text
- **Hover state:** subtle neon glow `hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]`
- **Active state:** `active:scale-95` — every button and clickable element
- **Transitions:** `transition-all duration-200` or `transition-all duration-300`
- **Group hover:** use `group` + `group-hover:` for compound interactive states

### Logo / Brand Mark
The shkodra.digital logotype standard:
- Icon: rounded square with `bg-gradient-to-b from-blue-400 to-emerald-400`, Activity icon (`lucide-react`)
- Text: `<span className="font-bold text-blue-400">shkodra</span><span className="font-medium text-slate-300">.digital</span>`

### Typography
- **Font:** Geist Sans (configured in layout.js)
- **Headings:** `font-semibold tracking-tight text-slate-100`
- **Body:** `text-sm text-slate-400`
- **Micro-labels:** `text-xs font-medium tracking-widest uppercase text-slate-400`

### Mobile-First Rules
- The `citizen` QR view and `police` scanner view MUST be designed mobile-first.
- Full-viewport layouts, large touch targets (min 44px), bottom-anchored CTAs.

---

## 5a. REACT IMPLEMENTATION LAWS — HYDRATION & CLIENT COMPONENTS

These rules prevent build errors and React hydration mismatches. Violations will break production.

### CRITICAL: className must always be a single continuous string
**NEVER** split a `className` value across multiple lines using newlines or template literal line breaks:

```jsx
// ❌ FORBIDDEN — stray \n characters cause hydration errors
className={`
  w-full
  flex items-center
  bg-white/5
`}

// ❌ ALSO FORBIDDEN — multi-line string literal
className="
  w-full
  flex items-center
"

// ✅ CORRECT — single unbroken string on one line
className="w-full flex items-center bg-white/5 border border-white/10 rounded-xl"
```

### 'use client' directive
- **Always** place `'use client'` at the very top of any file that uses `useState`, `useEffect`, `useRef`, `useActionState`, event handlers (`onClick`, `onChange`, etc.), or any browser-only API.
- Server Components (`async function Page()`) must **never** contain hooks or event handlers.
- Default assumption: if in doubt, make it a Client Component.

### Component file hygiene
- One default export per file.
- Client Components live in `src/components/shared/` or colocated with their route.
- Never define a Server Function (`'use server'`) inside a Client Component file.

---

## 6. QR SECURITY SPECIFICATION

The QR system is a core security feature. Implement it exactly as follows:

### Token Structure
The QR payload is a JSON object encrypted with AES-256-GCM:
```json
{
  "plate_id": "uuid",
  "plate_number": "AA000AA",
  "issued_at": 1234567890,
  "expires_at": 1234567950,
  "nonce": "random-8-chars"
}
```
- `expires_at` = `issued_at + 60` (seconds). QR is valid for **60 seconds only**.
- The encryption key is stored in `SUPABASE_QR_SECRET` environment variable. Never hardcode it.

### Validation (Police Scanner)
When a police officer scans a QR:
1. Decrypt the payload.
2. Check `expires_at > Date.now() / 1000`. If expired → reject with "QR-ja ka skaduar".
3. Look up `plate_id` in the `authorized_plates` table. If not authorized → reject.
4. Log the scan with `officer_id`, `plate_id`, `timestamp`, and `action` (ENTRY or EXIT).

### Anti-Screenshot Measure
The citizen QR component MUST refresh and regenerate the token every **45 seconds** (before the 60-second expiry). Use `setInterval` in a `'use client'` component. The QR must visually pulse/animate on refresh.

---

## 7. ANALYTICS — OCCUPANCY CALCULATION

Real-time occupancy is calculated from the `scan_logs` table:

```
current_occupancy = COUNT(ENTRY logs today) - COUNT(EXIT logs today)
available_spots = zone_capacity - current_occupancy
```

- `zone_capacity` is stored in a `zone_config` table, configurable by Super Admin.
- This value must be displayed on both the Police dashboard and the Admin dashboard.
- Use Supabase Realtime to push updates. Do not poll.

---

## 8. SERVER FUNCTIONS — MANDATORY PATTERN

Every Server Function in `src/actions/` MUST follow this pattern:

```js
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/roles'

export async function someAction(formData) {
  const supabase = await createServerClient()
  await requireRole(supabase, ['manager', 'super_admin']) // throws if unauthorized

  // ... mutation logic
}
```

- `requireRole()` must throw (not return false) on failure — let Next.js error boundaries catch it.
- Never pass `user.id` or `role` from the client. Always derive it server-side from the session.

---

## 9. DATABASE NAMING CONVENTIONS

- Tables: `snake_case` plural (e.g., `authorized_plates`, `scan_logs`, `citizen_reports`)
- Columns: `snake_case` (e.g., `created_at`, `officer_id`, `plate_number`)
- All tables MUST have: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- All tables MUST have RLS enabled. Default policy: deny all. Grant only what is needed per role.

---

## 10. ENVIRONMENT VARIABLES

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_QR_SECRET=
```

- `NEXT_PUBLIC_` prefix only for values safe to expose to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` is for server-only admin operations. NEVER import it in a `'use client'` file.
- `SUPABASE_QR_SECRET` NEVER leaves the server.

---

## 11. WHAT IS FORBIDDEN

- No `any` types if TypeScript is ever adopted. (Currently JS — add JSDoc types to complex functions.)
- No hardcoded Albanian text in English variable names that could confuse — Albanian UI, English code identifiers.
- No direct `fetch()` calls to Supabase REST API — always use the Supabase client.
- No `getServerSideProps` or `getStaticProps` — this is App Router only.
- No `useRouter().refresh()` — use `refresh()` from `next/cache` inside Server Functions.
- No `revalidatePath('/')` as a lazy fix — revalidate the specific path that changed.
- No committing `.env.local` or any file containing secrets.
- No adding Vercel-specific features (`@vercel/analytics`, Edge Runtime config) — target is Hostinger Node.js.
- **No `middleware.js`** — Next.js 16 renamed this to `proxy.js`. The exported function is `proxy()`, not `middleware()`.
