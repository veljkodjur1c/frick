import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE, POST_IMAGES_BUCKET } from "./constants";

export type FeedPostData = {
  id: string;
  caption: string | null;
  createdAt: string;
  /** Signed URL, valid for SIGNED_URL_TTL seconds. Null if signing failed (e.g. the file is gone). */
  imageUrl: string | null;
  author: { displayName: string; avatarUrl: string | null };
};

export type FeedPage = {
  posts: FeedPostData[];
  /** Pass to the next getFeedPage call; null when there are no older posts. */
  nextCursor: string | null;
};

type PostRow = {
  id: string;
  caption: string | null;
  image_path: string;
  created_at: string;
  author: { display_name: string; avatar_url: string | null };
};

const SIGNED_URL_TTL = 60 * 60;

/**
 * One page of posts, newest first, with author and a signed photo URL.
 * `before` is the cursor from the previous page (a created_at). Caller must check the user is logged in.
 */
export async function getFeedPage(before?: string): Promise<FeedPage> {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("id, caption, image_path, created_at, author:profiles!posts_user_id_fkey(display_name, avatar_url)")
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
  }));

  return { posts, nextCursor };
}
