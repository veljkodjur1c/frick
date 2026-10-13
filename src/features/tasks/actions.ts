"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { TaskType, WeekStatus } from "./queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Same check as in src/features/feed/actions.ts.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GENERIC_ERROR = "Nešto nije u redu. Probaj ponovo.";

type TaskCheckRow = { type: TaskType; week: { status: WeekStatus } };

/**
 * Ticks (done = true) or unticks a `check` task for the logged-in player.
 * Takes the wanted end state, not a toggle, so a repeated request can't flip it twice.
 * Proof tasks are completed with a photo instead (issue #9).
 */
export async function setCheckTaskDone(taskId: string, done: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Prijavi se ponovo pa pokušaj još jednom." };
  if (!UUID.test(taskId) || typeof done !== "boolean") return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();

  // RLS enforces all of this too, but a failed delete is silent (0 rows), so check first for a clear message.
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("type, week:weeks(status)")
    .eq("id", taskId)
    .maybeSingle<TaskCheckRow>();
  if (taskError || !task) {
    if (taskError) console.error("setCheckTaskDone: read task failed", taskError);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (task.type !== "check") return { ok: false, error: "Ovaj task se završava slikom." };
  if (task.week.status !== "active") return { ok: false, error: "Ova nedelja nije aktivna." };

  // user_id defaults to auth.uid(); the completions_before_insert trigger approves check tasks.
  const { error } = done
    ? await supabase.from("completions").insert({ task_id: taskId })
    : await supabase.from("completions").delete().eq("task_id", taskId).eq("user_id", user.id);

  // 23505 = unique violation: already ticked, which is what we wanted.
  if (error && error.code !== "23505") {
    console.error("setCheckTaskDone failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/tasks");
  return { ok: true };
}
