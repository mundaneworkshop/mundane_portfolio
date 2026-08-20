# Case study chapter ring

> **SHELVED Aug 20 2026.** This describes code that is built and works but is gated off
> behind `CASE_STUDY_CTA_ENABLED`. See `case-study-constellation-SHELVED.md` for why and
> `case-study-figma-deck.md` for the direction that replaced it. Everything below is still
> accurate about the code — it just isn't the shipping path.

The case study view: a flat ring of chapter nodes around a project hub, entered through
the brick cascade from a kit box or manual CTA. Built Aug 19 2026 on `MWSubScene`.
Companion docs: `webgl-brick-cascade.md` (how you get here), `box-replacement-focus.md`
(the galaxy-vs-focus mesh precedent this borrows from), `url-slugs-routing.md` (routing).

## Framing a focused chapter — INVARIANT, derived not guessed

`csSelect` puts the camera on the line from the hub out through the focused chapter and
looks **at the chapter, not at the hub**. Looking at the hub keeps the constellation
centred but pushes the chapter itself low, straight down behind the booklet — which is
exactly the bug that was reported and fixed here.

The yaw needs deriving, and getting it wrong is subtle rather than obvious:

- `csNodePos` lays the ring out on `(cos a, y, sin a)`, with `a = π/2 − (i/n)2π`.
- `MWOrbit.apply` reads yaw on `(sin yaw, y, cos yaw)`.

Those conventions are **mirrored**. The camera direction matching a node's own outward
radial is therefore `yaw = π/2 − a = (i/n)2π`. Using `a` directly puts the camera near
perpendicular to the radial, which reads as "the chapter is off to one side and too low"
rather than as an obviously wrong camera.

Verified by measurement, not by eye: `window.__ring()` projects the focused node to
screen space. Correct framing is **x = 50%, y ≈ 32%**, with the booklet's top edge at
~52%. Keep that hook — every internal here lives in `bootHolotable()`'s closure, so
without it the only way to check a framing change is to squint at a screenshot.

`chapterFrac` is what lifts the chapter clear of the booklet: `look` is dropped below the
node by `(0.5 − chapterFrac)` of the visible height at `chapterDist`.

## Arrive vs swing

A deep link opens the page **already** at a chapter. Easing in from the galaxy home pose
plays a ~2s camera move the visitor never made. `csSelect(i, snap)` takes a flag, set only
on the route-restore path, that places the orbit *and* the camera outright (`camSnap`, read
once in `animate()`). User-driven moves — stepper, node click, keyboard — still ease, so
stepping around the ring keeps reading as a swing rather than a cut.

Two easing rates are in play and their ORDER MATTERS: `CS_RING.ease` (orbit, 0.04) must
stay below `animate()`'s camera lerp (0.06). If the orbit outruns the camera, the camera
trails it and cuts a chord straight through the middle of the ring instead of swinging
around the outside.

## The stepper hides at the ring

At ring level the whole set is on screen and every chapter is one click away, so the 1..N
stepper is clutter over the constellation. `csPlaceNav()` toggles it on `csAtChapter`.

## Per-chapter objects — two tiers

Mirrors how a project reads as a PLANET in the galaxy and a KIT BOX once focused:

| slot | key | what it is |
|---|---|---|
| ring | `chmesh:<pid>:<chId>` | how the chapter looks sitting on the ring |
| focus | `chfocus:<pid>:<chId>` | what replaces it once that chapter is the subject |

Focus falls back to the ring visual, which falls back to the built-in holo sphere. So
setting only the ring tier means "same object, bigger when focused", and setting only the
focus tier is equally valid. Sizes are two separate authored dials (`objR`, `objFocusR`)
because the same object needs different mass at ring distance and at `chapterDist`.

Accepts everything the focus-view box replacement already parses — `.glb/.gltf/.obj/.svg/
.stp` and bitmaps — by reusing the same record shape, so the two features cannot drift.

**Storage is split, deliberately.** Binary uploads go to IndexedDB and stay local to the
authoring browser, like every other mesh override in this file. A **video is only a URL**,
so it goes to `copyOvr` and syncs to every visitor — which is the entire point of putting
a video on a public case study. Burying it in IndexedDB would have made it invisible to
everyone but the author.

**One slot holds one thing.** Setting a video clears that slot's upload and uploading
clears that slot's video, so there is never a precedence question to answer at read time.

### Traps this hit

- **Re-tiering must be lazy.** `csNodeVisual` rebuilds only when a node's tier actually
  changes. Rebuilding all of them on every step re-decodes ten GLBs per keypress.
- **Late async must not land.** Every swap takes a ticket (`n._tok`). An upload that
  resolves after the reader has moved on must not mount onto a node that has since
  changed tier — it gets disposed instead.
- **Videos must be stopped, not just detached.** An unreferenced `<video>` keeps decoding
  for as long as it has a `src`. Teardown pauses, clears `src`, reloads and removes it.
  Confirmed: leaving the case study leaves zero `<video>` elements in the DOM.
- **The `<video>` lives in the document, off-screen at 1px.** A detached element textures
  fine in Chrome but Safari/iOS will not reliably decode one, and `display:none` stops
  playback outright.
- **Hidden documents suspend media** and do not always resume on return — same family as
  the cascade's rAF stall. A `visibilitychange` listener re-plays chapter videos.
- **`prefers-reduced-motion` suppresses autoplay**, leaving the decoded first frame up as
  a still. Same bargain the brick cascade strikes.

### What video does NOT do

`THREE.VideoTexture` needs a direct `.mp4`/`.webm` served with CORS. A YouTube or Vimeo
**embed page is an iframe** and cannot be drawn into WebGL. If an iframe embed is ever
wanted, it has to be a DOM overlay positioned over the canvas — a different feature, not
an extension of this one. The panel says so inline so it isn't rediscovered the hard way.
