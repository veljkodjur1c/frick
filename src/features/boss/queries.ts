import "server-only";
import type { DamageCompletion } from "@/lib/game/boss";
import { currentWeekStart } from "@/lib/game/week";
import { createClient } from "@/lib/supabase/server";

export type BossPageData = {
  boss: { id: string; name: string; hp: number; imageUrl: string | null };
  completions: DamageCompletion[];
  players: Array<{ id: string; displayName: string; avatarUrl: string | null }>;
};

type WeekRow = {
  id: string;
  boss: { id: string; name: string; hp: number; image_url: string | null } | null;
};

type CompletionRow = {
  user_id: string;
  status: DamageCompletion["status"];
  task: { points: number };
};

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };

/** This week's boss with every completion and player, or null if the week or boss doesn't exist yet. */
export async function getCurrentBoss(): Promise<BossPageData | null> {
  const supabase = await createClient();

  const { data: week, error } = await supabase
    .from("weeks")
    .select("id, boss:bosses(id, name, hp, image_url)")
    .eq("starts_on", currentWeekStart())
    .maybeSingle()
    .overrideTypes<WeekRow, { merge: false }>();
  if (error) throw error;
  if (!week?.boss) return null;

  const [completions, profiles] = await Promise.all([
    supabase
      .from("completions")
      .select("user_id, status, task:tasks!inner(points)")
      .eq("task.week_id", week.id)
      .overrideTypes<CompletionRow[], { merge: false }>(),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .order("created_at")
      .overrideTypes<ProfileRow[], { merge: false }>(),
  ]);
  if (completions.error) throw completions.error;
  if (profiles.error) throw profiles.error;

  const { boss } = week;
  return {
    boss: { id: boss.id, name: boss.name, hp: boss.hp, imageUrl: boss.image_url },
    completions: completions.data.map((row) => ({
      userId: row.user_id,
      points: row.task.points,
      status: row.status,
    })),
    players: profiles.data.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    })),
  };
}
