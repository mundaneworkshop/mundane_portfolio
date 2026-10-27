# CV page tweaks (Oct 26–27 2026)

> Branch `feat/cv-page-tweaks`. The CV route (`/cv`, `cvScene` in `index.html`, grep `CV — 3D HYPERSPACE ROUTE`) picked up the focus-view manual conventions, a re-centre click, node hover reticle, arrow-key stepping and a list view.

## Manual + stage (same contract as projects and the outfit About view)
- `CS.mlIsProject()` is now true for `body.mw-cvroute` too, so a node's booklet goes through `layoutManual()` (dock; drawer under 720px) and publishes `window.MWStage` `{l,t,r,b,H,W,mode}`. `mlPublish` fires a `mwstage` window event when the rectangle changes.
- The CV camera is an orbit rig, not a kit box, so it does not use `stageFit()`'s lens shift. `cvFrame(pts,{radius,pad})` solves look + radius for the current yaw/pitch so the projected bounds (plus label padding) fit the stage with margins, centred; `animate()` eases the real camera there. `FOCUSFRAME` stays the kit-box anchor and is not used here.
- Overview = whole viewport below the 48px breadcrumb row; with a node open = `MWStage`. `cvFrameMode` ('overview' | 'node') remembers which one to re-solve on `resize` / `mwstage` (two rAFs later so `layoutManual` has re-measured).
- **Saved default view (Edit Mode → Save view)** now contributes yaw/pitch only to the overview; zoom and pan are always re-solved so the route fits any window. `cvOrbit` radius limit raised 24 → 40 so a wide route on a phone is not clamped.
- Leaving the route (`onExit`) clears `MWStage` and `data-ml`.

## Interaction
- Clicking empty space (`onBack`) always goes to the overview and re-centres, including when already there.
- Hover (Oct 27): node + label are **one target**. A raycast on the canvas or `pointerenter` on the label sets `cvHoverId`; `targets()` returns one frame spanning the sphere and its label, labelled `▸ VIEW`. The node scales 1.35 and the label takes the hover colour. Labels no longer carry `data-bric-target`; `targets()` accepts a pointer on `.cvrlbl` as well as the canvas.
- ←/→ step through `cvStops()` (depth-first, main path before side branches; ends clamp). Ignored in input/textarea/select/contenteditable, with modifiers, in the arcade; in list view they move to the card above / below (the list's own order). A focused segmented toggle keeps the arrows for itself (radiogroup).

## List view
- `#cvView` is the BRIC **Segmented Toggle** (Figma › Components › 14, signed off Oct 27; CSS `.bric-seg` in `assets/bric-components.css`), `role=radiogroup` with roving tabindex. Top centre, replacing the old controls legend; on a phone (and whenever the breadcrumb would run into it) it drops under the breadcrumb (`placeView` in `wireCVView`). Choice is stored in `localStorage['mw_cvview']` (try/catch); default immersive. Edit Mode forces immersive (the list is read-only) without overwriting the stored choice.
- `#cvList` is built from the manual's own classes (`manual-title`, `manual-tags`/`bric-tag`, `snap-cell`, `manual-link`, `bric-btn`, `mb-corner`) with the same scoped tokens (`#cs-root, #cvList`). Snapshot values are author HTML, rendered with `innerHTML` like the manual. `#cvListBar` keeps the fixed chrome off scrolling cards.
- **Oct 27 rework:**
  - `cvListStops()`: solid stops only (disabled stops stay 3D-only), newest first. The route has no dates, so time = depth along it; at equal depth the main path comes before a branch.
  - Focus: the card crossing the focus line is in focus (`cvListFrame` on scroll, rAF-throttled): full opacity, amber corner marks and title, gold node with the route's pulse; other cards sit at 42% opacity. Focus also sets `cvSelId`, the breadcrumb and the 3D labels, so switching to immersive flies to that stop with its manual up.
  - Parallax: the title drifts at 0.35 of the scroll and fades. Transform/opacity only; static under reduced motion (the pulse and transitions also stop).
- **Oct 27 round 3** (owner feedback):
  - Hero is one line of copy, no eyebrow or stop count (`CV_LIST_HEAD`): "Shipped to millions. Built systems for the world's most exclusive properties. Designed funnels behind $4B+ in potential orders." (workshopped in chat; "potential orders" is deliberate, not "revenue").
  - The CV download sits right under that line and again after the last card (`cvCtaBtn()`; the newest stop's CTA if it links somewhere, else the first stop that does). The pinned bottom-right CTA was too easy to miss and is gone.
  - Cards drop the kicker ("Current system", "Prior system"…).
  - Focus line: 40% down, except at the top of the page it starts on the first card's middle and runs down to 40% as you scroll (`fy = min(0.4·H, firstCardMid + scrollTop)`). Before this, on a tall window the short newest card (Mundane Workshop) sat above the 40% line at scrollTop 0 and could never take focus.
  - Pixel look restored: the DOM list had none of the scene's post pass. The timeline (rail, lit rail, nodes, branch spurs, pulse) is now drawn on `.cvl-tl`, a canvas at 1/`params.pixel` with `image-rendering:pixelated` and `filter:url(#ig-posterize)`, the same recipe as `#cvFxCanvas` and the message stars. `--cvl-rail-x` / `--cvl-node-y` on `.cvl-track` place it against the cards. The pulse redraws in its own rAF loop only while the list shows; static under reduced motion.
  - Starfield: three canvas layers (`cvDrawSky`, drift 0.06 / 0.16 / 0.32) drawn at 1/`params.pixel`, using the galaxy's brightness curve (`(0.22+0.78·r^1.7)·0.8`) posterized to `params.levels`. Density ≈ 0.3 stars per 1000px² in total (was ~1.2, far too dense), about a third of stars falling into loose clumps, and each layer is as tall as its own drift so nothing tiles or repeats. Colours resolved from the tokens via a probe element. Redrawn when a resize settles.
  - Hover: every card not in focus is a reticle target (`data-bric-target`, `▸ VIEW`, arm 16) and lifts to 72% opacity with an amber title; the card in focus drops the attribute.
  - Snapshot rows get `space-3-stud` (phone `space-2-stud`) between label and value, baseline-aligned for values that wrap.
- The render loop is paused while the list shows (`animate()` checks `cvListOn && cvScene.active`).
