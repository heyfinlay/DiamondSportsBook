-- Add user_roles table for multiple role support
-- This extends the existing profiles.role system to allow users to have multiple roles

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

-- Only super_admins can modify roles
create policy "Super admins can manage roles"
  on public.user_roles
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Grant permissions
grant select on public.user_roles to authenticated;

-- Update has_permission function to check both profiles.role and user_roles
create or replace function public.has_permission(target_permission text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  has_multi_role boolean;
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

  -- Super admin has all permissions
  if actor.role = 'super_admin' then
    return true;
  end if;

  if target_permission is null then
    return false;
  end if;

  -- Check primary role in profiles table
  if target_permission = actor.role::text then
    return true;
  end if;

  -- Check permissions array in profiles table
  if target_permission = any(actor.permissions) then
    return true;
  end if;

  -- Check user_roles table for additional roles
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = target_permission
  ) into has_multi_role;

  return has_multi_role;
end;
$$;

-- Migrate existing profiles.role to user_roles for consistency
-- This allows users to have their primary role in both places
insert into public.user_roles (user_id, role)
select id, role::text
from public.profiles
where role is not null
on conflict (user_id, role) do nothing;
