# PROJECT STATE — SHKODRA.DIGITAL
# Last updated: 2026-04-01
# Phase: 1 — Zdralë Pedestrian Zone Access Control & Citizen Reporting

---

## CURRENT STATUS: SPRINTS 1–5 COMPLETE — FULL SYSTEM OPERATIONAL

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
[DONE]   Sprint 3 — Police Operations (scanner, camera QR, manual entry, occupancy bar)
[DONE]   Sprint 4 — Citizen Portal (dashboard, dynamic QR, report submission)
[DONE]   Sprint 5 — Users management, QR security redesign, analytics, full system integration
[TODO]   Deployment to Hostinger
[TODO]   Supabase Realtime for live occupancy
[TODO]   Final polish & PWA manifest
```

---

## COMPLETED THIS SESSION (2026-04-01)

### QR Security — Full Redesign (AES-256-GCM → HMAC-SHA256 Static)
- **Discovery:** QR codes are PRINTED on car windscreens. TTL-based 60s tokens are incompatible with printed paper.
- `src/lib/qr/token.js` — Rewrote entirely. Uses `createHmac('sha256', SUPABASE_QR_SECRET).update(plate_id)`. Token format: `${plate_id}.${hex_sig}`. Removed `'use server'` directive (it's a utility library, not a Server Action file).
- `validateQRToken()` uses `timingSafeEqual` from Node.js `crypto` — constant-time comparison prevents timing attacks.
- Revocation is done via `authorized_plates.status` (DB column), not token expiry.
- `src/actions/qr.js` — Unified `getQRToken` handles CITIZEN + MANAGER + SUPER_ADMIN roles. Citizens get `owner_id` filter; managers/admins do not.

### Bug Fixes — Mock Function Contamination (Critical)
Three files had been overwritten with fake prototype functions that silently passed while calling no real backend:
- `AddPlateModal.tsx` — Removed fake `addPlate()` mock, restored `import { addPlate } from '@/actions/authorizations'`
- `UsersTable.tsx` — Removed all four fake mocks (`createUser`, `deleteUser`, `changePassword`, `generateResetLink`), restored real server action imports
- `DynamicQR.tsx` — Removed fake `getQRToken` mock + Wikipedia placeholder, restored real `import { getQRToken } from '@/actions/qr'`

### Bug Fix — Roles Stuck on "Qytetar" in Përdoruesit Panel
- Root cause: `profiles` table was missing `temp_password` column → SELECT failed silently → all profile fetches returned null → UI fell back to `'citizen'` for every user.
- Fix: SQL migration `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password TEXT DEFAULT NULL;`
- Added error propagation in `src/actions/users.js` `createUser()`: if profile UPDATE fails after auth user creation, delete the orphaned auth user and return error.

### Bug Fix — Camera QR Scanning Silently Failing (Police Scanner)
- Root cause: `@zxing/library` fires its callback ~10×/second. `isPending` (React state) is a stale closure in the callback — multiple concurrent server calls were being queued.
- Fix in `SkanerClient.tsx`: `processingRef = useRef(false)` as a synchronous lock; `actionRef = useRef<ScanAction>('ENTRY')` with `actionRef.current = action` on each render. `handleQRDetected` wrapped in `useCallback([])` with empty deps so the camera reader never restarts. After scan: camera deactivated, re-activated after 3 seconds.

### Bug Fix — PrintQRModal Generating Invalid QR Tokens
- Root cause: Was encoding `/verifiko/${plateNumber}` URL instead of an HMAC token.
- Fix: `PrintQRModal` now calls `getQRToken(plateId)` on open, shows a spinner while loading, disables print button until token is ready. PlatesTable passes `plateId={printPlate.id}`.

### Bug Fix — "Autorizimi nuk ka filluar ende" When Scanning Admin-Printed QR
- Root cause: `AddPlateModal` had `valid_from`/`valid_until` date fields. Browser autofilled or left them with future dates. Scanner's `checkPlateEligibility` correctly rejected them.
- Fix: Removed both date fields entirely from `AddPlateModal.tsx`. Plates added via the admin modal have no date restriction.
- SQL migration needed: `UPDATE public.authorized_plates SET valid_from = NULL WHERE valid_from > NOW()::DATE;`

### Bug Fix — TypeScript Build Error in ReportForm.tsx
- Root cause: `useActionState` couldn't unify `initialState: { error: undefined; success: undefined }` with the action's return type.
- Fix: Defined `type ReportFormState = { error?: string; success?: string }`, `const initialState: ReportFormState = {}`, and cast `submitReport` at the call site.

### Bug Fix — AddUserModal Not Saving
- Root cause: `UsersTable.tsx` had an `onSubmit` handler + manual state pattern that broke under React 19's batching.
- Fix: Converted `AddUserModal` to `useActionState` + `<form action={formAction}>` pattern.

### Bug Fix — 'use server' on token.js (Turbopack Error)
- Root cause: `src/lib/qr/token.js` had `'use server'` directive. Turbopack requires all functions in 'use server' files to be async. `generateQRToken` and `validateQRToken` are synchronous.
- Fix: Removed `'use server'` from token.js. It is a utility module imported by server actions, not a server action itself.

### Admin UI Redesign
- `AdminShell.tsx` — Dynamic page title via `usePathname()` + `PAGE_TITLES` record
- `PlatesTable.tsx` — 7-column table with `useOptimistic` approve/reject + PrintQR action for approved plates
- `AddPlateModal.tsx` — Clean form (plate number, owner name, vehicle type, optional citizen account creation)
- `PrintQRModal.tsx` — Print card with real HMAC QR code, plate number in license-plate style, owner, validity dates
- `ImportPlatesModal.tsx` — CSV bulk import for plates

---

## PENDING DB MIGRATIONS

Run these in Supabase SQL Editor before next session:

```sql
-- 1. Add temp_password column (fixes role display bug)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password TEXT DEFAULT NULL;

