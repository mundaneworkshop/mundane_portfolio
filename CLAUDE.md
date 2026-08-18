# mundane_portfolio

Jason Hsin's portfolio site — a WebGL "galaxy" of clickable project planets (Three.js r128), built and maintained mostly through AI pair-programming sessions since April 2026. This file is the entry point for picking up development in Claude Code; `docs/project-history/` has the full accumulated design/build decision log from the Cowork sessions that built it — read the relevant file there before touching anything non-trivial, especially anything flagged INVARIANT or "regressed N times."

## What this is, architecturally

- **`index.html`** is the entire site: ~13,000 lines, ~660KB, single file. No build step, no bundler, no framework. Several `<script>` blocks inline. This is a deliberate choice made early in the project, not an oversight — see `docs/project-history/homepage-holotable-prototype.md` for the original architecture decision.
- **`api/holonet-submit.js`** and **`api/holonet-delete.js`** are two Vercel serverless functions backing the HoloNet (contact) feature — a Supabase-backed shared message board. `holonet-schema.sql` is the table schema.
- **`vercel.json`** has one rewrite rule: an SPA fallback so `/work/<slug>` and similar client-routed paths don't 404 on a hard refresh.
- **`package.json`** only lists the two serverless function's dependencies (`@supabase/supabase-js`, `resend`) — there's no build/dev script because the frontend needs none.

There is no test suite. Verification has historically been: `node --check` on extracted `<script>` content to catch syntax errors, plus either the user reloading in their own browser, or (more recently) headless Playwright driving the actual unmodified file. Prefer the Playwright approach going forward if a browser is available — see `docs/project-history/workflow-html-verification.md` for the standing process.

## Content/editing model — important before touching anything UI-related

The site has its own in-page CMS, not a separate admin panel:

- **`?edit=1`** in the URL sets `localStorage.mw_author` and adds `body.author-mode` — this only controls whether the editing toolbar is *visible*. It does **not** make anything editable by itself.
- The toolbar's **Edit Mode** toggle (`editMode` JS variable) is what makes fields `contentEditable`. Gotcha: while Edit Mode is on, clicking a planet **selects it for mesh editing** instead of opening its booklet. To edit a project's booklet content, open the project first in normal mode, *then* toggle Edit Mode.
- Small text/config overrides persist to `localStorage` under the key `bric_copy` (the `copyOvr` object), via `window.BRICStore.getCopy()`/`setCopy()`.
- Binary overrides (uploaded meshes, images, GLBs) persist to IndexedDB via the rest of `window.BRICStore`'s API.
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
