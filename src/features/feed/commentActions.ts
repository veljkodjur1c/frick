"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { commentBodyError, type CommentData } from "./comments";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LOGIN_AGAIN = "Prijavi se ponovo pa pokušaj još jednom.";

/** More than a post will realistically get among 5 friends; keeps one request bounded. */
const COMMENTS_LIMIT = 200;

type CommentRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { display_name: string; avatar_url: string | null };
};

const COMMENT_COLUMNS = "id, user_id, body, created_at, author:profiles!post_comments_user_id_fkey(display_name, avatar_url)";

function toComment(row: CommentRow, viewerId: string): CommentData {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: { displayName: row.author.display_name, avatarUrl: row.author.avatar_url },
    isOwn: row.user_id === viewerId,
  };
}

/** A post's comments, oldest first. */
export async function loadComments(
  postId: string,
): Promise<{ ok: true; comments: CommentData[] } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGIN_AGAIN };
  if (!UUID.test(postId)) return { ok: false, error: "Komentari nisu učitani. Pokušaj ponovo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select(COMMENT_COLUMNS)
    .eq("post_id", postId)
    .order("created_at")
    .limit(COMMENTS_LIMIT)
    .overrideTypes<CommentRow[], { merge: false }>();
  if (error) {
    console.error("loadComments failed", error);
    return { ok: false, error: "Komentari nisu učitani. Pokušaj ponovo." };
  }

  return { ok: true, comments: data.map((row) => toComment(row, user.id)) };
}

/** Adds the viewer's comment to a post and returns it. */
export async function addComment(
  postId: string,
  body: string,
): Promise<{ ok: true; comment: CommentData } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: LOGIN_AGAIN };
  if (!UUID.test(postId) || typeof body !== "string") return { ok: false, error: "Komentar nije poslat. Pokušaj ponovo." };

  const trimmed = body.trim();
  const invalid = commentBodyError(trimmed);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, body: trimmed })
    .select(COMMENT_COLUMNS)
    .single()
    .overrideTypes<CommentRow, { merge: false }>();
  if (error) {
    console.error("addComment failed", error);
    return { ok: false, error: "Komentar nije poslat. Pokušaj ponovo." };
  }

  return { ok: true, comment: toComment(data, user.id) };
}

/** Deletes one of the viewer's own comments. Returns an error message, or null. */
export async function deleteComment(commentId: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return LOGIN_AGAIN;
  if (!UUID.test(commentId)) return "Komentar nije obrisan. Pokušaj ponovo.";

  const supabase = await createClient();
  // RLS only lets you delete your own; a silent 0-row delete means it wasn't yours or is already gone.
  const { data, error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("deleteComment failed", error);
    return "Komentar nije obrisan. Pokušaj ponovo.";
  }
  return null;
}
