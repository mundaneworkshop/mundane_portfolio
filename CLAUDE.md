# mundane_portfolio

Jason Hsin's portfolio site — a WebGL "galaxy" of clickable project planets (Three.js r128), built and maintained mostly through AI pair-programming sessions since April 2026. This file is the entry point for picking up development in Claude Code; `docs/project-history/` has the full accumulated design/build decision log from the Cowork sessions that built it — read the relevant file there before touching anything non-trivial, especially anything flagged INVARIANT or "regressed N times."

## What this is, architecturally

- **`index.html`** is the entire site: ~13,000 lines, ~660KB, single file. No build step, no bundler, no framework. Several `<script>` blocks inline. This is a deliberate choice made early in the project, not an oversight — see `docs/project-history/homepage-holotable-prototype.md` for the original architecture decision.
- **`api/holonet-submit.js`** and **`api/holonet-delete.js`** are two Vercel serverless functions backing the HoloNet (contact) feature — a Supabase-backed shared message board. `holonet-schema.sql` is the table schema.
- **`api/content-save.js`** is a third Vercel serverless function backing server-authoritative content sync for the in-page CMS (see "Content sync backend" below). `content-schema.sql` is its table schema.
- **`vercel.json`** has one rewrite rule: an SPA fallback so `/work/<slug>` and similar client-routed paths don't 404 on a hard refresh.
- **`package.json`** only lists the two serverless function's dependencies (`@supabase/supabase-js`, `resend`) — there's no build/dev script because the frontend needs none.

There is no test suite. Verification has historically been: `node --check` on extracted `<script>` content to catch syntax errors, plus either the user reloading in their own browser, or (more recently) headless Playwright driving the actual unmodified file. Prefer the Playwright approach going forward if a browser is available — see `docs/project-history/workflow-html-verification.md` for the standing process.

## Content/editing model — important before touching anything UI-related

The site has its own in-page CMS, not a separate admin panel:

- **`?edit=1`** in the URL sets `localStorage.mw_author` and adds `body.author-mode` — this only controls whether the editing toolbar is *visible*. It does **not** make anything editable by itself.
- The toolbar's **Edit Mode** toggle (`editMode` JS variable) is what makes fields `contentEditable`. Gotcha: while Edit Mode is on, clicking a planet **selects it for mesh editing** instead of opening its booklet. To edit a project's booklet content, open the project first in normal mode, *then* toggle Edit Mode.
- Small text/config overrides persist to `localStorage` under the key `bric_copy` (the `copyOvr` object), via `window.BRICStore.getCopy()`/`setCopy()`. As of Aug 2026 this is also synced server-side (see "Content sync backend" below) — `bric_copy` is still the source `persistCopy()` writes to and every reader reads from, it's just no longer the *only* copy of the truth.
- Binary overrides (uploaded meshes, images, GLBs) persist to IndexedDB via the rest of `window.BRICStore`'s API — these are NOT part of the server sync (much larger payloads, different problem; still local-only, same as always).
- Standing product rule (`docs/project-history/maximize-customization.md`): treat every tunable — debug slider, baked constant, magic number — as something that should be exposed as editable content, not hardcoded. Don't ask whether an existing tunable should be editable; assume yes.

## Known landmarks in index.html (grep these, don't assume line numbers stay put)

- `<base href="/" />` — near the top of `<head>`. **Do not remove.** Without it, the site's relative asset paths (`./three.min.js`, `fetch('assets/manifest.json')`) resolve against the current URL's path instead of site root, so any deep link more than one segment deep 404s on its own JS engine. Full story in `docs/project-history/url-slugs-routing.md`.
- `window.BRICStore` — defined twice in the file (an early seed-script copy and a later canonical one). The second definition explicitly checks `if(window.BRICStore) return` before redefining, specifically to avoid clobbering the first one and losing an in-flight seed. Don't "clean up" the apparent duplication without reading both definitions.
- `CASES` object + `slugify()`/`uniqueSlug()`/`setRoute()` — routing helpers, defined together. `applyRouteFromLocation()` is defined *inside* `bootHolotable()`'s closure (near the final `animate()` call), not at top level, because it needs closure access to `activate`/`planetById`/`CASES` which aren't exposed on `window`.
- `_positionManualBook()` — measures both booklet pages and clamps/scrolls as needed so the booklet's visible height adapts to content (fixed Aug 13 2026; previously it only measured the left page and could cut off a taller right page below the fold).
- The **field-restore whitelist array** used to repopulate `CASES[id]` from stored overrides on boot — if you add a new persisted per-project field, it must be added to this array or edits will silently not survive a reload. This has bitten the project before (see `docs/project-history/url-slugs-routing.md`).

## Routing

Client-side only, via `history.pushState`/`popstate` — no server routing beyond the Vercel SPA-fallback rewrite. URL scheme: `/work/<project-slug>`, `/work/<project-slug>/<moon-slug>` (nested, artifacts), `/cv` (one slug for the whole CV route — per-node CV slugs were explicitly ruled out), `/holonet` (the internal dev id for this view/planet is `contact`; there is no separate "Contact" page — just HoloNet). Full detail and the two bugs that were found and fixed while building this: `docs/project-history/url-slugs-routing.md`.

## HoloNet backend — required environment variables

