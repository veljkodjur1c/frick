import "server-only";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DISPLAY_NAME_MAX } from "./displayName";

export type MyProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  /** Total LP; the rank comes from it (rankFromLp). */
  lp: number;
};

const PROFILE_COLUMNS = "id, display_name, avatar_url, lp";

async function readProfile(userId: string): Promise<MyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<MyProfile>();
  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }
  return data;
}

/**
 * One player's row from profiles, or null if it doesn't exist.
 * Runs once per request per user, so the top bar and /profile share it.
 */
export const getProfile = cache(readProfile);

/**
 * Creates the profile row for a user who has none. Normally the handle_new_user trigger does this on
 * sign-up; this covers accounts made before the trigger existed. Same name fallback as the trigger.
 */
async function createMissingProfile(user: User): Promise<MyProfile> {
  const metadataName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
  const fallback = metadataName.trim() || user.email?.split("@")[0] || "player";
  const displayName = [...fallback].slice(0, DISPLAY_NAME_MAX).join("");

  const supabase = await createClient();
  // ignoreDuplicates: if the row appeared in the meantime, keep it instead of failing.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName }, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    throw new Error(`Could not create profile: ${error.message}`);
  }

  const profile = await readProfile(user.id);
  if (!profile) {
    throw new Error("Profile is still missing after creating it");
  }
  return profile;
}

/**
 * The logged-in user's own row from profiles, created if it's missing. Redirects to /login when logged out.
 * Reads cookies, so call it inside a <Suspense> boundary.
 */
export async function getMyProfile(): Promise<MyProfile> {
  const user = await requireUser();
  return (await getProfile(user.id)) ?? createMissingProfile(user);
}
