# Entry-gate space battle (Oct 19 2026)

Imperials (left) vs Rebel Alliance (right), fought around the MW monogram on the entry gate. Code: `assets/battle/battle.js` (one IIFE, `window.MWBattle`), models: `assets/battle/models/*.glb` (24 files, ~3.7 MB, Draco-compressed via `gltf-transform draco --quantize-position 14`; originals were 37 MB).

## Wiring in index.html (4 touch points, all grep-able as `MWBattle`)
- `<script src="assets/battle/battle.js">` next to the reticle script.
- `MWBattle.init({...})` at the end of `bootHolotable()`, only if `mwPhase==='entry'` (deep links / reduced-motion never load it).
- `MWBattle.update(t)` in `animate()` right before `mwUpdate`.
- `MWBattle.hyperspace()` at the top of `startDock()`; `MWBattle.dispose()` in `mwLoad`'s failure path.

## Design decisions
- Same three.js scene as the monogram (not an overlay), so pixelize + posterize apply for free and the monogram's depth correctly hides ships behind it.
- The battle lives in a group `G` oriented to the **entry camera pose at init** (includes the saved galaxy-view elevation `camElev`), so layout is stable if the visitor orbits/zooms. All sim is in G-local coords (+x right, +y up, +z toward viewer) — use `aim()` not `Object3D.lookAt` (world-space).
- Zones: fighters = soft ellipsoid around the monogram (pursue/evade/wander state machine, keep-out sphere around the mark); support = anchored patrol at ~62–71% of half-width; capitals ~93–97%; Death Star (max 1) far back upper-left. Imperials left, rebels right.
- Lasers: rebel RED, imperial GREEN, hero YELLOW. Each ship fires at its nearest opponent; fighters only when the target is in a ~16° cone. Fighters have 3 HP and respawn; support/capitals/Death Star never die. Hero bolts hit both sides.
- Hero ships: buttons bottom-right; mouse aims, W/S throttle, A/D strafe, Shift boost, Space or click fires, Esc ejects. Clicking the monogram still docks.
- Minikits: spawn anywhere, glow sprite, click or hero-blast to open. Reward is TBD — hook is `MWBattle.onUnlock(fn)` and the `mw:minikit` window event (`detail:{total,via,reward:null}`).
- Dock: ships stop firing, align nose to an outward vector, flash, stretch and accelerate off page (delay by class — fighters, support, capitals, Death Star — swept by angle around the mark, step = `jumpStep`). Everything is disposed afterwards.

## Tuning
Debug panel → "Space battle · entry gate" (visible only at the gate): density, speed, size, arena, laser rate/speed/size, per-zone size/speed/laser, per-type counts, Death Star on/off, minikit rate/max/size. Persisted to `localStorage['mw_battle_cfg']`.

## Model notes
All models are authored nose-+Z except Slave I, which ships in its landed pose and is pre-rotated +90° about X (`MODELS[].rot`) — that nose direction is a best guess; flip the sign if it flies backwards. `tools/battle-orient.html` is a top-down contact sheet with axes for checking this.
