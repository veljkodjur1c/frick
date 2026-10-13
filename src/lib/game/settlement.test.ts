import { describe, expect, it } from "vitest";
import { bossForWeek, settleWeek, weeklyAwards, type SettlementInput } from "./settlement";

// Current config: +10 LP per task, -20 LP under 5 tasks, +25 LP for a boss kill, boss HP 500.

const tasks: SettlementInput["tasks"] = [
  { id: "t1", points: 100, assigneeId: null },
  { id: "t2", points: 50, assigneeId: null },
  { id: "solo-ana", points: 80, assigneeId: "ana" },
];

const players: SettlementInput["players"] = [
  { id: "ana", lp: 95, earnedFlavors: [] },
  { id: "marko", lp: 10, earnedFlavors: ["original"] },
];

describe("settleWeek", () => {
  it("adds up points per player and the boss damage", () => {
    const result = settleWeek({
      bossHp: 500,
      players,
      tasks,
      completions: [
        { taskId: "t1", userId: "ana", status: "approved" },
        { taskId: "solo-ana", userId: "ana", status: "approved" },
        { taskId: "t1", userId: "marko", status: "approved" },
        { taskId: "t2", userId: "marko", status: "rejected" },
      ],
    });

    expect(result.damage).toBe(280);
    expect(result.bossDefeated).toBe(false);
    expect(result.players.map((p) => [p.id, p.points, p.completedTasks])).toEqual([
      ["ana", 180, 2],
      ["marko", 100, 1],
    ]);
    expect(result.cans).toEqual([]);
  });

  it("accepts proofs still pending at week end", () => {
    const result = settleWeek({
      bossHp: 500,
      players,
      tasks,
      completions: [{ taskId: "t2", userId: "marko", status: "pending" }],
    });
    expect(result.players.find((p) => p.id === "marko")?.points).toBe(50);
  });

  it("ignores a solo task completed by someone else and tasks from other weeks", () => {
    const result = settleWeek({
      bossHp: 500,
      players,
      tasks,
      completions: [
        { taskId: "solo-ana", userId: "marko", status: "approved" },
        { taskId: "old-task", userId: "marko", status: "approved" },
      ],
    });
    expect(result.damage).toBe(0);
  });

  it("changes LP and reports rank changes", () => {
    const result = settleWeek({
      bossHp: 500,
      players,
      tasks,
      completions: [{ taskId: "t1", userId: "ana", status: "approved" }],
    });

    const [ana, marko] = result.players;
    // Ana: 1 task (+10) under the minimum (-20): 95 -> 85, still Iron IV.
    expect(ana.lp.total).toBe(-10);
    expect([ana.lpBefore, ana.lpAfter, ana.rankChange]).toEqual([95, 85, "same"]);
    // Marko: nothing done, 10 - 20 stops at 0.
    expect([marko.lpAfter, marko.rankChange]).toEqual([0, "same"]);
  });

  it("kills the boss at exactly its HP and gives everyone a can and the bonus", () => {
    const result = settleWeek({
      bossHp: 230,
      players,
      tasks,
      completions: [
        { taskId: "t1", userId: "ana", status: "approved" },
        { taskId: "solo-ana", userId: "ana", status: "approved" },
        { taskId: "t2", userId: "marko", status: "approved" },
      ],
    });

    expect(result.damage).toBe(230);
    expect(result.bossDefeated).toBe(true);
    expect(result.players[0].lp.bossBonus).toBe(25);
    // Ana has no cans yet, Marko already has "original".
    expect(result.cans).toEqual([
      { userId: "ana", flavor: "original" },
      { userId: "marko", flavor: "ultra-white" },
    ]);
    // Ana: 2 tasks (+20) - 20 + 25 = +25, 95 -> 120: Iron IV -> Iron III.
    expect([result.players[0].lpAfter, result.players[0].rankChange]).toEqual([120, "promoted"]);
  });

  it("gives MVP and Feeder awards", () => {
    const result = settleWeek({
      bossHp: 500,
      players,
      tasks,
      completions: [{ taskId: "t1", userId: "ana", status: "approved" }],
    });
    expect(result.awards).toEqual([
      { kind: "mvp", userId: "ana", points: 100 },
      { kind: "feeder", userId: "marko", points: 0 },
    ]);
  });
});

describe("weeklyAwards", () => {
  it("shares an award between tied players", () => {
    expect(
      weeklyAwards([
        { id: "a", points: 50 },
        { id: "b", points: 50 },
        { id: "c", points: 10 },
      ]),
    ).toEqual([
      { kind: "mvp", userId: "a", points: 50 },
      { kind: "mvp", userId: "b", points: 50 },
      { kind: "feeder", userId: "c", points: 10 },
    ]);
  });

  it("gives nothing when everyone has the same points", () => {
    expect(weeklyAwards([{ id: "a", points: 0 }, { id: "b", points: 0 }])).toEqual([]);
    expect(weeklyAwards([])).toEqual([]);
  });
});

describe("bossForWeek", () => {
  it("rotates the bosses week by week and repeats", () => {
    expect(bossForWeek("2026-10-12")).toEqual({ name: "Baron Nashor", hp: 500, image: "baron-nashor.jpg" });
    expect(bossForWeek("2026-10-19").name).toBe("Elder Dragon");
    expect(bossForWeek("2026-11-02").name).toBe("Atakhan");
    expect(bossForWeek("2026-11-09").name).toBe("Baron Nashor");
  });

  it("works for weeks before the rotation start", () => {
    expect(bossForWeek("2026-10-05").name).toBe("Atakhan");
  });
});
