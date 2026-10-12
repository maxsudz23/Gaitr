-- Phase 3: writing reviews, aggregate ratings, and review photos.

-- Per-shoe rating summary (count + average). A view rather than stored columns,
-- so it can never drift out of sync with the reviews table. security_invoker
-- makes it run as the caller, so the reviews RLS policies still apply.
create view shoe_rating_stats
with (security_invoker = true)
as
  select
    shoe_id,
    count(*)::integer                     as review_count,
    round(avg(overall_rating), 1)::float8 as average_rating
  from public.reviews
  group by shoe_id;

grant select on shoe_rating_stats to anon, authenticated;


-- Create or update the caller's review of a shoe, together with its per-aspect
-- ratings, in a single transaction. Doing this from the client would take
-- several round trips (upsert review, delete old ratings, insert new ones) and
-- could leave a half-saved review if one failed.
--
-- `aspect_ratings` is a JSON object like {"comfort": 4, "fit": 5}. Aspects not
-- present are cleared, so the call always reflects the full form state.
--
-- Runs as the caller (not security definer), so RLS still enforces ownership.
create or replace function save_review(
  target_shoe_id uuid,
  overall numeric,
  review_title text,
  review_body text,
  aspect_ratings jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to review a shoe';
  end if;

  insert into public.reviews (user_id, shoe_id, overall_rating, title, body)
  values (
    auth.uid(),
    target_shoe_id,
    overall,
    nullif(trim(review_title), ''),
    nullif(trim(review_body), '')
  )
  on conflict (user_id, shoe_id) do update
    set overall_rating = excluded.overall_rating,
        title          = excluded.title,
        body           = excluded.body
  returning id into saved_id;

  delete from public.ratings where review_id = saved_id;

  insert into public.ratings (review_id, aspect, score)
  select saved_id, key::public.rating_aspect, value::smallint
  from jsonb_each_text(coalesce(aspect_ratings, '{}'::jsonb));

  return saved_id;
end;
$$;

grant execute on function save_review(uuid, numeric, text, text, jsonb) to authenticated;


-- Tighten media inserts: the original policy only checked that you own the
-- media row, which would let you attach a photo to someone else's review.
drop policy "Users can upload their own media" on media;

create policy "Users can upload their own media"
  on media for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      review_id is null
      or exists (
        select 1 from reviews r
        where r.id = media.review_id and r.user_id = auth.uid()
      )
    )
  );


-- Storage bucket for review photos. Public, because reviews are public and a
-- public bucket serves images by plain URL (no signed-URL round trip).
-- Objects are stored at `<user_id>/<review_id>/<file>`, so the first path
-- segment identifies the owner and the policies below key off it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-media',
  'review-media',
  true,
  10 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
);

create policy "Users can upload review media to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own review media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Removing objects through the Storage API also requires select permission on
-- them (public-URL downloads don't go through this policy).
create policy "Users can see their own review media objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
