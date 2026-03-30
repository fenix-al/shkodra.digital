# DECISIONS — SHKODRA.DIGITAL
# Architectural choices, bug fixes, and rationale. Append-only log.

---

## [2026-03-31] Session 3 — TypeScript Migration & Admin UI Completion

### D-001 — TypeScript added as opt-in, not a full migration
**Decision:** Added TypeScript with `allowJs: true`. New files (components, types) are `.tsx/.ts`. Infrastructure files (`proxy.js`, `actions/*.js`, `lib/**/*.js`, `app/**/*.js`) remain JavaScript.
**Why:** Rewriting all infrastructure files would take a full session with zero user-visible value. `allowJs: true` gives full TypeScript benefits on new code without breaking existing JS files. TSC will type-check both.
**Constraint:** Do not convert existing `.js` files to `.ts` without explicit instruction. Only write new files as TypeScript.

---

### D-002 — `cx()` utility instead of raw `clsx`
**Decision:** Created `src/lib/cx.ts` exporting `cx(...inputs: ClassValue[])` which composes `clsx` + `twMerge`.
**Why:** Prevents Tailwind class conflicts (e.g., `p-4` + `p-6` → only `p-6` survives). Single import across all components. Typed via `ClassValue` from clsx.
**Usage:** Import `{ cx }` from `@/lib/cx` in any `.tsx` component that conditionally applies Tailwind classes.

---

### D-003 — AdminShell as the single source of shell chrome
**Decision:** `AdminShell.tsx` is a `'use client'` component that owns: mobile backdrop, sidebar open/close state, header (title + system status + avatar). The `admin/layout.js` is now a lean server component that only fetches the profile and renders `<AdminShell>`.
**Why:** The old layout.js was a server component but tried to render an interactive sidebar (wrong). Moving shell chrome into a client component is the correct Next.js App Router pattern for server layout → client UI handoff.
**Constraint:** `admin/layout.js` must remain a server component (async function). Never add `'use client'` to it.

---

### D-004 — Dynamic page title in AdminShell via `usePathname()` map
**Decision:** `AdminShell.tsx` uses `usePathname()` and a `PAGE_TITLES` record to display the current page's Albanian title in the header, matching the design spec.
**Why:** Avoids React Context, prop-drilling, or a title-passing mechanism between child pages and the parent shell. The pathname is the source of truth. Simple and zero-overhead.
**Map:**
```
/admin/dashboard   → 'Paneli Kryesor'
/admin/autorizimet → 'Menaxhimi i Autorizimeve'
/admin/raportet    → 'Raportet'
/admin/perdoruesit → 'Përdoruesit'
/admin/cilesimet   → 'Cilësimet'
```

---

### D-005 — `last_entry_at` is server-side enriched, not a DB column
**Decision:** `last_entry_at` on `AuthorizedPlate` is not stored in `authorized_plates`. It is computed server-side in `autorizimet/page.js` by fetching the 1000 most recent ENTRY rows from `scan_logs` and building a `Map<plate_id, scanned_at>` (first-wins = latest, since ordered DESC).
**Why:** Keeping `last_entry_at` in sync as a denormalized column requires a trigger on `scan_logs` and an UPDATE on `authorized_plates` — adding write complexity to an immutable audit trail. The scan_logs query is fast (indexed on `scanned_at`, filtered by `action = 'ENTRY'`, limit 1000). Re-evaluate with a DB trigger if the scan volume exceeds ~100k rows/day.

---

### D-006 — `useOptimistic` for approve/reject (no skeleton loading)
**Decision:** PlatesTable uses React 19's `useOptimistic` to instantly update the plate's status badge when the operator clicks Approve or Reject. The actual server mutation runs asynchronously via `useTransition`.
**Why:** Government operators making rapid decisions need immediate visual confirmation. A 300–800ms round-trip to Supabase would feel sluggish. If the server call fails, React reverts the optimistic state automatically.

---

### D-007 — Inter as primary font, Geist as fallback
**Decision:** Inter is loaded via `next/font/google` with `variable: '--font-inter'`. `globals.css` maps `--font-sans → var(--font-inter)`. Geist Sans/Mono remain loaded for mono usage.
**Why:** User design spec explicitly requires Inter for admin UI. The `--font-sans` CSS variable in the Tailwind v4 `@theme inline` block was previously a self-reference (`var(--font-sans)`) — a bug that meant no custom font was applied. This fixes it.

---

### D-008 — Action buttons fade in on row hover (opacity-0 → opacity-100)
**Decision:** The actions column `<div>` in PlatesTable uses `opacity-0 group-hover:opacity-100 transition-opacity`. The `group` class is on the `<tr>`.
**Why:** Matches the design spec exactly. Keeps the table visually clean; reveals contextual actions only when the operator focuses on a specific row.

---

## [Earlier Sessions]

### D-100 — Next.js 16 renamed middleware.js → proxy.js
**Decision:** Created `src/proxy.js` with `export async function proxy(request)`. Deleted `src/middleware.js`.
**Why:** Next.js 16 breaking change. The old `middleware.js` convention was removed. Using the old name causes a silent failure where RBAC is never applied. Documented as forbidden in CLAUDE.md §11.

### D-101 — Route groups removed for admin/citizen/police
**Decision:** Routes are explicit URL segments (`/admin/*`, `/citizen/*`, `/police/*`), not route groups (`(admin)`, etc.).
**Why:** Three route groups each containing a `dashboard/page.js` caused a Next.js build error: "You cannot have two parallel pages that resolve to the same path." Route groups collapse the URL segment so all three resolved to `/dashboard`. `(auth)` is kept as a route group because `/login` has no siblings.

### D-102 — Role hardcoded to 'citizen' in trigger (Zero Trust)
**Decision:** `handle_new_user` trigger hardcodes `'citizen'`. The previous `COALESCE(raw_user_meta_data->>'role', 'citizen')` was a privilege escalation vector.
**Why:** `raw_user_meta_data` is attacker-controlled — any user could sign up with `{"role": "super_admin"}` in the metadata. Role elevation uses only the Supabase service role key in a Server Function. Documented as Zero Trust directive in CLAUDE.md §0.

### D-103 — `get_my_role()` SECURITY DEFINER to prevent RLS recursion
**Decision:** All RLS policies call `public.get_my_role()` instead of querying `profiles` inline.
**Why:** Querying `profiles` inside a `profiles` RLS policy causes infinite recursion. `SECURITY DEFINER` bypasses RLS for the helper function itself. `SET search_path = public` prevents search-path injection attacks on the helper.

### D-104 — scan_logs is immutable (no UPDATE/DELETE policies)
**Decision:** No UPDATE or DELETE RLS policies exist on `scan_logs`. Ever.
**Why:** `scan_logs` is a legal audit trail for physical access control. Mutability would compromise its evidentiary value and violate the Zero Trust directive.
