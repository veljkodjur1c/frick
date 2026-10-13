"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/features/tasks/actions";
import type { TaskScope, TaskType, WeekStatus } from "@/features/tasks/queries";
import type { CompletionStatus } from "@/lib/game/points";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PROOF_IMAGES_BUCKET } from "./constants";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GENERIC_ERROR = "Dokaz nije sačuvan. Pokušaj ponovo.";

type TaskProofRow = {
  type: TaskType;
  scope: TaskScope;
  assignee_id: string | null;
  week: { status: WeekStatus };
};

type CompletionRow = { id: string; status: CompletionStatus; proof_path: string | null };

/**
 * Completes a `proof` task with a photo the browser already uploaded to proof-images.
 * The completion starts as pending (completions_before_insert trigger) until the others vote.
 * After a Cap (rejected) the player may send a new photo: the old completion, its votes and its photo are removed.
 */
export async function submitProof(taskId: string, imagePath: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Prijavi se ponovo pa pokušaj još jednom." };
  if (!UUID.test(taskId) || !/^[0-9a-f-]+\/[\w-]+\.jpg$/.test(imagePath) || !imagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  // RLS enforces most of this too; checking first gives a clear message instead of a policy error.
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("type, scope, assignee_id, week:weeks(status)")
    .eq("id", taskId)
    .maybeSingle<TaskProofRow>();
  if (taskError || !task || (task.scope === "solo" && task.assignee_id !== user.id)) {
    if (taskError) console.error("submitProof: read task failed", taskError);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (task.type !== "proof") return { ok: false, error: "Ovaj task se štiklira, slika ne treba." };
  if (task.week.status !== "active") return { ok: false, error: "Ova nedelja nije aktivna." };

  const { data: existing, error: existingError } = await supabase
    .from("completions")
    .select("id, status, proof_path")
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .maybeSingle<CompletionRow>();
  if (existingError) {
    console.error("submitProof: read completion failed", existingError);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (existing?.status === "pending") return { ok: false, error: "Dokaz je već poslat i čeka glasove." };
  if (existing?.status === "approved") return { ok: false, error: "Ovaj task je već priznat." };

  if (existing) {
    // A new proof after a Cap. Its proof_votes go with it (on delete cascade).
    const { error } = await supabase.from("completions").delete().eq("id", existing.id);
    if (error) {
      console.error("submitProof: delete rejected completion failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    if (existing.proof_path) {
      // Best effort: a leftover file only costs storage.
      await supabase.storage.from(PROOF_IMAGES_BUCKET).remove([existing.proof_path]);
    }
  }

  // user_id defaults to auth.uid(); the trigger sets status to pending for proof tasks.
  const { error } = await supabase.from("completions").insert({ task_id: taskId, proof_path: imagePath });
  if (error) {
    // 23505 = unique violation: a proof for this task was saved a moment ago (double tap).
    if (error.code === "23505") return { ok: false, error: "Dokaz je već poslat i čeka glasove." };
    console.error("submitProof failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/tasks");
  return { ok: true };
}
