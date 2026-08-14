# CV + HoloNet (Contact) focus views

> CV (3D hyperspace route) + Contact/HoloNet (comm console → message-star wall) bespoke focus views in index.html.

CV and HoloNet planets get BESPOKE focus views (not the kit-box/booklet at their top level). `activate()` routes id `'cv'` → `openCV` → `enterCVRoute`, `'contact'` → `openContact` (internal dev id is `contact`; the exposed name/route is HoloNet — see url-slugs-routing.md).

## CV — 3D hyperspace route

`enterCVRoute(grp)`: focuses the cv planet, disables autoRotate, hides the galaxy (`galaxy.visible=false`), shows `cvRouteGroup` (starfield + per-segment lane lines + node spheres + ship). Body gets `mw-altfocus`+`mw-cvroute` classes. **Default on load = overview zoom with the latest node active** (gold, pulsing).

**Node model**: `cvData` is a TREE persisted in `copyOvr['cvRoute']`. Node = `{id, parent, title, sub, kicker, body, tags, pos[x,y,z], disabled, branch}`. `rebuildCVRoute()` is re-runnable. A disabled node renders as a dashed "path not taken" line + dimmed sphere. `cvLatestId` = the deepest LEAF of the main (non-branch) path.

**Per-node edit controls** (Edit Mode): add-linear, add-branch, toggle-branch, toggle-disabled, delete-node (reparents children, guards against deleting the last node).

**Nav has two levels**: overview (wide cam, booklet hidden) and node (dolly-in, booklet shown). Clicking a node uses an invisible larger hit-sphere (a real bug: without it, the tiny node orb was unclickable at overview zoom and clicks fell through to overview). Camera auto-fits the route's bounding box on entry/rebuild.

**Details reuse the project manual** (`#manual-scene`) via `CS.showBooklet(cvDataForBooklet(id))` — fully editable in Edit Mode, writing to the tree NODE, never the cv planet itself. A booklet subtitle field was added (hidden for projects/artifacts where it doesn't apply). CTA = "Download CV (PDF)" — currently a toast stub, needs a real PDF wired up.

**Ship**: travels the lane path between nodes on selection, GLB-uploadable (falls back to a cone). Orientation/facing and speed are Edit Mode debug controls, persisted.

**Known historical gotcha (fixed):** `.manual-title`/`.manual-framing` are global inline-edit nodes bound to whichever planet is "focused" — CV keeps the cv planet focused underneath, so an early version of editing a CV node title wrote into `case:cv:title` instead, corrupting the menu label. Fixed by rerouting `commitInline` for CV context to the node object, plus a one-time boot cleanup that deletes stray `case:cv:*` keys.

## Contact / HoloNet

`#contactFocus` is a dark holo console: name+message fields (maxlength 40/280, live remaining-character counters), a GLB upload slot (renders via its own mini WebGL renderer, own Holo FX/Pixelize/Posterize toggles), and a "transmit" action. Menu label renamed from "Contact" to "HoloNet" — the internal id stays `contact` (routing keys off the stable id).

**Accent = purple `#A06AF0`** (hot `#C8AAFF`) — deliberately maximally separated from amber (work) and teal (system). Applied to the message-star default, the modal, the HoloNet planet itself, the menu button, and a "constellation hover" effect (hovering the HoloNet node draws purple conduit lines to every message star).

Transmit flow: send → go home → a full-screen launch animation (uploaded GLB spins then launches off-screen, falls back to a default ship SVG) → the message is added → camera focuses/dollies on the new star.

## Message stars (visitor transmissions)

Real backend as of Aug 2026 (see api/holonet-submit.js, api/holonet-delete.js, and holonet-schema.sql at the repo root) — Supabase-backed shared `messages` table, a serverless submit endpoint with validation + an email alert via Resend, admin-only delete gated by a server-side secret token (`HOLONET_ADMIN_TOKEN`), not the client-side "author mode" flag. Older notes below describe the pre-backend, localStorage-only version — the general rendering/interaction model (canvas-drawn pixelated stars, click → modal, purple constellation hover) is unchanged; only the storage layer changed.

Stars are drawn on a low-res canvas so they inherit the site's global pixelize/posterize post-processing. Scattered on an outer ring beyond the planet plate so they never collide with planets.
