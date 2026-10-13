-- Comment replies: one level of threading. A reply points at a top-level
-- comment on the same review; replying to a reply joins that same thread.

alter table review_comments add column parent_id uuid;

-- The composite FK pins a reply to its parent's review, so a reply can't be
-- attached to a comment on some other review. Deleting a comment deletes its
-- replies.
alter table review_comments
  add constraint review_comments_id_review_id_key unique (id, review_id);

alter table review_comments
  add constraint review_comments_parent_fkey
  foreign key (parent_id, review_id)
  references review_comments (id, review_id)
  on delete cascade;

create index review_comments_parent_id_idx
  on review_comments (parent_id)
  where parent_id is not null;

-- Keep threads one level deep: the parent must itself be top-level.
create function review_comments_check_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and exists (
    select 1 from public.review_comments
    where id = new.parent_id and parent_id is not null
  ) then
    raise exception 'Replies must point at a top-level comment'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger review_comments_check_parent
  before insert or update of parent_id on review_comments
  for each row execute function review_comments_check_parent();
