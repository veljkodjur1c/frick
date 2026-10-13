import { Card, EmptyState, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/supabase/auth";
import { FeedItemCard } from "./FeedItemCard";
import { LoadMorePosts } from "./LoadMorePosts";
import { getFeedPage } from "./queries";

/** Reads the session, so it must sit inside a <Suspense> boundary. */
export async function FeedList() {
  const user = await requireUser();

  const { items, nextCursor } = await getFeedPage(user.id);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Još nema objava"
        description="Budi prvi: dodaj sliku sa treninga, žurke ili bilo čega preko dugmeta Nova objava."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <FeedItemCard item={item} />
          </li>
        ))}
      </ul>
      {nextCursor && <LoadMorePosts key={nextCursor} initialCursor={nextCursor} />}
    </div>
  );
}

export function FeedListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((key) => (
        <Card key={key} padding="sm" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton rounded="full" className="size-10" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton rounded="lg" className="aspect-4/5 w-full" />
        </Card>
      ))}
    </div>
  );
}
