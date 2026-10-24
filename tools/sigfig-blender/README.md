# sig fig Blender pipeline

Turns a Studio `.io` into a rigged, decimated, animated GLB for the hologram (see `docs/project-history/sigfig-lab.md`).
Two scripts run INSIDE Blender (tested on 5.1; the Blender MCP's `execute_blender_code` is the usual way to run them).

| file | what it does |
|---|---|
| `ldr_to_blender.py` | `.io` -> rig in a collection `sigfig-<id>`; decimation pass; `export_glb()` |
| `idle_anim.py` | a JSON motion spec -> keyframes on the rig, exported as the glTF animation `idle` |

```python
exec(open('/path/to/repo/tools/sigfig-blender/ldr_to_blender.py').read())
exec(open('/path/to/repo/tools/sigfig-blender/idle_anim.py').read())
info = build_sigfig('/path/mw-sigfig-vr-gamer.io', 'vr-gamer')            # tri_budget=9000, safe=True, roles=None
apply_idle('vr-gamer', SPEC)                                              # see idle_anim.py for the spec format
export_glb('vr-gamer', '/path/mw-sigfig-vr-gamer-idle-v1.glb')
restore_scene()                                                           # puts the scene's fps / frame range back
```

## What the importer does
- Reads `model2.ldr` from the `.io` (a flattened LDraw: part geometry is inlined, no LDraw library needed). Colours are Studio colour codes, read at run time from `/Applications/Studio 2.0/data/StudioColorDefinition.txt` (nothing from BrickLink's table is stored in the repo); LDraw direct colours (`0x2RRGGBB`) work too. Falls back to a small palette if Studio is not installed.
- One mesh per part, **origin at the part's joint** (shoulder, hip, neck, wrist), named by role: `head torso hips arm_l arm_r hand_l hand_r leg_l leg_r`, plus `acc_<part>` (near the head, a hand, the torso or hips) and `prop_<part>` (free: a bike, skis). The figure's right is -X in LDraw; roles follow the figure's own left/right.
- Hierarchy: hips > legs, torso > head, arms > hands > held props; accessories under what they sit on. Feet at z = 0, facing -Y (glTF +Z).
- Blender object names are `<fig>:<role>` so several figures share a scene; `export_glb` renames them to the bare roles for the export only.
- Custom Studio parts (the slate dummy's `m64a4bc45_*`) carry no usable part number. Pass `roles={'m64a4bc45_202587_011646': 'head', ...}`.
- Printed decals that Studio stores as textures (parts named `bl_*`, e.g. the usual printed face) are NOT in the `.io`; those parts come in plain. For a textured face, export `.dae`/`.obj` from Studio instead.

## Decimation (why it is gentle)
`build_sigfig(..., tri_budget=9000, safe=True)`:
1. Merge coincident points (the importer makes three per triangle). It deliberately does not dissolve coplanar faces: re-triangulating the merged n-gons bridged the concave notch of the C-shaped hand clip.
2. `safe=True`: body parts and any multi-colour printed part (3+ materials) are left at full detail; accessories and props (hair, helmets, headsets, bikes) are collapse-decimated, never below half. A vertex group pins every vertex on an open edge or a colour border at weight 0, so outlines and print edges do not move (checked: open-edge counts identical before and after). A plain collapse moves them, which tore holes in the neck bracket and chewed the controller's button prints.
3. `tri_budget` is a target, not a ceiling: protected parts are never thinned, so a figure can land above it. `safe=False` also thins body parts (measurably rougher on round limbs).
First pilot (VR gamer): 12,087 triangles raw -> 10,529; the heavy figures lose more (biker 17,150 -> 12,248, mostly the bike).

## The request queue (how the Sig Fig Lab uses this)
The Lab's "Idle loop" box queues a request in the artifact db (`requests/<fig id>`, status `queued`) with the `.io` stored as an asset. Nothing runs by itself; the user asks Claude to "run the sig fig queue". The runner:
1. `ArtifactData query` collection `requests` where `status == queued`; set the doc to `working`.
2. `Artifact read` with `path` = the request's `ioAsset` id to download the base64 text, decode it to a `.io` file.
3. In Blender: `build_sigfig(...)`, write a `SPEC` from the description, `apply_idle`, `export_glb`, `restore_scene()`, delete the figure's collection and its orphaned meshes / materials / actions (leave the user's Cube, Camera and Light alone).
4. Base64 the GLB to a `.txt`, upload it with `Artifact publish asset:true` (the asset store takes no `.glb`), then `ArtifactData update` `sigfigs/<id>` `glbs` with `{uid, name, size, at, asset}` and `requests/<id>` to `done` with a note and the spec (or `failed` with the reason).
Each run adds a new GLB (`-idle-v<N>`); remove the old one from the card and its asset.
