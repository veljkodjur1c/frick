-- Task categories. Every task belongs to one category; the player with the most approved tasks of a category
-- (all time, at least TITLE_MIN_TASKS) holds that category's title ("Caffeine addict", "Gymbro", ...).
-- Titles are computed in src/lib/game/titles.ts, nothing is stored for them.
--
-- The proposer picks the category in champ select; activate_week() copies it to the task.
-- Tasks and proposals made before this migration have no category and count toward no title.

create type public.task_category as enum ('caffeine', 'gym', 'grind', 'chef', 'random');

alter table public.task_proposals add column category public.task_category;
alter table public.tasks add column category public.task_category;

-- New proposals must have a category. NOT VALID skips the check for rows that already exist.
alter table public.task_proposals
  add constraint task_proposals_category_required check (category is not null) not valid;

-- Clients may set the category when proposing and change it while the proposal is open (RLS decides the rows).
grant insert (category) on public.task_proposals to authenticated;
grant update (category) on public.task_proposals to authenticated;

-- Same function as in 20261013170000_activate_week.sql, now also copying the category.
create or replace function public.activate_week(p_week_id uuid, p_approvals_needed integer)
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

  insert into public.tasks (week_id, proposal_id, title, description, type, scope, assignee_id, points, category)
  select p.week_id, p.id, p.title, p.description, p.type, p.scope, p.assignee_id, p.points, p.category
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

-- create or replace keeps the existing grants; repeated here so this file reads on its own.
revoke execute on function public.activate_week(uuid, integer) from public, anon, authenticated;
grant execute on function public.activate_week(uuid, integer) to service_role;

-- Approved tasks per player and category, all time: the input of categoryTitles() in src/lib/game/titles.ts.
-- At most players x categories rows, so the app never pages through every completion.
-- security_invoker: the view reads with the caller's rights, so the normal RLS on completions and tasks applies.
create view public.category_counts
with (security_invoker = true)
as
select c.user_id, t.category, count(*)::integer as count
from public.completions c
join public.tasks t on t.id = c.task_id
where c.status = 'approved' and t.category is not null
group by c.user_id, t.category;

revoke all on public.category_counts from anon;
grant select on public.category_counts to authenticated;
