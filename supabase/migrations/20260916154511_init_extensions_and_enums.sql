-- Phase 1: foundational types and helpers shared across the schema.

-- Enum types keep categorical columns constrained at the database level.
-- Adding a value later is a one-line `alter type ... add value` migration.

create type shoe_category as enum (
  'running',
  'racing',
  'trail',
  'walking',
  'training',
  'gym',
  'hiking',
  'lifestyle'
);

create type component_type as enum (
  'upper',
  'midsole',
  'outsole',
  'insole',
  'plate',
  'laces',
  'tongue',
  'heel_counter',
  'other'
);

-- Aspects a user can rate individually, separate from the overall star rating.
create type rating_aspect as enum (
  'comfort',
  'cushioning',
  'durability',
  'fit',
  'style',
  'value',
  'traction',
  'breathability'
);

create type media_type as enum (
  'image',
  'video'
);

-- Reusable trigger function: stamps updated_at on every UPDATE.
-- Defined once here and attached to each table that has the column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
