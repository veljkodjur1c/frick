-- Boss artwork shown on /boss, referenced by bosses.image_url.
--
-- Access model:
--   * Public bucket, like `avatars`: bosses.image_url is a plain public URL that works in <img src>.
--     The files are game artwork, nothing private.
--   * Only trusted server code with the service role (seed script, weekly job) uploads here, and the
--     service role bypasses RLS, so there are no client write policies on purpose.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('boss-images', 'boss-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);
