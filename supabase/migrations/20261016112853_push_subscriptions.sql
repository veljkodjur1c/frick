-- Web push subscriptions: one row per phone/browser that turned notifications on.
-- The browser gets endpoint + keys from PushManager.subscribe(); the server (web-push, service role) sends to them
-- when someone posts, sends a proof or comments, and deletes rows whose endpoint the push service says is gone.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Push service URL of one browser. Unique: a phone belongs to whoever subscribed on it last.
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  -- Keys the payload is encrypted with (base64url).
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- Saves the caller's subscription. If the phone was subscribed by another player before (shared phone, switched
-- accounts), it now belongs to the caller. A function, because RLS can't let an upsert take over someone else's row.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.push_subscriptions from anon;
-- Writes go through save_push_subscription(); clients may only read and delete their own rows.
revoke insert, update on public.push_subscriptions from authenticated;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: read own" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_subscriptions: delete own" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
