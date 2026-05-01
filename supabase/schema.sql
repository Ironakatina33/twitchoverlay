create table if not exists public.overlay_state (
  id text primary key,
  settings jsonb not null,
  viewer_count integer not null default 0,
  follow_count integer not null default 0,
  last_follow text not null default '-',
  last_follow_at timestamptz,
  twitch_connected boolean not null default false,
  twitch_last_error text not null default '',
  twitch_last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.overlay_events (
  id bigint generated always as identity primary key,
  type text not null,
  username text,
  triggered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'overlay_state'
  ) then
    alter publication supabase_realtime add table public.overlay_state;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'overlay_events'
  ) then
    alter publication supabase_realtime add table public.overlay_events;
  end if;
end $$;

alter table public.overlay_state enable row level security;
alter table public.overlay_events enable row level security;

drop policy if exists "overlay_state_select_anon" on public.overlay_state;
create policy "overlay_state_select_anon"
  on public.overlay_state
  for select
  to anon
  using (true);

drop policy if exists "overlay_events_select_anon" on public.overlay_events;
create policy "overlay_events_select_anon"
  on public.overlay_events
  for select
  to anon
  using (true);
