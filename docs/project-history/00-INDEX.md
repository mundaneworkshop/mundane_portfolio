# Project history index

This folder is a snapshot of the design/build decision log kept in the Cowork session that built this site (Apr–Aug 2026). It's exported here so that context isn't lost now that development is moving to Claude Code, which has no access to that memory system. Each file is one topic; read the ones relevant to whatever you're touching before making changes — a lot of this documents hard-won bugs (regressed 2-3 times each) and explicit designer decisions that look arbitrary in the code without this context.

**Start here depending on what you're doing:**

- Touching the manual/booklet, routing, or URL slugs → [url-slugs-routing.md](url-slugs-routing.md)
- Touching GLB/3D model texture rendering → [glb-texture-rendering.md](glb-texture-rendering.md) (regressed 3×, has a REGRESSION GUARD banner in-code)
- Touching the galaxy/focus/case-study transition → [case-study-direction.md](case-study-direction.md) (long — the full history of the box-open + cascade feature)
- Touching CV or HoloNet views → [cv-contact-focus-views.md](cv-contact-focus-views.md)
- Touching the in-canvas editor / IndexedDB / localStorage persistence → [holotable-editor-and-glb.md](holotable-editor-and-glb.md)
- Adding any new tunable/parameter → [maximize-customization.md](maximize-customization.md) (standing rule: expose it, don't bake it)
- Verifying any HTML/JS change → [workflow-html-verification.md](workflow-html-verification.md)
- Figma design system (tokens, components, color, spacing, type) → [foundation-docs.md](foundation-docs.md), [color-decisions.md](color-decisions.md), [spacing-decisions.md](spacing-decisions.md), [visual-language-direction.md](visual-language-direction.md), [star-wars-visual-dna.md](star-wars-visual-dna.md), [bric-build-progress.md](bric-build-progress.md), [bric-framer-translation.md](bric-framer-translation.md)
- Known open backlog items not yet built → [holotable-next-steps.md](holotable-next-steps.md), [text-style-tokens-todo.md](text-style-tokens-todo.md)

**Full file list:**

- [box-replacement-focus.md](box-replacement-focus.md) — "Replace box" upload, swap the kit box for a custom asset per project
- [bric-build-progress.md](bric-build-progress.md) — Figma DS component build state, button state model, token API gotchas
- [bric-framer-translation.md](bric-framer-translation.md) — deferred: rebuilding the stepped button in Framer as a code component
- [case-study-direction.md](case-study-direction.md) — full history of the galaxy → focus → box-open → case-study transition direction
- [case-study-page-brief-jul8.md](case-study-page-brief-jul8.md) — confirmed case-study page direction, Framer/CMS build target
- [color-decisions.md](color-decisions.md) — locked palette (B1 Vivid Gold), two-register color model, link color
- [cv-contact-focus-views.md](cv-contact-focus-views.md) — CV hyperspace route + HoloNet comm console architecture
- [foundation-docs.md](foundation-docs.md) — design token architecture, Figma page structure
- [galaxy-view-amend-jun23.md](galaxy-view-amend-jun23.md) — dynamic zone/planet model, per-zone FX, editable breadcrumb
- [glb-texture-rendering.md](glb-texture-rendering.md) — INVARIANT rules for GLB decal/texture rendering, read before touching
- [holotable-backlog-jun20.md](holotable-backlog-jun20.md) — long log of feature rounds + bug fixes (marquee, box faces, SVG upload, etc.)
- [holotable-editor-and-glb.md](holotable-editor-and-glb.md) — in-canvas Edit Mode architecture, persistence model, holo-FX pipeline
- [holotable-next-steps.md](holotable-next-steps.md) — open backlog as of Jun 20
- [homepage-holotable-prototype.md](homepage-holotable-prototype.md) — original homepage concept + architecture
- [instagram-focus-view.md](instagram-focus-view.md) — Instagram planet focus view (polaroid grid)
- [maximize-customization.md](maximize-customization.md) — standing rule: expose tunables as editable content
- [spacing-decisions.md](spacing-decisions.md) — locked spacing tokens
- [star-wars-visual-dna.md](star-wars-visual-dna.md) — Star Wars UI visual language analysis backing the aesthetic
- [text-style-tokens-todo.md](text-style-tokens-todo.md) — todo for the real build: bind text to DS type tokens
- [url-slugs-routing.md](url-slugs-routing.md) — Aug 13 2026: editable URL slugs + client-side routing (most recent work)
- [visual-language-direction.md](visual-language-direction.md) — locked cassette-futurism aesthetic, all core design rules
- [workflow-html-verification.md](workflow-html-verification.md) — standing QA process for HTML prototype changes
