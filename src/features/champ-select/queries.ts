import "server-only";
import type { TaskScope, TaskType } from "@/features/tasks/queries";
import { champSelectWeekStart } from "@/lib/game/champSelect";
import type { TaskCategory } from "@/lib/game/titles";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ProposalVotes = {
  za: number;
  protiv: number;
  /** The viewer's own vote: true = Za, false = Protiv, null = not voted. */
  mine: boolean | null;
};

export type ProposalData = {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  scope: TaskScope;
  points: number;
  /** Null only for proposals made before categories existed. */
  category: TaskCategory | null;
  proposer: { displayName: string; avatarUrl: string | null };
  /** The viewer proposed it (so they can delete it). */
  isOwn: boolean;
  votes: ProposalVotes;
};

export type ChampSelectData =
  | { state: "closed" }
  | { state: "open"; weekStartsOn: string; proposals: ProposalData[] };

type ProposalRow = {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  scope: TaskScope;
  points: number;
  category: TaskCategory | null;
  proposed_by: string;
  proposer: { display_name: string; avatar_url: string | null };
  votes: Array<{ voter_id: string; approve: boolean }>;
};

/**
 * Next week's champ select with every proposal and its votes, oldest proposal first.
 * "closed" unless next week's row exists and is still in champ select (syncWeekPhase() opens it).
 * Reads the session, so the caller must sit inside a <Suspense> boundary.
 */
export async function getChampSelect(): Promise<ChampSelectData> {
  const user = await requireUser();
  const supabase = await createClient();
  const weekStartsOn = champSelectWeekStart(new Date());

  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id")
    .eq("starts_on", weekStartsOn)
    .eq("status", "champ_select")
    .maybeSingle<{ id: string }>();
  if (weekError) throw weekError;
  if (!week) return { state: "closed" };

  const { data, error } = await supabase
    .from("task_proposals")
    .select(
      "id, title, description, type, scope, points, category, proposed_by, " +
        "proposer:profiles!task_proposals_proposed_by_fkey(display_name, avatar_url), " +
        "votes:task_votes(voter_id, approve)",
    )
    .eq("week_id", week.id)
    .order("created_at")
    .overrideTypes<ProposalRow[], { merge: false }>();
  if (error) throw error;

  const proposals = data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    scope: row.scope,
    points: row.points,
    category: row.category,
    proposer: { displayName: row.proposer.display_name, avatarUrl: row.proposer.avatar_url },
    isOwn: row.proposed_by === user.id,
    votes: {
      za: row.votes.filter((v) => v.approve).length,
      protiv: row.votes.filter((v) => !v.approve).length,
      mine: row.votes.find((v) => v.voter_id === user.id)?.approve ?? null,
    },
  }));

  return { state: "open", weekStartsOn, proposals };
}
