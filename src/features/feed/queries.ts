import "server-only";
import { PROOF_IMAGES_BUCKET } from "@/features/proofs/constants";
import type { CompletionStatus } from "@/lib/game/points";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE, POST_IMAGES_BUCKET } from "./constants";
import { mergeNewestFirst } from "./merge";
import type { PostVote, VoteTally } from "./votes";

type Author = { displayName: string; avatarUrl: string | null };

export type FeedPostData = {
  kind: "post";
  id: string;
  caption: string | null;
  createdAt: string;
  /** Signed URL, valid for SIGNED_URL_TTL seconds. Null if signing failed (e.g. the file is gone). */
  imageUrl: string | null;
  author: Author;
  /** The viewer wrote this post (so they can't vote on it). */
  isOwn: boolean;
  votes: VoteTally;
  commentCount: number;
};

/** A photo proof for a task (a completion with proof_path), voted Legit/Cap by the other players. */
export type FeedProofData = {
  kind: "proof";
  /** Completion id. */
  id: string;
  createdAt: string;
  imageUrl: string | null;
  author: Author;
  isOwn: boolean;
  task: { title: string; points: number };
  status: CompletionStatus;
  votes: VoteTally;
};

export type FeedItem = FeedPostData | FeedProofData;

export type FeedPage = {
  items: FeedItem[];
  /** Pass to the next getFeedPage call; null when there is nothing older. */
  nextCursor: string | null;
};

type VoteRow = { voter_id: string; vote: PostVote };
type AuthorRow = { display_name: string; avatar_url: string | null };

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  image_path: string;
  created_at: string;
  author: AuthorRow;
  votes: VoteRow[];
  /** post_comments(count) returns one row with the count. */
  comments: Array<{ count: number }>;
};

type ProofRow = {
  id: string;
  user_id: string;
  status: CompletionStatus;
  proof_path: string;
  created_at: string;
  author: AuthorRow;
  task: { title: string; points: number };
  votes: VoteRow[];
};

const SIGNED_URL_TTL = 60 * 60;

/**
 * One page of the feed, newest first: posts and task proofs, each with author, a signed photo URL and votes.
 * `viewerId` is the logged-in user (the caller must have checked it); `before` is the cursor from the previous page.
 */
export async function getFeedPage(viewerId: string, before?: string): Promise<FeedPage> {
  const supabase = await createClient();

  // One extra row per source tells us whether there is another page.
  let postQuery = supabase
    .from("posts")
    .select(
      "id, user_id, caption, image_path, created_at, " +
        "author:profiles!posts_user_id_fkey(display_name, avatar_url), votes:post_votes(voter_id, vote), " +
        "comments:post_comments(count)",
    )
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  let proofQuery = supabase
    .from("completions")
    .select(
      "id, user_id, status, proof_path, created_at, " +
        // completions has two paths to profiles (user_id, and proof_votes), so name the foreign key.
        "author:profiles!completions_user_id_fkey(display_name, avatar_url), task:tasks(title, points), " +
        "votes:proof_votes(voter_id, vote)",
    )
    .not("proof_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  if (before) {
    postQuery = postQuery.lt("created_at", before);
    proofQuery = proofQuery.lt("created_at", before);
  }

  const [posts, proofs] = await Promise.all([
    postQuery.overrideTypes<PostRow[], { merge: false }>(),
    proofQuery.overrideTypes<ProofRow[], { merge: false }>(),
  ]);
  if (posts.error) throw posts.error;
  if (proofs.error) throw proofs.error;

  const { items: rows, hasMore } = mergeNewestFirst<
    (({ kind: "post" } & PostRow) | ({ kind: "proof" } & ProofRow)) & { createdAt: string }
  >(
    [
      posts.data.map((row) => ({ kind: "post" as const, ...row, createdAt: row.created_at })),
      proofs.data.map((row) => ({ kind: "proof" as const, ...row, createdAt: row.created_at })),
    ],
    FEED_PAGE_SIZE,
  );
  const nextCursor = hasMore ? rows[rows.length - 1].created_at : null;

  const [postUrls, proofUrls] = await Promise.all([
    signUrls(POST_IMAGES_BUCKET, rows.flatMap((row) => (row.kind === "post" ? [row.image_path] : []))),
    signUrls(PROOF_IMAGES_BUCKET, rows.flatMap((row) => (row.kind === "proof" ? [row.proof_path] : []))),
  ]);

  const items = rows.map((row): FeedItem => {
    const shared = {
      id: row.id,
      createdAt: row.created_at,
      author: { displayName: row.author.display_name, avatarUrl: row.author.avatar_url },
      isOwn: row.user_id === viewerId,
      votes: tally(row.votes, viewerId),
    };
    return row.kind === "post"
      ? {
          ...shared,
          kind: "post",
          caption: row.caption,
          imageUrl: postUrls.get(row.image_path) ?? null,
          commentCount: row.comments[0]?.count ?? 0,
        }
      : {
          ...shared,
          kind: "proof",
          task: row.task,
          status: row.status,
          imageUrl: proofUrls.get(row.proof_path) ?? null,
        };
  });

  return { items, nextCursor };

  /** Signed URLs by path, one request per bucket. A failure only hides those photos, the feed still loads. */
  async function signUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
    if (paths.length === 0) return new Map();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL);
    if (error) {
      console.error(`getFeedPage: signing ${bucket} failed`, error);
      return new Map();
    }
    return new Map(data.flatMap((item) => (item.signedUrl && item.path ? [[item.path, item.signedUrl]] : [])));
  }
}

function tally(votes: VoteRow[], viewerId: string): VoteTally {
  return {
    legit: votes.filter((v) => v.vote === "legit").length,
    cap: votes.filter((v) => v.vote === "cap").length,
    mine: votes.find((v) => v.voter_id === viewerId)?.vote ?? null,
  };
}
