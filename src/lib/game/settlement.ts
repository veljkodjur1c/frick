// Weekly settlement: what happens when a week ends. Pure functions, no DB or UI imports.
// Rules (CLAUDE.md): proofs still pending at week end are accepted, the boss dies if the team's approved points
// reach its HP, every player's LP changes (rank.ts), MVP has the most points and "Feeder of the week" the fewest,
// and on a boss kill every player gets a Monster can (cans.ts).

import { isBossDefeated } from "./boss";
import { BOSS_HP, BOSS_ROTATION, BOSS_ROTATION_START } from "./config";
import { nextCanFlavor } from "./cans";
import type { CompletionStatus } from "./points";
import { applyLpChange, rankChange, weeklyLpChange, type WeeklyLp } from "./rank";
import { weeksBetween } from "./week";

export type SettlementTask = {
  id: string;
  points: number;
  /** Set for solo tasks: the only player who has it. Null for team tasks (everyone has them). */
  assigneeId: string | null;
};

export type SettlementInput = {
  bossHp: number;
  players: ReadonlyArray<{ id: string; lp: number; earnedFlavors: readonly string[] }>;
  tasks: readonly SettlementTask[];
  completions: ReadonlyArray<{ taskId: string; userId: string; status: CompletionStatus }>;
};

export type PlayerResult = {
  id: string;
  /** Approved points this week, pending proofs counted as accepted. */
  points: number;
  /** Different tasks the player got approved. */
  completedTasks: number;
  lp: WeeklyLp;
  lpBefore: number;
  lpAfter: number;
  rankChange: "promoted" | "demoted" | "same";
};

export type Award = { kind: "mvp" | "feeder"; userId: string; points: number };

export type Settlement = {
  damage: number;
  bossDefeated: boolean;
  players: PlayerResult[];
  awards: Award[];
  /** One can per player, only when the boss died. */
  cans: Array<{ userId: string; flavor: string }>;
};

/** At week end a proof still waiting for votes counts as accepted; rejected ones stay rejected. */
function finalStatus(status: CompletionStatus): CompletionStatus {
  return status === "pending" ? "approved" : status;
}

/**
 * MVP: the most points; Feeder of the week: the fewest. Ties give the award to everyone tied.
 * No awards when everyone has the same points (including a week where nobody did anything).
 */
export function weeklyAwards(players: ReadonlyArray<{ id: string; points: number }>): Award[] {
  if (players.length === 0) return [];
  const most = Math.max(...players.map((p) => p.points));
  const fewest = Math.min(...players.map((p) => p.points));
  if (most === fewest) return [];

  return [
    ...players.filter((p) => p.points === most).map((p) => ({ kind: "mvp" as const, userId: p.id, points: p.points })),
    ...players
      .filter((p) => p.points === fewest)
      .map((p) => ({ kind: "feeder" as const, userId: p.id, points: p.points })),
  ];
}

/** Everything the week's end changes, computed from the week's tasks, completions and the players. */
export function settleWeek({ bossHp, players, tasks, completions }: SettlementInput): Settlement {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const approvedByPlayer = new Map<string, Set<string>>();

  for (const completion of completions) {
    const task = taskById.get(completion.taskId);
    // Only completions of this week's tasks, by a player who has the task.
    if (!task || (task.assigneeId !== null && task.assigneeId !== completion.userId)) continue;
    if (finalStatus(completion.status) !== "approved") continue;
    const done = approvedByPlayer.get(completion.userId) ?? new Set<string>();
    done.add(task.id);
    approvedByPlayer.set(completion.userId, done);
  }

  const pointsOf = (playerId: string) =>
    [...(approvedByPlayer.get(playerId) ?? [])].reduce((sum, taskId) => sum + (taskById.get(taskId)?.points ?? 0), 0);

  // Damage counts every approved completion, including players who are no longer in `players`.
  const damage = [...approvedByPlayer.keys()].reduce((sum, playerId) => sum + pointsOf(playerId), 0);
  const bossDefeated = isBossDefeated(bossHp, damage);

  const results = players.map((player): PlayerResult => {
    const completedTasks = approvedByPlayer.get(player.id)?.size ?? 0;
    const lp = weeklyLpChange({ completedTasks, bossDefeated });
    const lpAfter = applyLpChange(player.lp, lp.total);
    return {
      id: player.id,
      points: pointsOf(player.id),
      completedTasks,
      lp,
      lpBefore: player.lp,
      lpAfter,
      rankChange: rankChange(player.lp, lpAfter),
    };
  });

  return {
    damage,
    bossDefeated,
    players: results,
    awards: weeklyAwards(results),
    cans: bossDefeated
      ? players.map((player) => ({ userId: player.id, flavor: nextCanFlavor(player.earnedFlavors).id }))
      : [],
  };
}

/** The boss for the week starting `startsOn`: BOSS_ROTATION in order from BOSS_ROTATION_START, repeating. */
export function bossForWeek(startsOn: string): { name: string; hp: number; image: string | null } {
  const index = weeksBetween(BOSS_ROTATION_START, startsOn);
  const boss = BOSS_ROTATION[((index % BOSS_ROTATION.length) + BOSS_ROTATION.length) % BOSS_ROTATION.length];
  return { name: boss.name, hp: BOSS_HP, image: boss.image };
}
