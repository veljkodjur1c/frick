import { describe, expect, it } from "vitest";
import { applyLpChange, nextRank, rankChange, rankFromLp, rankOrder, weeklyLpChange } from "./rank";

// Numbers below use the current config: 100 LP per division, Master 2800, Grandmaster 3200, Challenger 3600,
// +10 LP per task, -20 LP under 5 tasks, +25 LP for a boss kill.

describe("rankFromLp", () => {
  it("starts at Iron IV 0 LP", () => {
    expect(rankFromLp(0)).toEqual({ tier: "iron", division: 4, lp: 0 });
  });

  it("moves up one division every 100 LP", () => {
    expect(rankFromLp(99)).toEqual({ tier: "iron", division: 4, lp: 99 });
    expect(rankFromLp(100)).toEqual({ tier: "iron", division: 3, lp: 0 });
    expect(rankFromLp(399)).toEqual({ tier: "iron", division: 1, lp: 99 });
    expect(rankFromLp(400)).toEqual({ tier: "bronze", division: 4, lp: 0 });
    expect(rankFromLp(1264)).toEqual({ tier: "gold", division: 4, lp: 64 });
    expect(rankFromLp(1564)).toEqual({ tier: "gold", division: 1, lp: 64 });
    expect(rankFromLp(2799)).toEqual({ tier: "diamond", division: 1, lp: 99 });
  });

  it("shows LP above Master in the apex tiers", () => {
    expect(rankFromLp(2800)).toEqual({ tier: "master", division: null, lp: 0 });
    expect(rankFromLp(3199)).toEqual({ tier: "master", division: null, lp: 399 });
    expect(rankFromLp(3200)).toEqual({ tier: "grandmaster", division: null, lp: 400 });
    expect(rankFromLp(3600)).toEqual({ tier: "challenger", division: null, lp: 800 });
    expect(rankFromLp(9000)).toEqual({ tier: "challenger", division: null, lp: 6200 });
  });

  it("treats negative and fractional totals safely", () => {
    expect(rankFromLp(-50)).toEqual({ tier: "iron", division: 4, lp: 0 });
    expect(rankFromLp(150.9)).toEqual({ tier: "iron", division: 3, lp: 50 });
    expect(() => rankFromLp(Number.NaN)).toThrow();
  });
});

describe("rankOrder", () => {
  it("orders every rank from Iron IV to Challenger", () => {
    expect(rankOrder({ tier: "iron", division: 4 })).toBe(0);
    expect(rankOrder({ tier: "iron", division: 1 })).toBe(3);
    expect(rankOrder({ tier: "bronze", division: 4 })).toBe(4);
    expect(rankOrder({ tier: "diamond", division: 1 })).toBe(27);
    expect(rankOrder({ tier: "master", division: null })).toBe(28);
    expect(rankOrder({ tier: "grandmaster", division: null })).toBe(29);
    expect(rankOrder({ tier: "challenger", division: null })).toBe(30);
  });

  it("matches rankFromLp at every division start", () => {
    for (let step = 0; step < 28; step++) {
      expect(rankOrder(rankFromLp(step * 100))).toBe(step);
    }
  });
});

describe("nextRank", () => {
  it("is the next division inside the normal tiers, and the next tier after division I", () => {
    expect(nextRank(1264)).toEqual({
      rank: { tier: "gold", division: 3 },
      lpNeeded: 36,
      progress: 64,
      stepSize: 100,
    });
    expect(nextRank(1564)?.rank).toEqual({ tier: "platinum", division: 4 });
  });

  it("goes from Diamond I to Master, then up the apex tiers", () => {
    expect(nextRank(2750)?.rank).toEqual({ tier: "master", division: null });
    expect(nextRank(2900)).toEqual({
      rank: { tier: "grandmaster", division: null },
      lpNeeded: 300,
      progress: 100,
      stepSize: 400,
    });
    expect(nextRank(3500)?.rank).toEqual({ tier: "challenger", division: null });
  });

  it("is null at Challenger", () => {
    expect(nextRank(3600)).toBeNull();
  });
});

describe("weeklyLpChange", () => {
  it("gives LP per task and the boss bonus", () => {
    expect(weeklyLpChange({ completedTasks: 6, bossDefeated: true })).toEqual({
      fromTasks: 60,
      lowActivityPenalty: 0,
      bossBonus: 25,
      total: 85,
    });
  });

  it("takes LP for fewer than 5 tasks, even with a boss kill", () => {
    expect(weeklyLpChange({ completedTasks: 4, bossDefeated: true }).total).toBe(40 - 20 + 25);
    expect(weeklyLpChange({ completedTasks: 5, bossDefeated: false }).total).toBe(50);
  });

  it("loses LP for a week with nothing done", () => {
    expect(weeklyLpChange({ completedTasks: 0, bossDefeated: false })).toEqual({
      fromTasks: 0,
      lowActivityPenalty: -20,
      bossBonus: 0,
      total: -20,
    });
  });
});

describe("applyLpChange", () => {
  it("adds and subtracts LP", () => {
    expect(applyLpChange(120, 85)).toBe(205);
    expect(applyLpChange(120, -20)).toBe(100);
  });

  it("never goes below 0", () => {
    expect(applyLpChange(10, -20)).toBe(0);
  });
});

describe("rankChange", () => {
  it("detects promotion and demotion across divisions", () => {
    expect(rankChange(90, 110)).toBe("promoted");
    expect(rankChange(110, 90)).toBe("demoted");
    expect(rankChange(2790, 2810)).toBe("promoted");
  });

  it("stays the same inside a division and at the 0 LP floor", () => {
    expect(rankChange(120, 180)).toBe("same");
    expect(rankChange(0, 0)).toBe("same");
    expect(rankChange(2900, 3100)).toBe("same");
  });
});
