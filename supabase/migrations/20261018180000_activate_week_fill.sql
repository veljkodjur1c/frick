-- activate_week() also adds the fill-up tasks: team tasks from the pool that bring a week whose champ select approved
-- too little up into the acceptable damage range. The server picks them (fillTasks() in src/lib/game/champSelect.ts,
-- called from syncWeekPhase() in src/features/week/weekPhase.ts) and passes them in p_fill_tasks, a jsonb array of
-- {title, type, points, category}. They are added in the same transaction as the approved proposals, so a week is
-- activated with its fill-up or not at all. Filled-in tasks are team tasks without a proposal.
--
-- p_fill_tasks defaults to an empty array, so a call with only the first two arguments still works.

drop function public.activate_week(uuid, integer);

create function public.activate_week(p_week_id uuid, p_approvals_needed integer, p_fill_tasks jsonb default '[]'::jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_created integer;
  v_filled integer;
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

  insert into public.tasks (week_id, proposal_id, title, description, type, scope, assignee_id, points, category)
  select p.week_id, p.id, p.title, p.description, p.type, p.scope, p.assignee_id, p.points, p.category
  from public.task_proposals p
  where p.week_id = p_week_id and p.status = 'approved'
  order by p.created_at
  on conflict (proposal_id) do nothing;
  get diagnostics v_created = row_count;

  -- Fill-up tasks, skipping any title the week already has.
  insert into public.tasks (week_id, title, description, type, scope, points, category)
  select p_week_id, f.title, 'Dopuna iz bazena: champ select nije izglasao dovoljno taskova.',
    f.type::public.task_type, 'team'::public.task_scope, f.points, f.category::public.task_category
  from jsonb_to_recordset(coalesce(p_fill_tasks, '[]'::jsonb)) as f(title text, type text, points integer, category text)
  where not exists (
    select 1 from public.tasks t where t.week_id = p_week_id and lower(btrim(t.title)) = lower(btrim(f.title))
  );
  get diagnostics v_filled = row_count;

  update public.weeks set status = 'active' where id = p_week_id;

  -- Number of tasks created, fill-up included.
  return v_created + v_filled;
end;
$$;

-- Only the service role may run it; players must not be able to start a week.
revoke execute on function public.activate_week(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.activate_week(uuid, integer, jsonb) to service_role;
