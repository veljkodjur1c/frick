import "server-only";
import { cache } from "react";
import { categoryTitles, titlesOf, type CategoryTitle, type TaskCategory } from "@/lib/game/titles";
import { createClient } from "@/lib/supabase/server";

type CountRow = { user_id: string; category: TaskCategory; count: number };

/**
 * Who holds which category title right now. Reads the category_counts view (one row per player and category),
 * once per request, so the feed and the profile share it.
 */
export const getCategoryTitles = cache(async (): Promise<CategoryTitle[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_counts")
    .select("user_id, category, count")
    .overrideTypes<CountRow[], { merge: false }>();
  if (error) throw error;
  return categoryTitles(data.map((row) => ({ userId: row.user_id, category: row.category, count: row.count })));
});

export type PlayerTitle = {
  category: TaskCategory;
  /** Approved tasks of the category. */
  count: number;
  /** Other players who share the title (a tie), by display name. */
  sharedWith: string[];
};

/** The titles one player holds, strongest first, with the names of anyone they share a title with. */
export async function getPlayerTitles(userId: string): Promise<PlayerTitle[]> {
  const titles = titlesOf(userId, await getCategoryTitles());
  const otherIds = [...new Set(titles.flatMap((title) => title.holderIds.filter((id) => id !== userId)))];

  let names = new Map<string, string>();
  if (otherIds.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", otherIds)
      .overrideTypes<Array<{ id: string; display_name: string }>, { merge: false }>();
    // Only the "deliš sa" line needs the names; the titles still show without them.
    if (error) console.error("getPlayerTitles: reading names failed", error);
    names = new Map((data ?? []).map((row) => [row.id, row.display_name]));
  }

  return titles.map((title) => ({
    category: title.category,
    count: title.count,
    sharedWith: title.holderIds.flatMap((id) => {
      const name = id === userId ? undefined : names.get(id);
      return name ? [name] : [];
    }),
  }));
}
