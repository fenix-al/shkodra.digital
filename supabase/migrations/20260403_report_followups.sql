alter table public.citizen_reports
  add column if not exists follow_up_count integer not null default 0,
  add column if not exists last_follow_up_at timestamptz,
  add column if not exists last_follow_up_note text;

create index if not exists idx_citizen_reports_follow_up_count
  on public.citizen_reports(follow_up_count);

create index if not exists idx_citizen_reports_last_follow_up_at
  on public.citizen_reports(last_follow_up_at desc);
