# PROJECT STATE - SHKODRA.DIGITAL
Last updated: 2026-04-02
Current phase: Digital city operations platform - reporting, realtime, notifications, email delivery foundation

## Snapshot
- Core access-control platform is operational for admin, police, and citizen roles.
- Citizen reporting is operational with photo upload, geolocation, Supabase storage, and admin review flow.
- Admin reporting workspace is operational with filters, exports, interactive map, clustering, heatmap, playback, and realtime updates.
- Notifications are operational in-app for admin and citizen, with unread/read state, bell UI, realtime updates, and DB persistence.
- Email delivery foundation is operational with Resend integration, notification preferences, and delivery settings.

## Completed
- Next.js 16 App Router + React 19 + Tailwind v4 foundation
- Supabase auth, profiles, roles, RLS, storage, realtime subscriptions
- Admin dashboard, authorizations, users, settings, analytics
- Police QR scanner and zone occupancy flow
- Citizen dashboard, QR access, report submission
- Report photo upload hardening and cleanup logic
- Admin reports table with filters, exports, and quick actions
- Interactive map with:
  - clusters
  - heatmap
  - playback
  - timeline chart
  - studio mode
  - live selection sync from table
- Realtime reports:
  - table updates automatically
  - map pins update automatically
  - dashboard report stats refresh automatically
  - report status changes reflect without manual refresh
- Notifications system:
  - `app_notifications`
  - `app_notification_preferences`
  - bell for admin
  - bell for citizen
  - mark read / unread count
  - deep links to reports
- Notification preferences UI for admin and citizen
- Global delivery settings UI in admin settings
- Resend integration for email delivery

## Database / Supabase status
- `app_notifications` migration applied
- `app_delivery_settings` migration created and should be applied in Supabase
- Realtime enabled for:
  - `citizen_reports`
  - `app_notifications`
  - `scan_logs`

## Current technical focus
- Stabilize deliverability for the first outgoing report email
- Improve sender reputation with SPF/DKIM/DMARC and warm-up
- Prepare for mobile push notifications and neighborhood manager workflow

## Open operational tasks
- Apply `supabase/migrations/20260402_app_delivery_settings.sql`
- Confirm `.env.local` and production envs include:
  - `RESEND_API_KEY`
  - `NOTIFICATIONS_EMAIL_FROM`
- Verify domain DNS for email:
  - SPF
  - DKIM
  - DMARC

## Recommended next product steps
1. Municipality projects module
2. Neighborhood manager workflow
3. Real mobile push notifications
4. Public-facing project showcase / studio presentation mode

## Key files
- `src/actions/reports.js`
- `src/lib/notifications.js`
- `src/lib/email.js`
- `src/components/admin/ReportsGeoMap.tsx`
- `src/components/admin/ReportsTable.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/citizen/CitizenBell.tsx`
- `src/components/shared/NotificationPreferencesCard.tsx`
- `src/components/admin/AccountSettingsForm.tsx`

## Supporting docs
- `DECISIONS.md`
- `WORKING_MEMORY.md`
- `TECHNICAL_PRESENTATION.md`
- `EXECUTIVE_PRESENTATION.md`
