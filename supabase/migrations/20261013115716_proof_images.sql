-- Proof photos for `proof` tasks (completions.proof_path), voted Legit/Cap by the other players.
--
-- Upload flow: the browser uploads the photo to the private `proof-images` bucket under
-- `<user id>/<file name>`, then a Server Action inserts the completion with that path.
-- Photos are read through short-lived signed URLs created on the server, like `post-images`.

-- Private bucket. The client shrinks photos before upload, so 5 MB is a generous cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proof-images', 'proof-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "proof-images: members can read" on storage.objects for select to authenticated
  using (bucket_id = 'proof-images');

-- Upload only into your own folder. No update policy, so a proof can't be swapped after voting started.
create policy "proof-images: upload to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proof-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Delete own files, e.g. the old photo when sending a new proof after a Cap.
create policy "proof-images: delete own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'proof-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
