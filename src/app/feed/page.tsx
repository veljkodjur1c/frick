import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { FeedActionWheel } from "@/features/feed/FeedActionWheel";
import { FeedList, FeedListSkeleton } from "@/features/feed/FeedList";
import { countVoteQueue } from "@/features/feed/queries";
import { requireUser } from "@/lib/supabase/auth";

export default function FeedPage() {
  return (
    <>
      <PageHeader title="Feed" />
      <Suspense fallback={<FeedListSkeleton />}>
        <FeedList />
      </Suspense>
      {/* Room under the last post, so the floating action button never covers its buttons. */}
      <div aria-hidden className="h-20" />
      <Suspense fallback={null}>
        <FeedActions />
      </Suspense>
    </>
  );
}

/** The floating action wheel, with how many proofs wait for the viewer's vote. */
async function FeedActions() {
  const user = await requireUser();
  const voteCount = await countVoteQueue(user.id).catch((error: unknown) => {
    // Only the badge is lost; the button still works.
    console.error("FeedActions: counting the vote queue failed", error);
    return 0;
  });
  return <FeedActionWheel userId={user.id} voteCount={voteCount} />;
}
