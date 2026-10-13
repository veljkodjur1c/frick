// Legit/Cap votes on feed posts. Pure functions, no DB or UI.

export type PostVote = "legit" | "cap";

export type VoteTally = {
  legit: number;
  cap: number;
  /** The viewer's own vote, or null. */
  mine: PostVote | null;
};

/** More Legit -> "legit", more Cap -> "cap", no votes or a tie -> null (no stamp). */
export function postVerdict({ legit, cap }: Pick<VoteTally, "legit" | "cap">): "legit" | "cap" | null {
  if (legit > cap) return "legit";
  if (cap > legit) return "cap";
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
