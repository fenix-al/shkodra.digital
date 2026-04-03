# WORKING MEMORY - SHKODRA.DIGITAL

This file is a compact operational memory for ongoing development.

## Product vision
Shkodra.digital is evolving from a service portal into a city operations platform:
- online documents and requests
- citizen issue reporting
- live municipal oversight
- public transparency
- future mobile engagement

## Current priorities
1. Keep reporting, follow-up, map, notifications, and email flows stable
2. Improve email deliverability and sender trust
3. Prepare the next major module: municipality projects

## High-value modules already built
- Admin reporting dashboard
- Realtime reports workspace
- Citizen reporting with photo upload
- Citizen follow-up flow for unresolved reports (`prapambetur`)
- Admin and citizen notifications
- Notification preferences
- Email delivery foundation with Resend

## Current risks / watchpoints
- First report confirmation email may hit spam until domain reputation improves
- Follow-up / overdue flow depends on:
  - `20260403_report_followups.sql` being applied
  - realtime enabled for `citizen_reports`
  - admin report workspace staying in sync with Supabase updates
- Email settings depend on:
  - valid Resend API key
  - verified sender domain
  - correct DNS records
- Realtime depends on Supabase publication switches staying enabled

## Important environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_QR_SECRET`
- `RESEND_API_KEY`
- `NOTIFICATIONS_EMAIL_FROM`
- optional future:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`

## Important Supabase tables
- `profiles`
- `authorized_plates`
- `scan_logs`
- `citizen_reports`
- `app_notifications`
- `app_notification_preferences`
- `app_delivery_settings`
- `zone_config`

## Current UX conventions
- Albanian-first UI
- dark, premium operational dashboard style
- fast access to actions in-context
- mobile-first citizen experience
- admin workspace optimized for speed, visibility, and presentation
- overdue / neglected reports are visually distinct and must stay highly visible

## Immediate next steps after current phase
1. Municipality projects module
2. Neighborhood managers / field operators
3. Push notifications for mobile app
4. Public-facing presentation layer for municipality storytelling

## Rules of thumb
- Do not break report upload flow
- Do not break report status flow
- Do not break follow-up / `prapambetur` logic
- Do not regress bell notifications
- Do not regress admin realtime on reports/map/dashboard
- Keep admin actions available without unnecessary clicks
- Prefer secure server-side integrations for anything sensitive
