import { describe, expect, it } from "vitest";
import { MIN_TASKS_PER_WEEK } from "./config";
import { approvedPoints, completedCount, weeklyProgress, type ScoredCompletion } from "./points";

const tasks = [
  { id: "team-walk", points: 20 },
  { id: "team-cook", points: 30 },
  { id: "solo-run", points: 50 },
];

const approved = (taskId: string): ScoredCompletion => ({ taskId, status: "approved" });

describe("approvedPoints", () => {
  it("is 0 without completions", () => {
    expect(approvedPoints(tasks, [])).toBe(0);
    expect(approvedPoints([], [])).toBe(0);
  });

  it("sums approved completions", () => {
    expect(approvedPoints(tasks, [approved("team-walk"), approved("solo-run")])).toBe(70);
  });

  it("ignores pending and rejected completions", () => {
    const mixed: ScoredCompletion[] = [
      approved("team-walk"),
      { taskId: "team-cook", status: "pending" },
      { taskId: "solo-run", status: "rejected" },
    ];
    expect(approvedPoints(tasks, mixed)).toBe(20);
  });

  it("counts a team task once per player who completed it", () => {
    // Three players each completed the same team task, plus one solo task.
    const team = [approved("team-walk"), approved("team-walk"), approved("team-walk"), approved("solo-run")];
    expect(approvedPoints(tasks, team)).toBe(3 * 20 + 50);
  });

  it("ignores completions of unknown tasks", () => {
    expect(approvedPoints(tasks, [approved("other-week")])).toBe(0);
  });
});

describe("completedCount", () => {
  it("counts tasks, not completions", () => {
    expect(completedCount(tasks, [approved("team-walk"), approved("team-walk")])).toBe(1);
    expect(completedCount(tasks, [{ taskId: "team-cook", status: "pending" }])).toBe(0);
  });
});

describe("weeklyProgress", () => {
  it("starts with the whole minimum to go", () => {
    expect(weeklyProgress({ tasks, completions: [] })).toEqual({
      doneCount: 0,
      totalCount: 3,
      points: 0,
      tasksUntilMinimum: MIN_TASKS_PER_WEEK,
    });
  });

  it("counts only approved tasks toward the minimum", () => {
    const progress = weeklyProgress({
      tasks,
      completions: [approved("team-walk"), { taskId: "team-cook", status: "pending" }],
    });
    expect(progress).toEqual({ doneCount: 1, totalCount: 3, points: 20, tasksUntilMinimum: MIN_TASKS_PER_WEEK - 1 });
  });

  it("never goes below 0 tasks until the minimum", () => {
    const many = Array.from({ length: MIN_TASKS_PER_WEEK + 2 }, (_, i) => ({ id: `t${i}`, points: 10 }));
    const progress = weeklyProgress({ tasks: many, completions: many.map((t) => approved(t.id)) });
    expect(progress.doneCount).toBe(MIN_TASKS_PER_WEEK + 2);
    expect(progress.points).toBe((MIN_TASKS_PER_WEEK + 2) * 10);
    expect(progress.tasksUntilMinimum).toBe(0);
  });
});
