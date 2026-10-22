# Entry gate text + hold-then-dock (Oct 22 2026)

> The entry gate (monogram on a starfield, before the first click) carries the site's one-line intro. Clicking the monogram now HOLDS (the monogram keeps spinning) for 0.7 s while the text leaves, then runs the dock itself at 0.3 s (2x the original 0.6 s speed).

## What's on screen
- **H1** `MUNDANE WORKSHOP` above the monogram (`#gateTitle`, Chakra Petch, holo teal). It has no hover effect: the Aurebesh decode that briefly lived on it was removed (too much).
- **Two H2 lines** below it (`.gate-h2`), "The creative practice of product designer Jason Hsin" / "Building delightful digital consumer experiences", on one tilted plane (`.gate-plane`: `rotateX(--gate-tilt)`, default 34 deg, origin at its top edge, parent `perspective: --gate-persp`, 520 px) for the Star Wars crawl convergence. 52 deg / 320 px was too extreme to read. They are children of the same plane, so rise/exit travel happens in plane space.
- Position: `gateLayout()` (index.html, just before `startDock`) projects the monogram quad's bounding box every frame in the entry phase and writes `--gate-top/bot/cx/cy/rx/ry`, `--gate-exit` and `--gate-h1-fly` on `#gate`; the H1 sits `--gate-gap` above the box and the crawl `--gate-gap` below it, so it follows any viewport size, zoom or orbit. The box is the quad's, a little larger than the visible mark.

## Timing
- **Fade-in is staggered and waits for the camera, with no input needed.** `gateLayout()` measures settle in WALL-CLOCK time (`GATE_SETTLE_MS` 400: the box has not moved, and is a real size, because the quad is empty while the monogram loads), with a `GATE_MAX_WAIT_MS` (3 s) fallback; then `body.mw-gate-on` starts CSS transitions with delays from that moment: H1 after 1000 ms, the first H2 line 400 ms after the H1 starts (`--gate-h2-delay` 1400), the second H2 line 500 ms after that. Each is 1000 ms, `cubic-bezier(.22,1,.36,1)`, rising 46 px (plane space for the H2 lines). It used to count frames, which stalls when the page is throttled (a hidden preview pane renders nothing at all until something wakes it; that can look like "it only starts after a click"). Nothing in the gate listens for clicks except the monogram click that starts the dock.
- **Click** (`startDock`): `mw-gate-on` -> `mw-gate-out`. Over 600 ms: the H1 FLIES DOWN into the monogram (`--gate-h1-fly`, shrinking to 0.45, accelerating), the H2 lines recede up the tilted plane (`--gate-exit`) and foreshorten into a sliver, and an elliptical mask around the monogram (`--gate-cx/cy/rx/ry`) hides each once it is inside the mark, so everything appears to go behind/into it. Opacity eases IN (`cubic-bezier(.65,0,.9,.5)`) so the text stays visible during the flight and drops as it arrives; the bottom hint fades with it.
- **Hold, then dock.** `startDock` only schedules the dock (`_dockAt = now + params.dockHold`, default 0.7 s, must be >= the 600 ms exit); the phase stays `entry` so the monogram keeps spinning. `mwUpdate` then calls `beginDock()` and the dock runs for `params.dockDur` (default 0.30 s; 0.60 s originally, briefly 3 s). `mw-entrygate` is removed and the boot cascade starts when it completes. Measured: text gone at about 0.6 s, dock starts about 0.7 s, docked about 1.0-1.1 s.
- Only `transform` and `opacity` animate (plus the mask). `prefers-reduced-motion`: opacity only, no travel, no stagger delay.

## Type
- H1: Chakra Petch (`--display`) 600, caps, 0.34em tracking, holo teal. H2: Space Grotesk (`--grotesk`) 500, all caps with 0.14em tracking by default (caps need more tracking than mixed case), teal by default (`--holo`; white and amber are switchable in the panel: white read flat, amber was tried and rejected). The H2 lines are `white-space:nowrap` at 2.2vw so each stays on ONE line on desktop; below 700 px width they wrap.

## Tunables (Debug panel)
"Entry gate · text": crawl tilt (34 deg), perspective (520 px, lower = stronger), gap to the monogram (22 px), fade-in (1000 ms), fade-out (600 ms), rise travel (46 px), H1 delay (1000), H2 delay (1400), second-line stagger (500), H2 colour, H2 caps, H2 letter-spacing -> `params.gate*`, applied as custom properties by `applyGate()`. "Dock duration (the move itself)" and "Hold before the dock".

## Gotchas
- Deep links and the skip-entry path never show it: `#gate` is `display:none` unless `body.mw-entrygate`.
- Copy lives in the markup, not in `copyOvr`; make it editable if the CMS needs it.
