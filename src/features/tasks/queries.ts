import "server-only";
import { currentWeekStart } from "@/lib/game/week";
import type { CompletionStatus } from "@/lib/game/points";
import type { TaskCategory } from "@/lib/game/titles";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

// Enum values from supabase/migrations/20261012202823_initial_schema.sql.
export type WeekStatus = "champ_select" | "active" | "finished";
export type TaskType = "check" | "proof";
export type TaskScope = "team" | "solo";

export type TaskData = {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  scope: TaskScope;
  points: number;
  /** Null for tasks made before categories existed; they count toward no title. */
  category: TaskCategory | null;
  /** Status of the viewer's own completion, or null if they haven't done it. */
  myStatus: CompletionStatus | null;
};

export type CurrentWeekTasks =
  | { state: "none" }
  | { state: "inactive"; status: Exclude<WeekStatus, "active"> }
  | { state: "active"; tasks: TaskData[] };

type WeekRow = { id: string; status: WeekStatus };

type TaskRow = Omit<TaskData, "myStatus"> & {
  /** Only the viewer's completion (filtered in the query); unique (task_id, user_id) makes it 0 or 1 rows. */
  completions: Array<{ status: CompletionStatus }>;
};

/**
 * The viewer's tasks for the current Belgrade week: all team tasks plus solo tasks assigned to them,
 * each with the viewer's own completion status. Other players' solo tasks are left out.
 * Reads the session, so the caller must sit inside a <Suspense> boundary.
 */
export async function getCurrentWeekTasks(): Promise<CurrentWeekTasks> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .select("id, status")
    .eq("starts_on", currentWeekStart())
    .maybeSingle<WeekRow>();
  if (weekError) throw weekError;
  if (!week) return { state: "none" };
  if (week.status !== "active") return { state: "inactive", status: week.status };

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, type, scope, points, category, completions(status)")
    .eq("week_id", week.id)
    .or(`scope.eq.team,assignee_id.eq.${user.id}`)
    .eq("completions.user_id", user.id)
    // Enum order: team before solo.
    .order("scope")
    .order("created_at")
    .overrideTypes<TaskRow[], { merge: false }>();
  if (error) throw error;

  const tasks = data.map(({ completions, ...task }) => ({ ...task, myStatus: completions[0]?.status ?? null }));
  return { state: "active", tasks };
}
