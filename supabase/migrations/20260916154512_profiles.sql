-- Users. Supabase Auth owns the private `auth.users` table (email, password,
-- OAuth identities). We never write to it directly. Instead every user gets a
-- public `profiles` row keyed to the same id — this is the standard Supabase
-- pattern and the table the rest of the app joins against.

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  display_name text,
  bio         text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Usernames: 3-30 chars, lowercase letters/numbers/underscore only.
  constraint username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- When Supabase Auth creates a user, mint their profile automatically so the
-- app never has to deal with a signed-in user who has no profile row.
-- Username defaults to a placeholder derived from the id; the user can change
-- it later during onboarding.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Placeholder username, kept within the 30-char format constraint
  -- (5 for 'user_' + 24 hex chars = 29). Users pick a real one at onboarding.
  insert into public.profiles (id, username)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 24)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
