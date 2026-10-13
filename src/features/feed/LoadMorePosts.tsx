"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { loadMorePosts } from "./actions";
import { FeedPostCard } from "./FeedPostCard";
import type { FeedPostData } from "./queries";

/**
 * Older posts loaded with "Učitaj još", appended under the server-rendered first page.
 * Give it `key={initialCursor}` so it starts over when the first page changes (e.g. after a new post).
 */
export function LoadMorePosts({ initialCursor }: { initialCursor: string }) {
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setError(false);
    startTransition(async () => {
      try {
        const page = await loadMorePosts(cursor);
        setPosts((current) => [...current, ...page.posts]);
        setCursor(page.nextCursor);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <>
      {posts.length > 0 && (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id}>
              <FeedPostCard post={post} />
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
