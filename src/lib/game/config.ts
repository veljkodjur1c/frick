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

/** PLACEHOLDER ("+X" in CLAUDE.md): LP for each completed task. */
export const LP_PER_TASK = 10;

/** PLACEHOLDER ("-Y" in CLAUDE.md): LP lost for fewer than MIN_TASKS_PER_WEEK completed tasks. */
export const LP_PENALTY_LOW_ACTIVITY = 20;

/** PLACEHOLDER: LP bonus for every player when the boss dies. */
export const LP_BOSS_KILL_BONUS = 25;

/** PLACEHOLDER: champ select opens on Sunday at this hour (Belgrade time) and runs until the week starts at midnight. */
export const CHAMP_SELECT_OPENS_HOUR = 18;

/** PLACEHOLDER: "Za" votes a proposed task needs to become a task next week (a majority of the 5 players). */
export const PROPOSAL_APPROVALS_NEEDED = 3;

/** PLACEHOLDER: points a proposed task may have. */
export const PROPOSAL_MIN_POINTS = 5;
export const PROPOSAL_MAX_POINTS = 100;
