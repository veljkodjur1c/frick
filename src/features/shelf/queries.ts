import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CanSource = "boss" | "mvp" | "craft";

export type EarnedCan = {
  id: string;
  /** Flavor id from src/lib/game/cans.ts. */
  flavor: string;
  earnedAt: string;
  source: CanSource;
  /** Name of the boss whose kill earned it; null for crafted cans. */
  bossName: string | null;
};

export type ShelfPlayer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  /** Cans on the shelf (not spent on crafting), newest first. */
  cans: EarnedCan[];
  /** Every can the player ever got, spent ones too, oldest first (for "Kolekcionar"). */
  history: Array<{ flavor: string; earnedAt: string }>;
};

type CanRow = {
  id: string;
  user_id: string;
  flavor: string;
  earned_at: string;
  source: CanSource;
  spent_in: string | null;
  boss: { name: string } | null;
};

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };

/** Every player with their cans. Reads the session (RLS: any logged-in member). */
export async function getShelves(): Promise<ShelfPlayer[]> {
  const supabase = await createClient();

  const [cans, profiles] = await Promise.all([
    supabase
      .from("cans")
      .select("id, user_id, flavor, earned_at, source, spent_in, boss:bosses(name)")
      .order("earned_at")
      .order("id")
      .overrideTypes<CanRow[], { merge: false }>(),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .order("created_at")
      .overrideTypes<ProfileRow[], { merge: false }>(),
  ]);
  if (cans.error) throw cans.error;
  if (profiles.error) throw profiles.error;

  return profiles.data.map((profile) => {
    const own = cans.data.filter((can) => can.user_id === profile.id);
    return {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      cans: own
        .filter((can) => can.spent_in === null)
        .reverse()
        .map((can) => ({
          id: can.id,
          flavor: can.flavor,
          earnedAt: can.earned_at,
          source: can.source,
          bossName: can.boss?.name ?? null,
        })),
      history: own.map((can) => ({ flavor: can.flavor, earnedAt: can.earned_at })),
    };
  });
}
