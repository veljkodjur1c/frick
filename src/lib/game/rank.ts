// LP and rank (Iron IV -> Challenger). Pure functions, no DB or UI imports.
// A player's total LP lives in profiles.lp (never below 0); the rank is always derived from it.

import {
  CHALLENGER_LP,
  GRANDMASTER_LP,
  LP_BOSS_KILL_BONUS,
  LP_PENALTY_LOW_ACTIVITY,
  LP_PER_DIVISION,
  LP_PER_TASK,
  MASTER_LP,
  MIN_TASKS_PER_WEEK,
} from "./config";

/** Tiers from lowest to highest. */
export const RANK_TIERS = [
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
] as const;

export type RankTier = (typeof RANK_TIERS)[number];

/** 4 is the lowest (IV), 1 the highest (I). Only tiers below Master have divisions. */
export type RankDivision = 1 | 2 | 3 | 4;

export type Rank = {
  tier: RankTier;
  /** Null for Master, Grandmaster and Challenger. */
  division: RankDivision | null;
  /**
   * LP shown next to the rank: 0..LP_PER_DIVISION-1 inside a division,
   * and the LP above MASTER_LP in the apex tiers (like the League client).
   */
  lp: number;
};

const DIVISION_TIERS = RANK_TIERS.slice(0, RANK_TIERS.indexOf("master"));
const DIVISIONS_PER_TIER = 4;

/** Total LP must be a whole number; negative totals count as 0. */
function normalizeLp(totalLp: number): number {
  if (!Number.isFinite(totalLp)) throw new Error(`Invalid LP total: ${totalLp}`);
  return Math.max(0, Math.floor(totalLp));
}

/** The rank for a total LP: 0 = Iron IV 0 LP, each LP_PER_DIVISION LP is one division up. */
export function rankFromLp(totalLp: number): Rank {
  const lp = normalizeLp(totalLp);

  if (lp >= CHALLENGER_LP) return { tier: "challenger", division: null, lp: lp - MASTER_LP };
  if (lp >= GRANDMASTER_LP) return { tier: "grandmaster", division: null, lp: lp - MASTER_LP };
  if (lp >= MASTER_LP) return { tier: "master", division: null, lp: lp - MASTER_LP };

  const step = Math.floor(lp / LP_PER_DIVISION);
  const tier = DIVISION_TIERS[Math.floor(step / DIVISIONS_PER_TIER)];
  const division = (DIVISIONS_PER_TIER - (step % DIVISIONS_PER_TIER)) as RankDivision;
  return { tier, division, lp: lp % LP_PER_DIVISION };
}

/** Position of a rank from Iron IV (0) up to Challenger; higher is better. */
export function rankOrder(rank: Pick<Rank, "tier" | "division">): number {
  const tierIndex = RANK_TIERS.indexOf(rank.tier);
  if (rank.division === null) return DIVISION_TIERS.length * DIVISIONS_PER_TIER + (tierIndex - DIVISION_TIERS.length);
  return tierIndex * DIVISIONS_PER_TIER + (DIVISIONS_PER_TIER - rank.division);
}

export type NextRank = {
  rank: Pick<Rank, "tier" | "division">;
  /** LP still needed to reach it. */
  lpNeeded: number;
  /** LP already earned inside the current step, and the step's size: for a "LP to next division" bar. */
  progress: number;
  stepSize: number;
};

/** The next rank up and how far away it is, or null at Challenger. */
export function nextRank(totalLp: number): NextRank | null {
  const lp = normalizeLp(totalLp);
  if (lp >= CHALLENGER_LP) return null;

  let from: number;
  let to: number;
  if (lp >= GRANDMASTER_LP) [from, to] = [GRANDMASTER_LP, CHALLENGER_LP];
  else if (lp >= MASTER_LP) [from, to] = [MASTER_LP, GRANDMASTER_LP];
  else {
    from = lp - (lp % LP_PER_DIVISION);
    to = from + LP_PER_DIVISION;
  }

  const { tier, division } = rankFromLp(to);
  return { rank: { tier, division }, lpNeeded: to - lp, progress: lp - from, stepSize: to - from };
}

export type WeeklyLpInput = {
  /** Different tasks the player got approved this week (completedCount() in points.ts). */
  completedTasks: number;
  bossDefeated: boolean;
};

export type WeeklyLp = {
  fromTasks: number;
  /** 0 or a negative number. */
  lowActivityPenalty: number;
  bossBonus: number;
  total: number;
};

/** One player's LP change for a finished week, with the parts shown separately. */
export function weeklyLpChange({ completedTasks, bossDefeated }: WeeklyLpInput): WeeklyLp {
  const fromTasks = Math.max(0, completedTasks) * LP_PER_TASK;
  const lowActivityPenalty = completedTasks < MIN_TASKS_PER_WEEK ? -LP_PENALTY_LOW_ACTIVITY : 0;
  const bossBonus = bossDefeated ? LP_BOSS_KILL_BONUS : 0;
  return { fromTasks, lowActivityPenalty, bossBonus, total: fromTasks + lowActivityPenalty + bossBonus };
}

/** New total LP after a change. Never goes below 0 (Iron IV 0 LP is the floor). */
export function applyLpChange(totalLp: number, change: number): number {
  return Math.max(0, normalizeLp(totalLp) + Math.trunc(change));
}

/** Whether a player moved up a rank, down a rank, or stayed (LP inside the division can still change). */
export function rankChange(lpBefore: number, lpAfter: number): "promoted" | "demoted" | "same" {
  const before = rankOrder(rankFromLp(lpBefore));
  const after = rankOrder(rankFromLp(lpAfter));
  if (after > before) return "promoted";
  if (after < before) return "demoted";
  return "same";
}
