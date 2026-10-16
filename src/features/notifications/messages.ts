// Texts of the push notifications. Plain functions without imports, so they have unit tests.
// The title is the player's name; the phone shows "FRICK" above it on its own.

export type PushMessage = {
  title: string;
  body: string;
  /** Page the notification opens when tapped. */
  url: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag: string;
};

/** Longest quoted text in a notification; longer ones are cut with "…". */
export const QUOTE_MAX_LENGTH = 100;

export function newPostMessage({
  postId,
  authorName,
  caption,
}: {
  postId: string;
  authorName: string;
  caption: string | null;
}): PushMessage {
  return {
    title: authorName,
    body: caption?.trim() ? `Nova objava: ${quote(caption)}` : "Nova objava u feedu",
    url: "/feed",
    tag: `post-${postId}`,
  };
}

export function newProofMessage({
  completionId,
  authorName,
  taskTitle,
}: {
  completionId: string;
  authorName: string;
  taskTitle: string;
}): PushMessage {
  return {
    title: authorName,
    body: `Dokaz čeka tvoj glas: ${quote(taskTitle)}`,
    url: "/feed",
    tag: `proof-${completionId}`,
  };
}

/** For the post's author. One tag per post, so a busy thread shows only the newest comment. */
export function newCommentMessage({
  postId,
  authorName,
  comment,
}: {
  postId: string;
  authorName: string;
  comment: string;
}): PushMessage {
  return {
    title: authorName,
    body: `Komentar na tvoju objavu: ${quote(comment)}`,
    url: "/feed",
    tag: `comment-${postId}`,
  };
}

/** „text“ on one line, cut to QUOTE_MAX_LENGTH. */
function quote(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  const short = line.length > QUOTE_MAX_LENGTH ? `${line.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}…` : line;
  return `„${short}“`;
}
