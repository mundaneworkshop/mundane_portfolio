# GLB texture rendering — INVARIANT

> INVARIANT for GLB custom-texture (decal) rendering in index.html — keeps prints from showing black/see-through backgrounds. Read before touching buildHoloGLB / applyGLBSceneToMoon / addFx.

**Canonical rules for uploaded .glb artifacts with custom textures (prints).** This bug ("the piece behind a print PNG shows black") regressed 3 times; these are the invariants that keep it fixed. All live in `buildHoloGLB` (used by `applyGLBSceneToMoon`) + `addFx`.

**Why it happens:** printed LEGO parts export as a decal mesh whose PNG is the print on an alpha-0, black-RGB background, sitting on a solid brick. The engine has NO colour management (renderer outputs linear→sRGB display, no encoding) and textures show as authored sRGB.

**The three rules (all required — see the REGRESSION GUARD banner in buildHoloGLB):**

1. **Composite, don't multiply.** Mapped meshes call `addFx(bm, fx, hasMap)` → `compositeAlpha=true` → shader does `diffuseColor.rgb = mix(brickColour, texel.rgb, texel.a*DECAL_LIFT)`. The default `#include <map_fragment>` (multiply) turns alpha-0 black texels into a black background — never use it for decals.
2. **Resolve the brick colour robustly, NEVER from the decal's own material.** Order: (a) name match — Mecabricks names a decal `15 White img0` after solid brick `15 White` (strip ` imgN` suffix); (b) **nearest solid brick by 3D centroid** (`nearestBrick`, exporter-independent — this is what makes non-Mecabricks GLBs safe); (c) white. Falling back to the decal material's `baseColorFactor` is the bug — exporters often leave it black.
3. **Lift solid/brick colours linear→sRGB** (`baseCol.setRGB(pow(c,1/2.2)...)`) so they match the (already-sRGB) prints and the Blender source; otherwise dark plastics (e.g. Dark Blue `[0.004,0.031,0.102]`) render near-black.

**Also:** holo mode (`FX_MOON.holo`>0, i.e. Artifact FX "Holographic" slider) makes parts translucent → the brick behind a print goes see-through → reads as black space. If a user reports black-behind-print but parts look solid, it's rule 2; if parts look translucent/teal, it's the holo slider (should be 0 for truthful colours).

History/details in holotable-backlog-jun20.md (rounds 2, 9, 13). Related: holotable-editor-and-glb.md, maximize-customization.md.
