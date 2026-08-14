# Standing rule: maximize customization

> Standing preference — expose maximum customization/editability across the project. (type: feedback — an explicit standing designer preference, not a one-off task.)

For the entire project, default to maximizing the designer's customization options. Treat every tunable value — debug-panel control, baked constant (e.g. cascade CFG, SHAPES brick weights), magic number, or hardcoded array — as something to expose as editable content, not bury in code.

**Why:** Jason is building an AI-readable, CMS-driven portfolio system and wants full authoring control over the canvas (meshes, textures, scene tuning, transition timing) without touching code; he plans to keep adding parameters before handover.

**How to apply:** When modeling content, prefer typed, validated, well-described fields over baked values. When you find a hardcoded value, surface it as editable and flag it rather than leaving it baked. Mirror tested ranges (slider min/max/step) as validation bounds. Don't ask "should this be editable?" for existing tunables — assume yes.
