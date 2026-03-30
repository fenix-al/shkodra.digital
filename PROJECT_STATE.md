# PROJECT STATE — SHKODRA.DIGITAL
# Last updated: 2026-03-30
# Phase: 1 — Zdralë Pedestrian Zone Access Control & Citizen Reporting

---

## CURRENT STATUS: SCAFFOLDING

```
[DONE]   Next.js 16 + React 19 + Tailwind v4 base installed
[DONE]   CLAUDE.md architecture law established
[DONE]   PROJECT_STATE.md tracking initialized
[TODO]   Install remaining dependencies (see Phase 0)
[TODO]   Database schema designed and applied
[TODO]   Supabase Auth + RLS configured
[TODO]   Folder structure scaffolded
[TODO]   Middleware + RBAC routing implemented
[TODO]   Core features built (see Phase 1)
```

---

## PHASE 0 — ENVIRONMENT SETUP

### 0.1 Install Dependencies
```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# shadcn/ui (Tailwind v4 compatible)
npx shadcn@latest init
# When prompted: Dark mode, CSS variables, src/components/ui path

# QR libraries
npm install react-qr-code @zxing/library

# Crypto (Node built-in — no install needed for AES-256-GCM)
```

### 0.2 Environment Variables
Create `.env.local` at project root:
```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase project settings>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase project settings>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase project settings>
SUPABASE_QR_SECRET=<generate: openssl rand -base64 32>
```

### 0.3 Scaffold Folder Structure
Create all directories and stub files per CLAUDE.md Section 4.

---

## PHASE 1 — DATABASE SCHEMA

### Tables to Create in Supabase

#### `profiles`
Extends Supabase `auth.users`. Created automatically on signup via trigger.
```sql
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'citizen'
                CHECK (role IN ('super_admin', 'manager', 'police', 'citizen')),
  badge_id    TEXT,                    -- for police officers
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

#### `authorized_plates`
Vehicles authorized to enter the Zdralë zone.
```sql
CREATE TABLE authorized_plates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID REFERENCES profiles(id),
  plate_number    TEXT NOT NULL UNIQUE,
  owner_name      TEXT NOT NULL,
  vehicle_type    TEXT,               -- 'car', 'motorcycle', 'delivery'
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  expires_at      DATE,               -- NULL = indefinite
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE authorized_plates ENABLE ROW LEVEL SECURITY;
```

#### `scan_logs`
Every QR scan / manual entry-exit event.
```sql
CREATE TABLE scan_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_id        UUID REFERENCES authorized_plates(id),
  plate_number    TEXT NOT NULL,      -- denormalized for fast queries
  officer_id      UUID REFERENCES profiles(id),
  action          TEXT NOT NULL CHECK (action IN ('ENTRY', 'EXIT')),
  scan_method     TEXT NOT NULL CHECK (scan_method IN ('QR', 'MANUAL')),
  location        TEXT DEFAULT 'Zona Zdrala',
  scanned_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
```

#### `citizen_reports`
Geo-tagged issue reports from citizens.
```sql
CREATE TABLE citizen_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id     UUID REFERENCES profiles(id),
  category        TEXT NOT NULL,      -- 'parkimi_ilegal', 'ndriçimi', 'pastërtia', 'tjetër'
  description     TEXT NOT NULL,
  photo_url       TEXT,               -- Supabase Storage URL
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  status          TEXT NOT NULL DEFAULT 'hapur'
                    CHECK (status IN ('hapur', 'në_shqyrtim', 'zgjidhur', 'refuzuar')),
  resolved_by     UUID REFERENCES profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;
