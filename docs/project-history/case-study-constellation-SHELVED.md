# Case study constellation — SHELVED Aug 20 2026

**Status: built, working, and deliberately unreachable.** Shelved in favour of linking or
embedding the Figma Slides deck instead. Nothing was deleted — this is a pause, not a
revert, and the code is intended to be pickable-up.

If you are resuming this, read `case-study-chapter-ring.md` first for the mechanics. This
file is the *why*, the decisions that are already locked, and what was still unanswered.

## How to bring it back

The constellation is gated behind `window.CASE_STUDY_CTA_ENABLED` (index.html, ~line 1697),
currently `false`. That flag is the only thing standing between the current site and the
chapter ring — the routes (`/work/<slug>/case/<chapter>`), the ring, the booklet, the
authoring panel and the brick cascade into it are all live code that works today.

To see it without shipping it: set the flag true in devtools, or hit a
`/work/slate-auto/case/snapshot` URL directly.

## What was actually built and verified

- Flat ring of 10 chapter nodes around a project hub, on `MWSubScene`
- Brick cascade transition into it, with real LEGO geometry (PR #21)
- Camera framing on a focused chapter — measured at x=50%, y≈32%, booklet top at ~52%
- Deep links arrive without a camera glide; user-driven moves ease
- Per-chapter two-tier objects: ring visual + focus override, with size dials
- Uploads (.glb/.gltf/.obj/.svg/.stp/bitmap) and direct-mp4 video-on-node
- Authoring panel for all of the above, values syncing through `copyOvr`

## Decisions that are LOCKED — do not re-litigate without a reason

1. **Built on the WebGL galaxy engine, self-hosted on Vercel — not Framer.** The whole
   point was reusing the existing foundation. (Original direction, Aug 19.)
2. **Chapters are equidistant on a FLAT circular plane**, not a sphere or a spiral. Ten
   chapters, fixed list in `CS_CH_DEFAULT`, hideable per project.
3. **Each chapter re-uses the project focus-view layout** — object above, instruction
   manual booklet below. It is not a new page type.
4. **Chapter 1 sits at the ring's front, sequence runs clockwise on screen** so "next" is
   always the same direction.
5. **Reverse navigation is a quick fade**, not a reverse cascade.
6. **The cascade and the layout were separate PRs**, deliberately.
7. **Slate Auto (`w1`) is the pilot project.**
8. **Camera looks at the CHAPTER, not the hub.** Looking at the hub pushes the chapter
   down behind the booklet. This was a reported bug, fixed, and the maths is written down.
9. **Video on a 3D node is a direct .mp4/.webm only.** A YT/Vimeo embed is an iframe and
   cannot be textured into WebGL — this is a hard browser limit, not a gap in the code.
10. **Binary uploads stay in IndexedDB (local); URLs go to `copyOvr` (synced).** Same split
    as the rest of the file.

## Open questions if this is picked back up

**Content — the real blocker, and the reason this stalled.**
- The intake form exists (published Artifact, Aug 19) but was never filled in. No chapter
  prose exists for any project. Every chapter currently renders "This chapter has not been
  written yet."
- Chapters 06 (Collaboration map) and 10 (Next / learnings) had **no source material** in
  the Figma deck. They would need writing from scratch.
- The deck's existing case studies were judged to need "an aggressive amount of editing"
  to fit the 10-chapter format. That editing never happened. **This is the actual cost of
  this direction, and it is what the Figma-deck pivot avoids.**

**Product**
- `CASE_STUDY_CTA_ENABLED` is global. It was always meant to become per-project, derived
  from "does this project have authored chapters" — so a half-written case study can't be
  reached. Never done.
- Read-mode fallback at `?read=1` (a plain vertical document version of all ten chapters,
  for people who don't want to fly a camera around) was agreed in principle, never built.
- Per-chapter mesh authoring exists, but no chapter has an actual object yet.

**Technical**
- Node click-picking was never verified end-to-end by automated test — the browser pane
  throttles rAF, so nodes move between a synthetic hover and click. It was verified by
  hand and via stepper/routes. If resumed, test this on a real browser first.
- Booklet media slot (YT/Vimeo facade in the DOM booklet) was specced but not built.
- Mobile was never considered at all. The ring assumes a landscape viewport and a mouse.

## Why it was shelved

Not because it didn't work — it does. The constellation is a content-hungry format: ten
chapters × N projects of original writing, in a structure the existing deck doesn't match.
The deck already exists and already tells the stories. Shelving trades a bespoke navigation
metaphor for actually having case studies.

The brick cascade **survives the pivot** and is the piece worth keeping regardless — see
`case-study-figma-deck.md` for where it goes next.
