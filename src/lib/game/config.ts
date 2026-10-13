// All game numbers in one place. Rules live in CLAUDE.md ("Game rules"); change them there first.
// Values marked PLACEHOLDER are not decided yet; don't build final balance on them.

/** Every week boundary is computed in this time zone (Monday 00:00 -> Sunday 23:59). */
export const TIMEZONE = "Europe/Belgrade";

/** Players in the group. */
export const PLAYERS = 5;

/** Legit votes from the other players needed to approve a proof. */
export const PROOF_APPROVALS_NEEDED = 2;

/** Cap votes that reject a proof: a majority of the other PLAYERS - 1 players. */
export const PROOF_REJECTIONS_NEEDED = Math.floor((PLAYERS - 1) / 2) + 1;

/** Completing fewer tasks than this in a week costs LP. */
export const MIN_TASKS_PER_WEEK = 5;

/** PLACEHOLDER: LP in one division (Iron IV -> Iron III, ...). Iron IV starts at 0 LP. */
export const LP_PER_DIVISION = 100;

/**
 * PLACEHOLDER: total LP where the apex tiers start. Diamond I ends at 7 tiers x 4 divisions x LP_PER_DIVISION
 * = 2800, so Master starts there.
 */
export const MASTER_LP = 2800;
export const GRANDMASTER_LP = 3200;
export const CHALLENGER_LP = 3600;

/** PLACEHOLDER ("+X" in CLAUDE.md): LP for each completed task. */
export const LP_PER_TASK = 10;

/** PLACEHOLDER ("-Y" in CLAUDE.md): LP lost for fewer than MIN_TASKS_PER_WEEK completed tasks. */
export const LP_PENALTY_LOW_ACTIVITY = 20;

/** PLACEHOLDER: LP bonus for every player when the boss dies. */
export const LP_BOSS_KILL_BONUS = 25;
