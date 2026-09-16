-- User-generated content: reviews, the per-aspect ratings attached to them,
-- and uploaded media.

-- A review is the core unit. It always carries an overall star rating; the
-- text body is optional, so "just rating a shoe" (Letterboxd-style) and
-- "writing a full review" are the same row with body null vs filled.
-- One review per user per shoe — editing replaces, it doesn't stack.
create table reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles (id) on delete cascade,
  shoe_id        uuid not null references shoes (id) on delete cascade,
  overall_rating numeric(2, 1) not null,
  title          text,
  body           text,
  size_purchased text,
  is_verified_purchase boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint one_review_per_user_per_shoe unique (user_id, shoe_id),
  -- 0.5 to 5.0 in half-star steps.
  constraint overall_rating_range check (
    overall_rating between 0.5 and 5.0
    and (overall_rating * 2) = floor(overall_rating * 2)
  )
);

create index reviews_shoe_id_idx on reviews (shoe_id);
create index reviews_user_id_idx on reviews (user_id);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();


-- Optional per-aspect breakdown for a review (comfort 4, durability 5, ...).
-- Each aspect can be scored at most once per review.
create table ratings (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews (id) on delete cascade,
  aspect     rating_aspect not null,
  score      smallint not null,
  created_at timestamptz not null default now(),

  constraint one_score_per_aspect unique (review_id, aspect),
  constraint score_range check (score between 1 and 5)
);

create index ratings_review_id_idx on ratings (review_id);


-- Uploaded photos/videos. `storage_path` points at an object in a Supabase
-- Storage bucket (the file itself lives there, not in Postgres). Media is
-- owned by a user and attached to a review and/or a shoe.
create table media (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  review_id    uuid references reviews (id) on delete cascade,
  shoe_id      uuid references shoes (id) on delete set null,
  type         media_type not null default 'image',
  storage_path text not null,
  caption      text,
  width        integer,
  height       integer,
  -- Ordering of images within a review's gallery.
  position     smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Media must hang off something, otherwise it is orphaned on upload.
  constraint media_has_parent check (review_id is not null or shoe_id is not null)
);

create index media_review_id_idx on media (review_id);
create index media_shoe_id_idx on media (shoe_id);
create index media_user_id_idx on media (user_id);

create trigger media_set_updated_at
  before update on media
  for each row execute function set_updated_at();
