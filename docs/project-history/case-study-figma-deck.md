# Case studies via embedded Figma Slides deck

Direction taken Aug 20 2026, replacing the chapter constellation
(`case-study-constellation-SHELVED.md`). Case studies live in the existing Figma Slides
deck — `https://www.figma.com/slides/UnJKz3zGBvRwSvCvjtJbgP` ("JH Q2'26") — rather than
being re-authored as ten chapters of site-native content.

**The brick cascade survives and is the point of continuity**: kit box / CTA click →
cascade → the deck, inside a page that keeps the breadcrumb and the star field.

## What is verified

Figma's Embed Kit 2.0 exposes these base URLs (confirmed against Figma's developer docs,
Aug 2026):

| endpoint | renders |
|---|---|
| `embed.figma.com/deck` | **Figma Slides in presentation view** ← the one this wants |
| `embed.figma.com/slides` | Slides file in editor view |
| `embed.figma.com/design` | design file |
| `embed.figma.com/proto` | prototype |
| `embed.figma.com/board` | FigJam |

So the plan is achievable: `/deck` gives the presentation without editor chrome. Embeds
support hiding UI, theme (light/dark/system), page selection and fullscreen permissions.
The exact query-parameter names were NOT nailed down — do that against
`developers.figma.com/docs/embeds/embed-kit-2.0/` before building, not from memory.

**Sharing is a hard requirement**: the deck must be link-shared publicly. An org-restricted
file shows a login wall to every visitor, and it will look fine to you because you're
signed in. Test in a private window before shipping.

## Design of the wrapper page

The pieces already exist and this is mostly assembly:

- **Star field** — already renders; the embed is a DOM rectangle over the canvas, exactly
  like the booklet is today. Nothing needs to change in the renderer.
- **Breadcrumb** — `renderCrumb` already supports clickable ancestor segments.
- **Route** — reuse `/work/<slug>`; the deck replaces the constellation as what the CTA
  opens. `vercel.json`'s SPA rewrite already covers it.
- **Cascade** — `BrickField` + curtain, unchanged.

## THE ONE REAL DESIGN PROBLEM — read before building

**The cascade is ~1–2s. A cold Figma embed is slower than that, and shows its own loading
state.** Naively wiring cascade → reveal gives: bricks → a blank grey Figma frame → the
deck. That is *worse* than no transition, because it draws attention to the seam.

The fix is to make the curtain do double duty: start loading the iframe **hidden, behind
the closed curtain**, and only tear the curtain down once the iframe reports it is ready
(or a timeout fires). The cascade then covers the load instead of racing it. The curtain
already has a wall-clock guard for backgrounded tabs (see `webgl-brick-cascade.md`) — the
same mechanism applies here.

This is the single highest-risk part of the direction. Everything else is assembly.

## Built Aug 20 2026 — the wrapper

`/work/<slug>/case` renders the deck. `CASE_STUDY_MODE` ('deck' | 'constellation') picks
between this and the shelved ring, so the shelf promise stays honest.

- **`deckEmbedURL()` is the only place that knows Figma's URL shape.** It accepts either a
  plain Slides URL or what "Get embed code" gives you and normalises to
  `embed.figma.com/deck/<key>/<name>`. `embed-host` is REQUIRED by Embed Kit 2.0 and is set
  to `mundane-workshop`. `node-id` carries the start slide. If Figma changes parameters,
  fix that function and nothing else.
- **The CTA now gates on having a deck.** `ctaActive` for a work project defaults from
  `deckHasContent(pid)`, which is the per-project gating `CASE_STUDY_CTA_ENABLED` was
  always standing in for. An explicit author override still wins.
- **`openCaseStudyRoute` is now genuinely the single entry point.** It was documented as
  one but three call sites reached past it straight to `window.csOpenCaseStudy` — so after
  the pivot the CTA still opened the constellation. Caught in testing. Add new triggers
  through `window.openCaseStudyRoute`.

### The curtain now HOLDS instead of racing (this was the stated risk)

`BrickField.run` takes an optional `hooks.gate()`, polled once per frame at full brick
coverage. While it returns false the timeline PINS at `exitStart` — `now` stops advancing
rather than the loop stalling, so the shader keeps running and nothing looks hung. Capped
at `GATE_MAX` (6s), and the wall-clock guard was extended by the same amount so it can't
tear the curtain down mid-hold. The reduced-motion cross-fade honours the same gate via a
poll, or reduced-motion visitors would get exactly the blank-frame flash this prevents.

Gate arithmetic is unit-tested against the real source (holds until open, gives up at
GATE_MAX, no hold when already ready, accumulates the right wait).

### Ready detection is layered, because Figma has no single "painted" signal

**iframe `onload` fires while the deck is still blank** — observed, not theorised. So:
postMessage from a `figma.com` origin (best — the app is actually running) → `onload` +
1.4s settle (fallback) → 9s hard cap. First one wins.

Independently, a **veil** covers the iframe until ready. It is deliberately not tied to the
cascade gate: if the gate gives up at GATE_MAX the reader still sees the veil, never a
half-painted embed.

### Verified / not verified

Verified in a headless pane: the wrapper renders a third-party iframe at the right size
with the site's chrome and starfield; the embed URL builds correctly; route, breadcrumb,
booklet dismissal and teardown (iframe `src` removed on exit) all work; the CTA → cascade →
deck path lands; **a public Figma embed renders inside the wrapper**.

NOT verified: the JH Q2'26 deck itself renders blank in that pane after 10s, while Figma's
own public example renders. It is not sharing (anonymous view of the deck works) and not
URL construction (the endpoint returns and fires onload). Cause undetermined — **check it
in a real browser before trusting the embed**.

## Open questions

- ~~Deep-linking to a specific slide.~~ ANSWERED — `node-id` carries it, authored per
  project as `deck:<pid>:node`. One combined deck can serve every project.
- **SEO and indexing.** An iframe's contents are opaque to search engines. Today the
  booklet text is real DOM and indexable; a deck is not. For a portfolio people find by
  searching a name, that is a genuine cost. Mitigation: keep a short site-native summary
  above or below the embed, so the page isn't content-free.
- **Aesthetic seam.** Figma's presentation chrome is Figma's, not BRIC. The embed is a
  rectangle of someone else's UI inside a very deliberate cassette-futurism frame. Worth
  deciding whether to lean into a "terminal window" framing device rather than pretend the
  seam isn't there.
- **Mobile.** Figma Slides presentation on a phone is rough. The constellation ignored
  mobile too, so this isn't a regression — but it's now the only case study path.
- **Offline / Figma outage.** The case studies become unavailable if Figma is down or the
  share link is revoked. Previously they'd have been site-native.
- **Do the chapter routes get retired?** `/work/<slug>/case/<chapter>` URLs currently
  resolve. If any were ever shared they should redirect rather than 404.

## What of the constellation work is reusable here

- `MWSubScene` / `MWOrbit` — general, untouched by this
- The brick cascade — used as-is
- Clickable breadcrumb ancestors — used as-is
- The per-chapter object system and the ring itself — not used, but left in place behind
  `CASE_STUDY_CTA_ENABLED`