The two `api/holonet-*.js` serverless functions need these set in the Vercel project (not in the repo):

- `SUPABASE_SECRET_KEY` — service-role key, used server-side only, bypasses RLS.
- `RESEND_API_KEY` — optional; email alert on new message is skipped if unset.
- `HOLONET_ALERT_EMAIL` — optional, defaults to the owner's email if unset.
- `HOLONET_ADMIN_TOKEN` — required for message deletion; the client's admin-only delete button is a convenience, this server-side token check is the actual security boundary.

The Supabase project URL is hardcoded in both function files (not a secret — it's also embedded client-side).

## Content sync backend (adopted Aug 2026)

Before this, every in-page CMS edit (title/description/tags/snapshot rows/links/CTA/camera views/marquee text/galaxy layout — anything that used to only live in `copyOvr`/`bric_copy`) persisted to `localStorage` in whichever browser made the edit, full stop. No other visitor, device, or environment ever saw it. `content_overrides` (schema in `content-schema.sql`) is a flat `key -> value` mirror of `copyOvr`'s own shape — one row per top-level `copyOvr` key, no per-feature schema, so any new key the client ever starts writing round-trips through this table with zero migration.

**No new environment variables** — reuses `SUPABASE_SECRET_KEY` and `HOLONET_ADMIN_TOKEN` from the HoloNet section above. `HOLONET_ADMIN_TOKEN` was always a general site admin token in practice (the client already persists it under the generic key `mw_admintoken`, not a HoloNet-specific one) — this just gives it a second consumer.

**Reads happen two different ways in this file, on purpose** — don't "simplify" this into one pattern without reading why first:
- *Writes* always go through a serverless function using the secret key (`api/holonet-submit.js`, `api/holonet-delete.js`, `api/content-save.js`) — this is the actual security boundary, since RLS on both tables has no anon/authenticated write policy at all.
- *Reads* happen directly from the client using the separate publishable key, restricted by RLS to SELECT-only — `loadMessages()` does this for `messages`, and `reconcileServerContent()` (in the pre-boot IIFE, alongside `seedOne`/`seedCopy`, around line 1577) does the same for `content_overrides`. This avoids an extra Vercel round-trip for something that's genuinely public, read-only data.

**Boot-order matters here.** `reconcileServerContent()` is wired into the existing `window.__mwSeedReady` promise chain (the same one `bootHolotable()` already waits on before running at all) — specifically so the server's data lands in `localStorage['bric_copy']` *before* `bootHolotable()`'s first (and only) read of it. `galaxyModel`/zone geometry get baked synchronously from that first read; patching `copyOvr` after boot would leave stale zone geometry no amount of re-rendering fixes. If you're ever tempted to move this reconcile to run "after" boot for perceived simplicity, re-read this — it was a real bug caught during design review, not a hypothetical.

**Merge rule**: `localStorage['bric_copy_syncedAt']` tracks this browser's own last successful reconcile-or-save. If the server's newest row is newer than that, the server wins outright. Only if the server hasn't changed since this browser's last sync (true on a first-ever boot post-deploy, since the table starts empty) does local win — and only then does it get pushed up via `api/content-save`. This is deliberately NOT "admin token present → local always wins": that would let a second, stale admin browser (e.g. an old phone still carrying a months-old `?admintoken=`) clobber newer edits made from a different device on its next boot, since it has no way to know it's the stale one.

**One-time step after first deploy**: visit the live site once from the browser holding your actual, current content (the one you've been editing in) — this triggers the "local wins, push up" path above and seeds the (initially empty) `content_overrides` table from what's already in that browser's `bric_copy`. Confirm rows appear in the Supabase Table Editor afterward. After that, every visitor (including a fresh incognito window, including you on a different device) sees it.

## Deployment

Deployed on Vercel. Pushing to `main` should trigger a deploy if Vercel's git integration is connected to this repo — this hasn't been independently re-verified from Claude Code, so confirm on first push rather than assuming.

## Git workflow (adopted Aug 14 2026)

`main` is the source of truth and should reflect what's live. For any non-trivial change:

1. Branch off `main`: `git checkout -b feat/short-name` (`feat/` new work, `fix/` bugs, `chore/` cleanup/config/docs).
2. Commit in small, clearly-described chunks as you go rather than one large commit at the end.
3. Push the branch: `git push -u origin feat/short-name`.
4. GitHub auto-generates a compare/PR link on push — open a PR even solo; it gives a diff view before anything lands on `main`, which matters a lot in a single 13k-line file where it's easy to lose track of exactly what changed.
5. Merge after review.

As of Aug 18 2026, `gh` is installed and authenticated (account `mundaneworkshop`) in the Claude Code environment — use `gh pr create` directly instead of the web compare-link flow. (Earlier sessions had no `gh` CLI and used the web flow instead; if `gh auth status` fails in a future environment, fall back to that.)

## Where the rest of the context lives

`docs/project-history/` — see `docs/project-history/00-INDEX.md` for a topic-by-topic map. It's a snapshot of ~4 months of design/build decisions, hard-won bugs (some regressed 2-3 times before the real root cause was found), and explicit product calls from the designer. It won't be kept in sync automatically going forward — if you make a decision here worth remembering the same way, write it down somewhere in this repo (a new file in `docs/project-history/` or inline comments) rather than relying on this snapshot staying current.
