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

/** PLACEHOLDER: champ select opens on Sunday at this hour (Belgrade time) and runs until the week starts at midnight. */
export const CHAMP_SELECT_OPENS_HOUR = 18;

/** PLACEHOLDER: "Za" votes a proposed task needs to become a task next week (a majority of the 5 players). */
export const PROPOSAL_APPROVALS_NEEDED = 3;

/** PLACEHOLDER: points a proposed task may have. */
export const PROPOSAL_MIN_POINTS = 5;
export const PROPOSAL_MAX_POINTS = 100;

/** PLACEHOLDER: HP of every weekly boss. Issue #17 ("later") makes it grow week by week. */
export const BOSS_HP = 500;

/**
 * Weekly bosses, in order; the list repeats. `image` is an object in the public boss-images bucket
 * (null shows the boss without art). The first week of the game, BOSS_ROTATION_START, gets the first one.
 */
export const BOSS_ROTATION: ReadonlyArray<{ name: string; image: string | null }> = [
  { name: "Baron Nashor", image: "baron-nashor.jpg" },
  { name: "Elder Dragon", image: null },
  { name: "Rift Herald", image: null },
  { name: "Atakhan", image: null },
];
export const BOSS_ROTATION_START = "2026-10-12";

/** Monster can rarities and the chance of each when a can is rolled; split evenly between the flavors of a rarity. */
export const CAN_RARITY_CHANCE = { common: 0.5, rare: 0.35, legendary: 0.15 } as const;

/** Bad-luck protection: after this many duplicates in a row the next can is a flavor the player doesn't have. */
export const CAN_PITY_DUPLICATES = 3;

/** Duplicates spent to craft one new can. */
export const CAN_CRAFT_COST = 3;
