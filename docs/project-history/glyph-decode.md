# Glyph decode (Aurebesh → Latin) — Oct 1 2026

> One shared text effect on four surfaces. Characters start as Aurebesh and resolve to Latin. Tunable in Debug › "Glyph decode · …".

## Surfaces
| Surface | Trigger | Params prefix |
|---|---|---|
| Latin marquee ring (canvas texture) | once after docking (page load), and on pointer-enter of the ring | `gxRing*` (+ `gxRingHover`) |
| Planet labels (`.plabel` title + sub) | planet becomes hovered (`setHovered`) | `gxLbl*` |
| Text buttons (`button, [role=button]`) | `mouseover` (delegated) | `gxBtn*` |
| Base-grid section names (`.zlabel`) | zone becomes active (`setZone`) | `gxZone*` |

Each surface has `On`, `Dur` (ms to fully resolved), `Delay` (ms held fully scrambled), `Tick` (ms per glyph refresh), `Scatter` (0 = clean left→right sweep, 1 = random order). All live in `params`, `GX_DEFAULTS`, `DEFAULTS` (so reset + export-diff work).

## Engine (`GFX`, defined right after `var params`)
- One shared `requestAnimationFrame` loop, per-key runs, `ifIdle` so a hover mid-run doesn't restart it.
- DOM surfaces: only elements with no child elements; only `[A-Za-z0-9]` are scrambled (symbols/emoji stay). The element's box (width, height, `white-space:nowrap`, `overflow:hidden`) is frozen **before the first scrambled frame** — locking after the first render measures the already-scrambled, wider/taller Aurebesh box, which is the bug this fixed. Overflow is clipped at the boundary; only `data-text` glitch labels skip the clip. Scrambled spans use `line-height:0` so they can't grow the line box. Everything is restored on completion. `aria-label` carries the real text while scrambled. Elements with `data-text` (the glitch "uncharted" zone label) mirror the scramble into it. Skipped for contenteditable, `#debug`, `[data-gfx="off"]`.
- Ring: `makeRing(..., 'ring')` draws per-glyph while decoding; the canvas starts on a held fully-Aurebesh frame so Latin never flashes before the first decode.
- `prefers-reduced-motion`: everything is skipped (plain text, no scramble).
- No library: single-file/no-build site, and it's a text swap.

## Font
`assets/fonts/aurebesh/aurebesh-{regular,bold}.woff2` are straight OTF→WOFF2 conversions of Pixel Sagas' *Aurebesh* (no subsetting, glyphs untouched), declared via `@font-face` (400 / 700) and preloaded (bold). `GFX` waits for `document.fonts.load()` (2.5s cap) before the first ring decode, then detects the face by glyph width; until then / if it fails it falls back to a pool of alien glyphs. A declared `@font-face` shadows any locally-installed Aurebesh, so what you see locally is what visitors get.

**LICENSE — read before shipping commercially.** `assets/fonts/aurebesh/LICENSE.txt` is the Pixel Sagas EULA: free for **personal, non-commercial** use, **commercial use requires a (modest) paid license**; web embedding is permitted, offering the file for direct download is not. Mundane Workshop LLC is a business, so confirm whether a commercial license is needed (jaynz@pixelsagas.com / pixelsagas.com).
