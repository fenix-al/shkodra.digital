create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.app_notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  digest_frequency text not null default 'instant' check (digest_frequency in ('instant', 'daily', 'weekly')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_role text,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'generic',
  title text not null,
  body text not null,
  href text,
  tone text not null default 'blue' check (tone in ('emerald', 'amber', 'rose', 'blue', 'slate')),
  icon text not null default 'report' check (icon in ('report', 'camera', 'car', 'check', 'clock', 'shield', 'x', 'alert')),
  metadata jsonb not null default '{}'::jsonb,
  channels_requested jsonb not null default '{"in_app": true, "email": false, "push": false}'::jsonb,
  channels_status jsonb not null default '{"in_app": "ready", "email": "disabled", "push": "disabled"}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_notifications_target_check check (recipient_id is not null or recipient_role is not null),
  constraint app_notifications_role_check check (recipient_role is null or recipient_role in ('admin', 'manager', 'super_admin', 'citizen', 'police'))
);

create index if not exists idx_app_notifications_recipient_id_created_at
  on public.app_notifications(recipient_id, created_at desc);

create index if not exists idx_app_notifications_recipient_role_created_at
  on public.app_notifications(recipient_role, created_at desc);

create index if not exists idx_app_notifications_unread
  on public.app_notifications(read_at, created_at desc);

drop trigger if exists trg_app_notification_preferences_updated_at on public.app_notification_preferences;
create trigger trg_app_notification_preferences_updated_at
before update on public.app_notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_app_notifications_updated_at on public.app_notifications;
create trigger trg_app_notifications_updated_at
before update on public.app_notifications
for each row execute function public.set_updated_at();

alter table public.app_notification_preferences enable row level security;
alter table public.app_notifications enable row level security;

drop policy if exists "preferences_select_own" on public.app_notification_preferences;
create policy "preferences_select_own"
on public.app_notification_preferences
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "preferences_update_own" on public.app_notification_preferences;
create policy "preferences_update_own"
on public.app_notification_preferences
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "preferences_insert_own" on public.app_notification_preferences;
create policy "preferences_insert_own"
on public.app_notification_preferences
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "notifications_select_visible" on public.app_notifications;
create policy "notifications_select_visible"
on public.app_notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
  or (
    recipient_role = 'admin'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('manager', 'super_admin')
    )
  )
);

drop policy if exists "notifications_update_visible" on public.app_notifications;
create policy "notifications_update_visible"
on public.app_notifications
for update
to authenticated
using (
  recipient_id = auth.uid()
  or (
    recipient_role = 'admin'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('manager', 'super_admin')
    )
  )
)
with check (
  recipient_id = auth.uid()
  or (
    recipient_role = 'admin'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('manager', 'super_admin')
    )
  )
);