-- 2. Add validity date columns if not already present
ALTER TABLE public.authorized_plates
  ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valid_until DATE DEFAULT NULL;

-- 3. Clear any bad valid_from dates set by old AddPlateModal
UPDATE public.authorized_plates SET valid_from = NULL WHERE valid_from > NOW()::DATE;
```

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
- [x] `actions/authorizations.js` — `approvePlate()`, `rejectPlate()`, `addPlate()` Server Functions
- [x] `AddPlateModal` — add plate + optional citizen account creation
- [x] `ImportPlatesModal` — CSV bulk import
- [x] `PrintQRModal` — print card with HMAC QR code (FIXED — was encoding wrong value)
- [x] `UsersTable` — list users + create + delete + password reset (FIXED — was using mocks)

### Sprint 3: Police Operations ✅ COMPLETE
- [x] `src/app/police/layout.js` — police shell (simplified, mobile-first)
- [x] `src/app/police/skaner/page.js` + `SkanerClient.tsx` — camera QR scan + manual plate input
- [x] `src/lib/qr/token.js` — HMAC-SHA256 static tokens with `timingSafeEqual`
- [x] `src/actions/scanner.js` — `processQRScan()`, `processManualScan()` Server Functions
- [x] Entry/Exit toggle UI
- [x] Active log view — today's scans
- [x] Camera QR scanning FIXED — `processingRef` + `actionRef` pattern
- [x] Validation: expired QR, unauthorized plate, valid_from/valid_until date checks

### Sprint 4: Citizen Portal ✅ COMPLETE
- [x] `src/app/citizen/layout.js`
- [x] `src/app/citizen/dashboard/page.js` — vehicle list + QR display
- [x] `DynamicQR.tsx` — HMAC token QR, static (no refresh timer — printed on car)
- [x] `src/app/citizen/raporto/page.js` + `ReportForm.tsx` — category select, photo upload, geolocation
- [x] `src/actions/reports.js` — `submitReport()` Server Function

### Sprint 5: Analytics, Users & Polish ✅ COMPLETE
- [x] Users management page (`/admin/perdoruesit`) — list, create, delete, password reset
- [x] QR security redesign — HMAC-SHA256 static tokens replacing AES-256-GCM TTL tokens
- [x] All mock function contamination removed from production files
- [x] TypeScript migration on new components complete
- [x] Full end-to-end flow verified: Admin creates plate → prints QR → Citizen scans → Police reads entry/exit

---

## NEXT SESSION — DEPLOYMENT

### TODO: Hostinger Deployment
1. Run pending DB migrations in Supabase SQL Editor (see above)
2. Set environment variables in Hostinger Node.js panel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_QR_SECRET`
3. Configure GitHub CI/CD: `npm run build && npm start`
4. Test all flows on production URL

### TODO: Supabase Realtime
- Replace occupancy polling with `supabase.channel('scan_logs').on('postgres_changes', ...)` in admin dashboard and police scanner

### TODO: Final Polish
- PWA manifest + service worker (citizen QR offline access)
- Analytics tab — avg stay time, peak hours (bar chart)
- Sound/haptic feedback on police scanner success scan
- Admin reports management page (`/admin/raportet`)

---

## ARCHITECTURE DECISIONS LOG

See `DECISIONS.md` for all significant choices and the rationale behind them.

---

## OPEN QUESTIONS

- [ ] Should the police scanner show a success sound/haptic on valid scan?
- [ ] Should the citizen QR be accessible offline (PWA cache)?
- [ ] What is the exact zone capacity for Zdralë? (Default: 50, configurable via zone_config)
- [ ] Analytics: should "scan from phone camera" be tracked as a separate `scan_method` value?
