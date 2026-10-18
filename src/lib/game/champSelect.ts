// Champ select: proposing and voting on next week's tasks on Sunday evening. Pure functions, no DB or UI imports.
// The database applies the same approval rule when the week starts (activate_week() in
// supabase/migrations/20261013170000_activate_week.sql gets PROPOSAL_APPROVALS_NEEDED as an argument).

import {
  BOSS_ROTATION_START,
  CHAMP_SELECT_DAMAGE_MAX_FACTOR,
  CHAMP_SELECT_DAMAGE_MIN_FACTOR,
  CHAMP_SELECT_OPENS_HOUR,
  FILL_POOL_WEEKLY_SHIFT,
  PLAYERS,
  PROPOSAL_APPROVALS_NEEDED,
  PROPOSAL_MAX_POINTS,
  PROPOSAL_MIN_POINTS,
  PROPOSAL_POINTS_STEP,
} from "./config";
import { FILL_TASK_POOL, type PoolTask } from "./taskPool";
import { currentWeekStart, dayOfWeek, hourOf, nextWeekStart, weeksBetween } from "./week";

/** True from Sunday CHAMP_SELECT_OPENS_HOUR:00 until the new week starts at Monday 00:00 (Belgrade). */
export function isChampSelectOpen(now: Date): boolean {
  return dayOfWeek(now) === 7 && hourOf(now) >= CHAMP_SELECT_OPENS_HOUR;
}

/** The week that champ select at `now` picks tasks for: the one starting next Monday. */
export function champSelectWeekStart(now: Date): string {
  return nextWeekStart(currentWeekStart(now));
}

/** A proposal becomes a task if enough players voted "Za". */
export function isProposalApproved(approveVotes: number): boolean {
  return approveVotes >= PROPOSAL_APPROVALS_NEEDED;
}

/** Points within PROPOSAL_MIN_POINTS..PROPOSAL_MAX_POINTS, in steps of PROPOSAL_POINTS_STEP. */
export function isValidProposalPoints(points: number): boolean {
  return (
    Number.isInteger(points) &&
    points >= PROPOSAL_MIN_POINTS &&
    points <= PROPOSAL_MAX_POINTS &&
    points % PROPOSAL_POINTS_STEP === 0
  );
}

/** `points` moved one step up (+1) or down (-1), kept within PROPOSAL_MIN_POINTS..PROPOSAL_MAX_POINTS. */
export function stepProposalPoints(points: number, direction: 1 | -1): number {
  const next = points + direction * PROPOSAL_POINTS_STEP;
  return Math.min(PROPOSAL_MAX_POINTS, Math.max(PROPOSAL_MIN_POINTS, next));
}

/** The fields of a task (or proposal) that its damage needs. */
export type DamageTask = { scope: "team" | "solo"; points: number };

/** Most damage a task can do to the boss: a team task once per player, a solo task once. */
export function maxTaskDamage(task: DamageTask): number {
  return task.scope === "team" ? task.points * PLAYERS : task.points;
}

/** Total max damage of `tasks` (the proposals that pass, or the tasks of a week). */
export function maxDamage(tasks: readonly DamageTask[]): number {
  return tasks.reduce((total, task) => total + maxTaskDamage(task), 0);
}

export type DamageRange = { min: number; max: number };

/** The acceptable max damage for a boss with `bossHp`. */
export function damageRange(bossHp: number): DamageRange {
  return {
    min: Math.round(bossHp * CHAMP_SELECT_DAMAGE_MIN_FACTOR),
    max: Math.round(bossHp * CHAMP_SELECT_DAMAGE_MAX_FACTOR),
  };
}

export type DamageZone = "low" | "ok" | "high";

/** Below, inside (both ends included) or above the range. */
export function damageZone(damage: number, range: DamageRange): DamageZone {
  if (damage < range.min) return "low";
  if (damage > range.max) return "high";
  return "ok";
}

/** Same title ignoring case and spaces at the ends, so a proposal and a pool task don't both end up in a week. */
function titleKey(title: string): string {
  return title.trim().toLocaleLowerCase("sr");
}

/**
 * Pool tasks that bring a week's max damage up into the range when champ select left it below `range.min`.
 * Walks FILL_TASK_POOL from a start that moves FILL_POOL_WEEKLY_SHIFT tasks every week, skips tasks whose title is
 * already in the week and tasks that would push the damage over `range.max`, and stops once it reaches `range.min`.
 * Empty when the week is already in or above the range. Deterministic, so two requests pick the same tasks.
 */
export function fillTasks(
  weekStartsOn: string,
  approved: ReadonlyArray<DamageTask & { title: string }>,
  range: DamageRange,
  pool: readonly PoolTask[] = FILL_TASK_POOL,
): PoolTask[] {
  let damage = maxDamage(approved);
  if (damage >= range.min || pool.length === 0) return [];

  const taken = new Set(approved.map((task) => titleKey(task.title)));
  const shift = weeksBetween(BOSS_ROTATION_START, weekStartsOn) * FILL_POOL_WEEKLY_SHIFT;
  const start = ((shift % pool.length) + pool.length) % pool.length;
  const picked: PoolTask[] = [];

  for (let i = 0; i < pool.length && damage < range.min; i++) {
    const task = pool[(start + i) % pool.length];
    const taskDamage = maxTaskDamage({ scope: "team", points: task.points });
    if (taken.has(titleKey(task.title)) || damage + taskDamage > range.max) continue;
    picked.push(task);
    taken.add(titleKey(task.title));
    damage += taskDamage;
  }
  return picked;
}
