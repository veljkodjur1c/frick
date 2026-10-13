import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile } from "./queries";

/** The player's avatar in the top bar, linking to /profile. Renders nothing when logged out (e.g. on /login). */
export async function ProfileAvatarLink() {
  // Session reads use Date.now() (token expiry), which can't be prerendered. Wait for a real request first.
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  // The top bar is on every page, so a failed profile read shows initials instead of breaking the page.
  const profile = await getProfile(user.id).catch((error: unknown) => {
    console.error(error);
    return null;
  });
  const name = profile?.display_name ?? user.email ?? "?";

  return (
    <Link href="/profile" aria-label="Profil" className="flex size-11 items-center justify-center rounded-full">
      <Avatar name={name} src={profile?.avatar_url} size="md" />
    </Link>
  );
}
