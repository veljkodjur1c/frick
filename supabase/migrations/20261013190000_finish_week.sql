-- Weekly settlement: writes what settleWeek() (src/lib/game/settlement.ts) computed for a finished week.
--
-- Called by trusted server code with the service role (syncWeekPhase() in src/features/champ-select/weekPhase.ts)
-- once the week is over. Runs in one transaction and only once per week: a week that is no longer active is
-- left alone, so a second call (two page loads at the same moment) changes nothing.
--
-- p_result:
--   { "boss_defeated": bool,
--     "players": [{ "id": uuid, "lp_delta": int }],
--     "awards":  [{ "kind": "mvp" | "feeder", "user_id": uuid, "points": int }],
--     "cans":    [{ "user_id": uuid, "flavor": text }] }

create function public.finish_week(p_week_id uuid, p_result jsonb)
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

  insert into public.cans (user_id, boss_id, flavor)
  select x.user_id, b.id, x.flavor
  from jsonb_to_recordset(p_result -> 'cans') as x(user_id uuid, flavor text)
  join public.bosses b on b.week_id = p_week_id
  on conflict (user_id, boss_id) do nothing;

  update public.weeks set status = 'finished' where id = p_week_id;
  return true;
end;
$$;

-- Only the service role may run it; players must not be able to end a week or hand out LP.
revoke execute on function public.finish_week(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finish_week(uuid, jsonb) to service_role;
