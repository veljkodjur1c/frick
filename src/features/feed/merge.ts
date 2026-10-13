// The feed shows posts and task proofs in one list. Each source is read newest first with the same cursor,
// so merging them and taking one page gives the right page of the combined feed.

/**
 * Merges lists that are each sorted newest first and returns the newest `limit` items.
 * `hasMore` is true if anything was left over, so ask every source for limit + 1 items.
 */
export function mergeNewestFirst<T extends { createdAt: string }>(
  lists: ReadonlyArray<readonly T[]>,
  limit: number,
): { items: T[]; hasMore: boolean } {
  const all = lists.flat().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { items: all.slice(0, limit), hasMore: all.length > limit };
}
