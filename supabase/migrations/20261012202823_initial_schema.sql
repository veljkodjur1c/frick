-- Initial schema for Nexus.
--
-- Access model:
--   * Every table has RLS on. Only the `authenticated` role gets policies; `anon` gets nothing.
--   * Reads: any logged-in user can read every row (it's a private 5-person group).
--   * Writes from the client: only rows the user owns (tied to auth.uid()).
--   * System tables (weeks, bosses, tasks, awards, cans) have no client write policies at all.
--     They are written by trusted server code with the service role, which bypasses RLS.
--   * Columns that must not be self-edited (lp, proposal status, completion status) are
--     protected with column-level grants and/or triggers.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.week_status as enum ('champ_select', 'active', 'finished');
create type public.task_type as enum ('check', 'proof');
create type public.task_scope as enum ('team', 'solo');
create type public.proposal_status as enum ('open', 'approved', 'rejected');
create type public.completion_status as enum ('pending', 'approved', 'rejected');
create type public.proof_vote as enum ('legit', 'cap');
create type public.award_kind as enum ('mvp', 'feeder');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per player, 1:1 with auth.users. Created automatically on sign-up (trigger below).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  avatar_url text,
  -- Total LP. Rank (Iron IV -> Challenger) is derived from this in src/lib/game.
  lp integer not null default 0 check (lp >= 0),
  created_at timestamptz not null default now()
);

-- One row per game week (Monday 00:00 -> Sunday 23:59, Europe/Belgrade).
-- champ_select: proposals/voting open; active: tasks can be completed; finished: results final.
create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null unique check (extract(isodow from starts_on) = 1),
  ends_on date generated always as (starts_on + 6) stored,
  status public.week_status not null default 'champ_select',
  created_at timestamptz not null default now()
);

-- The weekly boss. Dies if total approved points >= hp at week end.
create table public.bosses (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null unique references public.weeks (id) on delete cascade,
  name text not null,
  hp integer not null check (hp > 0),
  image_url text,
  defeated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Task ideas proposed during champ select for a given week.
create table public.task_proposals (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  proposed_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  type public.task_type not null,
  scope public.task_scope not null,
  -- Set only for solo tasks: the player who gets the task.
  assignee_id uuid references public.profiles (id) on delete cascade,
  points integer not null check (points > 0),
  status public.proposal_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint task_proposals_assignee_matches_scope check ((scope = 'solo') = (assignee_id is not null))
);

-- Champ select votes on proposals. One vote per player per proposal, can be changed while open.
create table public.task_votes (
  proposal_id uuid not null references public.task_proposals (id) on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  approve boolean not null,
  created_at timestamptz not null default now(),
  primary key (proposal_id, voter_id)
);

-- Active tasks for a week, created from approved proposals by server code.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  proposal_id uuid unique references public.task_proposals (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  type public.task_type not null,
  scope public.task_scope not null,
  assignee_id uuid references public.profiles (id) on delete cascade,
  points integer not null check (points > 0),
  created_at timestamptz not null default now(),
  constraint tasks_assignee_matches_scope check ((scope = 'solo') = (assignee_id is not null))
);

-- A player marking a task as done. For team tasks every player completes it separately.
-- check tasks are approved immediately; proof tasks start pending and are resolved by proof_votes.
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Path of the proof photo in Supabase Storage. Required for proof tasks.
  proof_path text,
  status public.completion_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (task_id, user_id)
);

-- Legit/Cap votes on someone else's proof.
create table public.proof_votes (
  completion_id uuid not null references public.completions (id) on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  vote public.proof_vote not null,
  created_at timestamptz not null default now(),
  primary key (completion_id, voter_id)
);

-- Weekly awards. Ties are allowed, so the key includes user_id.
create table public.awards (
  week_id uuid not null references public.weeks (id) on delete cascade,
  kind public.award_kind not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null,
  created_at timestamptz not null default now(),
  primary key (week_id, kind, user_id)
);

-- Collectible Monster cans on the achievement shelf, one per player per defeated boss.
create table public.cans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  boss_id uuid not null references public.bosses (id) on delete cascade,
  flavor text not null,
  image_url text,
  earned_at timestamptz not null default now(),
  unique (user_id, boss_id)
);

-- Indexes for foreign keys used in joins and RLS checks (PK/unique prefixes are already indexed).
create index task_proposals_week_id_idx on public.task_proposals (week_id);
create index tasks_week_id_idx on public.tasks (week_id);
create index completions_user_id_idx on public.completions (user_id);
create index proof_votes_voter_id_idx on public.proof_votes (voter_id);
create index awards_user_id_idx on public.awards (user_id);
create index cans_boss_id_idx on public.cans (boss_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'player'), 32)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Server decides the initial status of a completion; clients can't insert an approved proof.
create function public.completions_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_type public.task_type;
begin
  select t.type into v_type from public.tasks t where t.id = new.task_id;

  if v_type = 'proof' and new.proof_path is null then
    raise exception 'proof task requires proof_path';
  end if;

  if v_type = 'check' then
    new.status := 'approved';
    new.resolved_at := now();
  else
    new.status := 'pending';
    new.resolved_at := null;
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger completions_before_insert
  before insert on public.completions
  for each row execute function public.completions_before_insert();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on
  public.profiles, public.weeks, public.bosses, public.task_proposals, public.task_votes,
  public.tasks, public.completions, public.proof_votes, public.awards, public.cans
