# Projects Manager panel (Sep 29 2026)

One fixed 2D panel (`#projMgr`, toolbar button **▤ projects**, Edit Mode only) for adding / removing / renaming / hiding **zones** and the **planets** inside them. It replaced three fragile paths:

1. The `#menu` sidebar's ＋/✕/⤺ buttons, every one of which ended in `structuralApply()` → `location.reload()` (slow, no live preview). `structuralApply`, `handleMenuEdit` and the `mw_reedit` re-enter-Edit-Mode hook are gone.

**The `#menu` sidebar itself was then removed entirely** (Sep 29, per designer: it was the mobile nav — shown <768px, forced on in desktop Edit Mode only as a workaround — and mobile gets its own dedicated pass once desktop is design/feature-locked). Gone with it: `buildMenu`/`wireMenu`, the `@media (min-width:768px)` rule (the only responsive breakpoint in the file), the editable per-row idx numbers (`p.idx`) and the editable menu title (`menuTitle`). Planets are reached by clicking them in the scene. When the mobile pass happens it needs a fresh nav design, not a revival of this one.
2. Click-to-rename on the projected 3D zone/planet labels. Their screen position is a live 3D→2D projection that drifts with the camera, so they were genuinely hard to hit. The labels are **no longer contentEditable** (`zoneEditNodes` / `labelEditNodes` are kept, empty, because `setInlineEditing()` iterates them); saved names are still restored onto them at boot.
3. Index-keyed inline edits of the sidebar (`#menu .grp`, `.navbtn > span:first-child` in `INLINE_SELS`). See "Bug found" below.

The **Mesh Select** mode + `#editPanel` (texture / mesh / box faces / marquee) is a different concern and was deliberately left alone.

## How it works

- Everything mutates `galaxyModel`, then `syncSceneToModel()` reconciles the *running* scene to it: zone wedges first (`rebuildZoneDef` → `computeZoneBounds` → `layoutZones` → `rebuildZones`; zone meshes/labels are created/dropped as needed), then planets (`addModelPlanet` + `pmInitPlanet` for new ones, `pmDropPlanet` for gone ones), then dependents (`applyHiddenVisibility` → `refreshHitLists`, `buildMenu`, `buildZoneFxCtls`, `buildPlanetFxCtls`, `applyHoloColors`).
- `pmInitPlanet` is the per-planet mirror of the whole-array boot passes (fit hit proxy, `seedCaseFor` / `finalizeCase` / `restoreCaseOverrides`, label text, saved spot, moon count, `restorePlanetOverrides` / `restoreMoonOverrides`). If you add another per-planet boot pass, add it there too.
- Persistence is the normal path: `persistModel()` → `persistCopy()` (sets `bric_copy_dirty`). The panel never pushes; SAVE (`pushContentSave`) is untouched, and nothing runs on a passive page load.
- Renames are applied as you type (live preview) and persisted on blur/Enter. They write **both** the model and the override keys boot reads (`zone:<id>:name`, `case:<id>:title`, `plabel:<id>:sub`) — a model-only write would lose to the override on reload.
- **Hide** is soft (content kept, restorable). **Remove** is permanent: two-click confirm, purges every stored key for that id (whole `:`-segment match — `case:<id>:*`, `spot:<id>`, `camview:moon:<id>:*` …) plus its `planetfx`/`zonefx` entries, and offers **Undo** (snapshot of the model object, keys, `CASES` entry and fx). `content-save` deletes server keys that are absent from `copyOvr`, so purged keys really do leave Supabase on the next SAVE.
- `cv` and `contact` (CV route / HoloNet) can be hidden but not removed, and a zone containing them can't be removed.
- New zone/planet ids are never reused (`pmUid`), so a removed item's leftovers can't leak into a later one (the old `zone1`/`zone2` scheme could).
- Every structural commit **freezes every planet's spot** into `spot:<id>`. Boot's fallback draws spots from a seeded RNG in creation order, so without this, reloading after adding/removing anything reshuffled whichever planets had no saved spot. Existing planets keep their relative place in their zone's wedge as it grows/shrinks (a saved angle outside its own wedge is pulled to the nearest edge).

## Bugs found and fixed on the way

- **Index-keyed menu overrides** (`k:#menu .grp:N`, `k:.navbtn > span:first-child:N`): any structural change shifted saved names onto the wrong buttons. With Playground emptied, Profile's "CV" button rendered "MINIFIGURE ME". Those selectors are out of `INLINE_SELS`; the legacy keys (plus `menuTitle`) are inert and get purged on the first explicit panel edit (never on load — a passive load must not dirty the copy).
- **Hidden planets rendered and stayed clickable in prod view.** The per-frame passes in `animate()` overwrote `applyHiddenVisibility()` with the boot gate, and hidden planets stayed in the raycast list. Now `planetShown()` gates both and `refreshHitLists()` rebuilds `planetHits` / `editHits` / `zoneHits` in place (other code holds those arrays). Never surfaced before because no live planet was hidden.
- `editIds` (which ids get their uploaded mesh/texture restored from IndexedDB at boot) was a hardcoded list (`w0,w1,w2,p0,p1,p2,cv,contact,li,ig`), so planets added in Edit Mode never got their uploads back after a reload. It's derived from the live planets now.
- The window-level **D** shortcut (toggle Debug) fired inside text inputs; typing "Dinner Decider" into any field popped the debug panel. It now has the same input guard as **H**.

## Known gaps (not fixed here)

- After a page reload, `_csDirty` starts `false` even when `bric_copy_dirty` is still set in localStorage, so SAVE reports "nothing to sync" until another edit is made — edits made before the reload can sit unsynced. That is the content-sync engine (PR #25), deliberately not touched here.
- Zone `kind` (work / play / social) isn't editable after creation; new zones are `work`. Reordering zones/planets and moving a planet between zones aren't in the panel.
- A few small baked values: the 8 s auto-disarm of a "sure?" remove button, and the planet grow-in start scale (`base=0.01`). Everything content-shaped (zone name, planet title, planet subtitle) is editable.
