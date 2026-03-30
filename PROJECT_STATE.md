# PROJECT STATE — SHKODRA.DIGITAL
# Last updated: 2026-03-31
# Phase: 1 — Zdralë Pedestrian Zone Access Control & Citizen Reporting

---

## CURRENT STATUS: SPRINT 2 COMPLETE — ADMIN CORE DONE

```
[DONE]   Next.js 16 + React 19 + Tailwind v4 base installed
[DONE]   CLAUDE.md architecture law established
[DONE]   TypeScript added (allowJs: true — mixed JS/TS project)
[DONE]   Install remaining dependencies
[DONE]   Database schema designed and applied
[DONE]   Supabase Auth + RLS configured
[DONE]   Folder structure scaffolded
[DONE]   Proxy (RBAC routing) implemented
[DONE]   Sprint 1 — Login page (glassmorphism, Albanian UI, Supabase auth)
[DONE]   Sprint 2 — Admin Core (dashboard, authorizations, sidebar, shell)
[WIP]    Sprint 3 — Police Operations
[TODO]   Sprint 4 — Citizen Portal
[TODO]   Sprint 5 — Analytics & Polish
```

---

## COMPLETED THIS SESSION (2026-03-31)

### TypeScript Migration
- Added `tsconfig.json` with `allowJs: true` — new files are `.tsx/.ts`, old infrastructure stays `.js`
- Installed `typescript`, `@types/react`, `@types/node`
- Created `src/types/admin.ts` — canonical types: `PlateStatus`, `VehicleType`, `AuthorizedPlate`, `ZoneStats`, `ScanLog`, `ScanAction`, `ScanMethod`, `UserRole`, `UserProfile`
- Created `src/lib/cx.ts` — type-safe `clsx` + `tailwind-merge` helper

### Admin Shell & Sidebar (TypeScript, Production-Grade)
- `src/components/admin/AdminShell.tsx` — client shell managing mobile drawer state + dynamic page title via `usePathname()` mapped to Albanian titles
- `src/components/admin/AdminSidebar.tsx` — fully typed, mobile slide-in with `translate-x` CSS transition, `aria-current="page"`, logout via `useTransition`
- `src/components/admin/PlatesTable.tsx` — 7 columns (Targa, Pronari, Lloji, Data, Statusi, Hyrja e fundit, Veprime), `useOptimistic` for instant approve/reject, `STATUS_CONFIG` record pattern, polished empty state with reset button
- Deleted old `AdminSidebar.js` and `PlatesTable.js`

### Admin Layout & Pages
- `src/app/admin/layout.js` — now a lean server component: fetches profile, renders `<AdminShell>`; all shell chrome moved to AdminShell
- `src/app/admin/autorizimet/page.js` — parallel fetch of `authorized_plates` + `scan_logs`; builds `lastEntryMap` to enrich each plate with `last_entry_at` before passing to PlatesTable
- `src/app/admin/dashboard/page.js` — 7 parallel Supabase queries, real occupancy calculation (`ENTRY - EXIT`), StatCard components matching the 2026 design spec, occupancy progress bar, recent scan log feed

### Design System Updates
- `src/app/layout.js` — Inter font loaded via `next/font/google`, CSS variable `--font-inter` registered
- `src/app/globals.css` — `--font-sans` now maps to `--font-inter` (was self-referencing `--font-sans`)
- `AdminShell.tsx` — header shows dynamic page title (left) + system status pill with `shadow-[0_0_8px_#10b981]` glow (right)
- `PlatesTable.tsx` — plate number bumped to `text-lg`; action buttons are `opacity-0 group-hover:opacity-100 transition-opacity` (fade in on row hover)
- `dashboard/page.js` `StatCard` — matches mock exactly: `font-black tracking-tighter` value, `text-[10px] font-bold uppercase tracking-widest` label, Live/Standby badge with `ArrowUpRight`

---

## PHASE 0 — ENVIRONMENT SETUP ✅ COMPLETE

All dependencies installed, `.env.local` configured, folder structure scaffolded.

