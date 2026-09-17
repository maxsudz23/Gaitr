-- Catalog search across shoe name and brand name.
--
-- pg_trgm enables trigram (fuzzy substring) matching; the GIN indexes let
-- case-insensitive ILIKE searches use an index instead of scanning every row,
-- so this keeps working as the catalog grows.
create extension if not exists pg_trgm with schema extensions;

create index shoes_name_trgm_idx on shoes using gin (name extensions.gin_trgm_ops);
create index brands_name_trgm_idx on brands using gin (name extensions.gin_trgm_ops);

-- Returns shoes whose name OR whose brand's name matches the query. Returning
-- `setof shoes` means the client can still embed related data (brand, etc.) on
-- the result, exactly like a normal shoes query.
--
-- Runs as the caller (not security definer), so Row Level Security still applies.
-- search_path is pinned to empty and tables are schema-qualified for safety.
create or replace function search_shoes(search_query text)
returns setof shoes
language sql
stable
set search_path = ''
as $$
  select s.*
  from public.shoes s
  join public.brands b on b.id = s.brand_id
  where s.name ilike '%' || search_query || '%'
     or b.name ilike '%' || search_query || '%'
  order by s.name;
$$;

grant execute on function search_shoes(text) to anon, authenticated;
