-- HoloNet messages table — run this once in Supabase SQL Editor (Project → SQL Editor → New query → Run)

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Anonymous',
  msg text not null,
  x double precision not null,
  y double precision not null,
  z double precision not null,
  created_at timestamptz not null default now(),
  approved boolean not null default true,
  constraint name_len check (char_length(name) <= 40),
  constraint msg_len check (char_length(msg) >= 1 and char_length(msg) <= 280)
);

alter table public.messages enable row level security;

-- Visitors (anon) and any logged-in user can only ever READ approved rows. There is no insert/update/delete
-- policy for anon/authenticated at all — every write goes through the /api/holonet-submit serverless function
-- using the secret key, which bypasses RLS. This is the only door in.
create policy "public can read approved messages"
  on public.messages for select
  to anon, authenticated
  using (approved = true);

-- Required for the client's live Realtime subscription (new stars appearing without a refresh) to receive
-- INSERT events for this table. If this errors with "already a member of publication", that's fine — it
-- means Realtime is already enabled for this table and there's nothing more to do.
alter publication supabase_realtime add table public.messages;
