-- Profile pictures.
--
-- Upload flow: the browser crops the photo to 256x256, uploads it to the `avatars` bucket at
-- `<user id>/avatar.webp` (upsert, so a new picture replaces the old one), then a Server Action
-- writes its public URL into profiles.avatar_url.
--
-- Access model:
--   * The bucket is public, so profiles.avatar_url works directly in <img src> (feed, profile)
--     without signed URLs. Anyone with the URL can see a picture; file names are only user ids.
--   * Logged-in members can list/read objects through the API.
--   * Each user can only upload, replace or delete files in their own `<user id>/` folder.

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------

-- Avatars are 256x256 after cropping (a few KB), so 1 MB is a generous cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png']);

-- ---------------------------------------------------------------------------
-- Policies on storage.objects (prefixed "avatars:" so they don't clash with other buckets)
-- ---------------------------------------------------------------------------

create policy "avatars: members can read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars: upload to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Needed for upsert: replacing avatar.webp is an update of the existing object.
create policy "avatars: replace own" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
