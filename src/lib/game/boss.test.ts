import { describe, expect, it } from "vitest";
import { daysLeftInWeek, isBossDefeated, summarizeDamage } from "./boss";

describe("summarizeDamage", () => {
  it("counts only approved points as damage, per player", () => {
    const summary = summarizeDamage([
      { userId: "ana", points: 20, status: "approved" },
      { userId: "ana", points: 15, status: "approved" },
      { userId: "marko", points: 30, status: "approved" },
      { userId: "marko", points: 50, status: "rejected" },
    ]);

    expect(summary.damage).toBe(65);
    expect(summary.byPlayer).toEqual({ ana: 35, marko: 30 });
  });

  it("keeps pending proofs apart from damage", () => {
    const summary = summarizeDamage([
      { userId: "ana", points: 20, status: "approved" },
      { userId: "ana", points: 30, status: "pending" },
    ]);

    expect(summary.damage).toBe(20);
    expect(summary.pendingDamage).toBe(30);
    expect(summary.byPlayer).toEqual({ ana: 20 });
  });

  it("is empty without completions", () => {
    expect(summarizeDamage([])).toEqual({ damage: 0, pendingDamage: 0, byPlayer: {} });
  });
});

describe("isBossDefeated", () => {
  it("dies at exactly its HP or more", () => {
    expect(isBossDefeated(500, 499)).toBe(false);
    expect(isBossDefeated(500, 500)).toBe(true);
    expect(isBossDefeated(500, 620)).toBe(true);
  });
});

describe("daysLeftInWeek", () => {
  it("counts down in Belgrade time", () => {
    // Monday 2026-10-12, 10:00 in Belgrade (UTC+2).
    expect(daysLeftInWeek(new Date("2026-10-12T08:00:00Z"))).toBe(6);
    // Sunday 2026-10-18, 23:30 in Belgrade, already Sunday evening.
    expect(daysLeftInWeek(new Date("2026-10-18T21:30:00Z"))).toBe(0);
    // Sunday 22:30 UTC is already Monday 00:30 in Belgrade: a new week.
    expect(daysLeftInWeek(new Date("2026-10-18T22:30:00Z"))).toBe(6);
  });
});
