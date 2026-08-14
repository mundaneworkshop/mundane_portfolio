# In-canvas editor + GLB rendering architecture

> index.html in-canvas Edit Mode, persistence, unified holo-FX pipeline, and textured-GLB rendering.

Relates to maximize-customization.md, bric-build-progress.md, holotable-next-steps.md.

**Edit Mode** (toolbar `✎ edit`, `editMode` variable — distinct from `?edit=1`/"author mode" which only controls toolbar visibility, see below): click an object = SELECT (no zoom); a contextual panel shows mesh/image upload + Reset. Planets → galaxy mesh/surface + "Open kit box" → 6-face texture picker; box-selected shows Artifacts −/+ to add/remove moons. In focus, moons/artifacts are clickable. Case Files menu is hidden while editing in focus.

**Author mode vs Edit Mode — important distinction to remember:** `?edit=1` sets `localStorage.mw_author` and adds `body.author-mode`, which only gates whether the editing toolbar is visible at all. The `editMode` boolean (toggled by clicking the toolbar's edit button) is what actually makes fields `contentEditable`. Also: clicking a planet WHILE `editMode` is already on SELECTS it for mesh editing rather than opening its booklet — to edit a booklet field you open the project first (in normal mode), then toggle Edit Mode.

**Copy editing is inline**: in Edit Mode every text node is click-to-edit (`contentEditable`, dashed outline, saves on blur), keyed per-selector+index so edits don't bleed across fields when the selector list changes.

**Persistence:** binary content (meshes, uploaded images/GLBs) lives in IndexedDB via `window.BRICStore` (keys like `mesh:<id>`, `tex:<id>`, `boxtex:<id>`); copy/text overrides live in `localStorage` under the key `bric_copy` (the `copyOvr` object, read/written via `BRICStore.getCopy()`/`setCopy()`); scene/FX tuning params live in a separate `bric_params` localStorage key with a version key for one-time migrations. `restoreOverrides()` re-applies everything on boot.

**Unified holo-FX pipeline (key architectural piece):** `addFx(mat, fxSet, compositeAlpha)` injects scan/fresnel/glitch/holographic effects into a MeshBasicMaterial via `onBeforeCompile`, driven by an FX set object `{scan, fres, scanFreq, fxInt, glitch, hot, tint, holo}`. Three independent FX sets exist with their own debug groups: `FX_LOGO`, `FX_MOON` (artifacts), `FX_BOX` (kit box). Default is truthful (fxInt 0, tint white, holo 0) — true colors first, holo effects toggled on top. `buildHoloGLB(scene, fx, radius)` converts an uploaded GLB into a truthful multi-mesh group preserving each mesh's own texture/color (no geometry merge, so multi-part models keep distinct colors) — see glb-texture-rendering.md for the specific decal/texture rules this must follow.

**Textured-GLB gotchas:** the renderer has no color management (outputs linear, no encoding) — texture maps need `LinearEncoding` set explicitly or they render dark. Meshes with FogExp2 in scope need `fog:false` set explicitly or they fade wrong.

**Other:** the focus camera settles on a stable anchor so there's no zoom-jump between planets of different sizes; hit-test proxies are padded AABBs, not exact geometry; labels are depth-occluded via their own raycast pass so they don't float over nearer objects.
