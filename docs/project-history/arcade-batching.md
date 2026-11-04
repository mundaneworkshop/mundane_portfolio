# Arcade fleet batching (Nov 3 2026)

Instancing and merging for the space battle, on desktop and mobile. Before this, ships shared geometry and materials (`proto.clone(true)`), which saved memory, but every ship still cost one draw call per material, and every visible laser bolt cost one draw call.

## What changed (`assets/battle/battle.js`, "fleet batching" block)
- **Instancing:** each fighter, support and capital model draws through `InstancedMesh`, one per model + part. `syncBatches()` runs at the end of `update()` and writes each visible ship's `root * bank * fx` matrix.
- **Merging:** a model's opaque, flat-coloured primitives that differ only by base colour become one "part". The colour moves into a vertex attribute and the material colour becomes white, so `applyLook()`'s brightness math still works.
- **Kept as separate parts:** textured primitives, alpha primitives, and near-black TIE panels (`applyLook` lifts those individually through `.dark`).
- **Not batched:** heroes (per-ship opacity and hurt effects on their materials) and the Death Star (one instance; its haze colour math isn't a simple multiply).
- **Bolts:** one `InstancedMesh` per colour. `b.mesh` is now a plain `Object3D` used for its transform, so 600 pooled meshes no longer sit in the scene graph.
- **Culling:** three would cull a batch as one object, so `frustumCulled=false` and `syncBatches()` tests each ship's sphere (`CULL_MARGIN` 1.5). Ships stretching through a hyperspace jump are never culled. The frustum comes from the camera's previous frame, which the margin covers.

## Invariants
- Each ship keeps its real graph, with `model.visible=false`. `shatter()` and `buildAtoms()` still read those hidden meshes and their original materials, so death and break-up look as before.
- Batch materials are clones. One material must not be shared between an `InstancedMesh` and a plain `Mesh`, because the program differs.
- `buildBatchParts()` must run before `trackMaterials()`/`applyLook()` at load, since it reads each material's untouched base colour.

## Measured (desktop, built-in browser, 800x869, default fleet, one sample of each mode)
| | `?batch=0` | Batched |
|---|---|---|
| Ship select: draw calls | 266 | 49 |
| Play: draw calls | 390 | 69 |
| Play: triangles per frame | 1.06M | 0.89M |

Counts include the hologram, planet, sparks and post pass. Triangle counts barely move: instancing doesn't reduce them, and the difference is random fleet placement. Not measured on a phone.

## Known limits
- Transparent parts are sorted per batch, not per ship.
- Merged geometry is an extra copy in memory next to the hidden originals, which `shatter()` and `buildAtoms()` need.
- Debris from destroyed ships is still one draw call per piece.

`?batch=0` turns all of this off for comparing. `MWBattle._fleetStats()` reports ships, drawn and culled.
