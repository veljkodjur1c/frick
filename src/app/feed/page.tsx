import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { FeedList, FeedListSkeleton } from "@/features/feed/FeedList";
import { NewPostSheet } from "@/features/feed/NewPostSheet";
import { getCurrentUser } from "@/lib/supabase/auth";

export default function FeedPage() {
  return (
    <>
      <PageHeader
        title="Feed"
        action={
          <Suspense fallback={null}>
            <NewPostAction />
          </Suspense>
        }
      />
      <Suspense fallback={<FeedListSkeleton />}>
        <FeedList />
      </Suspense>
    </>
  );
}

/** Only logged-in players can post. */
async function NewPostAction() {
  const user = await getCurrentUser();
  return user ? <NewPostSheet userId={user.id} /> : null;
}
