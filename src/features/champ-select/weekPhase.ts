import "server-only";
import { cache } from "react";
import { PROPOSAL_APPROVALS_NEEDED } from "@/lib/game/config";
import { champSelectWeekStart, isChampSelectOpen } from "@/lib/game/champSelect";
import { currentWeekStart } from "@/lib/game/week";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";

/**
 * Moves the weeks along with the clock, so nothing depends on a cron job firing on time:
 *   * Sunday from CHAMP_SELECT_OPENS_HOUR: creates next week's row in champ select (proposals open).
 *   * From Monday 00:00: activates any champ select week that has started (proposals -> tasks).
 * Pages that show week data call it before reading. Every step is idempotent, so calling it on
 * every visit is fine; it runs once per request.
 * Finishing the old week (boss result, LP, awards) and the new boss belong to the weekly job (issue #12).
 */
export const syncWeekPhase = cache(async (): Promise<void> => {
  // Writes system tables with the service role, so only for a logged-in member.
  await requireUser();
  const now = new Date();
  const admin = createAdminClient();

  const { data: started, error } = await admin
    .from("weeks")
    .select("id")
    .eq("status", "champ_select")
    .lte("starts_on", currentWeekStart(now));
  if (error) throw error;

  for (const week of started) {
    const { error: activateError } = await admin.rpc("activate_week", {
      p_week_id: week.id,
      p_approvals_needed: PROPOSAL_APPROVALS_NEEDED,
    });
    if (activateError) throw activateError;
  }

  if (isChampSelectOpen(now)) {
    const { error: openError } = await admin
      .from("weeks")
      .upsert(
        { starts_on: champSelectWeekStart(now), status: "champ_select" },
        { onConflict: "starts_on", ignoreDuplicates: true },
      );
    if (openError) throw openError;
  }
});
