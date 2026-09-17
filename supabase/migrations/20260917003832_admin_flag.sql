-- Admin flag on profiles, for future admin-only abilities such as editing the
-- shoe catalog. Defaults false.
alter table profiles
  add column is_admin boolean not null default false;

-- Security guard. The profiles RLS policy lets a user update their own row,
-- which on its own would let anyone set their own is_admin = true. This trigger
-- blocks changes to is_admin from the client roles (anon / authenticated);
-- only service_role or the database owner can grant or revoke admin.
-- Runs with invoker rights (NOT security definer) so current_user reflects the
-- caller's role (anon / authenticated / service_role) rather than the function
-- owner. That is what lets us tell a client edit apart from a privileged one.
create or replace function guard_is_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_user in ('anon', 'authenticated') then
    raise exception 'is_admin can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_is_admin
  before update on profiles
  for each row execute function guard_is_admin();
