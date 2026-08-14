# Open backlog (as of Jun 20 2026)

> Backlog items captured for index.html that may or may not still be relevant — check against current code before assuming any of these are still open.

1. A size/scale slider for all object types (logo, planets, moons) — some of this may have shipped since (e.g. `params.objScale` for planets/logo — check `holotable-backlog-jun20.md`/current code before re-adding).
2. A distance slider for moon/artifact orbit radius.
3. Click a moon/artifact → camera focuses on it with its own booklet content — this shipped (see holotable-editor-and-glb.md, cv-contact-focus-views.md pattern) — verify still true before treating as open.
4. Recolor the box-open flap interior to match the box's tint rather than a hardcoded teal.
5. A bug where only the front kit-box face image reliably persisted after save — this was root-caused and fixed twice (see holotable-backlog-jun20.md) — verify still fixed before assuming open.
6. An idea (not built as of this note): flat-color box sides with a ticking text marquee wrapping all four faces — a marquee ribbon did ship later, check current code.
7. Galaxy hover affordance (bump mesh + label on hover) — shipped, see holotable-backlog-jun20.md.
8. A secondary label line on planet labels wasn't editable — later made editable, see galaxy-view-amend-jun23.md.
9. SVG upload to a galaxy planet wrapping instead of replacing the sphere — root-caused and fixed (an `isImageFile` mime check was mis-routing SVGs), see holotable-backlog-jun20.md round 4.
10. Invert vertical drag in focus view independently from the galaxy's global invert-drag setting.

This file is kept mainly as a paper trail — most items above were later resolved (cross-referenced where known). Don't treat anything here as confirmed-still-open without checking the current code first.
