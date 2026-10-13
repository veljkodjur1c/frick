-- Legit/Cap votes on feed posts. More Legit -> "Valid" badge, more Cap -> "Freak", tie -> no badge.
-- The badge is computed from the votes when the feed loads; it isn't stored.

create table public.post_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Same legit/cap values as votes on task proofs.
  vote public.proof_vote not null,
  created_at timestamptz not null default now(),
  primary key (post_id, voter_id)
);

create index post_votes_voter_id_idx on public.post_votes (voter_id);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.post_votes from anon;

-- A vote can be cast, switched (only the vote column) or taken back (delete).
revoke insert, update on public.post_votes from authenticated;
grant insert (post_id, voter_id, vote) on public.post_votes to authenticated;
grant update (vote) on public.post_votes to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.post_votes enable row level security;

create policy "post_votes: members can read" on public.post_votes for select to authenticated using (true);

-- Own vote only, and never on your own post.
create policy "post_votes: insert own on others' posts" on public.post_votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id <> (select auth.uid()))
  );

create policy "post_votes: update own" on public.post_votes for update to authenticated
  using (voter_id = (select auth.uid()))
  with check (voter_id = (select auth.uid()));

create policy "post_votes: delete own" on public.post_votes for delete to authenticated
  using (voter_id = (select auth.uid()));
