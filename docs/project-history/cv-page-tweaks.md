# CV page tweaks (Oct 26 2026)

> Branch `feat/cv-page-tweaks`. The CV route (`/cv`, `cvScene` in `index.html`, grep `CV — 3D HYPERSPACE ROUTE`) picked up the focus-view manual conventions, a re-centre click, node hover reticle, arrow-key stepping and a list view.

## Manual + stage (same contract as projects and the outfit About view)
- `CS.mlIsProject()` is now true for `body.mw-cvroute` too, so a node's booklet goes through `layoutManual()` (dock; drawer under 720px) and publishes `window.MWStage` `{l,t,r,b,H,W,mode}`. `mlPublish` fires a `mwstage` window event when the rectangle changes.
- The CV camera is an orbit rig, not a kit box, so it does not use `stageFit()`'s lens shift. `cvFrame(pts,{radius,pad})` solves look + radius for the current yaw/pitch so the projected bounds (plus label padding) fit the stage with margins, centred; `animate()` eases the real camera there. `FOCUSFRAME` stays the kit-box anchor and is not used here.
- Overview = whole viewport below the 48px breadcrumb row; with a node open = `MWStage`. `cvFrameMode` ('overview' | 'node') remembers which one to re-solve on `resize` / `mwstage` (two rAFs later so `layoutManual` has re-measured).
- **Saved default view (Edit Mode → Save view)** now contributes yaw/pitch only to the overview; zoom and pan are always re-solved so the route fits any window. `cvOrbit` radius limit raised 24 → 40 so a wide route on a phone is not clamped.
- Leaving the route (`onExit`) clears `MWStage` and `data-ml`.

## Interaction
- Clicking empty space (`onBack`) always goes to the overview and re-centres, including when already there.
- Hover: a window-level raycast on the canvas sets `cvHoverId`; the reticle target (`targets()` in the reticle IIFE) frames the node sphere with `▸ OPEN`, the node scales 1.35 and its label takes the hover colour. The label stays its own DOM target.
- ←/→ step through `cvStops()` (depth-first, main path before side branches; ends clamp). Ignored in input/textarea/select/contenteditable, with modifiers, in the arcade; in list view they move the page.

## List view
- `#cvView` toggle (right edge, under the sound switch). Choice is stored in `localStorage['mw_cvview']` (try/catch); default immersive. Edit Mode forces immersive (the list is read-only) without overwriting the stored choice.
- `#cvList` is built from the manual's own classes (`manual-title`, `manual-tags`/`bric-tag`, `snap-cell`, `manual-link`, `bric-btn`, `mb-corner`) with the same scoped tokens (`#cs-root, #cvList`). Branches are indented, disabled stops dimmed, the active stop takes the amber title. `#cvListBar` keeps the fixed chrome off scrolling cards.
- The render loop is paused while the list shows (`animate()` checks `cvListOn && cvScene.active`).
- A node CTA is shown in the list only when it has a link or a custom label; the booklet's placeholder ("Download CV (PDF)", no URL) would otherwise repeat on every card.
