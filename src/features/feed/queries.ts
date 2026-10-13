import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE, POST_IMAGES_BUCKET } from "./constants";
import type { PostVote, VoteTally } from "./votes";

export type FeedPostData = {
  id: string;
  caption: string | null;
  createdAt: string;
  /** Signed URL, valid for SIGNED_URL_TTL seconds. Null if signing failed (e.g. the file is gone). */
  imageUrl: string | null;
  author: { displayName: string; avatarUrl: string | null };
  /** The viewer wrote this post (so they can't vote on it). */
  isOwn: boolean;
  votes: VoteTally;
};

export type FeedPage = {
  posts: FeedPostData[];
  /** Pass to the next getFeedPage call; null when there are no older posts. */
  nextCursor: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  image_path: string;
  created_at: string;
  author: { display_name: string; avatar_url: string | null };
  votes: Array<{ voter_id: string; vote: PostVote }>;
};

const SIGNED_URL_TTL = 60 * 60;

/**
 * One page of posts, newest first, with author, a signed photo URL and the Legit/Cap votes.
 * `viewerId` is the logged-in user (the caller must have checked it); `before` is the cursor from the previous page.
 */
export async function getFeedPage(viewerId: string, before?: string): Promise<FeedPage> {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(
      "id, user_id, caption, image_path, created_at, " +
        "author:profiles!posts_user_id_fkey(display_name, avatar_url), votes:post_votes(voter_id, vote)",
    )
    .order("created_at", { ascending: false })
    // One extra row tells us whether there is another page.
    .limit(FEED_PAGE_SIZE + 1);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query.overrideTypes<PostRow[], { merge: false }>();
  if (error) throw error;

  const rows = data.slice(0, FEED_PAGE_SIZE);
  const nextCursor = data.length > FEED_PAGE_SIZE ? rows[rows.length - 1].created_at : null;
  if (rows.length === 0) return { posts: [], nextCursor };

  // One request for all photos instead of one per post.
  const { data: signed, error: signError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.image_path),
      SIGNED_URL_TTL,
    );
  if (signError) throw signError;

  const urlByPath = new Map(signed.map((item) => [item.path, item.signedUrl]));

  const posts = rows.map((row) => ({
    id: row.id,
    caption: row.caption,
    createdAt: row.created_at,
    imageUrl: urlByPath.get(row.image_path) ?? null,
    author: { displayName: row.author.display_name, avatarUrl: row.author.avatar_url },
    isOwn: row.user_id === viewerId,
    votes: {
      legit: row.votes.filter((v) => v.vote === "legit").length,
      cap: row.votes.filter((v) => v.vote === "cap").length,
      mine: row.votes.find((v) => v.voter_id === viewerId)?.vote ?? null,
    },
  }));

  return { posts, nextCursor };
}
