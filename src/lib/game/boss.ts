// Weekly boss damage. Pure functions, no DB or UI imports.
// Rule (CLAUDE.md): approved points are damage; the boss dies if total damage >= HP at week end.

import { dayOfWeek } from "./week";

export type CompletionStatus = "pending" | "approved" | "rejected";

/** One completed task, reduced to what matters for damage. */
export type DamageCompletion = {
  userId: string;
  points: number;
  status: CompletionStatus;
};

export type DamageSummary = {
  /** Approved points: the damage the boss has taken. */
  damage: number;
  /** Points on proofs still waiting for votes. Not damage yet. */
  pendingDamage: number;
  /** Approved points per player id. Players without approved points are missing. */
  byPlayer: Record<string, number>;
};

export function summarizeDamage(completions: DamageCompletion[]): DamageSummary {
  const summary: DamageSummary = { damage: 0, pendingDamage: 0, byPlayer: {} };

  for (const { userId, points, status } of completions) {
    if (status === "approved") {
      summary.damage += points;
      summary.byPlayer[userId] = (summary.byPlayer[userId] ?? 0) + points;
    } else if (status === "pending") {
      summary.pendingDamage += points;
    }
  }

  return summary;
}

export function isBossDefeated(hp: number, damage: number): boolean {
  return damage >= hp;
}

/** Full days left after today in the Belgrade week: Monday 6 ... Sunday 0. */
export function daysLeftInWeek(now: Date = new Date()): number {
  return 7 - dayOfWeek(now);
}