from anon;

-- Column-level grants: clients may only touch these columns. RLS still decides which rows.
revoke insert, update on public.profiles from authenticated;
grant insert (id, display_name, avatar_url) on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.task_proposals from authenticated;
grant insert (week_id, proposed_by, title, description, type, scope, assignee_id, points)
  on public.task_proposals to authenticated;
grant update (title, description, type, scope, assignee_id, points)
  on public.task_proposals to authenticated;

revoke update on public.task_votes from authenticated;
grant update (approve) on public.task_votes to authenticated;

revoke update on public.completions from authenticated;

revoke update on public.proof_votes from authenticated;
grant update (vote) on public.proof_votes to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.weeks enable row level security;
alter table public.bosses enable row level security;
alter table public.task_proposals enable row level security;
alter table public.task_votes enable row level security;
alter table public.tasks enable row level security;
alter table public.completions enable row level security;
alter table public.proof_votes enable row level security;
alter table public.awards enable row level security;
alter table public.cans enable row level security;

-- Read access: every logged-in member reads everything.
create policy "profiles: members can read" on public.profiles for select to authenticated using (true);
create policy "weeks: members can read" on public.weeks for select to authenticated using (true);
create policy "bosses: members can read" on public.bosses for select to authenticated using (true);
create policy "task_proposals: members can read" on public.task_proposals for select to authenticated using (true);
create policy "task_votes: members can read" on public.task_votes for select to authenticated using (true);
create policy "tasks: members can read" on public.tasks for select to authenticated using (true);
create policy "completions: members can read" on public.completions for select to authenticated using (true);
create policy "proof_votes: members can read" on public.proof_votes for select to authenticated using (true);
create policy "awards: members can read" on public.awards for select to authenticated using (true);
create policy "cans: members can read" on public.cans for select to authenticated using (true);

-- profiles: own row only.
create policy "profiles: insert own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- task_proposals: own proposals, only while the week is in champ select and the proposal is open.
create policy "task_proposals: insert own during champ select" on public.task_proposals for insert to authenticated
  with check (
    proposed_by = (select auth.uid())
    and exists (select 1 from public.weeks w where w.id = week_id and w.status = 'champ_select')
  );
create policy "task_proposals: update own while open" on public.task_proposals for update to authenticated
  using (
    proposed_by = (select auth.uid())
    and status = 'open'
    and exists (select 1 from public.weeks w where w.id = week_id and w.status = 'champ_select')
  )
  with check (proposed_by = (select auth.uid()));
create policy "task_proposals: delete own while open" on public.task_proposals for delete to authenticated
  using (
    proposed_by = (select auth.uid())
    and status = 'open'
    and exists (select 1 from public.weeks w where w.id = week_id and w.status = 'champ_select')
  );

-- task_votes: own vote, only on open proposals during champ select.
create policy "task_votes: insert own" on public.task_votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.task_proposals p join public.weeks w on w.id = p.week_id
      where p.id = proposal_id and p.status = 'open' and w.status = 'champ_select'
    )
  );
create policy "task_votes: update own" on public.task_votes for update to authenticated
  using (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.task_proposals p join public.weeks w on w.id = p.week_id
      where p.id = proposal_id and p.status = 'open' and w.status = 'champ_select'
    )
  )
  with check (voter_id = (select auth.uid()));
create policy "task_votes: delete own" on public.task_votes for delete to authenticated
  using (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.task_proposals p join public.weeks w on w.id = p.week_id
      where p.id = proposal_id and p.status = 'open' and w.status = 'champ_select'
    )
  );

-- completions: own, only for tasks in an active week that are team tasks or assigned to you.
create policy "completions: insert own" on public.completions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t join public.weeks w on w.id = t.week_id
      where t.id = task_id
        and w.status = 'active'
        and (t.scope = 'team' or t.assignee_id = (select auth.uid()))
    )
  );
create policy "completions: delete own during active week" on public.completions for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t join public.weeks w on w.id = t.week_id
      where t.id = task_id and w.status = 'active'
    )
  );

-- proof_votes: own vote, only on someone else's pending proof.
create policy "proof_votes: insert own" on public.proof_votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.completions c
      where c.id = completion_id and c.status = 'pending' and c.user_id <> (select auth.uid())
    )
  );
create policy "proof_votes: update own while pending" on public.proof_votes for update to authenticated
  using (
    voter_id = (select auth.uid())
    and exists (select 1 from public.completions c where c.id = completion_id and c.status = 'pending')
  )
  with check (voter_id = (select auth.uid()));
create policy "proof_votes: delete own while pending" on public.proof_votes for delete to authenticated
  using (
    voter_id = (select auth.uid())
    and exists (select 1 from public.completions c where c.id = completion_id and c.status = 'pending')
  );
