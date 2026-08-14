# Holotable feature/bugfix backlog (Jun 20-23 rounds)

> Long chronological log of feature rounds + bug fixes in what is now index.html: marquee, box faces, SVG upload, moon focus, camera pan, STEP import, etc. Kept for the specific root-causes — several of these bug classes are easy to reintroduce.

Originally logged against `homepage-holotable-merged.html`, now `index.html` (renamed at some point before the Aug 2026 deploy prep). ~13k lines, several inline `<script>` blocks. No headless browser was available during most of this work, so changes were verified with `node --check` on extracted scripts; the user reloaded in their own browser to confirm visuals — keep doing this (or headless Playwright, now available) for any change here.

**Hover affordance**: planet hover bumps mesh scale + adds a `.plabel.hot` CSS glow/lift, toggled from both the canvas raycast hover handler and the menu's mouseenter/leave — both paths must stay in sync or hover state gets stuck (see "stuck highlight" bugs below).

**Editable secondary label**: planet labels are structured as a title + sub-label; both are separately inline-editable and persist separately.

**Moon focus + manual**: clicking a moon/artifact in focus (non-edit mode) freezes its orbital float and the camera follows it; `getMoonMeta()` supplies per-artifact content (title/desc/cta/links) with defaults falling back to the project's data, persisted only once actually edited. Returning to the project (clicking off the artifact) restores the project's own snapshot/CTA/tags — these are saved into separate "default" variables before an artifact focus overwrites the shared DOM, specifically to avoid a bug where returning to the project showed the artifact's leftover values.

**Box-face texture persistence** — hit this bug twice, worth knowing both causes: (1) an early save/load routine hardcoded only `['front','back']` instead of iterating all six faces; (2) after that was fixed, uploads still only reliably saved the front face because the texture-load callback fired async (`img.onload`) but the save call fired synchronously right after the upload handler — captured the pre-load state. Fixed by moving the persist call inside the image's `onload` callback.

**SVG/OBJ replacing planet geometry**: hardened the geometry-swap path to dispose the old geometry and remove stray child meshes; if the planet is currently shown as its focus-view box, the uploaded geometry is stashed and restored on unfocus so it isn't lost.

**Kit box side marquee**: a scrolling text ribbon wraps continuously around the box's four non-cover faces (single mesh, not four separate faces) — building it as four separate faces caused visible seams and mismatched scroll direction; the continuous-ribbon approach (`buildMarqueeRibbon`) fixed both. Marquee is per-project, editable in the project's edit panel (text, colors, font, speed, flip/reverse/mirror toggles for orientation).

**"Stuck planet highlight" / "click anywhere opens case study" bug** — root cause was a giant invisible hit-proxy: an SVG-derived planet's bounding box was computed from the SVG's raw (unscaled) coordinates before the mesh was scaled down, so the hit-test sphere ended up covering nearly the whole viewport. Fixed by always recomputing the bounding box/sphere AFTER scaling, not trusting a possibly-stale cached one.

**Vertical camera pan in focus view**: orbit-drag only tilts around a fixed look point; a separate shift-drag pan control was added so the designer can also raise/lower the framing, saved per-project alongside the other camera view settings.

**STEP (.stp/.step) file upload support**: three.js has no native STEP loader, so `occt-import-js` (WASM build of OpenCascade, the same importer used by Online3DViewer) is lazy-loaded from a CDN on first `.stp` upload. Converts to a THREE.Group of meshes with per-part color, then feeds into the same code paths as GLB uploads.

**Box-face image "cover" fit**: uploaded face textures are cropped/centered to fill each face's aspect ratio rather than stretching.

**GLB solid-brick colors too dark** — a related-but-distinct issue from the black-background decal bug (see glb-texture-rendering.md): solid (non-decal) brick colors also needed a linear→sRGB lift, or dark plastics rendered almost black and clashed visually with the correctly-lit prints next to them.

**Artifact bitmap upload as a flat card**: an uploaded flat image on an artifact/moon now replaces its geometry with a camera-facing plane (billboards every frame) instead of wrapping the image around the default sphere.

**"Hide CTA" collapsing the whole manual** — the booklet's vertical position is measured from the CTA button's screen position; when the CTA is hidden (`display:none`), its bounding rect collapses to zero and the position math went haywire, hiding the entire manual. Fixed by falling back to a different, always-present element's rect when the CTA is hidden. This is the same general fragility class of bug that the booklet height/positioning rewrite (Aug 13 2026, see url-slugs-routing.md's sibling fix) later replaced with a more robust dual-page-aware measurement — if you're touching booklet positioning again, prefer that newer approach over resurrecting this measure-off-a-specific-element pattern.

See also bric-build-progress.md, homepage-holotable-prototype.md, case-study-direction.md, holotable-editor-and-glb.md.
