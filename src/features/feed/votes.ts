// Legit/Cap votes on feed posts. Pure functions, no DB or UI.

export type PostVote = "legit" | "cap";

export type VoteTally = {
  legit: number;
  cap: number;
  /** The viewer's own vote, or null. */
  mine: PostVote | null;
};

/** More Legit -> "valid", more Cap -> "freak", no votes or a tie -> null (no badge). */
export function postVerdict({ legit, cap }: Pick<VoteTally, "legit" | "cap">): "valid" | "freak" | null {
  if (legit > cap) return "valid";
  if (cap > legit) return "freak";
  return null;
}

/** Tapping your current vote takes it back; tapping the other one switches to it. */
export function nextVote(current: PostVote | null, tapped: PostVote): PostVote | null {
  return current === tapped ? null : tapped;
}

/** The tally after the viewer's vote changes to `next`. Used to update the UI before the server answers. */
export function applyVote(tally: VoteTally, next: PostVote | null): VoteTally {
  const result = { ...tally, mine: next };
  if (tally.mine) result[tally.mine] -= 1;
  if (next) result[next] += 1;
  return result;
}
