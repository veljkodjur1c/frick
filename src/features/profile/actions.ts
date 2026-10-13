"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { displayNameError } from "./displayName";

export type UpdateProfileInput = {
  displayName: string;
  /** Set only when a new avatar was just uploaded. Must be `<user id>/avatar.webp`. */
  avatarPath?: string;
};

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; fieldErrors?: { displayName?: string; avatar?: string }; formError?: string };

const AVATAR_BUCKET = "avatars";

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, formError: "Sesija je istekla. Prijavi se ponovo." };
  }

  // The input comes from the browser, so check the shape too, not just the values.
  const displayName = typeof input?.displayName === "string" ? input.displayName.trim() : "";
  const nameError = displayNameError(displayName);
  if (nameError) {
    return { ok: false, fieldErrors: { displayName: nameError } };
  }

  const avatarPath = input?.avatarPath;
  if (avatarPath !== undefined && avatarPath !== `${user.id}/avatar.webp`) {
    return { ok: false, fieldErrors: { avatar: "Slika nije sačuvana. Izaberi je ponovo." } };
  }

  const supabase = await createClient();
  const changes: { display_name: string; avatar_url?: string } = { display_name: displayName };
  if (avatarPath !== undefined) {
    const { publicUrl } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data;
    // The file name never changes, so a version param makes browsers and the CDN fetch the new picture.
    changes.avatar_url = `${publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from("profiles").update(changes).eq("id", user.id);
  if (error) {
    console.error("updateProfile failed", error);
    return { ok: false, formError: "Profil nije sačuvan. Probaj ponovo." };
  }

  // Names and avatars show up on other pages too (feed), so refresh everything, including this page.
  revalidatePath("/", "layout");
  return { ok: true };
}
