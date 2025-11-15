-- Identity & Access Domain
create extension if not exists "pgcrypto" with schema public;

create type public.user_role as enum (
  'spectator',
  'marshal',
  'race_control',
  'betting_admin',
  'super_admin'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.user_role not null default 'spectator',
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.touch_profile_updated_at();

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own display name"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.has_permission(target_permission text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into actor
  from public.profiles
  where id = auth.uid();

  if not found then
    return false;
  end if;

  if actor.role = 'super_admin' then
    return true;
  end if;

  if target_permission is null then
    return false;
  end if;

  return target_permission = actor.role::text
    or target_permission = any(actor.permissions);
end;
$$;

grant usage on type public.user_role to authenticated;
grant select, update on public.profiles to authenticated;
