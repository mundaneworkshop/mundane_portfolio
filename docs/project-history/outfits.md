# Minifigure outfits (hologram figure)

> Replaces the sig-fig head in the hologram beam with a full minifigure, with outfit cycling. Scaffolding landed Oct 22 2026; no outfit GLBs are committed yet, so the original head still shows. The carousel / About-me / unlock layer (below) is the product vision from the same day.

**Storage / delivery.** Same pattern as every other GLB on the site: committed files under `assets/models/outfits/<id>/`, served statically by Vercel, listed in `assets/outfits.json` (cycle order = list order). An outfit is one or more GLBs loaded together and fitted as ONE figure (scaled so the combined height = `OUTFIT_NOMINAL_H` 2.9, centred on the old head position), so export all parts of an outfit from the same scene (shared origin/scale). Rendered through `buildHoloGLB(root, FX_LOGO, …)`, i.e. the same unlit holo FX pipeline and sliders as the head.

**Manager (Edit Mode → `☺ outfits`, `#outfitMgr`, code block `OUTFITS` in index.html near `wirePM`).** New outfit, rename, add/remove GLBs, show/hide, reorder, preview now, delete; plus three tunables (auto-cycle seconds, figure height, vertical offset).
- *Drafts* = uploaded in the manager: metadata in `localStorage['mw_outfit_drafts']`, binaries in BRICStore `outfit:<id>:<uid>`. THIS BROWSER ONLY. Id follows the name (folder name on export).
- *Repo outfits* come from `assets/outfits.json`; renames/enabled/order/"remove" are overlays in `copyOvr['outfitMeta']` (`{order:[ids], meta:{id:{name,enabled,removed}}}`), tunables in `copyOvr['outfitCfg']` — these sync with SAVE like everything else in `copyOvr`.
- *Export bundle* (`⇩`) → `mw-outfits.zip` (store-only zip written by `ocZip`): `assets/outfits.json` (merged, authoritative) + `assets/models/outfits/<id>/<file>.glb` for drafts. Unzip at repo root, commit, push. A draft with the same id as a repo outfit shadows it locally.

**Runtime.** `ocTick()` runs every frame (after the arcade block): fades the new outfit in/old out (600 ms, instant under reduced motion), hides `holoHead`/`glowShell`/`logo.userData.glbGroup`, hides the figure while `arcadeActive`, and auto-cycles when docked, unfocused, tab visible, not reduced-motion. Clicking the figure cycles to the next outfit unless a planet's hit proxy is nearer on the ray. If every outfit is disabled/removed/fails to load, the head is handed back. Failed outfits are skipped silently (console warning).

**Known limits / next.** Replacing a GLB inside an existing repo outfit = delete+recreate a draft with the same name and re-export (repo outfits are read-only for parts). Draft binaries are not synced (same as other BRICStore uploads). Not built: per-outfit scale/offset, outfit name caption in the scene, arcade "unlock outfit" reward hook (`MWBattle.onUnlock`) — the arcade doc says minikits should unlock outfits.

## Terminology (what to call things)

| say | meaning | in code |
|---|---|---|
| **hologram figure** (or just "the figure") | the full minifigure standing in the middle of the hologram cone, the thing you click | `outfitStage` / `outfitCur.group` |
| **outfit** | one look of the figure: a sig fig GLB (or several) plus name, About copy and unlock rule; the carousel cycles outfits | an entry in `assets/outfits.json`; `ocAll()` |
| **carousel** | the `◄ name ►` HUD under the cone that cycles outfits | `#outfitHud`, `ocNext()` |
| **About view** | the focus view you enter by clicking the figure: figure centred, manual below with that outfit's About-me copy; route `/about/<outfit-id>` | `aboutGrp`, `openAbout()` |
| **sig fig** | Jason's word for a figure made in Studio and converted by the Sig Fig Lab | the `.io` / GLB source of an outfit |
| **original head** | the pre-outfit placeholder, a minifig head, shown only when no outfit is enabled | `holoHead` (+ `glowShell`) |
| **logo** | the group everything in the hologram centre hangs off; also the MW monogram shown on the entry gate | `logo` |

"Minifig head" should now only mean the original head placeholder.

## Carousel, About-me focus view and arcade unlocks (Oct 22 2026)

**Product vision (Jason):** the hologram is an outfit carousel; clicking the central figure zooms into a focus view that reuses the project template, whose manual is an "About me" that changes copy with the selected outfit; locked outfits point visitors at the Space Arcade, which unlocks them.

