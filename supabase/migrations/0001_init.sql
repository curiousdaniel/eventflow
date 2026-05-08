-- LRDC EventFlow — initial schema
-- Apply this migration in the Supabase SQL editor or via `supabase db push`.

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type event_stage as enum (
    'seed', 'planning', 'confirmed', 'in_promotion', 'active', 'complete'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum (
    'teaching', 'empowerment', 'retreat', 'community', 'fundraiser', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_status as enum ('pending', 'drafted', 'sent');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default 'Untitled Event',
  stage        event_stage not null default 'seed',
  event_type   event_type,
  start_date   timestamptz,
  end_date     timestamptz,
  core         jsonb not null default '{}'::jsonb,
  logistics    jsonb not null default '{}'::jsonb,
  approvals    jsonb not null default '{}'::jsonb,
  publicity    jsonb not null default '{}'::jsonb,
  volunteers   jsonb not null default '{}'::jsonb,
  finances     jsonb not null default '{}'::jsonb,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists events_stage_idx      on events (stage);
create index if not exists events_start_date_idx on events (start_date);
create index if not exists events_updated_at_idx on events (updated_at desc);

-- -----------------------------------------------------------------------------
-- event_history
-- -----------------------------------------------------------------------------
create table if not exists event_history (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  snapshot     jsonb not null,
  changed_by   uuid references profiles(id),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists event_history_event_id_idx   on event_history (event_id);
create index if not exists event_history_created_at_idx on event_history (created_at desc);

-- -----------------------------------------------------------------------------
-- event_messages
-- -----------------------------------------------------------------------------
create table if not exists event_messages (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists event_messages_event_id_idx   on event_messages (event_id);
create index if not exists event_messages_created_at_idx on event_messages (created_at);

-- -----------------------------------------------------------------------------
-- promotional_items
-- -----------------------------------------------------------------------------
create table if not exists promotional_items (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  channel      text not null,
  action_type  text not null,
  target_date  date not null,
  status       promo_status not null default 'pending',
  content      text,
  created_at   timestamptz not null default now()
);

create index if not exists promotional_items_event_id_idx    on promotional_items (event_id);
create index if not exists promotional_items_target_date_idx on promotional_items (target_date);

-- -----------------------------------------------------------------------------
-- Row Level Security: simple v1 policy — authenticated users have full access.
-- -----------------------------------------------------------------------------
alter table profiles          enable row level security;
alter table events            enable row level security;
alter table event_history     enable row level security;
alter table event_messages    enable row level security;
alter table promotional_items enable row level security;

drop policy if exists "authenticated users have full access" on profiles;
create policy "authenticated users have full access"
  on profiles for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users have full access" on events;
create policy "authenticated users have full access"
  on events for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users have full access" on event_history;
create policy "authenticated users have full access"
  on event_history for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users have full access" on event_messages;
create policy "authenticated users have full access"
  on event_messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users have full access" on promotional_items;
create policy "authenticated users have full access"
  on promotional_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row is created.
-- Phase 1 magic-link sign-in relies on this so the user has a profile by the
-- time they hit /dashboard. The /auth/callback route also defensively upserts.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at trigger for events
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on events;
create trigger events_touch_updated_at
  before update on events
  for each row execute function public.touch_updated_at();
