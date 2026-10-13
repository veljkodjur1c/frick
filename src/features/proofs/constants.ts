// Keep in sync with supabase/migrations/20261013115716_proof_images.sql.

export const PROOF_IMAGES_BUCKET = "proof-images";

/** Matches the bucket's file_size_limit (5 MB). Checked after the browser shrinks the photo. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
