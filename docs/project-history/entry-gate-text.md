# Entry gate text + slow dock (Oct 22 2026)

> The entry gate (monogram on a starfield, before the first click) now carries the site's one-line intro, and the dock transition is a slow 3 s move instead of a 0.6 s snap.

## What's on screen
- **H1** `MUNDANE WORKSHOP` above the monogram (`#gateTitle`, Chakra Petch, holo teal). Aurebesh -> Latin decode on pointer-enter (mouse only), via the shared `GFX` engine as surface `Gate` (`gxGate*` params, same Dur / Delay / Tick / Scatter as the other surfaces; `noClip` so wide glyphs never get cut).
- **Two H2 lines** below it (`.gate-h2`), "The creative practice of Jason Hsin" and "A product designer building digital consumer experiences", on one tilted plane (`.gate-plane`: `rotateX(--gate-tilt)`, origin at its top edge, parent `perspective: --gate-persp`) so they get the Star Wars crawl convergence. They are children of the same plane, so the rise/exit travel happens in plane space (perspective-correct).
- Position: `gateLayout()` (index.html, just before `startDock`) projects the monogram quad's bounding box every frame in the entry phase and writes `--gate-top` / `--gate-bot` on `#gate`; the H1 sits `--gate-gap` above the box and the crawl `--gate-gap` below it, so it follows any viewport size, zoom or orbit. Text is positioned from the quad box, which is a little larger than the visible mark.

## Timing
- Fade up and in: 1000 ms, `cubic-bezier(.22,1,.36,1)`, translate `--gate-rise` (46 px, in plane space) to 0. Starts the first frame the monogram is visible (`body.mw-gate-on`).
- Click the monogram (`startDock`): `mw-gate-on` is swapped for `mw-gate-out`, so ALL gate text (H1, both H2 lines, and the small bottom hint) fades up and out over 600 ms, `cubic-bezier(.4,0,.2,1)`, travelling `--gate-rise` upward.
- `dockDur` default 0.60 -> 3.00 s (slider max 3 -> 8). Returning browsers with the old saved value are migrated (`cfgV` 5). The monogram's existing smoothstep ease and spin-to-flat slerp now play over those 3 s; `mw-entrygate` is removed (and the boot cascade starts) when the dock completes, as before.
- Only `transform` and `opacity` animate. `prefers-reduced-motion`: opacity only, no travel; the hover decode is skipped by `GFX`.

## Tunables (Debug panel)
"Entry gate · text": crawl tilt (52 deg), perspective (320 px, lower = stronger), gap to the monogram (22 px), fade-in (1000 ms), fade-out (600 ms), rise / exit travel (46 px) -> `params.gate*`, applied as custom properties by `applyGate()`. "Glyph decode · entry gate title". "Dock duration".

## Gotchas
- Deep links and the skip-entry path never show it: `#gate` is `display:none` unless `body.mw-entrygate`.
- Copy lives in the markup, not in `copyOvr`; make it editable if the CMS needs it.
