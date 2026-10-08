# Archived: WebGL brick cascade, chapter ring, Figma case-study deck

**Status: mothballed (Oct 2026). Not planned for further development.** Case studies are being built in Framer instead.
The work is preserved, not lost: it lives at the git tag **`archive/case-study-deck`** (commit `ca9212b`, Aug 20 2026).

## What's in it (11 commits on top of `main` as of Aug 20 2026)
- **WebGL brick-field cascade** — replaced the CSS cube cascade with a WebGL renderer, including the curtain scrim and fallbacks that announce themselves. Own doc: `webgl-brick-cascade.md`.
- **Chapter ring** — case study as a ring of per-chapter objects with camera framing, focus dim, nav placement and an authoring panel. Docs: `case-study-chapter-ring.md`, `case-study-constellation-SHELVED.md` (the constellation variant, shelved with what it decided and what it didn't).
- **Figma deck wrapper** — the Figma deck embedded in the site, with the curtain covering the load. Doc: `case-study-figma-deck.md`.
- Clickable breadcrumb ancestors.

Those four docs exist **only on the tag**; read them with `git show archive/case-study-deck:docs/project-history/<file>`.

## How to look at it
```bash
git fetch --tags
git show archive/case-study-deck --stat                      # what changed
git worktree add ../portfolio-archive archive/case-study-deck  # browse it as a full checkout
```
It is ~68 commits behind `main` at time of archiving and will conflict heavily; treat it as a reference to port ideas from, not something to merge.

## What was removed from `main` alongside the archive
The original DOM brick cascade had already been switched off (`CASCADE_ENABLED = false`, Sep 28 2026) and was deleted in Oct 2026: the CSS cube/stud styles, `buildCascade`, the `cascadeCfg` tunables, and the "Brick cascade" debug panel. `CS.showCascade` now just runs a plain opaque fade scrim (420 ms in, 600 ms cover, 420 ms out) with the same `onCurtainClosed` / `onDone` hooks. The legacy DOM kit box (`#box-scene`) was removed in the same cleanup.
Any `cascadeCfg` saved in `content_overrides` is now unread and harmless.
