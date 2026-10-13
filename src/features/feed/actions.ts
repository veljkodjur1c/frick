"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_MAX_LENGTH } from "./constants";
import { getFeedPage, type FeedPage } from "./queries";
import type { PostVote } from "./votes";

type CreatePostInput = {
  /** Path in the post-images bucket the browser already uploaded to. */
  imagePath: string;
  caption: string;
};

/** Saves a feed post for a photo that is already in Storage. Returns an error message for the form, or null. */
export async function createPost({ imagePath, caption }: CreatePostInput): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return "Prijavi se ponovo pa pokušaj još jednom.";

  // RLS checks this too; failing early gives a clear message instead of a policy error.
  if (!/^[0-9a-f-]+\/[\w-]+\.(jpg|png|webp)$/.test(imagePath) || !imagePath.startsWith(`${user.id}/`)) {
    return "Slika nije ispravno otpremljena. Pokušaj ponovo.";
  }

  const trimmed = caption.trim();
  if (trimmed.length > CAPTION_MAX_LENGTH) {
    return `Opis može imati najviše ${CAPTION_MAX_LENGTH} znakova.`;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    image_path: imagePath,
    caption: trimmed || null,
  });

  if (error) {
    console.error("createPost failed", error);
    return "Objava nije sačuvana. Pokušaj ponovo.";
  }

  refresh();
  return null;
}

/** The next page of the feed for "Učitaj još". `before` is the cursor from the previous page. */
export async function loadMorePosts(before: string): Promise<FeedPage> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");
  if (Number.isNaN(Date.parse(before))) throw new Error("Invalid cursor");

  return getFeedPage(user.id, before);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Sets the viewer's Legit/Cap vote on a post; null takes the vote back.
 * Takes the wanted end state (not a toggle), so a repeated request can't flip it twice.
 * Returns an error message, or null.
 */
export async function setPostVote(postId: string, vote: PostVote | null): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return "Prijavi se ponovo pa pokušaj još jednom.";
  if (!UUID.test(postId) || (vote !== null && vote !== "legit" && vote !== "cap")) {
    return "Glas nije sačuvan. Pokušaj ponovo.";
  }

  const supabase = await createClient();
  const ownVote = supabase.from("post_votes");
  let error: PostgrestError | null;

  if (vote === null) {
    ({ error } = await ownVote.delete().eq("post_id", postId).eq("voter_id", user.id));
  } else {
    // Not upsert(): it would also try to update post_id/voter_id, which clients may not change.
    const updated = await ownVote.update({ vote }).eq("post_id", postId).eq("voter_id", user.id).select("post_id");
    error = updated.error;
    if (!error && !updated.data?.length) {
      // RLS rejects this for your own post.
      ({ error } = await ownVote.insert({ post_id: postId, voter_id: user.id, vote }));
    }
  }

  if (error) {
    console.error("setPostVote failed", error);
    return "Glas nije sačuvan. Pokušaj ponovo.";
  }
  return null;
}
