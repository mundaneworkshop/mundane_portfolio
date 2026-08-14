# Instagram focus view

> Instagram planet focus = light polaroid grid in index.html, with upload panel, external CTA, and inherited 8-bit post-processing.

Focusing the Instagram planet hides the WebGL kit-box mesh and shows a 2×3 grid of light, askew, floating polaroids (image-only, no pins). Restored to the normal box view on returning home.

Interactions: hovering a polaroid re-renders it crisp (drops the posterize effect) as a preview; in view mode, clicking a polaroid opens its saved URL in a new tab. In Edit Mode, each polaroid gets an upload/clear control and a URL text field; images persist in IndexedDB as Blobs under keys `igfeed:0..5` (deliberately serializable/render-agnostic so a future rebuild in a different renderer can read the same keys).

The entire polaroid (paper + photo + any pin) is drawn to a canvas, pixelated by nearest-upscaling a low-res buffer, and posterized via a shared SVG filter (`#ig-posterize`) so it stays visually consistent with the rest of the scene's 8-bit look.

Social planets (kind `'social'`, e.g. Instagram/LinkedIn) don't enter the case-study takeover on their CTA — the booklet CTA opens an external URL instead (`window.open`). CTA copy and target URL are both editable in Edit Mode and persisted per-instance.

Known limitation (accepted, deferred): pixelation is currently applied per-card (so pixels rotate with each card's CSS tilt) rather than true screen-space pixelation like the rest of the scene. A screen-space-accurate version would need a per-frame compositor — deferred to a future rebuild in a proper 3D framework, where polaroids would become in-scene textured planes instead of DOM elements so they pass through the same post-processing pass as everything else.
