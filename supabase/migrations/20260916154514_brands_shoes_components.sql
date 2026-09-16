-- The shoe catalog: brands, the shoes they make, and the components of a shoe.
-- These are "reference" tables — read by everyone, written only by admins/seed
-- scripts (enforced later in the RLS migration).

create table brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  logo_url    text,
  website_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint slug_format check (slug ~ '^[a-z0-9-]+$')
);

create trigger brands_set_updated_at
  before update on brands
  for each row execute function set_updated_at();


create table shoes (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands (id) on delete cascade,
  name          text not null,
  slug          text not null,
  category      shoe_category not null,
  description   text,
  release_year  smallint,
  -- Money is stored as integer cents to avoid floating-point rounding.
  msrp_cents    integer,
  weight_grams  smallint,
  -- Heel-to-toe drop and stack heights, the numbers runners actually compare.
  drop_mm         numeric(4, 1),
  heel_stack_mm   numeric(4, 1),
  forefoot_stack_mm numeric(4, 1),
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A slug is unique within a brand, not globally: two brands can both have a
  -- "pegasus"-like slug without colliding.
  constraint shoe_slug_unique unique (brand_id, slug),
  constraint shoe_slug_format check (slug ~ '^[a-z0-9-]+$'),
  constraint release_year_sane check (release_year is null or release_year between 1970 and 2100),
  constraint weight_positive check (weight_grams is null or weight_grams > 0),
  constraint msrp_positive check (msrp_cents is null or msrp_cents >= 0)
);

create index shoes_brand_id_idx on shoes (brand_id);
create index shoes_category_idx on shoes (category);

create trigger shoes_set_updated_at
  before update on shoes
  for each row execute function set_updated_at();


-- The parts that make up a shoe (upper, midsole, outsole, plate...). In V1 this
-- is a descriptive catalog only; component-level *ratings* are a V2 feature.
create table shoe_components (
  id             uuid primary key default gen_random_uuid(),
  shoe_id        uuid not null references shoes (id) on delete cascade,
  component_type component_type not null,
  name           text,
  material       text,
  description    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index shoe_components_shoe_id_idx on shoe_components (shoe_id);

create trigger shoe_components_set_updated_at
  before update on shoe_components
  for each row execute function set_updated_at();
