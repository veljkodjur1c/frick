-- Champ select -> active week: decides the proposals and turns the approved ones into tasks.
--
-- Called by trusted server code with the service role (syncWeekPhase() in src/features/champ-select/weekPhase.ts)
-- once the week's Monday has come. Runs in one transaction, and is safe to call again:
-- a week that is no longer in champ select is left alone.
--
-- p_approvals_needed comes from PROPOSAL_APPROVALS_NEEDED in src/lib/game/config.ts, so the number lives in one place.

create function public.activate_week(p_week_id uuid, p_approvals_needed integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_created integer;
begin
  -- Lock the week so two calls at the same moment can't both activate it.
  perform 1 from public.weeks w where w.id = p_week_id and w.status = 'champ_select' for update;
  if not found then
    return 0;
  end if;

  update public.task_proposals p
  set status = case
    when (select count(*) from public.task_votes v where v.proposal_id = p.id and v.approve) >= p_approvals_needed
      then 'approved'::public.proposal_status
    else 'rejected'::public.proposal_status
  end
  where p.week_id = p_week_id and p.status = 'open';

  insert into public.tasks (week_id, proposal_id, title, description, type, scope, assignee_id, points)
  select p.week_id, p.id, p.title, p.description, p.type, p.scope, p.assignee_id, p.points
  from public.task_proposals p
  where p.week_id = p_week_id and p.status = 'approved'
  order by p.created_at
  on conflict (proposal_id) do nothing;
  get diagnostics v_created = row_count;

  update public.weeks set status = 'active' where id = p_week_id;

  -- Number of tasks created.
  return v_created;
end;
$$;

-- Only the service role may run it; players must not be able to start a week.
revoke execute on function public.activate_week(uuid, integer) from public, anon, authenticated;
grant execute on function public.activate_week(uuid, integer) to service_role;
