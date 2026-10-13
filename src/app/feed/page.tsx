import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { FeedList, FeedListSkeleton } from "@/features/feed/FeedList";
import { NewPostSheet } from "@/features/feed/NewPostSheet";
import { requireUser } from "@/lib/supabase/auth";

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

async function NewPostAction() {
  const user = await requireUser();
  return <NewPostSheet userId={user.id} />;
}
