// All game numbers in one place. Rules live in CLAUDE.md ("Game rules"); change them there first.
// Values marked PLACEHOLDER are not decided yet; don't build final balance on them.

/** Every week boundary is computed in this time zone (Monday 00:00 -> Sunday 23:59). */
export const TIMEZONE = "Europe/Belgrade";

/** Players in the group. */
export const PLAYERS = 5;

/** Legit votes from the other players needed to approve a proof. */
export const PROOF_APPROVALS_NEEDED = 2;

/** Completing fewer tasks than this in a week costs LP. */
export const MIN_TASKS_PER_WEEK = 5;

/** PLACEHOLDER ("+X" in CLAUDE.md): LP for each completed task. */
export const LP_PER_TASK = 10;

/** PLACEHOLDER ("-Y" in CLAUDE.md): LP lost for fewer than MIN_TASKS_PER_WEEK completed tasks. */
export const LP_PENALTY_LOW_ACTIVITY = 20;

/** PLACEHOLDER: LP bonus for every player when the boss dies. */
export const LP_BOSS_KILL_BONUS = 25;
