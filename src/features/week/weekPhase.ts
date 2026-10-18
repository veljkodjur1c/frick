import "server-only";
import { cache } from "react";
import { PROPOSAL_APPROVALS_NEEDED } from "@/lib/game/config";
import {
  champSelectWeekStart,
  damageRange,
  fillTasks,
  isChampSelectOpen,
  isProposalApproved,
} from "@/lib/game/champSelect";
import type { PoolTask } from "@/lib/game/taskPool";
import { bossForWeek } from "@/lib/game/settlement";
import { currentWeekStart } from "@/lib/game/week";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";
import { finishWeek } from "./finishWeek";

type AdminClient = ReturnType<typeof createAdminClient>;

type WeekRow = {
  id: string;
  starts_on: string;
  status: "champ_select" | "active" | "finished";
  boss: { id: string } | null;
};

/**
 * Moves the weeks along with the clock, so nothing depends on a cron job firing on time. In order:
 *   1. Settles every active week that has ended (finishWeek(): pending proofs, boss, LP, awards, cans).
 *   2. Makes sure the current week exists; without a champ select it starts with only pool tasks (step 3).
 *   3. Activates any champ select week that has started (approved proposals -> tasks), filled up from the task
 *      pool when the approved tasks' max damage is below the range for its boss (fillTasks()).
 *   4. Gives the current week its boss (bossForWeek()).
 *   5. Sunday from CHAMP_SELECT_OPENS_HOUR: creates next week's row in champ select (proposals open).
 * WeekSync in the app frame runs it on every page; pages that read week data await it first.
 * Every step is idempotent and it runs once per request. Does nothing for a logged-out visitor.
 */
export const syncWeekPhase = cache(async (): Promise<void> => {
  // Writes system tables with the service role, so only for a logged-in member.
  if (!(await getCurrentUser())) return;
  const now = new Date();
  const thisWeek = currentWeekStart(now);
  const admin = createAdminClient();

  const { data: open, error } = await admin
    .from("weeks")
    .select("id, starts_on, status, boss:bosses(id)")
    .neq("status", "finished")
    .order("starts_on")
    .overrideTypes<WeekRow[], { merge: false }>();
  if (error) throw error;

  // 1. Oldest first, so LP from an earlier week is in place before the next one is settled.
  for (const week of open) {
    if (week.status === "active" && week.starts_on < thisWeek) await finishWeek(admin, week.id);
  }

  // 2. Champ select never opened (nobody visited on Sunday evening): start the week anyway.
  let current = open.find((week) => week.starts_on === thisWeek);
  if (!current) {
    const { data: created, error: createError } = await admin
      .from("weeks")
      .upsert({ starts_on: thisWeek, status: "champ_select" }, { onConflict: "starts_on", ignoreDuplicates: true })
      .select("id, starts_on, status, boss:bosses(id)")
      .overrideTypes<WeekRow[], { merge: false }>();
    if (createError) throw createError;
    // Empty when another request created it at the same moment; it activates and gets its boss there.
    current = created[0];
  }

  // 3.
  for (const week of [...open, ...(current && !open.includes(current) ? [current] : [])]) {
    if (week.status !== "champ_select" || week.starts_on > thisWeek) continue;
    const { error: activateError } = await admin.rpc("activate_week", {
      p_week_id: week.id,
      p_approvals_needed: PROPOSAL_APPROVALS_NEEDED,
      p_fill_tasks: await fillTasksFor(admin, week),
    });
    if (activateError) throw activateError;
  }

  // 4.
  if (current && !current.boss) {
    const boss = bossForWeek(thisWeek);
    const imageUrl = boss.image ? admin.storage.from("boss-images").getPublicUrl(boss.image).data.publicUrl : null;
    const { error: bossError } = await admin
      .from("bosses")
      .upsert(
        { week_id: current.id, name: boss.name, hp: boss.hp, image_url: imageUrl },
        { onConflict: "week_id", ignoreDuplicates: true },
      );
    if (bossError) throw bossError;
  }

  // 5.
  if (isChampSelectOpen(now)) {
    const { error: openError } = await admin
      .from("weeks")
      .upsert(
        { starts_on: champSelectWeekStart(now), status: "champ_select" },
        { onConflict: "starts_on", ignoreDuplicates: true },
      );
    if (openError) throw openError;
  }
});

/**
 * The pool tasks a champ select week gets on activation (fillTasks()), from the proposals that pass right now.
 * activate_week() decides the proposals again under its lock; a vote landing in between only shifts the fill-up a bit.
 */
async function fillTasksFor(admin: AdminClient, week: WeekRow): Promise<PoolTask[]> {
  const { data, error } = await admin
    .from("task_proposals")
    .select("title, scope, points, votes:task_votes(approve)")
    .eq("week_id", week.id)
    .eq("status", "open")
    .overrideTypes<
      Array<{ title: string; scope: "team" | "solo"; points: number; votes: Array<{ approve: boolean }> }>,
      { merge: false }
    >();
  if (error) throw error;
  const approved = data.filter((p) => isProposalApproved(p.votes.filter((v) => v.approve).length));
  return fillTasks(week.starts_on, approved, damageRange(bossForWeek(week.starts_on).hp));
}
