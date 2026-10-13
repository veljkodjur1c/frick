"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { TaskScope, TaskType } from "@/features/tasks/queries";
import { PROPOSAL_MAX_POINTS, PROPOSAL_MIN_POINTS } from "@/lib/game/config";
import { champSelectWeekStart, isValidProposalPoints } from "@/lib/game/champSelect";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PROPOSAL_DESCRIPTION_MAX_LENGTH, PROPOSAL_TITLE_MAX_LENGTH } from "./constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Same check as in src/features/feed/actions.ts.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LOGGED_OUT = "Prijavi se ponovo pa pokušaj još jednom.";
const CLOSED = "Champ select je zatvoren.";

export type NewProposal = {
  title: string;
  description: string;
  type: TaskType;
  scope: TaskScope;
  points: number;
};

/**
 * Proposes a task for next week. A solo task is for the player who proposes it.
 * The proposer's Za vote is added right away; they can take it back like any vote.
 */
export async function createProposal(input: NewProposal): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGGED_OUT };

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!title) return { ok: false, error: "Upiši naziv taska." };
  if (title.length > PROPOSAL_TITLE_MAX_LENGTH) {
    return { ok: false, error: `Naziv može imati najviše ${PROPOSAL_TITLE_MAX_LENGTH} znakova.` };
  }
  if (description.length > PROPOSAL_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: `Opis može imati najviše ${PROPOSAL_DESCRIPTION_MAX_LENGTH} znakova.` };
  }
  if ((input.type !== "check" && input.type !== "proof") || (input.scope !== "team" && input.scope !== "solo")) {
    return { ok: false, error: "Predlog nije sačuvan. Pokušaj ponovo." };
  }
  if (!isValidProposalPoints(input.points)) {
    return { ok: false, error: `Poeni moraju biti ceo broj od ${PROPOSAL_MIN_POINTS} do ${PROPOSAL_MAX_POINTS}.` };
  }

  // Champ select is open while next week's row is in champ_select; syncWeekPhase() opens and closes it.
  const supabase = await createClient();
  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id")
    .eq("starts_on", champSelectWeekStart(new Date()))
    .eq("status", "champ_select")
    .maybeSingle<{ id: string }>();
  if (weekError) console.error("createProposal: read week failed", weekError);
  if (!week) return { ok: false, error: CLOSED };

  const { data: proposal, error } = await supabase
    .from("task_proposals")
    .insert({
      week_id: week.id,
      proposed_by: user.id,
      title,
      description: description || null,
      type: input.type,
      scope: input.scope,
      assignee_id: input.scope === "solo" ? user.id : null,
      points: input.points,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    console.error("createProposal failed", error);
    return { ok: false, error: "Predlog nije sačuvan. Pokušaj ponovo." };
  }

  // The proposal is saved either way; a missing vote is only one tap to fix.
  const { error: voteError } = await supabase
    .from("task_votes")
    .insert({ proposal_id: proposal.id, voter_id: user.id, approve: true });
  if (voteError) console.error("createProposal: own Za vote failed", voteError);

  revalidatePath("/champ-select");
  return { ok: true };
}

/** Deletes the viewer's own proposal (and its votes) while champ select is open. */
export async function deleteProposal(proposalId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGGED_OUT };
  if (!UUID.test(proposalId)) return { ok: false, error: "Predlog nije obrisan. Pokušaj ponovo." };

  const supabase = await createClient();
  // RLS allows only your own open proposal during champ select; anything else deletes 0 rows.
  const { data, error } = await supabase
    .from("task_proposals")
    .delete()
    .eq("id", proposalId)
    .eq("proposed_by", user.id)
    .select("id");
  if (error || !data.length) {
    if (error) console.error("deleteProposal failed", error);
    return { ok: false, error: "Predlog nije obrisan. Možda je champ select zatvoren, osveži stranicu." };
  }

  revalidatePath("/champ-select");
  return { ok: true };
}

/**
 * Sets the viewer's vote on a proposal: true = Za, false = Protiv, null takes the vote back.
 * Takes the wanted end state (not a toggle), so a repeated request can't flip it twice.
 */
export async function setProposalVote(proposalId: string, approve: boolean | null): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGGED_OUT };
  if (!UUID.test(proposalId) || (approve !== null && typeof approve !== "boolean")) {
    return { ok: false, error: "Glas nije sačuvan. Pokušaj ponovo." };
  }

  const supabase = await createClient();
  const ownVote = supabase.from("task_votes");
  let error: PostgrestError | null;

  // Same steps as setPostVote in src/features/feed/actions.ts.
  if (approve === null) {
    ({ error } = await ownVote.delete().eq("proposal_id", proposalId).eq("voter_id", user.id));
  } else {
    // Not upsert(): it would also try to update proposal_id/voter_id, which clients may not change.
    const updated = await ownVote
      .update({ approve })
      .eq("proposal_id", proposalId)
      .eq("voter_id", user.id)
      .select("proposal_id");
    error = updated.error;
    if (!error && !updated.data?.length) {
      // RLS rejects this once champ select is closed.
      ({ error } = await ownVote.insert({ proposal_id: proposalId, voter_id: user.id, approve }));
    }
  }

  if (error) {
    console.error("setProposalVote failed", error);
    return { ok: false, error: "Glas nije sačuvan. Možda je champ select zatvoren, osveži stranicu." };
  }

  revalidatePath("/champ-select");
  return { ok: true };
}
