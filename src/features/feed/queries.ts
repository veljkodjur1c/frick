import "server-only";
import { PROOF_IMAGES_BUCKET } from "@/features/proofs/constants";
import { getCategoryTitles } from "@/features/titles/queries";
import { collectors } from "@/lib/game/cans";
import type { CompletionStatus } from "@/lib/game/points";
import { mainTitleOf, type CategoryTitle, type TaskCategory } from "@/lib/game/titles";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE, POST_IMAGES_BUCKET } from "./constants";
import { mergeNewestFirst } from "./merge";
import type { PostVote, VoteTally } from "./votes";

type Author = {
  displayName: string;
  avatarUrl: string | null;
  /** Owns every Monster can flavor: shown with the "Kolekcionar" avatar frame. */
  collector: boolean;
  /** The author's strongest category title (shown next to the name), or null if they hold none. */
  title: TaskCategory | null;
};

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

/** Most proofs the "Čeka tvoj glas" list shows at once. */
const VOTE_QUEUE_LIMIT = 50;

/**
 * One page of the feed, newest first: posts and task proofs, each with author, a signed photo URL and votes.
 * `viewerId` is the logged-in user (the caller must have checked it); `before` is the cursor from the previous page.
 * With `voteQueue` it returns only other players' pending proofs the viewer hasn't voted on yet (no posts, no paging).
 */
export async function getFeedPage(
  viewerId: string,
  before?: string,
  { voteQueue = false }: { voteQueue?: boolean } = {},
): Promise<FeedPage> {
  const supabase = await createClient();
  const limit = voteQueue ? VOTE_QUEUE_LIMIT : FEED_PAGE_SIZE;

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
    .limit(limit + 1);
  if (voteQueue) proofQuery = proofQuery.eq("status", "pending").neq("user_id", viewerId);
  if (before) {
    postQuery = postQuery.lt("created_at", before);
    proofQuery = proofQuery.lt("created_at", before);
  }

  const [posts, proofs, cans, titles] = await Promise.all([
    voteQueue
      ? Promise.resolve({ data: [] as PostRow[], error: null })
      : postQuery.overrideTypes<PostRow[], { merge: false }>(),
    proofQuery.overrideTypes<ProofRow[], { merge: false }>(),
    // Every can, for the "Kolekcionar" avatar frame (a handful of rows per player).
    supabase
      .from("cans")
      .select("user_id, flavor, earned_at")
      .order("earned_at")
      .order("id")
      .overrideTypes<Array<{ user_id: string; flavor: string; earned_at: string }>, { merge: false }>(),
    // The titles are a decoration; if they fail to load, the feed still shows.
    getCategoryTitles().catch((error: unknown): CategoryTitle[] => {
      console.error("getFeedPage: reading titles failed", error);
      return [];
    }),
  ]);
  if (posts.error) throw posts.error;
  if (proofs.error) throw proofs.error;
  if (cans.error) throw cans.error;

  const { completed } = collectors(
    [...new Set(cans.data.map((can) => can.user_id))].map((id) => ({
      id,
      history: cans.data.filter((can) => can.user_id === id).map((can) => ({ flavor: can.flavor, earnedAt: can.earned_at })),
    })),
  );

  const { items: merged, hasMore } = mergeNewestFirst<
    (({ kind: "post" } & PostRow) | ({ kind: "proof" } & ProofRow)) & { createdAt: string }
  >(
    [
      posts.data.map((row) => ({ kind: "post" as const, ...row, createdAt: row.created_at })),
      proofs.data.map((row) => ({ kind: "proof" as const, ...row, createdAt: row.created_at })),
    ],
    limit,
  );
  const nextCursor = hasMore && !voteQueue ? merged[merged.length - 1].created_at : null;
  const rows = voteQueue ? merged.filter((row) => !row.votes.some((vote) => vote.voter_id === viewerId)) : merged;

  const [postUrls, proofUrls] = await Promise.all([
    signUrls(POST_IMAGES_BUCKET, rows.flatMap((row) => (row.kind === "post" ? [row.image_path] : []))),
    signUrls(PROOF_IMAGES_BUCKET, rows.flatMap((row) => (row.kind === "proof" ? [row.proof_path] : []))),
  ]);

  const items = rows.map((row): FeedItem => {
    const shared = {
      id: row.id,
      createdAt: row.created_at,
      author: {
        displayName: row.author.display_name,
        avatarUrl: row.author.avatar_url,
        collector: completed.has(row.user_id),
        title: mainTitleOf(row.user_id, titles),
      },
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

/** How many of the other players' pending proofs still wait for the viewer's vote (the badge on the feed button). */
export async function countVoteQueue(viewerId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("completions")
    .select("id, votes:proof_votes(voter_id)")
    .eq("status", "pending")
    .not("proof_path", "is", null)
    .neq("user_id", viewerId)
    .overrideTypes<Array<{ id: string; votes: Array<{ voter_id: string }> }>, { merge: false }>();
  if (error) throw error;
  return data.filter((proof) => !proof.votes.some((vote) => vote.voter_id === viewerId)).length;
}

function tally(votes: VoteRow[], viewerId: string): VoteTally {
  return {
    legit: votes.filter((v) => v.vote === "legit").length,
    cap: votes.filter((v) => v.vote === "cap").length,
    mine: votes.find((v) => v.voter_id === viewerId)?.vote ?? null,
  };
}
