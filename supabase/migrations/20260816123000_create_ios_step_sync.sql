create table if not exists public.ios_step_sync (
  token_hash text primary key,
  steps integer not null check (steps between 0 and 200000),
  step_date date not null,
  updated_at timestamptz not null default now(),
  constraint ios_step_sync_token_hash_length check (length(token_hash) = 64)
);

alter table public.ios_step_sync enable row level security;

revoke all on table public.ios_step_sync from anon, authenticated;

comment on table public.ios_step_sync is
  'Latest Apple Health step upload per opaque device capability. Access is limited to the ios-step-sync Edge Function.';

