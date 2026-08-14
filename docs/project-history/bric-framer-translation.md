# Framer translation plan (deferred)

> Future task: translate the BRIC button (and dual-state language) from Figma to Framer as a code component. CSS implementation plan — do only when a Figma layout is locked and the designer is ready, not unprompted.

**When to do this:** deferred until a Figma layout is finalized and the designer explicitly asks to translate to Framer.

**The key technical answer** (this was the designer's main concern — whether auto-resize + all the holo effects survive the move): yes. The Figma fixed-size button was a Figma-only constraint (Figma auto-layout frames can't hold true vector corner geometry). In Framer it becomes a Code Component built in CSS, so it can hug its content naturally.

**CSS implementation map:**

- Pixel-stepped corners → `clip-path: polygon()` with fixed-px corner insets and far edges computed via `calc(100% - …)` — auto-resizes to any width with zero JS, and per-corner insets are always symmetric (avoids a global-grid-snap artifact that caused inconsistent corners in the original Figma vector approach).
- Holo glow → `filter: drop-shadow(...)` on a wrapper (not `box-shadow`, which ignores `clip-path` and stays rectangular).
- Bright 1px holo edge → two stacked clipped layers, not an inset box-shadow (same clip-path limitation).
- Scanlines → a `repeating-linear-gradient` overlay clipped to the same shape.
- Ambient motion (flicker, scanline drift, chromatic edge) → CSS `@keyframes`, all gated behind `@media (prefers-reduced-motion: reduce)` — must fully stop, not just slow down; flagged as the top accessibility risk.
- Materialize (holo→alloy) entrance → tied to the design system's Motion tokens.

**Engineering blind spots to flag when this work happens:** render a real semantic `<button>` underneath so `clip-path` doesn't eat keyboard/focus/assistive-tech support; `filter` + animation stacking has a small GPU cost, fine for individual buttons but worth watching if a page ends up dense with them.

See bric-build-progress.md for the exact color/spec values this would port, and visual-language-direction.md for the governing rules.
