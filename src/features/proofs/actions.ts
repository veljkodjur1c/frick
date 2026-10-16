"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyNewProof } from "@/features/notifications/push";
import type { ActionResult } from "@/features/tasks/actions";
import type { TaskScope, TaskType, WeekStatus } from "@/features/tasks/queries";
import type { CompletionStatus } from "@/lib/game/points";
import { countProofVotes, resolveProof, type ProofVote } from "@/lib/game/proofs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PROOF_IMAGES_BUCKET } from "./constants";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GENERIC_ERROR = "Dokaz nije sačuvan. Pokušaj ponovo.";
const VOTE_ERROR = "Glas nije sačuvan. Pokušaj ponovo.";

type TaskProofRow = {
  title: string;
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
    .select("title, type, scope, assignee_id, week:weeks(status)")
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
  const { data: completion, error } = await supabase
    .from("completions")
    .insert({ task_id: taskId, proof_path: imagePath })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    // 23505 = unique violation: a proof for this task was saved a moment ago (double tap).
    if (error.code === "23505") return { ok: false, error: "Dokaz je već poslat i čeka glasove." };
    console.error("submitProof failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  // After the response, so the player doesn't wait for the push services.
  after(() => notifyNewProof(user.id, completion.id, task.title));
  revalidatePath("/tasks");
  return { ok: true };
}

export type ProofVoteResult =
  | { ok: true; status: CompletionStatus; legit: number; cap: number }
  | { ok: false; error: string };

/**
 * Sets the viewer's Legit/Cap vote on someone else's pending proof; null takes it back.
 * Takes the wanted end state (not a toggle). After the vote the proof is approved or rejected
 * once a side has enough votes (resolveProof), and the new status and counts are returned.
 */
export async function voteOnProof(completionId: string, vote: ProofVote | null): Promise<ProofVoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Prijavi se ponovo pa pokušaj još jednom." };
  if (!UUID.test(completionId) || (vote !== null && vote !== "legit" && vote !== "cap")) {
    return { ok: false, error: VOTE_ERROR };
  }

  const supabase = await createClient();

  const { data: completion, error: readError } = await supabase
    .from("completions")
    .select("user_id, status")
    .eq("id", completionId)
    .maybeSingle<{ user_id: string; status: CompletionStatus }>();
  if (readError || !completion) {
    if (readError) console.error("voteOnProof: read completion failed", readError);
    return { ok: false, error: VOTE_ERROR };
  }
  if (completion.user_id === user.id) return { ok: false, error: "Za svoj dokaz ne možeš da glasaš." };
  if (completion.status !== "pending") return { ok: false, error: "Glasanje za ovaj dokaz je završeno." };

  // RLS: own vote, only on someone else's pending proof.
  const votes = supabase.from("proof_votes");
  let error: PostgrestError | null;
  if (vote === null) {
    ({ error } = await votes.delete().eq("completion_id", completionId).eq("voter_id", user.id));
  } else {
    // Not upsert(): it would also try to update completion_id/voter_id, which clients may not change.
    const updated = await votes.update({ vote }).eq("completion_id", completionId).eq("voter_id", user.id).select("vote");
    error = updated.error;
    if (!error && !updated.data?.length) {
      ({ error } = await votes.insert({ completion_id: completionId, vote }));
    }
  }
  if (error) {
    console.error("voteOnProof: write vote failed", error);
    return { ok: false, error: VOTE_ERROR };
  }

  // Count after writing, so of two votes landing at once at least the later one sees both.
  const { data: allVotes, error: countError } = await votes
    .select("vote")
    .eq("completion_id", completionId)
    .overrideTypes<Array<{ vote: ProofVote }>, { merge: false }>();
  if (countError) {
    console.error("voteOnProof: count votes failed", countError);
    return { ok: false, error: VOTE_ERROR };
  }
  const counts = countProofVotes(allVotes);
  let status = resolveProof(counts);

  if (status !== "pending") {
    // Players can't change a completion's status (no update grant), so the server does it with the service role.
    try {
      const { error: resolveError } = await createAdminClient()
        .from("completions")
        .update({ status, resolved_at: new Date().toISOString() })
        .eq("id", completionId)
        .eq("status", "pending");
      if (resolveError) throw resolveError;
    } catch (resolveError) {
      // The vote is saved; the next vote (or the weekly job) resolves it.
      console.error("voteOnProof: resolve failed", resolveError);
      status = "pending";
    }
    revalidatePath("/tasks");
    revalidatePath("/boss");
  }

  return { ok: true, status, ...counts };
}
