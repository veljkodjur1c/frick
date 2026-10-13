-- Comments on feed posts (not on task proofs). Shown in a sheet under each post, oldest first.

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Trimmed text, 1-500 characters.
  body text not null check (char_length(body) between 1 and 500 and body = btrim(body)),
  created_at timestamptz not null default now()
);

-- Comments of one post, in order.
create index post_comments_post_id_created_at_idx on public.post_comments (post_id, created_at);
create index post_comments_user_id_idx on public.post_comments (user_id);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.post_comments from anon;

-- Clients can't set id or created_at, and comments can't be edited (only deleted).
revoke insert, update on public.post_comments from authenticated;
grant insert (post_id, user_id, body) on public.post_comments to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.post_comments enable row level security;

create policy "post_comments: members can read" on public.post_comments for select to authenticated using (true);

create policy "post_comments: insert own" on public.post_comments for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "post_comments: delete own" on public.post_comments for delete to authenticated
  using (user_id = (select auth.uid()));
