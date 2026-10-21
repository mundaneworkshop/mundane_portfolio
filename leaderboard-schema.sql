-- Arcade leaderboard table — run once in the Supabase SQL Editor (Project → SQL Editor → New query → Run)

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Anonymous',
  kills integer not null,
  hero text not null,                 -- hero ship id: mil-falcon | n1 | razorcrest | slave-1
  seconds integer not null default 0, -- time played (used by the server's plausibility check)
  ip_hash text,                       -- salted hash of the submitter's IP, for rate limiting only (never exposed)
  created_at timestamptz not null default now(),
  approved boolean not null default true,   -- flip to false to hide a row without deleting it
  constraint lb_name_len check (char_length(name) between 1 and 20),
  constraint lb_kills check (kills between 1 and 5000),
  constraint lb_hero check (hero in ('mil-falcon','n1','razorcrest','slave-1'))
);

create index if not exists leaderboard_score_idx on public.leaderboard (kills desc, created_at asc);
create index if not exists leaderboard_ip_idx on public.leaderboard (ip_hash, created_at desc);

alter table public.leaderboard enable row level security;

-- Visitors can only READ approved rows (and the client only selects the public columns). There is no insert/update/delete policy for
-- anon/authenticated — every write goes through /api/leaderboard-submit using the secret key, which bypasses RLS.
create policy "public can read approved scores"
  on public.leaderboard for select
  to anon, authenticated
  using (approved = true);

-- Column-level privileges: the publishable key may read ONLY the public columns (never ip_hash). Clients must name columns explicitly (no select *).
revoke select on public.leaderboard from anon, authenticated;
--   grant select (id, name, kills, hero, seconds, created_at, approved) on public.leaderboard to anon, authenticated;
revoke select on public.leaderboard from anon, authenticated;
grant select (id, name, kills, hero, seconds, created_at, approved) on public.leaderboard to anon, authenticated;


-- ── Country flag (Oct 20 2026) — run once in the SQL Editor. ISO 3166-1 alpha-2 code taken from Vercel's x-vercel-ip-country header at submit time
-- (the code only, never the IP). Existing rows stay NULL (no flag). The client and the API both tolerate this column not existing yet.
alter table public.leaderboard add column if not exists country text;
do $$ begin
  alter table public.leaderboard add constraint lb_country check (country is null or country ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
grant select (country) on public.leaderboard to anon, authenticated;
