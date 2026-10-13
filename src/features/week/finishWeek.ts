import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompletionStatus } from "@/lib/game/points";
import { settleWeek } from "@/lib/game/settlement";

type AdminClient = SupabaseClient;

type CompletionRow = { task_id: string; user_id: string; status: CompletionStatus };

/**
 * Settles a finished week: reads its tasks, completions, boss and the players, computes the result with
 * settleWeek() and writes it with finish_week() in one transaction. Returns false if another request
 * finished it first. `admin` must be the service role client (createAdminClient()).
 */
export async function finishWeek(admin: AdminClient, weekId: string): Promise<boolean> {
  const [boss, tasks, completions, profiles, cans] = await Promise.all([
    admin.from("bosses").select("hp").eq("week_id", weekId).maybeSingle<{ hp: number }>(),
    admin
      .from("tasks")
      .select("id, points, assignee_id")
      .eq("week_id", weekId)
      .overrideTypes<Array<{ id: string; points: number; assignee_id: string | null }>, { merge: false }>(),
    admin
      .from("completions")
      .select("task_id, user_id, status, task:tasks!inner(week_id)")
      .eq("task.week_id", weekId)
      .overrideTypes<CompletionRow[], { merge: false }>(),
    admin.from("profiles").select("id, lp").overrideTypes<Array<{ id: string; lp: number }>, { merge: false }>(),
    // Oldest first, spent ones too: bad-luck protection looks at the order of every can a player got.
    admin
      .from("cans")
      .select("user_id, flavor")
      .order("earned_at")
      .order("id")
      .overrideTypes<Array<{ user_id: string; flavor: string }>, { merge: false }>(),
  ]);
  for (const result of [boss, tasks, completions, profiles, cans]) {
    if (result.error) throw result.error;
  }

  const result = settleWeek({
    // A week without a boss can't be won.
    bossHp: boss.data?.hp ?? Number.POSITIVE_INFINITY,
    players: profiles.data!.map((profile) => ({
      id: profile.id,
      lp: profile.lp,
      canHistory: cans.data!.filter((can) => can.user_id === profile.id).map((can) => can.flavor),
    })),
    tasks: tasks.data!.map((task) => ({ id: task.id, points: task.points, assigneeId: task.assignee_id })),
    completions: completions.data!.map((c) => ({ taskId: c.task_id, userId: c.user_id, status: c.status })),
  });

  const { data: finished, error } = await admin.rpc("finish_week", {
    p_week_id: weekId,
    p_result: {
      boss_defeated: result.bossDefeated,
      players: result.players.map((player) => ({ id: player.id, lp_delta: player.lpAfter - player.lpBefore })),
      awards: result.awards.map((award) => ({ kind: award.kind, user_id: award.userId, points: award.points })),
      cans: result.cans.map((can) => ({ user_id: can.userId, flavor: can.flavor, source: can.source })),
    },
  });
  if (error) throw error;
  return finished === true;
}
