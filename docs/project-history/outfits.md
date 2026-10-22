# Minifigure outfits (hologram figure)

> Replaces the sig-fig head in the hologram beam with a full minifigure, with outfit cycling. Scaffolding landed Oct 22 2026; no outfit GLBs are committed yet, so the original head still shows.

**Storage / delivery.** Same pattern as every other GLB on the site: committed files under `assets/models/outfits/<id>/`, served statically by Vercel, listed in `assets/outfits.json` (cycle order = list order). An outfit is one or more GLBs loaded together and fitted as ONE figure (scaled so the combined height = `OUTFIT_NOMINAL_H` 2.9, centred on the old head position), so export all parts of an outfit from the same scene (shared origin/scale). Rendered through `buildHoloGLB(root, FX_LOGO, …)`, i.e. the same unlit holo FX pipeline and sliders as the head.

**Manager (Edit Mode → `☺ outfits`, `#outfitMgr`, code block `OUTFITS` in index.html near `wirePM`).** New outfit, rename, add/remove GLBs, show/hide, reorder, preview now, delete; plus three tunables (auto-cycle seconds, figure height, vertical offset).
- *Drafts* = uploaded in the manager: metadata in `localStorage['mw_outfit_drafts']`, binaries in BRICStore `outfit:<id>:<uid>`. THIS BROWSER ONLY. Id follows the name (folder name on export).
- *Repo outfits* come from `assets/outfits.json`; renames/enabled/order/"remove" are overlays in `copyOvr['outfitMeta']` (`{order:[ids], meta:{id:{name,enabled,removed}}}`), tunables in `copyOvr['outfitCfg']` — these sync with SAVE like everything else in `copyOvr`.
- *Export bundle* (`⇩`) → `mw-outfits.zip` (store-only zip written by `ocZip`): `assets/outfits.json` (merged, authoritative) + `assets/models/outfits/<id>/<file>.glb` for drafts. Unzip at repo root, commit, push. A draft with the same id as a repo outfit shadows it locally.

**Runtime.** `ocTick()` runs every frame (after the arcade block): fades the new outfit in/old out (600 ms, instant under reduced motion), hides `holoHead`/`glowShell`/`logo.userData.glbGroup`, hides the figure while `arcadeActive`, and auto-cycles when docked, unfocused, tab visible, not reduced-motion. Clicking the figure cycles to the next outfit unless a planet's hit proxy is nearer on the ray. If every outfit is disabled/removed/fails to load, the head is handed back. Failed outfits are skipped silently (console warning).

**Known limits / next.** Replacing a GLB inside an existing repo outfit = delete+recreate a draft with the same name and re-export (repo outfits are read-only for parts). Draft binaries are not synced (same as other BRICStore uploads). Not built: per-outfit scale/offset, outfit name caption in the scene, arcade "unlock outfit" reward hook (`MWBattle.onUnlock`) — the arcade doc says minikits should unlock outfits.
