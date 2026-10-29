# Favicon (Oct 2026, PR #72)

The tab icon is a 1-bit pixel abstraction of the MW monogram, not a render of it.

## Why not the 3D render

The first version cropped an isometric studio render of `assets/mw-monogram/` (eye (20,20,20), up (0,1,0)). At 16px it turned to mush. A tighter crop and a contrast boost didn't fix it: the fins and the maze can't survive anti-aliased downscaling.

## What was kept

The owner's brief: keep (1) the maze-like fins forming the M/W, seen from an angle, and (2) the isometric quality. Everything else was open.

## Process

The design sheets are kept in [`docs/favicon-design/`](../favicon-design/). Open them over any static server, because they draw to canvas from inline JS with no dependencies.

- `round-1.html`: first directions. A snake block, B fin comb, C slit cube, D maze-top cube and F tile were all vector, posterized to 16px. The owner liked A and B but wanted more fins and more cube depth.
- `round-2.html`: everything after that. It uses a small ray-caster: boxes in a voxel grid, point-sampled at pixel centres in 2:1 iso, so every pixel is crisp. Sections, newest first:
  - **A6d refined (A9a/b/c).** This holds the pick, A9b.
  - **A8.** Plane-separation tests.
  - **A6/A7.** Textured right wall.
  - **A5.** Squared-up maze cube.
  - **B4.** Comb cube camera study.
  - **A3.** Maze variants.
  - **W\*.** Early mono tests.

## The pick: A9b

The geometry is the real 5-wall plan maze (`planY(7,7)`: 9×7 plan, walls 7 high), seen as a 9×7×7 cube that fills the 16px frame at exactly 1px per unit:

- the M cap spans fins 1–3 and the W cap spans fins 3–5
- fin 2 starts one unit in and fin 4 stops one unit short

It is 1-bit: everything is ink, and only the fin gaps carry form. The large right wall gets lines parallel to its top edge, so it doesn't overpower the fins. Two tweaks apply at 16px only, and 32/48 stay as rendered:

- one extra vertical line through the W-cap block (column 5)
- wall line parity flipped so the wall's bottom edge is solid

Light-on-dark was preferred. But the 16px mark touches all four frame edges, so a dark tile behind it would leave no gutters, and the edges would be tangent. So:

- **`favicon.ico` and `icon-16/32/48.png`.** Dark ink `#070c0c` on a transparent background.
- **`favicon.svg`.** The same 16-grid. Its `<style>` flips the ink to `#f0ede8` under `prefers-color-scheme: dark`.
- **`icon-180/192/512.png`.** Light ink on a `#070c0c` tile, built from the 32px form scaled up with padding.

In `<head>`, the ico is declared `sizes="32x32"` rather than `any`, so Chrome prefers the SVG.
