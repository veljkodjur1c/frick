"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_MAX_LENGTH } from "./constants";
import { getFeedPage, type FeedPage } from "./queries";

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

  return getFeedPage(before);
}
