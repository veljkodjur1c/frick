-- Monster can rules (CLAUDE.md, "Monster cans"): random cans with duplicates, one extra can for the week's MVP,
-- and crafting 3 duplicates into a missing flavor. The rolls happen in server code (src/lib/game/cans.ts); this
-- migration only makes room for them in the table and writes them.

-- ---------------------------------------------------------------------------
-- cans: where a can came from, and whether it was spent on crafting
-- ---------------------------------------------------------------------------

create type public.can_source as enum ('boss', 'mvp', 'craft');

alter table public.cans
  add column source public.can_source not null default 'boss',
  -- The crafted can this one was spent on. Spent cans stay for history (bad-luck protection, "Kolekcionar")
  -- but are no longer on the shelf.
  add column spent_in uuid references public.cans (id) on delete set null,
  -- Crafted cans don't come from a boss.
  alter column boss_id drop not null;

-- Was: one can per player per boss. Now: one boss can and one MVP can per player per boss.
alter table public.cans drop constraint cans_user_id_boss_id_key;
alter table public.cans add constraint cans_user_boss_source_key unique (user_id, boss_id, source);
alter table public.cans add constraint cans_boss_matches_source check ((source = 'craft') = (boss_id is null));

-- ---------------------------------------------------------------------------
-- finish_week(): same as 20261013190000_finish_week.sql, but cans now carry their source (boss / mvp)
-- ---------------------------------------------------------------------------

create or replace function public.finish_week(p_week_id uuid, p_result jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  -- Lock the week so a second call waits and then sees it finished.
  perform 1 from public.weeks w where w.id = p_week_id and w.status = 'active' for update;
  if not found then
    return false;
  end if;

  -- Proofs still waiting for votes are accepted at week end (CLAUDE.md, Game rules).
  update public.completions c
  set status = 'approved', resolved_at = now()
  where c.status = 'pending'
    and c.task_id in (select t.id from public.tasks t where t.week_id = p_week_id);

  if (p_result ->> 'boss_defeated')::boolean then
    update public.bosses set defeated_at = now() where week_id = p_week_id and defeated_at is null;
  end if;

  -- Same floor as applyLpChange(): LP never goes below 0.
  update public.profiles p
  set lp = greatest(0, p.lp + x.lp_delta)
  from jsonb_to_recordset(p_result -> 'players') as x(id uuid, lp_delta integer)
  where p.id = x.id;

  insert into public.awards (week_id, kind, user_id, points)
  select p_week_id, x.kind::public.award_kind, x.user_id, x.points
  from jsonb_to_recordset(p_result -> 'awards') as x(kind text, user_id uuid, points integer)
  on conflict do nothing;

  -- "cans": [{ "user_id": uuid, "flavor": text, "source": "boss" | "mvp" }]
  insert into public.cans (user_id, boss_id, flavor, source)
  select x.user_id, b.id, x.flavor, coalesce(x.source, 'boss')::public.can_source
  from jsonb_to_recordset(p_result -> 'cans') as x(user_id uuid, flavor text, source text)
  join public.bosses b on b.week_id = p_week_id
  on conflict (user_id, boss_id, source) do nothing;

  update public.weeks set status = 'finished' where id = p_week_id;
  return true;
end;
$$;

revoke execute on function public.finish_week(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finish_week(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- craft_can(): spends 3 of a player's spare cans and adds the crafted one, in one transaction
-- ---------------------------------------------------------------------------

-- Called by trusted server code with the service role (craftCan() in src/features/shelf/actions.ts) after it
-- checked the player and rolled the flavor. Returns the new can's id. Raises if the cans are not the player's,
-- already spent, or would spend the last can of a flavor, so a double tap can't spend twice.
create function public.craft_can(p_user_id uuid, p_spend uuid[], p_flavor text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_locked integer;
  v_new uuid;
begin
  if cardinality(p_spend) <> 3 or (select count(distinct x) from unnest(p_spend) as x) <> 3 then
    raise exception 'craft_can needs 3 different cans';
  end if;

  perform 1 from public.cans c
  where c.id = any (p_spend) and c.user_id = p_user_id and c.spent_in is null
  for update;
  get diagnostics v_locked = row_count;
  if v_locked <> 3 then
    raise exception 'cans are not available for crafting';
  end if;

  -- Keep at least one unspent can of every flavor being spent.
  if exists (
    select 1 from public.cans s
    where s.id = any (p_spend)
      and not exists (
        select 1 from public.cans k
        where k.user_id = p_user_id and k.flavor = s.flavor and k.spent_in is null and k.id <> all (p_spend)
      )
  ) then
    raise exception 'craft_can would spend the last can of a flavor';
  end if;

  insert into public.cans (user_id, boss_id, flavor, source)
  values (p_user_id, null, p_flavor, 'craft')
  returning id into v_new;

  update public.cans set spent_in = v_new where id = any (p_spend);
  return v_new;
end;
$$;

-- Only the service role may run it; players craft through the Server Action.
revoke execute on function public.craft_can(uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.craft_can(uuid, uuid[], text) to service_role;