- **Outfit record additions** (repo manifest or overlay in `copyOvr['outfitMeta']`, or a draft): `unlockAt` (minikits; the FIRST ENABLED outfit in order is always the free default; new drafts default to 3) and `about: {kicker,title,body,teaser}`. Edited in the manager under "unlock + about copy"; exported in `outfits.json`.
- **Unlock state:** `localStorage['mw_kits_total']` = lifetime minikits (+1 per `mw:minikit` window event from `assets/battle/battle.js`; no battle.js changes needed). Outfit is locked iff total < `unlockAt` (default outfit exempt). `mw_outfits_new` = just-unlocked ids (shows "· new", toast "Outfit unlocked: …"). Manager has `+1` / `reset` for testing.
- **Carousel HUD** (`#outfitHud`): `◄ name ►` + status under the cone; locked outfit renders as a 28% ghost (`OUTFIT_LOCKED_ALPHA`) with "Collect N more minikits…" and a PLAY THE SPACE ARCADE button. Auto-cycle is now OFF by default (it fights a visitor reading; the arrows are the carousel).
- **About-me focus view:** `aboutGrp` is a stand-in "planet" (child of `logo`, `userData.hit = outfitStage`) so `focusPlanet`, `stageFit`, the booklet manual (`CS.showBooklet`) and `goHome` all work unchanged — the figure already sits at `FOCUSFRAME.anchorY`. Click figure = `ocClickFigure` (locked → nudge HUD instead). Route `/about/<outfit-id>` (vercel rewrite already covers it; local python server 404s deep links). While focused, the figure eases to face the camera, "Hologram zoom" focus mode never hides it, and the HUD moves into the free stage rect (`MWStage`) above the manual. Switching outfit in the focus view re-fills the manual; a locked outfit shows the teaser + arcade CTA instead.
- **Gotcha fixed:** the `addFx` holo shader overwrote alpha (`gl_FragColor.a = mix(…, holoA, uHolo)`), so `material.opacity` was ignored in holo mode. It now multiplies by a `uOc` uniform (default 1, so nothing else changes) — that is what drives the outfit fade and the locked ghost.

**Not built:** snapshot rows/tags in the About manual (booklet supports them; manager has no editor yet), in-page inline editing of About copy (use the manager), arcade-side "outfit unlocked" celebration, per-outfit tint.

**Locked-outfit affordance now matches the arcade's ship gate (Oct 22 2026).** Same mental model in both places: "shoot N minikits in the Space Arcade". The carousel HUD shows the real minikit GLB (spun in the site's `mountGLBViewer`, only mounted while a locked outfit is on show, since it is a second WebGL context) with `×(still needed)`, a "Shoot N more minikits in the Space Arcade to unlock (have/N)" line, and a PLAY THE SPACE ARCADE link (`ocGoArcade`; in the focus view the manual's CTA does the same and the HUD button hides). The `mw:minikit` listener prefers the arcade's `detail.lifetime` (the arcade PR owns `mw_kits_total`) and only falls back to +1 against an older `battle.js`, so the two never double-count.

**Intake.** The first batch of sig figs is prepared with the Sig Fig Lab artifact (`sigfig-lab.md`, source `tools/sigfig-lab.html`); its export bundle writes `assets/outfits.json` and `assets/models/outfits/<id>/`. Site follow-ups it depends on: idle-clip playback and the non-minikit unlock rules.

## Carousel pass 2 (Oct 23 2026)

- **The original head is carousel entry 0.** Built-in outfit `id:'head'` ("Original head", `ocAll()` adds it, `builtin:true`, no parts, always first, always free, not shown in the manager or the export bundle). With no real outfits the carousel does not exist and nothing here touches the scene (as before). Selecting it hands the scene back to the head (textured GLB head if set, else `holoHead`); it has its own About view (`/about/head`, placeholder copy, editable through the `outfitMeta` overlay).
- **Hover reticle on the figure / head.** The pointermove handler raycasts `ocHit()` (the figure, or the head in head mode) and sets `figHover` (unless a planet is nearer); `targets()` returns `{key:'figure', label:'▸ ABOUT ME' | '▸ LOCKED'}` so the targeting reticle frames it, and the cursor becomes a pointer. The ghost's helper meshes have `raycast` disabled (a line's pick radius is huge at this scale and made the whole screen "hover").
- **Unlocked = the logo head's treatment.** `ocLogoize()`: DoubleSide basic materials registered in `ocMats`, which `setLogoHoloState()` drives together with the head's (so the figure follows the holo / solid / additive slider exactly like the head). The head uses ONE global depth pre-pass on `LOGO_LAYER`; that cannot pose a skinned figure (its depth did not match the colour pass and the figure came out in pieces), so each rigid part of the figure gets its own depth-only twin (`ocDepthMat`, polygon-offset back a hair) and draws as a single layer. The skinned torso/head have no twin (a skinned twin came out displaced) and draw without one.
- **Unlocked figures play their idle loop** (`AnimationMixer` over the figure root, clip named `idle` else the first; `ocTick` updates it while the stage is visible, not locked, not reduced-motion). `MWOutfits.seek(t)` freezes it at t seconds (review hook, `seek(null)` resumes). Skinned meshes need `material.skinning=true` in r128, and `addFx` now recomputes `vWP`/`vNN` after skinning (`#ifdef USE_SKINNING`).
- **Locked = the arcade's locked-ship look** (`ocGhostSet`, mirrors `carWire` in battle.js): a teal fresnel shell (normal blending, front faces, depth write) over a depth pre-pass so exactly one surface shows, plus a faint additive outline of hard edges (edges shorter than 6% of the part dropped). Static first pose; the mixer is rewound to 0 when a figure locks.
- **Test variants** in `assets/outfits.json`: `vr-gamer` (unlocked) and `vr-gamer-locked` (same GLB, `unlockAt:1000`, "locked test"). Delete the second entry when real sig figs land.
