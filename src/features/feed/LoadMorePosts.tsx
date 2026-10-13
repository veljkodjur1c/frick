"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { loadMorePosts } from "./actions";
import { FeedItemCard } from "./FeedItemCard";
import type { FeedItem } from "./queries";

/**
 * Older posts and proofs loaded with "Učitaj još", appended under the server-rendered first page.
 * Give it `key={initialCursor}` so it starts over when the first page changes (e.g. after a new post).
 */
export function LoadMorePosts({ initialCursor }: { initialCursor: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setError(false);
    startTransition(async () => {
      try {
        const page = await loadMorePosts(cursor);
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <>
      {items.length > 0 && (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <FeedItemCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          Objave nisu učitane. Proveri internet i pokušaj ponovo.
        </p>
      )}

      {cursor && (
        <Button variant="secondary" fullWidth loading={pending} onClick={loadMore}>
          Učitaj još
        </Button>
      )}
    </>
  );
}
