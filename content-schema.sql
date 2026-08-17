-- Content overrides table — run this once in Supabase SQL Editor (Project → SQL Editor → New query → Run)
--
-- Server-authoritative mirror of the client's `copyOvr` object (localStorage key `bric_copy`): every
-- in-page CMS edit (project/moon/CV titles, descriptions, tags, snapshot rows, links, CTA, camera views,
-- marquee text, breadcrumb/menu labels, the galaxy layout itself) is a single flat key → value pair there,
-- so this table is intentionally schema-less beyond that shape — one row per `copyOvr` key. Any new key the
-- client ever starts writing round-trips through this table with zero migration; there's no per-feature
-- table to keep in sync with the client's key namespace.

create table if not exists public.content_overrides (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.content_overrides enable row level security;

-- Same shape as messages: anyone can READ (this is just the site's own public content — same trust level
-- as the static HTML itself), nobody can write via RLS. There is no insert/update/delete policy for
-- anon/authenticated at all — every write goes through the /api/content-save serverless function using the
-- secret key, which bypasses RLS. This is the only door in — see api/content-save.js.
create policy "public can read content overrides"
  on public.content_overrides for select
  to anon, authenticated
  using (true);

-- Deliberately NO `alter publication supabase_realtime add table ...` here, unlike messages — this content
-- doesn't need to live-update while a visitor is already browsing (it's reconciled fresh on every page
-- load instead, before the page boots — see reconcileServerContent() in index.html). Don't add Realtime to
-- this table without also building the client-side subscription to actually use it; an unused publication
-- membership is just a footgun for scope creep.
