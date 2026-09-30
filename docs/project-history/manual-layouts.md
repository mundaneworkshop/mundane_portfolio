# Focus-view manual layouts + stage fit (Sep 29 2026)

> Branch `fix/focus-monogram-and-manual-layouts`. Two changes to the project focus view (kit box + artifact moons + instruction manual).

## 1. Bug: docked monogram clipped through the focused kit box
The MW monogram (`mwQuad`, the docked base emitter) stayed visible during project focus and its bounding cube showed through / clipped the kit box. `mwUpdate` now receives `1 - focusAmount` (was `focused ? fade : 1`), fades the holo material with it, and sets `mwQuad.visible = false` once `fadeK <= 0.03` (also skips the studio render pass). It eases back in on exit. The gatekeeper logo already did the equivalent (`logo.visible` gated by `focusAmount`).

## 2. Manual layouts (responsive) + stage fit
**Problem:** the manual was one fixed bottom-third panel (`60vw`, min 580px, ~430px tall). Kit-box size on screen scales with window height, the panel's height does not — so at 1440×900 the panel covered the box/moons that looked fine at 2560×1440.

**Panel** (`#manual-scene[data-ml]`, CSS block "MANUAL LAYOUTS"; DOM unchanged apart from the drawer's `.ml-toggle` button):
- `dock` — wide bottom bar, 3 columns (identity · snapshot · CTA+links). Stage = everything above.
- `rail` — vertical panel on the right edge (26vw, 300–420px), tilted `rotateY(-7deg)`. Stage = everything left. In Edit Mode it steps left of `#editPanel`.
- `drawer` — compact, deliberately TRUNCATED bar: title, 2-line framing, tags, CTA. No expand toggle (designer call, Sep 30 2026: the CTA/case study holds the detail, so snapshot rows + extra links are dropped at this scale). Artifact (moon) links stay; Edit Mode shows everything. Only auto-selected below 720px, or forced.
- `auto` (default) — <720px → drawer; else measures dock and rail and picks the one leaving the bigger stage (scores `min(stageW/1.6, stageH)`; `ML_CONTENT_ASPECT`).
- Forced from the author-only `#ml-switch` (under the breadcrumb while focused) or Debug → Instruction manual (`params.manualLayout`, saved with Save like other params).
- **Scope:** only when `body.mw-planet` (project/artifact focus). CV nodes + the chapter ring still use the original centred bottom panel, because their cameras (`MWOrbit.panelGapOffset`, `frameAt`) frame against a bottom-anchored panel. Porting them = give those cameras the same `window.MWStage`.
- Everything positional in the modes is `!important` because `showBooklet()`/`reset()` still write inline `top`/`margin-top` for the legacy panel.

**Stage fit** (`stageFit()` / `stageLens()` in the frame loop): the layout engine publishes the free rect as `window.MWStage` (+ CSS vars `--stage-cx/cy/w/h`, used by `#ig-feed`). Each frame while focused we project the kit box + moons (visible meshes only — invisible click proxies are skipped) from a FIXED reference orientation (yaw 0 / pitch 0.28, so orbiting doesn't make it breathe) and binary-search the camera distance at which they fill `params.stageFill` (0.74) of the stage, capped at `params.stageMaxH` (0.58) of window height. The centre is then moved to the stage centre with `camera.setViewOffset` (a lens shift, no rotation — labels/raycasts follow automatically). `focusZoom` stays a multiplier on top (1.2 = exactly "fill").
- **Saved camera views:** views saved before this had zoom ≈1.8–2.0 baked in to dodge the old panel. Without `fit:1` they now keep only their yaw/pitch; views saved under stage-fit carry `fit:1` and keep zoom/panY as fine-tuning.
- Debug → Instruction manual: layout seg, "Fit kit box + moons to the free stage" (off = original fixed-radius framing), Stage fill, Stage max height.

- **Zoom stop:** wheel zoom-in is floored at 55% of the fitted distance (`STAGE_ZOOM_MIN`) and never closer than 0.35 units to the nearest content (`STAGE_NEAR_GAP`); `params.focusZoom` is pulled up to that floor so scrolling back out responds immediately. Without it the camera ended up inside the box, the projection maths blew up and the lens shift (now also clamped to ±1.2 NDC) flung the scene off to the right.

## Decisions / next
- Sep 30 2026: designer likes **dock**; **auto stays the default**. Drawer's Details toggle removed (see above).
- **Mobile is deferred to a dedicated pass.** Intended direction: full phone width; top ⅓ of the screen for the kit box / artifact moon (side-swipe to switch focus between them), bottom ⅔ an auto-layout-wrap of the manual contents. The current drawer at <720px is only a stopgap. `window.MWStage` is already the hook: a phone layout just publishes a top-⅓ rect.

## Testing notes
- Headless/hidden browser panes throttle `requestAnimationFrame` — showBooklet's layout runs in a rAF, so nothing lays out until the pane is displayed. Camera lerps are per-frame, so settling takes a while on software GL.
- Mobile emulation in the Claude browser pane reports a 1026px layout width; test phone layouts in an iframe of the target size instead.
