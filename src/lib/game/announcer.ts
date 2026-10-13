// Announcer events in the feed: First Blood, Last hit, Pentakill and Shutdown. Pure functions, no DB or UI imports.
// Rules (CLAUDE.md, "Announcer"). Nothing is stored: like the titles, the events are computed from the weeks'
// approved completions whenever the feed loads, so an unticked task or a late approval moves or removes an event.
//
// A completion counts (deals damage) at `resolvedAt`: the tick of a check task, the deciding Legit vote of a proof,
// or the week's settlement for a proof nobody voted on. First Blood and Last hit happen at that moment.

import { isBossDefeated } from "./boss";
import { PLAYERS } from "./config";
import { dayOfWeek, nextWeekStart, weekStartOf } from "./week";

/** An approved completion of one of the week's tasks. */
export type AnnouncerCompletion = {
  id: string;
  userId: string;
  taskTitle: string;
  points: number;
  /** When the player did the task: the tick, or the proof photo upload. ISO timestamp. */
  createdAt: string;
  /** When it started to count (see above). ISO timestamp. */
  resolvedAt: string;
};

export type AnnouncerWeek = {
  id: string;
  /** Monday, "YYYY-MM-DD". */
  startsOn: string;
  boss: { name: string; hp: number } | null;
  /** Approved completions of the week's tasks, in any order. */
  completions: readonly AnnouncerCompletion[];
  /** The week's MVPs and Feeders, given at settlement (empty while the week runs). */
  mvpIds: readonly string[];
  feederIds: readonly string[];
  /** When the week was settled (the time of its awards); null while it runs or if nobody got an award. */
  settledAt: string | null;
};

export type AnnouncerEvent = {
  /** Unique across all events, stable between loads (a React key). */
  id: string;
  weekId: string;
  /** When it happened. ISO timestamp. */
  at: string;
} & (
  | { kind: "first-blood"; userId: string; taskTitle: string }
  | { kind: "last-hit"; userId: string; bossName: string }
  | { kind: "pentakill"; userIds: string[] }
  | { kind: "shutdown"; userId: string; overtakenIds: string[] }
);

/** Every event of the given weeks, newest first. Pass the week before the oldest one too, for its Shutdown. */
export function announcerEvents(weeks: readonly AnnouncerWeek[]): AnnouncerEvent[] {
  const byStart = new Map(weeks.map((week) => [week.startsOn, week]));
  const previousOf = new Map(
    weeks.flatMap((week) => {
      const next = byStart.get(nextWeekStart(week.startsOn));
      return next ? [[next.id, week] as const] : [];
    }),
  );

  const events = weeks.flatMap((week) => {
    const ordered = inCountingOrder(week.completions);
    return [
      firstBlood(week, ordered),
      lastHit(week, ordered),
      ...pentakills(week, ordered),
      ...shutdowns(week, previousOf.get(week.id)),
    ].filter((event): event is AnnouncerEvent => event !== null);
  });

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || (a.id < b.id ? -1 : 1));
}

/** First Blood: the first task of the week to count. */
function firstBlood(week: AnnouncerWeek, ordered: readonly AnnouncerCompletion[]): AnnouncerEvent | null {
  const first = ordered[0];
  if (!first) return null;
  return {
    id: `first-blood-${week.id}`,
    weekId: week.id,
    at: first.resolvedAt,
    kind: "first-blood",
    userId: first.userId,
    taskTitle: first.taskTitle,
  };
}

/** Last hit: the task whose points brought the team's damage up to the boss's HP. */
function lastHit(week: AnnouncerWeek, ordered: readonly AnnouncerCompletion[]): AnnouncerEvent | null {
  if (!week.boss) return null;
  let damage = 0;
  for (const completion of ordered) {
    damage += completion.points;
    if (isBossDefeated(week.boss.hp, damage)) {
      return {
        id: `last-hit-${week.id}`,
        weekId: week.id,
        at: completion.resolvedAt,
        kind: "last-hit",
        userId: completion.userId,
        bossName: week.boss.name,
      };
    }
  }
  return null;
}

/**
 * Pentakill: all PLAYERS players did at least one task on the same day (Belgrade time, by when they did it).
 * It happens once the last of them counts, so a proof approved the next day still makes it.
 */
function pentakills(week: AnnouncerWeek, ordered: readonly AnnouncerCompletion[]): AnnouncerEvent[] {
  // Day -> each player's first task of that day to count, in the order they counted.
  const days = new Map<string, Map<string, AnnouncerCompletion>>();
  for (const completion of ordered) {
    const done = new Date(completion.createdAt);
    const day = `${weekStartOf(done)}+${dayOfWeek(done)}`;
    const players = days.get(day) ?? new Map<string, AnnouncerCompletion>();
    if (!players.has(completion.userId)) players.set(completion.userId, completion);
    days.set(day, players);
  }

  return [...days].flatMap(([day, players]): AnnouncerEvent[] => {
    if (players.size < PLAYERS) return [];
    const last = [...players.values()][PLAYERS - 1];
    return [
      {
        id: `pentakill-${week.id}-${day}`,
        weekId: week.id,
        at: last.resolvedAt,
        kind: "pentakill",
        userIds: [...players.keys()],
      },
    ];
  });
}

/**
 * Shutdown: a Feeder of the previous week ends this week with more points than every MVP of the previous week.
 * Decided when the week is settled; during the week it would fire as soon as the Feeder ticks a task first.
 */
function shutdowns(week: AnnouncerWeek, previous: AnnouncerWeek | undefined): AnnouncerEvent[] {
  if (!week.settledAt || !previous || previous.mvpIds.length === 0) return [];
  const settledAt = week.settledAt;

  const points = new Map<string, number>();
  for (const completion of week.completions) {
    points.set(completion.userId, (points.get(completion.userId) ?? 0) + completion.points);
  }
  const bestMvp = Math.max(...previous.mvpIds.map((id) => points.get(id) ?? 0));

  return previous.feederIds
    .filter((id) => (points.get(id) ?? 0) > bestMvp)
    .map((id): AnnouncerEvent => ({
      id: `shutdown-${week.id}-${id}`,
      weekId: week.id,
      at: settledAt,
      kind: "shutdown",
      userId: id,
      overtakenIds: [...previous.mvpIds],
    }));
}

/** Completions in the order they started to count; ties by when they were done, then id (stable between loads). */
function inCountingOrder(completions: readonly AnnouncerCompletion[]): AnnouncerCompletion[] {
  return [...completions].sort(
    (a, b) =>
      Date.parse(a.resolvedAt) - Date.parse(b.resolvedAt) ||
      Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
