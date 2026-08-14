# Spacing tokens

> BRIC DS spacing tokens locked Jun 16 2026 — stud-count primitives, responsive semantic set, section-gap bumped, three-level naming.

**Primitive scale** — stud-count names, each = N×8px: half-stud 4, stud 8, 1-5-stud 12, 2-stud 16, 2-5-stud 20, 3-stud 24, 4-stud 32, 5-stud 40, 6-stud 48, 8-stud 64, 12-stud 96, 16-stud 128. Self-documenting, on-brand with the voxel/stud metaphor.

**Semantic set** (responsive, Mobile/Web modes), three-level `category/role/variant` naming:

| Token | Mobile | Web |
|---|---|---|
| spacing/inline/gap | 8 | 8 |
| spacing/content/gap | 12 | 16 |
| spacing/stack/gap | 16 | 24 |
| spacing/component/padding | 12 | 16 |
| spacing/card/padding | 16 | 24 |
| spacing/section/gap | 48 | 64 |
| spacing/page/margin | 16 | 32 |

**Key decisions:** section/gap was bumped from an app-density 24/32 to a more generous 48/64 to match the expressive portfolio brief ("willing to take up space"). A middle `spacing/stack/gap` tier was added so vertical rhythm reads content-gap < stack-gap < section-gap.

**Layout** (also locked Jun 16): grid columns 4 (mobile) / 12 (web), grid gutter 16/24, grid margin aliases spacing/page/margin, max-width/content unconstrained/1200, max-width/reading unconstrained/720 (~70ch prose — case-study body text should stay in this), max-width/wide unconstrained/1440 (showcase/gallery), full-bleed = no max (hero/3D). Kept to 2 modes (Mobile/Web) — Framer's Tablet breakpoint inherits Web values; a dedicated Tablet mode would only be added on demand.

**Deferred, build-on-demand:** display-register density tokens (tighter padding for MFD/data-card style panels) — intentionally not built speculatively.

See color-decisions.md, visual-language-direction.md, foundation-docs.md.
