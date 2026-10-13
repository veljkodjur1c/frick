import { syncWeekPhase } from "./weekPhase";

/**
 * Runs syncWeekPhase() on every page (it sits in AppShell), so the week is settled and the new boss
 * appears whichever page someone opens first. Renders nothing. A failure is logged, not shown:
 * the page still works and the next visit tries again.
 */
export async function WeekSync() {
  try {
    await syncWeekPhase();
  } catch (error) {
    console.error("syncWeekPhase failed", error);
  }
  return null;
}
