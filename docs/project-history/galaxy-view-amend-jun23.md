# Galaxy view — dynamic model, per-zone FX, breadcrumb

> index.html galaxy view: dynamic zone/planet model, per-zone FX, editable breadcrumb, dark-only, galaxy cam default, playground manual fix.

**Dynamic zone/planet model** — the galaxy's zones and planets are NOT hardcoded; they're a persisted `galaxyModel` object (`copyOvr['galaxyModel']`). Zones: work / play / profile (cv+contact merged) / social. The nav menu is generated from this model. In Edit Mode, +/- controls on the menu mutate the model, persist it, and reload the page so the whole scene rebuilds from the new model (a "soft delete" pattern — removed items are kept with `hidden:true` and shown dimmed only while editing, never fully destroyed from storage).

**Per-zone planet FX/tint** — replaced a single global planet-FX control with per-zone pairs (`zoneFx`, keyed by zone id, persisted). Defaults: teal for the play zone, amber elsewhere.

**Breadcrumb** — the root label is editable (default "Mundane Workshop", was previously a generic "home"); every breadcrumb segment is editable in Edit Mode.

**Light-mode toggle removed** — the galaxy view is dark-only now. Case study pages keep their own separate light mode.

**Galaxy default camera** — a debug control lets the designer save/reset the default camera angle/zoom for the galaxy view, applied on boot.

**Playground/locked planets** — the previously-locked placeholder planets now get a full kit box + booklet manual on focus (an encrypted-placeholder content set), instead of a manual-less dead end.

Relates to case-study-direction.md, bric-build-progress.md, homepage-holotable-prototype.md.