```

#### `zone_config`
Configurable zone settings (managed by super_admin).
```sql
CREATE TABLE zone_config (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name       TEXT NOT NULL DEFAULT 'Zona Këmbësore Zdralë',
  capacity        INTEGER NOT NULL DEFAULT 50,
  is_active       BOOLEAN DEFAULT TRUE,
  updated_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE zone_config ENABLE ROW LEVEL SECURITY;
-- Seed with one row
INSERT INTO zone_config (capacity) VALUES (50);
```

---

## PHASE 2 — SUPABASE AUTH & RLS SETUP

### 2.1 Auth Configuration (Supabase Dashboard)
- [ ] Enable Email provider
- [ ] Disable "Confirm email" for internal accounts (police/admin created by super_admin)
- [ ] Configure Storage bucket: `report-photos` (public read, authenticated write)

### 2.2 Profile Auto-Create Trigger
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2.3 RLS Policies (implement per table)
- [ ] `profiles`: users read own row; super_admin reads all; super_admin inserts/updates
- [ ] `authorized_plates`: citizen reads own; police reads approved; manager reads all; manager updates status
- [ ] `scan_logs`: police inserts; police/manager/admin reads; citizen reads own plate's logs
- [ ] `citizen_reports`: citizen inserts own; manager reads/updates all; citizen reads own
- [ ] `zone_config`: all authenticated read; only super_admin updates

---

## PHASE 3 — MIDDLEWARE & RBAC

### 3.1 middleware.js
- [ ] Intercept all routes
- [ ] Refresh Supabase session (cookie-based)
- [ ] Read `profile.role` from session metadata
- [ ] Redirect `/` to role-appropriate dashboard
- [ ] Block unauthorized role access (e.g., `citizen` hitting `/admin/*`)

### 3.2 Route Protection Map
| Route Pattern | Required Role(s) |
|---|---|
| `/` | Public → redirect to login if unauthed |
| `/(auth)/login` | Public |
| `/(citizen)/dashboard` | `citizen` |
| `/(citizen)/raporto` | `citizen` |
| `/(police)/skaner` | `police`, `super_admin` |
| `/(admin)/dashboard` | `manager`, `super_admin` |
| `/(admin)/autorizimet` | `manager`, `super_admin` |
| `/(admin)/raportet` | `manager`, `super_admin` |

---

## PHASE 4 — FEATURE IMPLEMENTATION ORDER

### Sprint 1: Foundation
- [ ] Supabase server/client helpers (`src/lib/supabase/`)
- [ ] `requireRole()` helper (`src/lib/auth/roles.js`)
- [ ] Middleware with session refresh + RBAC redirects
- [ ] Login page `(auth)/login` — email/password, Albanian UI
- [ ] Root layout + dark theme CSS variables

### Sprint 2: Admin Core
- [ ] Admin dashboard layout (glassmorphism sidebar + header)
- [ ] Live occupancy widget (Supabase Realtime)
- [ ] Authorization management page (approve/reject plates)
- [ ] `actions/authorizations.js` Server Functions

### Sprint 3: Police Operations
- [ ] Police scanner page — camera QR scan + manual plate input
- [ ] QR token validation logic (`src/lib/qr/token.js`)
- [ ] Entry/Exit registration Server Function (`actions/scanner.js`)
- [ ] Active log view (today's entries)

### Sprint 4: Citizen Portal
- [ ] Citizen dashboard — vehicle list + dynamic QR
- [ ] QR generation with 45-second auto-refresh + pulse animation
- [ ] Citizen reporting page — photo upload, geolocation, category select
- [ ] `actions/reports.js` Server Functions

### Sprint 5: Analytics & Polish
- [ ] Analytics tab: avg stay time, peak hours charts
- [ ] Citizen reports management for managers
- [ ] PWA manifest + service worker
- [ ] Final UI polish pass

---

## KNOWN DECISIONS & RATIONALE

| Decision | Rationale |
|---|---|
| Supabase over custom backend | Built-in RLS, Auth, Storage, and Realtime — dramatically reduces infrastructure |
| JS (not TypeScript) | Project initialized without TS; add JSDoc types to complex functions |
| 60-second QR expiry | Prevents WhatsApp screenshot sharing; 45s refresh gives buffer |
| No Vercel features | Deployment target is Hostinger Node.js |
| Albanian-only UI | City of Shkodra; target users are Albanian speakers |
| Dark mode only | Design constraint — premium/ops aesthetic |

---

## OPEN QUESTIONS

- [ ] Will police officers authenticate with email or a PIN/badge system?
- [ ] Should the citizen QR be accessible offline (PWA cache)?
- [ ] What is the exact zone capacity for Zdralë? (Default: 50)
- [ ] Does the Manager role need the ability to create Citizen accounts, or is self-registration open?
