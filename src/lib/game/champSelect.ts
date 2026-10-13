// Champ select: proposing and voting on next week's tasks on Sunday evening. Pure functions, no DB or UI imports.
// The database applies the same approval rule when the week starts (activate_week() in
// supabase/migrations/20261013170000_activate_week.sql gets PROPOSAL_APPROVALS_NEEDED as an argument).

import {
  CHAMP_SELECT_OPENS_HOUR,
  PROPOSAL_APPROVALS_NEEDED,
  PROPOSAL_MAX_POINTS,
  PROPOSAL_MIN_POINTS,
} from "./config";
import { currentWeekStart, dayOfWeek, hourOf, nextWeekStart } from "./week";

/** True from Sunday CHAMP_SELECT_OPENS_HOUR:00 until the new week starts at Monday 00:00 (Belgrade). */
export function isChampSelectOpen(now: Date): boolean {
  return dayOfWeek(now) === 7 && hourOf(now) >= CHAMP_SELECT_OPENS_HOUR;
}

/** The week that champ select at `now` picks tasks for: the one starting next Monday. */
export function champSelectWeekStart(now: Date): string {
  return nextWeekStart(currentWeekStart(now));
}

/** A proposal becomes a task if enough players voted "Za". */
export function isProposalApproved(approveVotes: number): boolean {
  return approveVotes >= PROPOSAL_APPROVALS_NEEDED;
}

/** Whole points within PROPOSAL_MIN_POINTS..PROPOSAL_MAX_POINTS. */
export function isValidProposalPoints(points: number): boolean {
  return Number.isInteger(points) && points >= PROPOSAL_MIN_POINTS && points <= PROPOSAL_MAX_POINTS;
}
