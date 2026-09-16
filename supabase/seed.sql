-- Seed data for local development. Runs automatically on `supabase db reset`.
-- Reference catalog only (brands / shoes / components) — reviews and ratings
-- need real auth users, so those are created through the app, not seeded here.
--
-- Fixed UUIDs are used so shoes can reference their brand deterministically and
-- re-running the reset always produces the same ids.

insert into brands (id, name, slug, description, website_url) values
  ('11111111-1111-1111-1111-111111111111', 'Nike',        'nike',        'American athletic footwear and apparel giant.', 'https://www.nike.com'),
  ('22222222-2222-2222-2222-222222222222', 'Hoka',        'hoka',        'Known for maximalist, high-stack cushioned running shoes.', 'https://www.hoka.com'),
  ('33333333-3333-3333-3333-333333333333', 'Saucony',     'saucony',     'Long-standing running-focused footwear brand.', 'https://www.saucony.com'),
  ('44444444-4444-4444-4444-444444444444', 'New Balance', 'new-balance', 'American brand spanning running, lifestyle, and training.', 'https://www.newbalance.com');

insert into shoes (brand_id, name, slug, category, description, release_year, msrp_cents, weight_grams, drop_mm, heel_stack_mm, forefoot_stack_mm) values
  ('11111111-1111-1111-1111-111111111111', 'Pegasus 41',        'pegasus-41',        'running', 'Nike''s workhorse daily trainer.',                     2024, 14000, 269, 10.0, 37.0, 27.0),
  ('11111111-1111-1111-1111-111111111111', 'Vaporfly 3',        'vaporfly-3',        'racing',  'Carbon-plated marathon racing shoe.',                 2023, 26000, 187,  8.0, 40.0, 32.0),
  ('22222222-2222-2222-2222-222222222222', 'Clifton 9',         'clifton-9',         'running', 'Lightweight, highly cushioned daily trainer.',        2023, 14500, 248,  5.0, 32.0, 27.0),
  ('22222222-2222-2222-2222-222222222222', 'Speedgoat 5',       'speedgoat-5',       'trail',   'Grippy, cushioned trail runner.',                     2022, 15500, 295,  4.0, 33.0, 29.0),
  ('33333333-3333-3333-3333-333333333333', 'Endorphin Speed 4', 'endorphin-speed-4', 'running', 'Nylon-plated tempo and daily-do-it-all trainer.',     2024, 17000, 218,  8.0, 36.0, 28.0),
  ('44444444-4444-4444-4444-444444444444', 'Fresh Foam 1080 v13','fresh-foam-1080-v13','running','Plush premium neutral daily trainer.',                2024, 16500, 269,  6.0, 38.0, 32.0);

-- A couple of example components to exercise the shoe_components table.
insert into shoe_components (shoe_id, component_type, name, material, description)
select id, 'midsole', 'ZoomX', 'PEBA foam', 'High-energy-return racing foam.'
from shoes where slug = 'vaporfly-3';

insert into shoe_components (shoe_id, component_type, name, material, description)
select id, 'plate', 'Carbon fiber plate', 'Carbon fiber', 'Full-length propulsion plate.'
from shoes where slug = 'vaporfly-3';
