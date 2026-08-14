# Original homepage concept + architecture

> Mundane Workshop portfolio homepage — holotable WebGL prototype, original direction + architecture + state (Jun 17 2026). Foundational context for the whole site.

Portfolio homepage concept locked as a **holotable projection** (Star Wars war-table). The homepage's primary job: fast-navigate to case studies. Runner-up direction that was rejected: "list + live map."

**Architecture:** one WebGL canvas, Three.js r128, vanilla (no framework/bundler) — this is still true of the current `index.html`. `three.min.js` is bundled locally alongside it (the designer's network blocks CDNs even in-browser, so a CDN-only dependency would be fragile) — a loader falls back local → cdnjs → jsdelivr → unpkg and shows an on-screen error if all fail. Colors bound to the BRIC DS Figma tokens (see color-decisions.md).

**Scene fundamentals (mostly still true of the current site):**

- A squircle (superellipse) baseplate with stepped-squircle stud rings drawn on a canvas texture.
- Zones angle-weighted by item count, each a filled wedge with jagged stepped edges on the shared zone-to-zone boundaries (not the outer perimeter — a center-triangle-fan approach was tried and rejected because it self-overlaps on the jagged edges).
- Planets represent projects/sections; moons/artifacts orbit a focused planet as sub-section placeholders.
- Two focus camera modes were explored: camera-fly (camera travels to the planet) and hologram-zoom (the planet flies to a fixed emitter column, camera pushes in) — hologram-zoom became the designer's preferred mode and is a load-bearing part of later focus-view work (see case-study-direction.md).
- An 8-bit look (low-res render target + nearest-neighbor upscale + posterize) is applied globally and is why later features (message stars, polaroids, CV pulse effects) all deliberately draw to a low-res canvas to inherit the same look.
- A large debug panel exposes most scene tuning as sliders — this pattern continued throughout the project and is codified as a standing rule in maximize-customization.md.

See case-study-direction.md for how the focus view and case-study transition evolved from here, and holotable-editor-and-glb.md for the in-canvas editor that was layered on top.
