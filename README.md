# Shkodra.digital

Municipal operations platform for citizen reporting, access control, realtime oversight, notifications, and digital service workflows.

## Stack
- Next.js 16
- React 19
- Tailwind CSS v4
- Supabase
- Resend

## Run locally
```bash
npm install
npm run dev
```

## Main environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_QR_SECRET`
- `RESEND_API_KEY`
- `NOTIFICATIONS_EMAIL_FROM`

## Main docs
- [Project State](./PROJECT_STATE.md)
- [Working Memory](./WORKING_MEMORY.md)
- [Technical Presentation](./TECHNICAL_PRESENTATION.md)
- [Executive Presentation](./EXECUTIVE_PRESENTATION.md)
- [Decisions Log](./DECISIONS.md)
- [Agent Rules](./AGENTS.md)

## Current platform coverage
- Admin dashboard and operations
- Citizen dashboard and reporting
- Police scanner workflow
- Realtime report tracking
- In-app notifications
- Email delivery foundation

## Deployment notes
- Apply Supabase migrations before production rollout
- Enable realtime on required tables
- Configure SPF, DKIM, and DMARC for email deliverability
