create table if not exists public.app_delivery_settings (
  id uuid primary key default gen_random_uuid(),
  email_notifications_enabled boolean not null default false,
  push_notifications_enabled boolean not null default false,
  sender_name text,
  sender_email text,
  reply_to_email text,
  footer_signature text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_app_delivery_settings_singleton
  on public.app_delivery_settings ((true));

drop trigger if exists trg_app_delivery_settings_updated_at on public.app_delivery_settings;
create trigger trg_app_delivery_settings_updated_at
before update on public.app_delivery_settings
for each row execute function public.set_updated_at();

alter table public.app_delivery_settings enable row level security;

drop policy if exists "delivery_settings_select_admin" on public.app_delivery_settings;
create policy "delivery_settings_select_admin"
on public.app_delivery_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'super_admin')
  )
);
