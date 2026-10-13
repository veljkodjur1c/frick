// Points from completed tasks. Pure functions, no DB or UI imports.
// Only approved completions count; pending and rejected proofs give nothing.

import { MIN_TASKS_PER_WEEK } from "./config";

export type CompletionStatus = "pending" | "approved" | "rejected";

/** The fields of a task that scoring needs. */
export type ScoredTask = { id: string; points: number };

/** The fields of a completion that scoring needs. */
export type ScoredCompletion = { taskId: string; status: CompletionStatus };

/**
 * Sum of points of approved completions. Works for one player or the whole team:
 * a team task completed by three players counts three times (that is the boss damage).
 * Completions of tasks not in `tasks` are ignored.
 */
export function approvedPoints(tasks: readonly ScoredTask[], completions: readonly ScoredCompletion[]): number {
  const pointsById = new Map(tasks.map((task) => [task.id, task.points]));
  let total = 0;
  for (const completion of completions) {
    if (completion.status === "approved") {
      total += pointsById.get(completion.taskId) ?? 0;
    }
  }
  return total;
}

/** Number of different tasks in `tasks` that have an approved completion. */
export function completedCount(tasks: readonly ScoredTask[], completions: readonly ScoredCompletion[]): number {
  const approved = new Set(completions.filter((c) => c.status === "approved").map((c) => c.taskId));
  return tasks.filter((task) => approved.has(task.id)).length;
}

export type WeeklyProgress = {
  doneCount: number;
  totalCount: number;
  points: number;
  /** Tasks still needed to reach MIN_TASKS_PER_WEEK; 0 once it is reached. */
  tasksUntilMinimum: number;
};

/** One player's week: their tasks and their own completions. */
export function weeklyProgress({
  tasks,
  completions,
}: {
  tasks: readonly ScoredTask[];
  completions: readonly ScoredCompletion[];
}): WeeklyProgress {
  const doneCount = completedCount(tasks, completions);
  return {
    doneCount,
    totalCount: tasks.length,
    points: approvedPoints(tasks, completions),
    tasksUntilMinimum: Math.max(0, MIN_TASKS_PER_WEEK - doneCount),
  };
}
