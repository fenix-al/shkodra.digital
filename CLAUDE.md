@AGENTS.md

# SHKODRA.DIGITAL — ARCHITECTURE LAW
# This file is the absolute law of this codebase. No code may be written that violates these rules.

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
│   ├── (auth)/                    # Login, register, forgot-password pages
│   │   └── login/page.js
│   ├── (citizen)/                 # Citizen-facing routes
│   │   ├── dashboard/page.js      # QR display + vehicle list
│   │   └── raporto/page.js        # Issue reporting
│   ├── (police)/                  # Police-facing routes
│   │   └── skaner/page.js         # QR scanner + manual search
│   ├── (admin)/                   # Admin + Manager routes
│   │   ├── dashboard/page.js      # Live occupancy + analytics
│   │   ├── autorizimet/page.js    # Authorization management
│   │   └── raportet/page.js       # Citizen reports management
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
└── middleware.js                  # RBAC route protection
```

**Rules:**
- Route groups `(auth)`, `(citizen)`, `(police)`, `(admin)` each have their own layout with role-appropriate chrome.
- Server Functions live in `src/actions/`. Never define `'use server'` functions inside page or component files.
- Supabase clients are only instantiated via `src/lib/supabase/server.js` (for server) and `src/lib/supabase/client.js` (for browser). Never call `createClient()` directly in a component or action.

---

## 5. UI/UX DESIGN SYSTEM — NON-NEGOTIABLE

### Theme
- **Mode:** Dark mode only. No light mode toggle.
- **Background:** `#0a0a0f` (near-black with a blue undertone)
- **Surface:** `#111118` for cards, `#1a1a24` for elevated surfaces
- **Accent — Primary:** Emerald (`emerald-400` / `#34d399`)
- **Accent — Secondary:** Cyan (`cyan-400` / `#22d3ee`)
- **Danger/Alert:** `rose-500`
- **Text:** `zinc-100` (primary), `zinc-400` (muted)
- **Border:** `white/10` (1px, subtle)

### Effects
- **Glassmorphism:** Cards must use `backdrop-blur-md bg-white/5 border border-white/10`
- **Animations:** Use Tailwind transitions (`transition-all duration-200`). No layout shifts. Smooth.
- **Glow accents:** Key metrics and CTAs may use `shadow-[0_0_20px_rgba(52,211,153,0.3)]`

### Typography
- **Font:** Geist Sans (already configured in layout.js)
- **Headings:** `font-semibold tracking-tight`
- **Body:** `text-sm` default

### Mobile-First Rules
- The `(citizen)` QR view and `(police)` scanner view MUST be designed mobile-first.
- These views must feel like native mobile apps. Use full-viewport layouts, large touch targets (min 44px), and bottom-anchored CTAs.

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
