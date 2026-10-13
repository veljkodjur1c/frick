import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Divider, PageHeader, Skeleton } from "@/components/ui";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { getMyProfile } from "@/features/profile/queries";
import { requireUser } from "@/lib/supabase/auth";

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profil" />
      {/* Reads the session (cookies), so with Cache Components it streams in behind a boundary. */}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileCard />
      </Suspense>
    </>
  );
}

async function ProfileCard() {
  // Session reads use Date.now() (token expiry), which can't be prerendered. Wait for a real request first.
  await connection();
  const user = await requireUser();
  const profile = await getMyProfile();

  return (
    <Card className="flex flex-col gap-3">
      <ProfileForm userId={user.id} displayName={profile.display_name} avatarUrl={profile.avatar_url} />
      <Divider />
      <SignOutButton />
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20" rounded="full" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-[4.5rem] w-full" />
      <Skeleton className="h-11 w-full" />
    </Card>
  );
}
