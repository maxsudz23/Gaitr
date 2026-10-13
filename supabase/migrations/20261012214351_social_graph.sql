-- Phase 4: the social graph. Follows between users, likes and comments on
-- reviews, saved (bookmarked) shoes, and the following feed.

-- Who follows whom. The composite primary key makes a follow unique, and the
-- check stops users following themselves.
create table follows (
  follower_id  uuid not null references profiles (id) on delete cascade,
  following_id uuid not null references profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- The primary key already indexes follower_id (its first column); this one
-- serves "who follows this user" lookups and follower counts.
create index follows_following_id_idx on follows (following_id);


-- One like per user per review.
create table review_likes (
  user_id    uuid not null references profiles (id) on delete cascade,
  review_id  uuid not null references reviews (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_id, review_id)
);

create index review_likes_review_id_idx on review_likes (review_id);


create table review_comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint comment_body_length check (char_length(trim(body)) between 1 and 1000)
);

create index review_comments_review_id_idx on review_comments (review_id, created_at);
create index review_comments_user_id_idx on review_comments (user_id);

create trigger review_comments_set_updated_at
  before update on review_comments
  for each row execute function set_updated_at();


-- A user's bookmarked shoes ("want to try" list).
create table saved_shoes (
  user_id    uuid not null references profiles (id) on delete cascade,
  shoe_id    uuid not null references shoes (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_id, shoe_id)
);


-- RLS. Follows, likes, and comments are public, like the rest of the site;
-- each user can only create or remove their own. Saved shoes are private.
alter table follows         enable row level security;
alter table review_likes    enable row level security;
alter table review_comments enable row level security;
alter table saved_shoes     enable row level security;

create policy "Follows are viewable by everyone"
  on follows for select using (true);

create policy "Users can follow as themselves"
  on follows for insert to authenticated
  with check (auth.uid() = follower_id);

create policy "Users can unfollow as themselves"
  on follows for delete to authenticated
  using (auth.uid() = follower_id);


create policy "Review likes are viewable by everyone"
  on review_likes for select using (true);

create policy "Users can like as themselves"
  on review_likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own likes"
  on review_likes for delete to authenticated
  using (auth.uid() = user_id);


create policy "Comments are viewable by everyone"
  on review_comments for select using (true);

create policy "Users can comment as themselves"
  on review_comments for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can edit their own comments"
  on review_comments for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on review_comments for delete to authenticated
  using (auth.uid() = user_id);


create policy "Users can see their own saved shoes"
  on saved_shoes for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can save shoes for themselves"
  on saved_shoes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unsave their own shoes"
  on saved_shoes for delete to authenticated
  using (auth.uid() = user_id);


-- The following feed: reviews written by people the caller follows, newest
-- first. Returns `setof reviews` so the client embeds author, shoe, likes,
-- etc. exactly as it does for any other review query (same pattern as
-- search_shoes). Runs as the caller, so RLS applies.
create or replace function feed_reviews()
returns setof reviews
language sql
stable
set search_path = ''
as $$
  select r.*
  from public.reviews r
  where r.user_id in (
    select f.following_id from public.follows f where f.follower_id = auth.uid()
  )
  order by r.created_at desc;
$$;

grant execute on function feed_reviews() to authenticated;
