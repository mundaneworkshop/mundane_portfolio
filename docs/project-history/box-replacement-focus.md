# Box replacement (focus view)

> Focus-view "Replace box" upload — swap the kit box for a custom asset per project.

In Edit Mode, while focused on a project, the designer can upload `.glb`/`.obj`/`.svg`/`.stp` (rendered as a holo mesh) or a bitmap (rendered as a flat holo panel that billboards to the camera) to fully replace the kit box for that project. Artifacts still orbit as normal; the box-open flap animation is skipped when the box has been replaced; Reset restores the default box.

Persists per-project under IndexedDB key `boxmesh:<id>` — deliberately **separate** from the galaxy-planet `mesh:<id>` override, so the galaxy view keeps its own planet representation independent of the focus-view box. Re-applies on every focus; cleaned up on returning home.

Related: holotable-editor-and-glb.md, case-study-direction.md.