---

## PHASE 1 — DATABASE SCHEMA ✅ COMPLETE

Tables created in Supabase: `profiles`, `authorized_plates`, `scan_logs`, `citizen_reports`, `zone_config`.

---

## PHASE 2 — SUPABASE AUTH & RLS ✅ COMPLETE

- Email provider enabled, confirm email disabled for internal accounts
- `handle_new_user` trigger: role hardcoded to `'citizen'` (security fix applied)
- `get_my_role()` SECURITY DEFINER helper with `SET search_path = public`
- Full RLS policies on all 5 tables + `report-photos` Storage bucket
- `report-photos` Storage bucket configured (public read, authenticated write)

---

## PHASE 3 — MIDDLEWARE & RBAC ✅ COMPLETE

`src/proxy.js` — Next.js 16 convention (`proxy()` export, not `middleware()`). Session refresh + role-based redirects. PUBLIC_ROUTES: `/login`. Protected: `/citizen`, `/police`, `/admin`.

---

## PHASE 4 — FEATURE IMPLEMENTATION

### Sprint 1: Foundation ✅ COMPLETE
- [x] Supabase server/client helpers
- [x] `requireRole()` helper
- [x] Proxy with session refresh + RBAC redirects
- [x] Login page — email/password, Albanian UI, glassmorphism
- [x] Root layout — `lang="sq"`, `class="dark"`, Inter font

### Sprint 2: Admin Core ✅ COMPLETE
- [x] Admin shell (glassmorphism sidebar + mobile drawer + dynamic header)
- [x] Admin dashboard — 4 stat cards + occupancy bar + recent scan feed
- [x] Authorization management page — table with optimistic approve/reject
- [x] `last_entry_at` enrichment from `scan_logs`
- [x] `actions/authorizations.js` — `approvePlate()`, `rejectPlate()` Server Functions

### Sprint 3: Police Operations ← NEXT SESSION STARTS HERE
- [ ] `src/app/police/layout.js` — police shell (simplified, mobile-first)
- [ ] `src/app/police/skaner/page.js` — camera QR scan + manual plate input field
- [ ] `src/lib/qr/token.js` — AES-256-GCM token generation + validation (60s TTL)
- [ ] `src/actions/scanner.js` — `logScan(plateId, action, method)` Server Function
- [ ] Entry/Exit toggle UI — shows current state, confirms action
- [ ] Active log view — today's scans for this officer
- [ ] QR scan: `@zxing/library` camera integration (mobile-first, full-viewport)
- [ ] Validation error display in Albanian (`QR-ja ka skaduar`, `Targa nuk është e autorizuar`)

### Sprint 4: Citizen Portal
- [ ] `src/app/citizen/layout.js`
- [ ] `src/app/citizen/dashboard/page.js` — vehicle list + QR display
- [ ] Dynamic QR component — AES-256-GCM token, 45s `setInterval` refresh, pulse animation on refresh
- [ ] `src/app/citizen/raporto/page.js` — category select, photo upload, geolocation
- [ ] `src/actions/reports.js` — `submitReport()` Server Function
- [ ] Supabase Storage upload for photos

### Sprint 5: Analytics & Polish
- [ ] Analytics tab — avg stay time, peak hours (bar chart)
- [ ] Citizen reports management for managers (`/admin/raportet`)
- [ ] Supabase Realtime for live occupancy updates (replace polling)
- [ ] PWA manifest + service worker (for citizen QR offline access)
- [ ] Final UI polish pass

---

## ARCHITECTURE DECISIONS LOG

See `DECISIONS.md` for all significant choices and the rationale behind them.

---

## OPEN QUESTIONS

- [ ] Will police officers authenticate with email or a PIN/badge system?
- [ ] Should the citizen QR be accessible offline (PWA cache)?
- [ ] What is the exact zone capacity for Zdralë? (Default: 50, configurable via zone_config)
- [ ] Does the Manager role need to create Citizen accounts, or is self-registration open?
- [ ] Should the police scanner show a success sound/haptic on valid scan?
