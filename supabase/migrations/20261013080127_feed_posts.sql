-- Feed posts: a photo with an optional caption, shown newest first on /feed.
--
-- Upload flow: the browser uploads the photo to the private `post-images` bucket under
-- `<user id>/<file name>`, then inserts a row here pointing at that path.
-- Photos are read through short-lived signed URLs created on the server.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Object path inside the `post-images` storage bucket, always `<user_id>/<file name>`.
  image_path text not null unique,
  caption text check (char_length(caption) between 1 and 500),
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_id_idx on public.posts (user_id);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.posts from anon;

-- Clients can't set id or created_at, and posts can't be edited after publishing.
revoke insert, update on public.posts from authenticated;
grant insert (user_id, image_path, caption) on public.posts to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.posts enable row level security;

create policy "posts: members can read" on public.posts for select to authenticated using (true);

-- Own posts only, and the photo must be in your own folder (no reposting someone else's file).
create policy "posts: insert own" on public.posts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
  );

create policy "posts: delete own" on public.posts for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Private bucket. The client shrinks photos before upload, so 5 MB is a generous cap.
-- iOS converts HEIC to JPEG when picking from <input type="file" accept="image/*">.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "post-images: members can read" on storage.objects for select to authenticated
  using (bucket_id = 'post-images');

-- Upload only into your own folder. No update policy, so files can't be overwritten.
create policy "post-images: upload to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "post-images: delete own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
