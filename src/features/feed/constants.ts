// Shared by the form (client), the server action and the queries.
// Keep in sync with supabase/migrations/20261013080127_feed_posts.sql.

export const POST_IMAGES_BUCKET = "post-images";

/** Matches the check on posts.caption. */
export const CAPTION_MAX_LENGTH = 500;

/** Matches the bucket's file_size_limit (5 MB). Checked after the browser shrinks the photo. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Posts per page; "Učitaj još" loads the next page. */
export const FEED_PAGE_SIZE = 10;
