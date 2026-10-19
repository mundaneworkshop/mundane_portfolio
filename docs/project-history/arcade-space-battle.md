# Arcade — the space battle (Oct 19 2026)

A **Fun** zone with one **Arcade** planet (the minifig-with-gamepad GLB, `assets/models/arcade/`, seeded via `mesh:arcade` in `assets/manifest.json`) opens a space battle fought inside the galaxy view: Imperials (left) vs the Rebel Alliance (right). Route: `/arcade` (deep links work). It used to live on the entry gate; it was moved here.

Code: `assets/battle/battle.js` (one IIFE, `window.MWBattle`), models `assets/battle/models/*.glb` (24 files, ~3.7 MB, Draco-compressed with `gltf-transform draco --quantize-position 14`; originals were 37 MB).

## What arcade mode does to the galaxy view (index.html, grep `arcade`)
- Keeps: hologram cone, minifig head, monogram emitter, base grid, rings. Hides: zone wedges, every planet, DOM labels, message stars, hint (`body.mw-arcade` CSS + `arcadeActive` checks in `animate()`).
- Ring text becomes "SELECT YOUR HERO SHIP • MOUSE TO MOVE • CLICK TO FIRE" (`ARCADE_RING`, restored on exit; both rings; replays the Aurebesh decode).
- Exit: the `#arcadeExit` button where the breadcrumb normally sits with an inline ESC chip (also clickable; `window` keydown, capture phase). Exit = ships jump to hyperspace (`MWBattle.hyperspace(true)`), then `onDone` → `finishArcadeExit()` restores the galaxy and the route (`/`).
- Input guards while active: planet/zone hover + click, reticle targets, arrow-key planet nav and the D / H author shortcuts are disabled (`window.__mwArcade`) so WASD/arrows fly the hero ship.
- `galaxyModel` migration: persisted/synced models that predate the Fun zone get it pushed on boot.
- `window.__mwPlanetScreen(id)` is a dev/test helper (planet → screen px).

## Battle design
- Same three.js scene as the hologram (so pixelize + posterize apply). The battle lives in group `G`, oriented to the camera pose at arcade entry and scaled by (camera distance / 4.3) so it reads the same from any camera; it turns with `galaxy.rotation.y`. Sim is in G-local coords — use `aim()` not `Object3D.lookAt`.
- Zones: fighters roam a big ellipsoid with an oval clearance around the hologram; support + capital ships are scattered through a deep 3D volume (best-candidate sampling, random every entry); one Death Star (dish always aimed at the hologram, never rolls).
- Lasers: rebel RED, imperial GREEN, hero YELLOW; each ship targets its nearest opponent. Fighters (3 HP) die and respawn; larger ships and the Death Star never die.
- Two stages. **select**: the minifig head is replaced by a carousel of the four hero ships (◄ PLAY ► under the cone; arrow keys / Enter work too); ring text reads "SELECT YOUR HERO SHIP • MOUSE TO MOVE • CLICK TO FIRE". **play** (PLAY or Enter): every hologram artifact hides (all galaxy children, the monogram, rings, grid) and the hero spawns mid-screen. The ship flies toward the mouse and fires where you click (hold to keep firing). 2D→3D: `pickAt()` ray-tests ships/minikits (a hit gives a real XYZ); empty space is approximated by the plane at the hero's depth (the ship also drifts back toward mid-depth). Right-drag pans the camera (left button is fire); spacebar returns to the carousel; ESC exits the mode. Kill counter (top right) counts fighters destroyed by the hero.
- Minikits: spawn anywhere, click or hero-blast to open. Reward is TBD: hook `MWBattle.onUnlock(fn)` / `mw:minikit` window event (`detail:{total,via,reward:null}`).

## Lighting (all battle-only; debug panel → Space battle → Lighting)
- Filmic (ACES) curve patched into the battle's `MeshStandardMaterial`s via `onBeforeCompile` — NOT `renderer.toneMapping`, which would also change the hologram's materials.
- Tiny dark-space environment (`PMREMGenerator.fromScene` of a vertex-coloured sphere: faint teal fill, dim cool back-glow, soft lobe toward the sun). Keep env values < 1 — an HDR sun in the env washed every ship to flat white (RGBM target), and a raw `ShaderMaterial` env rendered black (only built-in materials encode for the PMREM target).
- One sun (directional, azimuth/elevation sliders; fixed in world space, so ships turn under it), low ambient, dim cool back fill; the page's own ambient/key/warm lights are scaled down while the battle runs. Roughness slider (GLB roughness is 1 → no specular otherwise), per-model brightness (`MODELS[].bright`), TIE dark-plastic lift (`MODELS[].lift`).
- Settings persist in `localStorage['mw_battle_cfg']` (versioned: bumping `DEFAULTS.ver` drops stale saved lighting/counts).

## Model notes
Models are authored nose-+Z except Slave I (landed pose, pre-rotated +90° about X via `MODELS[].rot`; nose direction is a best guess). `tools/battle-orient.html` is a top-down contact sheet with axes for checking this.

## Visibility of distant ships
The page's scene fog (`FogExp2`, density 0.03) is what faded far capital ships to black. The battle scales it with the "Distance fog" slider (Lighting group, default 0.25 of the page value; restored on exit). Far support/capital ships also get a depth-compensated size boost (`depthComp`).
