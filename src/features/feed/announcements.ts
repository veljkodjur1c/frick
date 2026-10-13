import "server-only";
import { announcerEvents, type AnnouncerEvent, type AnnouncerWeek } from "@/lib/game/announcer";
import type { CompletionStatus } from "@/lib/game/points";
import { weekStartOf } from "@/lib/game/week";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementPlayer = { id: string; displayName: string; avatarUrl: string | null };

/** An announcer event in the feed (First Blood, Last hit, Pentakill, Shutdown), with the players' names. */
export type FeedAnnouncementData = {
  kind: "announcement";
  id: string;
  createdAt: string;
  event:
    | { kind: "first-blood"; player: AnnouncementPlayer; taskTitle: string }
    | { kind: "last-hit"; player: AnnouncementPlayer; bossName: string }
    | { kind: "pentakill"; players: AnnouncementPlayer[] }
    | { kind: "shutdown"; player: AnnouncementPlayer; overtaken: AnnouncementPlayer[] };
};

type WeekRow = {
  id: string;
  starts_on: string;
  boss: { name: string; hp: number } | null;
  awards: Array<{ kind: "mvp" | "feeder"; user_id: string; created_at: string }>;
  tasks: Array<{
    title: string;
    points: number;
    completions: Array<{
      id: string;
      user_id: string;
      status: CompletionStatus;
      created_at: string;
      resolved_at: string | null;
    }>;
  }>;
};

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The announcer events that happened in [from, before), newest first. Without `from` everything before `before`,
 * without `before` everything up to now.
 *
 * Only the weeks that can have events in that range are read: a week's events happen from its Monday on, but can
 * land after its end (the settlement runs on the first page load after it, and Shutdown happens then), and its
 * Shutdown needs the awards of the week before. Two extra weeks back cover both.
 */
export async function getAnnouncements({ from, before }: { from?: string; before?: string }): Promise<
  FeedAnnouncementData[]
> {
  const supabase = await createClient();

  let weekQuery = supabase
    .from("weeks")
    .select(
      "id, starts_on, boss:bosses(name, hp), awards(kind, user_id, created_at), " +
        "tasks(title, points, completions(id, user_id, status, created_at, resolved_at))",
    )
    .order("starts_on");
  if (before) weekQuery = weekQuery.lte("starts_on", weekStartOf(new Date(before)));
  if (from) weekQuery = weekQuery.gte("starts_on", weekStartOf(new Date(Date.parse(from) - 14 * DAY_MS)));

  const [weeks, profiles] = await Promise.all([
    weekQuery.overrideTypes<WeekRow[], { merge: false }>(),
    supabase.from("profiles").select("id, display_name, avatar_url").overrideTypes<ProfileRow[], { merge: false }>(),
  ]);
  if (weeks.error) throw weeks.error;
  if (profiles.error) throw profiles.error;

  const players = new Map(
    profiles.data.map((row) => [row.id, { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url }]),
  );
  const inRange = (at: string) =>
    (!from || Date.parse(at) >= Date.parse(from)) && (!before || Date.parse(at) < Date.parse(before));

  return announcerEvents(weeks.data.map(toAnnouncerWeek))
    .filter((event) => inRange(event.at))
    .flatMap((event) => {
      const announcement = withPlayers(event, players);
      return announcement ? [{ kind: "announcement" as const, id: event.id, createdAt: event.at, event: announcement }] : [];
    });
}

function toAnnouncerWeek(row: WeekRow): AnnouncerWeek {
  const awarded = (kind: "mvp" | "feeder") =>
    row.awards.filter((award) => award.kind === kind).map((award) => award.user_id);
  return {
    id: row.id,
    startsOn: row.starts_on,
    boss: row.boss,
    completions: row.tasks.flatMap((task) =>
      task.completions
        .filter((completion) => completion.status === "approved")
        .map((completion) => ({
          id: completion.id,
          userId: completion.user_id,
          taskTitle: task.title,
          points: task.points,
          createdAt: completion.created_at,
          // Every approved completion has resolved_at; fall back to when it was done, just in case.
          resolvedAt: completion.resolved_at ?? completion.created_at,
        })),
    ),
    mvpIds: awarded("mvp"),
    feederIds: awarded("feeder"),
    settledAt: row.awards[0]?.created_at ?? null,
  };
}

/** The event with names and avatars instead of player ids, or null if a player is gone. */
function withPlayers(
  event: AnnouncerEvent,
  players: ReadonlyMap<string, AnnouncementPlayer>,
): FeedAnnouncementData["event"] | null {
  const all = (ids: readonly string[]) => {
    const found = ids.flatMap((id) => players.get(id) ?? []);
    return found.length === ids.length ? found : null;
  };

  switch (event.kind) {
    case "first-blood": {
      const player = players.get(event.userId);
      return player ? { kind: event.kind, player, taskTitle: event.taskTitle } : null;
    }
    case "last-hit": {
      const player = players.get(event.userId);
      return player ? { kind: event.kind, player, bossName: event.bossName } : null;
    }
    case "pentakill": {
      const team = all(event.userIds);
      return team ? { kind: event.kind, players: team } : null;
    }
    case "shutdown": {
      const player = players.get(event.userId);
      const overtaken = all(event.overtakenIds);
      return player && overtaken ? { kind: event.kind, player, overtaken } : null;
    }
  }
}
