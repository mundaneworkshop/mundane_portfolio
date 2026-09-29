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

## Open questions

- **Deep-linking to a specific slide.** Is there a per-slide parameter on `/deck`, so
  `/work/slate-auto` can open at that project's first slide rather than slide 1 of a
  combined deck? If not, the alternative is one deck per project. **Unverified — check
  this early, it changes the deck's structure.**
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
