import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EarnedCan = {
  id: string;
  /** Flavor id from src/lib/game/cans.ts. */
  flavor: string;
  earnedAt: string;
  /** Name of the boss whose kill earned it. */
  bossName: string | null;
};

export type ShelfPlayer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  /** Newest first. */
  cans: EarnedCan[];
};

type CanRow = {
  id: string;
  user_id: string;
  flavor: string;
  earned_at: string;
  boss: { name: string } | null;
};

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };

/** Every player with the cans they have earned. Reads the session (RLS: any logged-in member). */
export async function getShelves(): Promise<ShelfPlayer[]> {
  const supabase = await createClient();

  const [cans, profiles] = await Promise.all([
    supabase
      .from("cans")
      .select("id, user_id, flavor, earned_at, boss:bosses(name)")
      .order("earned_at", { ascending: false })
      .overrideTypes<CanRow[], { merge: false }>(),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .order("created_at")
      .overrideTypes<ProfileRow[], { merge: false }>(),
  ]);
  if (cans.error) throw cans.error;
  if (profiles.error) throw profiles.error;

  return profiles.data.map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    cans: cans.data
      .filter((can) => can.user_id === profile.id)
      .map((can) => ({ id: can.id, flavor: can.flavor, earnedAt: can.earned_at, bossName: can.boss?.name ?? null })),
  }));
}
