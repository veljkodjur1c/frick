// Legit/Cap votes on task proofs. Pure functions, no DB or UI imports.
// Rule (CLAUDE.md): approved with PROOF_APPROVALS_NEEDED Legit votes, rejected with PROOF_REJECTIONS_NEEDED Cap votes
// (a majority of the other players), otherwise pending. Unvoted proofs are auto-accepted at week end (weekly job).

import { PROOF_APPROVALS_NEEDED, PROOF_REJECTIONS_NEEDED } from "./config";
import type { CompletionStatus } from "./points";

export type ProofVote = "legit" | "cap";

/** Status a pending proof should have after these votes. */
export function resolveProof({ legit, cap }: { legit: number; cap: number }): CompletionStatus {
  if (legit >= PROOF_APPROVALS_NEEDED) return "approved";
  if (cap >= PROOF_REJECTIONS_NEEDED) return "rejected";
  return "pending";
}

/** Counts Legit and Cap in a list of votes. */
export function countProofVotes(votes: ReadonlyArray<{ vote: ProofVote }>): { legit: number; cap: number } {
  let legit = 0;
  for (const { vote } of votes) {
    if (vote === "legit") legit += 1;
  }
  return { legit, cap: votes.length - legit };
}
