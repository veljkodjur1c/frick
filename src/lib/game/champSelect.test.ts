import { describe, expect, it } from "vitest";
import {
  champSelectWeekStart,
  damageRange,
  damageZone,
  fillTasks,
  isChampSelectOpen,
  isProposalApproved,
  isValidProposalPoints,
  maxDamage,
  maxTaskDamage,
  stepProposalPoints,
} from "./champSelect";
import type { PoolTask } from "./taskPool";

// Inputs are UTC instants. Belgrade is UTC+2 until 2026-10-25, UTC+1 after.
const at = (iso: string) => new Date(iso);

describe("isChampSelectOpen", () => {
  it("opens on Sunday at 18:00 Belgrade time", () => {
    // Sunday 2026-10-18, CEST
    expect(isChampSelectOpen(at("2026-10-18T15:59:00Z"))).toBe(false);
    expect(isChampSelectOpen(at("2026-10-18T16:00:00Z"))).toBe(true);
    expect(isChampSelectOpen(at("2026-10-18T21:59:00Z"))).toBe(true);
  });

  it("follows Belgrade time in winter", () => {
    // Sunday 2026-11-01, CET: 18:00 = 17:00 UTC
    expect(isChampSelectOpen(at("2026-11-01T16:30:00Z"))).toBe(false);
    expect(isChampSelectOpen(at("2026-11-01T17:00:00Z"))).toBe(true);
  });

  it("closes when the new week starts at Monday 00:00", () => {
    // Monday 2026-10-19 00:00 CEST = Sunday 22:00 UTC
    expect(isChampSelectOpen(at("2026-10-18T22:00:00Z"))).toBe(false);
  });

  it("is closed on other days in the evening", () => {
    // Saturday 2026-10-17 20:00 CEST
    expect(isChampSelectOpen(at("2026-10-17T18:00:00Z"))).toBe(false);
  });
});

describe("champSelectWeekStart", () => {
  it("is next Monday", () => {
    expect(champSelectWeekStart(at("2026-10-18T17:00:00Z"))).toBe("2026-10-19");
  });
});

describe("isProposalApproved", () => {
  it("needs 3 Za votes", () => {
    expect(isProposalApproved(2)).toBe(false);
    expect(isProposalApproved(3)).toBe(true);
    expect(isProposalApproved(5)).toBe(true);
  });
});

describe("isValidProposalPoints", () => {
  it("accepts points from 5 to 50 in steps of 5", () => {
    expect(isValidProposalPoints(5)).toBe(true);
    expect(isValidProposalPoints(25)).toBe(true);
    expect(isValidProposalPoints(50)).toBe(true);
    expect(isValidProposalPoints(0)).toBe(false);
    expect(isValidProposalPoints(55)).toBe(false);
    expect(isValidProposalPoints(12)).toBe(false);
    expect(isValidProposalPoints(12.5)).toBe(false);
    expect(isValidProposalPoints(Number.NaN)).toBe(false);
  });
});

describe("stepProposalPoints", () => {
  it("moves by 5", () => {
    expect(stepProposalPoints(10, 1)).toBe(15);
    expect(stepProposalPoints(10, -1)).toBe(5);
  });

  it("stays within 5 and 50", () => {
    expect(stepProposalPoints(5, -1)).toBe(5);
    expect(stepProposalPoints(50, 1)).toBe(50);
  });
});

describe("maxDamage", () => {
  it("counts a team task once per player and a solo task once", () => {
    expect(maxTaskDamage({ scope: "team", points: 10 })).toBe(50);
    expect(maxTaskDamage({ scope: "solo", points: 10 })).toBe(10);
    expect(
      maxDamage([
        { scope: "team", points: 20 },
        { scope: "solo", points: 15 },
      ]),
    ).toBe(115);
    expect(maxDamage([])).toBe(0);
  });
});

describe("damageRange and damageZone", () => {
  it("is 700-850 for a 500 HP boss", () => {
    expect(damageRange(500)).toEqual({ min: 700, max: 850 });
  });

  it("includes both ends", () => {
    const range = damageRange(500);
    expect(damageZone(695, range)).toBe("low");
    expect(damageZone(700, range)).toBe("ok");
    expect(damageZone(850, range)).toBe("ok");
    expect(damageZone(855, range)).toBe("high");
  });
});

describe("fillTasks", () => {
  const range = { min: 700, max: 850 };
  const pool: PoolTask[] = [
    { title: "A", type: "check", points: 20, category: "gym" }, // 100 damage
    { title: "B", type: "check", points: 50, category: "chef" }, // 250
    { title: "C", type: "proof", points: 30, category: "grind" }, // 150
    { title: "D", type: "check", points: 10, category: "random" }, // 50
  ];
  // BOSS_ROTATION_START, so the pool is walked from its first task.
  const week = "2026-10-12";

  it("adds nothing when the week is already in or above the range", () => {
    expect(fillTasks(week, [{ title: "X", scope: "team", points: 40 }, { title: "Y", scope: "team", points: 100 }], range, pool)).toEqual([]);
  });

  it("fills up to the range in pool order and stops there", () => {
    // 400 approved + A 100 + B 250 = 750
    const picked = fillTasks(week, [{ title: "X", scope: "team", points: 80 }], range, pool);
    expect(picked.map((t) => t.title)).toEqual(["A", "B"]);
  });

  it("skips tasks that would go over the max and titles already in the week", () => {
    // 650 approved: A is already in the week (other case), B would make 900, C brings it to 800.
    const picked = fillTasks(week, [{ title: " a ", scope: "team", points: 130 }], range, pool);
    expect(picked.map((t) => t.title)).toEqual(["C"]);
  });

  it("starts further into the pool every week", () => {
    // One week later the start moves FILL_POOL_WEEKLY_SHIFT (5) tasks: 5 % 4 = 1, so B comes first.
    const picked = fillTasks("2026-10-19", [], range, pool);
    expect(picked[0].title).toBe("B");
  });

  it("fills an empty week from the real pool into the range", () => {
    const picked = fillTasks("2026-10-19", [], range);
    const damage = maxDamage(picked.map((t) => ({ scope: "team" as const, points: t.points })));
    expect(damage).toBeGreaterThanOrEqual(700);
    expect(damage).toBeLessThanOrEqual(850);
    expect(new Set(picked.map((t) => t.title)).size).toBe(picked.length);
  });
});
