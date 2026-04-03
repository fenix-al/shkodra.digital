# TECHNICAL PRESENTATION - SHKODRA.DIGITAL

## 1. Project overview
Shkodra.digital is a full-stack municipal operations platform built to support:
- citizen self-service
- municipal reporting and issue resolution
- police access control operations
- realtime oversight
- notification and communication workflows

## 2. Main technologies
- Frontend:
  - Next.js 16 App Router
  - React 19
  - Tailwind CSS v4
  - Lucide icons
- Backend:
  - Next.js Server Actions
  - Supabase
- Database:
  - PostgreSQL on Supabase
- Auth:
  - Supabase Auth
- Storage:
  - Supabase Storage
- Realtime:
  - Supabase Realtime / Postgres Changes
- Email:
  - Resend

## 3. Core architectural blocks

### 3.1 Role-based application structure
The system supports four main roles:
- `citizen`
- `police`
- `manager`
- `super_admin`

Access is enforced server-side with role checks and route protection.

### 3.2 Supabase data model
Main tables:
- `profiles`
- `authorized_plates`
- `scan_logs`
- `citizen_reports`
- `zone_config`
- `app_notifications`
- `app_notification_preferences`
- `app_delivery_settings`

### 3.3 Security model
- Supabase RLS on protected tables
- Service-role access used only in server-side code
- QR security based on HMAC validation
- Report upload validation for file type, size, and cleanup
- Role checks for all sensitive actions

## 4. Functional modules

### 4.1 Citizen module
- citizen dashboard
- authorized vehicle QR access
- report submission
- report photo upload
- geolocation
- notification bell
- notification preferences

### 4.2 Admin module
- dashboard and analytics
- reports table with filters
- exports: CSV / Excel / PDF
- interactive geospatial workspace
- notification bell
- settings page
- email delivery configuration

### 4.3 Police module
- QR scanner
- manual plate entry
- entry / exit logging
- zone occupancy tracking

## 5. Realtime architecture
Realtime is implemented using Supabase Postgres Changes subscriptions.

Current live areas:
- admin notification bell
- citizen notification bell
- admin report table
- admin report map
- admin report statistics refresh
- occupancy tracking

Required tables enabled for realtime:
- `scan_logs`
- `citizen_reports`
- `app_notifications`

## 6. Notification architecture

### 6.1 In-app notifications
Notifications are stored in `app_notifications` and support:
- personal notifications
- shared admin notifications
- unread/read state
- metadata for deep links
- realtime updates

### 6.2 Preferences
Per-user preferences are stored in `app_notification_preferences`:
- email enabled
- push enabled
- digest frequency

### 6.3 Delivery settings
Global delivery configuration is stored in `app_delivery_settings`:
- email delivery enabled
- push delivery enabled
- sender name
- sender email
- reply-to email
- footer signature

## 7. Email flow
When a notification is created:
1. preferences are resolved
2. delivery settings are resolved
3. in-app notification is inserted
4. if email is enabled and configured, Resend is used to send the email
5. `channels_status.email` is updated to:
   - `sent`
   - `failed:...`
   - `awaiting_configuration`
   - `disabled`

## 8. Reporting / map module
The report workspace supports:
- search and filtering
- quick status actions
- priority derivation
- map clustering
- heatmap
- playback mode
- studio mode
- timeline chart
- map-to-table synchronization

## 9. Deployment and ops considerations
- environment variables must be configured for Supabase and Resend
- DNS must be configured for email reputation:
  - SPF
  - DKIM
  - DMARC
- Realtime publications must stay enabled in Supabase

## 10. Current next steps
- municipality projects module
- neighborhood manager workflows
- push notifications for mobile app
- public/studio presentation layer
