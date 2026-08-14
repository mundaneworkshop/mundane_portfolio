# Design token architecture + Figma structure

> Foundation docs + token architecture decisions + Figma page structure (BRIC DS design system, consolidated Jun 18 2026).

Seven foundation docs exist in the designer's local project folder (`../BRIC DS/`): project-brief, personas, design-principles, platform-constraints, visual-language, token-display-standards, ds-building-practices. These are Figma/design-system-side references, separate from the site's codebase — relevant if doing Figma work via the Figma MCP tools, not directly needed to edit `index.html`.

**Token architecture is a hybrid**: a Color collection with Light/Dark modes (existing), plus a Dimensions collection with Mobile/Web modes for responsive type/spacing/radius/layout — split across two collections because a single Figma variable collection can only vary along one mode axis.

**Spacing uses stud-count naming** (`space/half-stud`=4, `space/stud`=8, `space/2-stud`=16, etc., 1 stud = 8px) — see spacing-decisions.md for the full locked scale.

**Fonts locked**: Chakra Petch (display) + DM Sans/Space Grotesk (body) — see visual-language-direction.md for the final, further-revised type stack.

**Visual direction**: voxel (3D pixel = stackable modular block = LEGO logic) as the unifying metaphor, paired with a central 3D element planned via Spline.

**Tooling note**: Figma work in this project uses the figma-console MCP (Console MCP / Desktop Bridge), not the native Figma MCP — this was an explicit project rule, worth knowing if picking up any Figma-side work again.

**Figma page structure** (5 pages as of the last consolidation): Foundations (color/spacing/corners/elevation/layout/dual-state/type/background-grid), Components (atoms/molecules/organisms), Templates (reserved, mostly empty), References (Star Wars mood boards), LEGO Rebrand (reference board).

**Open blind spots flagged at the time**: no accessibility floor had been set (matters most for the big-tech-hiring-manager persona this site targets); AR/headset viewing is a different medium the pixel-based tokens weren't built for; the planned central 3D element needs a graceful-degradation/performance plan.

See color-decisions.md, spacing-decisions.md, visual-language-direction.md, bric-build-progress.md.
