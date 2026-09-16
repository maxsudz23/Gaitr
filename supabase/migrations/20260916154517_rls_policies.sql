-- Row Level Security. Supabase exposes these tables directly over its API, so
-- RLS is the actual authorization layer — without a policy, a table is locked
-- to everyone except the service_role key (which bypasses RLS and is what seed
-- scripts and admin tasks use).
--
-- General shape for Gaitr V1:
--   * Everything is publicly readable (it's a public review site).
--   * Reference data (brands/shoes/components) has NO write policy, so only the
--     service_role can change it.
--   * User content (reviews/ratings/media) is writable only by its owner.

alter table profiles        enable row level security;
alter table brands          enable row level security;
alter table shoes           enable row level security;
alter table shoe_components enable row level security;
alter table reviews         enable row level security;
alter table ratings         enable row level security;
alter table media           enable row level security;


-- Profiles: anyone can read; you can create and edit only your own.
create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- Reference catalog: readable by everyone, writable by no one (service_role only).
create policy "Brands are viewable by everyone"
  on brands for select using (true);

create policy "Shoes are viewable by everyone"
  on shoes for select using (true);

create policy "Shoe components are viewable by everyone"
  on shoe_components for select using (true);


-- Reviews: public read; owner-only write.
create policy "Reviews are viewable by everyone"
  on reviews for select using (true);

create policy "Users can create their own reviews"
  on reviews for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own reviews"
  on reviews for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own reviews"
  on reviews for delete to authenticated
  using (auth.uid() = user_id);


-- Aspect ratings: public read; writable only when you own the parent review.
create policy "Ratings are viewable by everyone"
  on ratings for select using (true);

create policy "Users can write ratings on their own reviews"
  on ratings for all to authenticated
  using (
    exists (
      select 1 from reviews r
      where r.id = ratings.review_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from reviews r
      where r.id = ratings.review_id and r.user_id = auth.uid()
    )
  );


-- Media: public read; owner-only write.
create policy "Media is viewable by everyone"
  on media for select using (true);

create policy "Users can upload their own media"
  on media for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own media"
  on media for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own media"
  on media for delete to authenticated
  using (auth.uid() = user_id);
