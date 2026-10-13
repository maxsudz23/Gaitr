-- Phase 5: trending and discovery. Plain heuristics over existing activity, no
-- ML. Each function returns ids plus the numbers behind the ranking; the app
-- loads the shoes/profiles themselves with its usual queries.

-- Indexes for the time-windowed scans below.
create index reviews_created_at_idx on reviews (created_at);
create index review_likes_created_at_idx on review_likes (created_at);
create index review_comments_created_at_idx on review_comments (created_at);
create index saved_shoes_shoe_id_idx on saved_shoes (shoe_id, created_at);


-- Trending: recent activity around each shoe, with older activity counting
-- for less. Every event in the last 14 days scores
--
--   weight * 0.5 ^ (age / 3 days)
--
-- (a 3-day half-life), with weights: new review 5, save 3, comment on one of
-- its reviews 2, like on one of its reviews 1.
--
-- Security definer so saves count: saved_shoes rows are private to their
-- owner, but only per-shoe totals leave this function, never who saved what.
create or replace function trending_shoes(max_results integer default 10)
returns table (shoe_id uuid, score float8, reviews_this_week integer)
language sql
stable
security definer
set search_path = ''
as $$
  with events as (
    select r.shoe_id, 'review' as kind, 5.0 as weight, r.created_at
    from public.reviews r
    where r.created_at > now() - interval '14 days'
    union all
    select s.shoe_id, 'save', 3.0, s.created_at
    from public.saved_shoes s
    where s.created_at > now() - interval '14 days'
    union all
    select r.shoe_id, 'comment', 2.0, c.created_at
    from public.review_comments c
    join public.reviews r on r.id = c.review_id
    where c.created_at > now() - interval '14 days'
    union all
    select r.shoe_id, 'like', 1.0, l.created_at
    from public.review_likes l
    join public.reviews r on r.id = l.review_id
    where l.created_at > now() - interval '14 days'
  )
  select
    e.shoe_id,
    sum(e.weight * power(0.5, extract(epoch from now() - e.created_at) / (3 * 86400)))::float8,
    (count(*) filter (where e.kind = 'review' and e.created_at > now() - interval '7 days'))::integer
  from events e
  group by e.shoe_id
  order by 2 desc
  limit least(greatest(max_results, 1), 50);
$$;

revoke execute on function trending_shoes(integer) from public, anon;
grant execute on function trending_shoes(integer) to authenticated;


-- Top rated: average rating shrunk toward the site-wide average (a Bayesian
-- average), so one 5-star review doesn't outrank twenty 4.8s:
--
--   (n * shoe_avg + k * site_avg) / (n + k)
--
-- `prior_weight` (k) acts like k phantom reviews at the site average.
create or replace function top_rated_shoes(
  max_results integer default 10,
  prior_weight integer default 3
)
returns table (shoe_id uuid, weighted_rating float8, average_rating float8, review_count integer)
language sql
stable
set search_path = ''
as $$
  with stats as (
    select r.shoe_id, count(*) as n, avg(r.overall_rating) as shoe_avg
    from public.reviews r
    group by r.shoe_id
  ),
  site as (
    select coalesce(avg(overall_rating), 3) as site_avg from public.reviews
  )
  select
    stats.shoe_id,
    ((stats.n * stats.shoe_avg + prior_weight * site.site_avg) / (stats.n + prior_weight))::float8,
    round(stats.shoe_avg, 1)::float8,
    stats.n::integer
  from stats, site
  order by 2 desc, 4 desc
  limit least(greatest(max_results, 1), 50);
$$;

grant execute on function top_rated_shoes(integer, integer) to anon, authenticated;


-- Reviewers the caller might want to follow: people they don't follow yet,
-- scored by
--
--   3 * (people the caller follows who follow them)
--   + reviews written (capped at 20, so volume alone can't dominate)
--   + 0.5 * likes their reviews received in the last 30 days
--
-- Runs as the caller; follows, reviews, and likes are all public.
create or replace function suggested_reviewers(max_results integer default 10)
returns table (profile_id uuid, mutual_count integer, review_count integer, score float8)
language sql
stable
set search_path = ''
as $$
  with candidates as (
    select
      p.id,
      (
        select count(*)
        from public.follows theirs
        join public.follows mine
          on mine.following_id = theirs.follower_id
         and mine.follower_id = auth.uid()
        where theirs.following_id = p.id
      ) as mutual_count,
      (select count(*) from public.reviews r where r.user_id = p.id) as review_count,
      (
        select count(*)
        from public.review_likes l
        join public.reviews r on r.id = l.review_id
        where r.user_id = p.id and l.created_at > now() - interval '30 days'
      ) as recent_likes
    from public.profiles p
    where p.id <> auth.uid()
      and not exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = p.id
      )
  )
  select
    c.id,
    c.mutual_count::integer,
    c.review_count::integer,
    (3 * c.mutual_count + least(c.review_count, 20) + 0.5 * c.recent_likes)::float8
  from candidates c
  where c.mutual_count > 0 or c.review_count > 0
  order by 4 desc, c.review_count desc
  limit least(greatest(max_results, 1), 50);
$$;

revoke execute on function suggested_reviewers(integer) from public, anon;
grant execute on function suggested_reviewers(integer) to authenticated;
