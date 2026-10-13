// Task categories and the titles they give. Pure functions, no DB or UI imports.
//
// Every task has one category. The player with the most approved tasks of a category (all time) holds its title,
// but only from TITLE_MIN_TASKS on. Ties share the title. A player can hold several titles.

import { TITLE_MIN_TASKS } from "./config";

/** Enum values of public.task_category (supabase/migrations/20261013200000_task_categories.sql). */
export const TASK_CATEGORIES = ["caffeine", "gym", "grind", "chef", "random"] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

/** Title name (also the category's label in the UI) and what kind of tasks belong to it. */
export const CATEGORY_INFO: Record<TaskCategory, { title: string; description: string }> = {
  caffeine: { title: "Caffeine addict", description: "Kafa, pre-workout, Monster" },
  gym: { title: "Gymbro", description: "Teretana, trening, trčanje" },
  grind: { title: "Grinder", description: "Faks, učenje, posao" },
  chef: { title: "Masterchef", description: "Kuvanje, pravljenje hrane" },
  random: { title: "Randomac", description: "Najrandom izazovi" },
};

export function isTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === "string" && (TASK_CATEGORIES as readonly string[]).includes(value);
}

/** Approved tasks of one category by one player, all time (a row of the category_counts view). */
export type CategoryCount = { userId: string; category: TaskCategory; count: number };

export type CategoryTitle = {
  category: TaskCategory;
  /** Players holding the title (more than one on a tie). */
  holderIds: string[];
  /** Approved tasks of the category each holder has. */
  count: number;
};

/**
 * The current holders of every category title, in TASK_CATEGORIES order. A category nobody has done
 * TITLE_MIN_TASKS times yet is left out.
 */
export function categoryTitles(counts: readonly CategoryCount[]): CategoryTitle[] {
  const titles: CategoryTitle[] = [];
  for (const category of TASK_CATEGORIES) {
    const rows = counts.filter((row) => row.category === category);
    const best = Math.max(0, ...rows.map((row) => row.count));
    if (best < TITLE_MIN_TASKS) continue;
    const holderIds = rows
      .filter((row) => row.count === best)
      .map((row) => row.userId)
      .sort();
    titles.push({ category, holderIds, count: best });
  }
  return titles;
}

/** The titles one player holds, most tasks first (ties keep TASK_CATEGORIES order). */
export function titlesOf(userId: string, titles: readonly CategoryTitle[]): CategoryTitle[] {
  return titles.filter((title) => title.holderIds.includes(userId)).sort((a, b) => b.count - a.count);
}

/** The title shown next to a player's name (their strongest one), or null if they hold none. */
export function mainTitleOf(userId: string, titles: readonly CategoryTitle[]): TaskCategory | null {
  return titlesOf(userId, titles)[0]?.category ?? null;
}
