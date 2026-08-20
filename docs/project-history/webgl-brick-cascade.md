# WebGL brick cascade

> Aug 19 2026: the case-study transition stopped faking bricks in CSS and started drawing real LEGO geometry. Decision, measurements, and the traps found on the way.

## The decision

**The WebGL renderer REPLACES the CSS cube system outright.** No dual path, no fallback renderer. Confirmed by the designer: maintaining two renderers forever is worse than the one risk it removes.

The old system built each brick from six face `<div>`s plus stud spans inside a `preserve-3d` cube. It was tuned hard and still never read as LEGO — the shapes were amalgamations, not parts. That was the whole reason to move.

## What replaced it

`BrickField`, inside the CS module. Its own canvas and renderer, deliberately independent of the galaxy's camera and render loop: the cascade is a screen-space CURTAIN and should be able to cover a scene swap without knowing what it covers.

**Pixel-space orthographic camera** — the frustum is `(0,0)-(W,H)` with y pointing DOWN, so it shares a coordinate system with the DOM version it replaced. That is why every existing tunable kept its meaning: `U` is still a pixel size, `rowDelay` is still milliseconds. Porting the choreography did not require re-deriving anything in world units.

## THE CURTAIN IS NOT THE BRICKS

The most important thing here, and the thing the first port got wrong.

The CSS version occluded for free: six solid faces per cube meant a filled grid was effectively opaque, so the scene swap behind it was safe. Real bricks are translucent holograms — over a live galaxy they look far better and hide **nothing**. Measured: a filled field of bricks alone left **68% of pixels below opaque**.

So bricks now fall in FRONT of a scrim that ramps up as they land, holds through the swap window, and fades out with the exit. **Bricks carry the character; the scrim guarantees the occlusion.** `CFG.scrim` tunes it — 0 is bricks only (and a visible swap), 1 is full cover. At the default 0.92: mean alpha 0.926, zero pixels below opaque.

If the brick set fails to load, `runCascade` falls through to the reduced-motion cross-fade rather than running a half-empty curtain. A failed brick set must degrade to "a plain fade", never to "you can see the seam".

## Traps found, all real

1. **The y-down camera flips triangle winding.** `top:0, bottom:H` mirrors the projection, so single-sided geometry faces away and is culled. The scrim rendered one draw call and wrote nothing at all; it looked exactly like "the scrim isn't working". The bricks survived only because their material happens to be double-sided. **Anything added to this scene needs `side: THREE.DoubleSide`.**

2. **requestAnimationFrame stops in a backgrounded tab.** The DOM version got teardown for free from `setTimeout`; the rAF loop does not. A visitor who switched away mid-cascade came back to a curtain that never tore down. There is now a wall-clock guard alongside the loop that finishes the sequence regardless.

3. **The seed pipeline writes shipped assets into IndexedDB**, so "has an IndexedDB record" does NOT mean "the author uploaded this". Author uploads are flagged `uploaded:true`; without that flag all three default bricks reported "this browser only" when they were in fact committed files, and a stale seeded copy could shadow an updated committed one.

## Brick authoring — measured, not guessed

Exports come from LDraw/Mecabricks through Blender. Convention: LDraw units, node carries `0.01` scale and a `-90° X` rotation, so **20 LDU = 1 stud = 0.2 world units** after the node transform is baked. `BrickField` bakes via `matrixWorld` rather than assuming this, so an oddly-authored part still lands correctly.

**Triangle count is NOT the constraint.** Measured on an M2 at 3200x2000, GPU-synchronised: 49 un-decimated bricks (1.85M triangles) cost 0.12 ms/frame — 1% of the budget. 400 bricks (15.1M triangles) cost 0.82 ms. All at one draw call per shape via `InstancedMesh`.

**File size WAS the constraint.** The same parts were 717KB / 179KB uncompressed. Decimating and enabling Draco took them to 15.8KB / 5.1KB / 2.1KB at 2,975 / 736 / 79 triangles — 45x smaller, with the LEGO lettering on the studs still legible.

Export settings that matter:
- **Decimate** to ~800-1,500 triangles. Planar first (5°) to flatten the box faces, then Collapse (~0.1) to thin the stud cylinders. Collapse alone eats the corners.
- **Origin to Geometry → Bounds Center**, not Median Point — the median is dragged toward the stud vertices, so bricks would tumble about a point near their top face.
- **Object at world origin** (`Alt+G`), or the export bakes a translation offset that becomes a constant error on every instance.
- **Draco on.** Quantize Position 12 is safe; below ~10 risks cracking edges. Normal stays at 10 — the fresnel rim is computed from normals.
- **One object per file**; clear the LDraw parent nesting and delete leftover empties.

**`doubleSided` deliberately stays ON.** It is not a performance decision: it saves ~0.1ms, and it changes the LOOK. Double-sided lets you see the far wall and the back of the stud cylinders through the front, which is a large part of why these read as holograms of bricks rather than tinted glass. Single-sided is cleaner and flatter — a legitimate choice, and one of the cheaper levers if the stacked translucency ever goes too milky at high density.

## Authoring UI

`#dbg-bricks` — one row per shape with name, weight, replace, reset and remove, plus a status chip reading **shipped** or **this browser only**. That distinction is the easiest thing to get wrong: uploads land in IndexedDB and never leave the browser, exactly like every other mesh override here. Shipping a brick means committing the `.glb` under `assets/models/bricks/` and adding a manifest line.

Uploads are validated on drop and report triangles, file size, stud width, and whether the origin is centred — the three things that actually went wrong across four rounds of real exports.

Related: maximize-customization.md, glb-texture-rendering.md, case-study-direction.md.
