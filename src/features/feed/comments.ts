// Comments on feed posts. Shared by the sheet (client) and the server actions.

/** Matches the check on post_comments.body. */
export const COMMENT_MAX_LENGTH = 500;

export type CommentData = {
  id: string;
  body: string;
  createdAt: string;
  author: { displayName: string; avatarUrl: string | null };
  /** The viewer wrote it, so they can delete it. */
  isOwn: boolean;
};

/** Serbian error for a comment, or null if it's fine. Expects a trimmed value. */
export function commentBodyError(body: string): string | null {
  // Count characters like Postgres char_length does (code points, not UTF-16 units).
  const length = [...body].length;
  if (length === 0) return "Napiši komentar.";
  if (length > COMMENT_MAX_LENGTH) return `Komentar može imati najviše ${COMMENT_MAX_LENGTH} znakova.`;
  return null;
}
