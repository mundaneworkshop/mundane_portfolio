# Entry gate text + hold-then-dock (Oct 22 2026)

> The entry gate (monogram on a starfield, before the first click) carries the site's one-line intro. Clicking the monogram now HOLDS (the monogram keeps spinning) for 0.7 s while the text leaves, then runs the dock itself at 0.3 s (2x the original 0.6 s speed).

## What's on screen
- **H1** `MUNDANE WORKSHOP` above the monogram (`#gateTitle`, Chakra Petch, holo teal). Aurebesh -> Latin decode on pointer-enter (mouse only), via the shared `GFX` engine as surface `Gate` (`gxGate*` params, same Dur / Delay / Tick / Scatter as the other surfaces; `noClip` so wide glyphs never get cut).
- **Two H2 lines** below it (`.gate-h2`), "The creative practice of Jason Hsin" and "A product designer building digital consumer experiences", on one tilted plane (`.gate-plane`: `rotateX(--gate-tilt)`, origin at its top edge, parent `perspective: --gate-persp`) so they get the Star Wars crawl convergence. They are children of the same plane, so the rise/exit travel happens in plane space (perspective-correct).
- Position: `gateLayout()` (index.html, just before `startDock`) projects the monogram quad's bounding box every frame in the entry phase and writes `--gate-top` / `--gate-bot` on `#gate`; the H1 sits `--gate-gap` above the box and the crawl `--gate-gap` below it, so it follows any viewport size, zoom or orbit. Text is positioned from the quad box, which is a little larger than the visible mark.

## Timing
- **Fade-in is staggered and waits for the camera.** `gateLayout()` counts frames in which the monogram's on-screen box has not moved (24 = about 0.4 s, and only once the box is a real size, because the quad is empty while the monogram loads); then `body.mw-gate-on` starts the CSS transitions with delays measured from that moment: H1 after 1000 ms, the H2 layer after 1800 ms, the second H2 line 500 ms after the first. Each is 1000 ms, `cubic-bezier(.22,1,.36,1)`, rising 46 px (in plane space for the H2 lines).
- **Click** (`startDock`): `mw-gate-on` -> `mw-gate-out`. All gate text (H1, both H2 lines, the bottom hint) fades up and out over 600 ms, `cubic-bezier(.4,0,.2,1)`. The H2 lines travel `--gate-exit` up the tilted plane (computed from the monogram's box and the tilt, about 420 px of plane at 1024x768) and foreshorten into a sliver as they recede, while an elliptical mask around the monogram (`--gate-cx/cy/rx/ry`, set by `gateLayout`) hides them, so they appear to scroll BEHIND it.
- **Hold, then dock.** `startDock` only schedules the dock (`_dockAt = now + params.dockHold`, default 0.7 s, must be >= the 600 ms exit); the phase stays `entry` so the monogram keeps spinning. `mwUpdate` then calls `beginDock()` (the old `startDock` body) and the dock runs for `params.dockDur` (default 0.30 s; it was 0.60 s originally, briefly 3 s). `mw-entrygate` is removed and the boot cascade starts when it completes, as before. Measured: text gone at 0.61 s, dock starts about 0.7 s, docked about 1.0-1.1 s.
- Only `transform` and `opacity` animate (plus the mask). `prefers-reduced-motion`: opacity only, no travel, no stagger delay; the hover decode is skipped.

## Type
- H1: Chakra Petch (`--display`) 600, caps, 0.34em tracking, holo teal. H2: Space Grotesk (`--grotesk`) 500, all caps with 0.14em tracking by default (caps need more tracking than mixed case), colour amber by default (white, teal and amber are switchable in the panel; white read flat against the teal H1, teal blended with it, amber separates the two layers and gives the crawl its character). The H2 lines are `white-space:nowrap` at 2.2vw so each stays on ONE line on desktop; below 700 px width they wrap.
- The H1 decode draws one span per glyph into a centred flex row (not `GFX.decodeEl`, whose frozen box left-aligned the scramble), so it stays centred while the Aurebesh widths change.

## Tunables (Debug panel)
"Entry gate · text": crawl tilt (52 deg), perspective (320 px, lower = stronger), gap to the monogram (22 px), fade-in (1000 ms), fade-out (600 ms), rise travel (46 px), H1 delay (1000), H2 delay (1800), second-line stagger (500), H2 colour, H2 caps, H2 letter-spacing -> `params.gate*`, applied as custom properties by `applyGate()`. "Glyph decode · entry gate title". "Dock duration (the move itself)" and "Hold before the dock".

## Gotchas
- Deep links and the skip-entry path never show it: `#gate` is `display:none` unless `body.mw-entrygate`.
- Copy lives in the markup, not in `copyOvr`; make it editable if the CMS needs it.
