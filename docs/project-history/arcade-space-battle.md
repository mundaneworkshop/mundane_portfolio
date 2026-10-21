# Arcade — the space battle (Oct 19 2026)

A **Fun** zone with one **Arcade** planet (the minifig-with-gamepad GLB, `assets/models/arcade/`, seeded via `mesh:arcade` in `assets/manifest.json`) opens a space battle fought inside the galaxy view: Imperials (left) vs the Rebel Alliance (right). Route: `/arcade` (deep links work). It used to live on the entry gate; it was moved here.

Code: `assets/battle/battle.js` (one IIFE, `window.MWBattle`), models `assets/battle/models/*.glb` (24 files, ~3.7 MB, Draco-compressed with `gltf-transform draco --quantize-position 14`; originals were 37 MB).

## What arcade mode does to the galaxy view (index.html, grep `arcade`)
- Keeps: hologram cone, minifig head, monogram emitter, base grid, rings. Hides: zone wedges, every planet, DOM labels, message stars, hint (`body.mw-arcade` CSS + `arcadeActive` checks in `animate()`).
- Ring text becomes "SELECT YOUR HERO SHIP • PLAY TO UNLOCK COSMETIC REWARDS" (`ARCADE_RING`, restored on exit; both rings; replays the Aurebesh decode).
- Exit: the `#arcadeExit` button where the breadcrumb normally sits with an inline ESC chip (also clickable; `window` keydown, capture phase). Exit = ships jump to hyperspace (`MWBattle.hyperspace(true)`), then `onDone` → `finishArcadeExit()` restores the galaxy and the route (`/`).
- Input guards while active: planet/zone hover + click, reticle targets, arrow-key planet nav and the D / H author shortcuts are disabled (`window.__mwArcade`) so WASD/arrows fly the hero ship.
- `galaxyModel` migration: persisted/synced models that predate the Fun zone get it pushed on boot.
- `window.__mwPlanetScreen(id)` is a dev/test helper (planet → screen px).

## Battle design
- Same three.js scene as the hologram (so pixelize + posterize apply). The battle lives in group `G`, oriented to the camera pose at arcade entry and scaled by (camera distance / 4.3) so it reads the same from any camera; it turns with `galaxy.rotation.y`. Sim is in G-local coords — use `aim()` not `Object3D.lookAt`.
- Zones: fighters roam a big ellipsoid with an oval clearance around the hologram; support + capital ships are scattered through a deep 3D volume (best-candidate sampling, random every entry); one Death Star (dish always aimed at the hologram, never rolls).
- Lasers: rebel RED, imperial GREEN, hero YELLOW; each ship targets its nearest opponent. Fighters (3 HP) die and respawn; larger ships and the Death Star never die.
- Two stages. **select**: the minifig head is replaced by a carousel of the four hero ships (◄ PLAY ► under the cone; arrow keys / Enter work too); ring text reads "SELECT YOUR HERO SHIP • PLAY TO UNLOCK COSMETIC REWARDS". **play** (PLAY or Enter): every hologram artifact hides (all galaxy children, the monogram, rings, grid) and the hero spawns mid-screen. The ship flies toward the mouse and fires where you click (hold to keep firing). 2D→3D: `pickAt()` ray-tests ships/minikits (a hit gives a real XYZ); empty space is approximated by the plane at the hero's depth (the ship also drifts back toward mid-depth). Right-drag pans the camera (left button is fire); spacebar returns to the carousel; ESC exits the mode. Kill counter (top right) counts fighters destroyed by the hero.
- Minikits: spawn anywhere; only the hero ship's lasers open them (mouse clicks no longer do). Reward is TBD: hook `MWBattle.onUnlock(fn)` / `mw:minikit` window event (`detail:{total,via,reward:null}`).

## Lighting (all battle-only; debug panel → Space battle → Lighting)
- Filmic (ACES) curve patched into the battle's `MeshStandardMaterial`s via `onBeforeCompile` — NOT `renderer.toneMapping`, which would also change the hologram's materials.
- Tiny dark-space environment (`PMREMGenerator.fromScene` of a vertex-coloured sphere: faint teal fill, dim cool back-glow, soft lobe toward the sun). Keep env values < 1 — an HDR sun in the env washed every ship to flat white (RGBM target), and a raw `ShaderMaterial` env rendered black (only built-in materials encode for the PMREM target).
- One sun (directional, azimuth/elevation sliders; fixed in world space, so ships turn under it), low ambient, dim cool back fill; the page's own ambient/key/warm lights are scaled down while the battle runs. Roughness slider (GLB roughness is 1 → no specular otherwise), per-model brightness (`MODELS[].bright`), TIE dark-plastic lift (`MODELS[].lift`).
- Settings persist in `localStorage['mw_battle_cfg']` (versioned: bumping `DEFAULTS.ver` drops stale saved lighting/counts).

## Model notes
Models are authored nose-+Z except Slave I (landed pose, pre-rotated +90° about X via `MODELS[].rot`; nose direction is a best guess). `tools/battle-orient.html` is a top-down contact sheet with axes for checking this.

## Visibility of distant ships
The page's scene fog (`FogExp2`, density 0.03) is what faded far capital ships to black. The battle scales it with the "Distance fog" slider (Lighting group, default 0.25 of the page value; restored on exit). Far support/capital ships also get a depth-compensated size boost (`depthComp`).

## Fleet layout + damage (latest)
- Support/capital ships live in a full SHELL around the hologram (radius 10–36 local units, every direction; imperials in the -x half-space, rebels +x), picked by best-candidate sampling, random on every entry. They drift very slowly along their heading (support .16, capital .08 units/s), curve back in (around, not through, the hologram) past radius 34 and bear away inside 12.
- Support (12 HP) and capital (30 HP) ships take damage only from the HERO (AI-vs-AI hits just spark); a health bar (DOM, `#bt-bars`) shows for ~3 s after each hero hit; kills respawn 28–45 s later at a new spot. The Death Star takes no damage. Kills (any ship) feed the top-right counter.
- Pinned visitor messages are `display:none` in arcade (their beacons set their own pointer-events, so hiding the container's pointer-events wasn't enough). The Aurebesh ring is hidden.
- Far stars: `buildArcadeStars()` adds stars to radius 110 with density falling off as 1/r² (constant stars per patch of sky — a uniform volume density packs the far field much denser on screen).
- Minikit spawn rate default 0.3 (debug → Minikits · hero → Minikit spawn rate; max at once is the next slider).
- Dev server tip: a caching static server serves a stale `battle.js` (partial updates look like broken code) — serve with `Cache-Control: no-store`.

## Update: drift, destruction, draw distance
- Support/capital ships travel in dead-straight lines (no bobbing/banking): `chooseHeading()` aims at the far side with a closest-approach margin from the hologram; past `s.R` (36–42) heading outward they make a slow wide turn (`.05`/`.07` rad/s) onto a new far-side heading. They never overlap (`sepLarge()` — soft bounding-sphere separation).
- Destruction: HP capital 100 / support 30 (hero hits only). `startDying()` → 8 s (capital) / 4.5 s (support) of escalating explosions along the hull, shuddering, then `breakApart()` (hull layers peel off + shards, fade out) and a 28–45 s respawn. Debug panel → "Explode a random capital / support ship" triggers it.
- Death Star: placed at distance 80 on its old sight-line (beyond the capital shell, radius ≤ ~42, so nothing passes behind it), scaled by the distance ratio (`dsK`), fog off.
- Ships vanishing when zooming = the camera's far plane (100). The battle raises `camera.far` to 800 while active and restores it on exit.
- Far star field density is half the base density, constant per patch of sky.

## Camera (current)
The normal galaxy orbit camera is used (left-drag yaw via `manualRot`, up/down via `camElev`); arcade widens the `camElev` clamp to -14..16 (normal galaxy view stays -3..7). A free-trackball version was tried and reverted.

## Game-over modal + global leaderboard
- Leaving a game you played (or opening the carousel's **Leaderboard** button) shows `#arcadeResult`: kills, hero ships flown, time; if you scored, a name field + Submit; then the top 10 (your row highlighted). Source of the numbers: `MWBattle.summary()` → `{played, kills, hero, heroes, heroIds, seconds}`.
- Backend (HoloNet pattern): table `leaderboard` (`leaderboard-schema.sql`, run once in the Supabase SQL editor), submit endpoint `api/leaderboard-submit.js` (secret key; reuses `SUPABASE_SECRET_KEY`; optional `LEADERBOARD_SALT` for the IP hash). Reads go straight from the browser with the publishable key — column-level grants expose only `id,name,kills,hero,seconds,created_at,approved` (never `ip_hash`); the client must select columns explicitly.
- **Light protection only**: field validation, plausibility cap (kills ≤ seconds×1.2+4, ≥5 s played), 5 submissions / 10 min per salted-IP-hash, duplicate suppression, no links in names. A determined person can still post a plausible fake score; if that matters, send a kill-event log and validate it server-side.
- Until the table exists the list shows "Leaderboard unavailable right now" and submit errors out gracefully (the local dev server has no `/api`).
- Moderation: set `approved=false` on a row to hide it.

## Intro / outro (latest)
- **Intro**: support + capital ships spawn hidden and `tryScheduleIntro()` gives them staggered hyperspace arrivals (sides interleaved, spread over 3 s once all their models are loaded; `startArrive`/`updArrive` = stretch + flash). Fighters: only ONE V-formation of 3 random types per side (`introWant`, `setupFormation`/`updFormation`) zig-zags around the hologram (immune to AI fire) until a hero is picked; `endIntro()` on PLAY loads in the rest, each jumping in over ~2 s. Respawns also use the arrival effect. Fighter arena is 1.5× larger than before.
- **Destruction**: fighters now leave a debris cloud (`shatter(s,{small:true})`); capital/support ships end with a much bigger final blast (white flash, ring of blasts, two delayed aftershocks via `later()`) as they break apart.
- **Outro** (no hyperspace): `MWBattle.outro()` — everyone stops firing (`quiet()`), fighters + hero fly off screen, support/capital ships stay; the game-over modal opens over the battle and closing it ends the exit (`finishArcadeAfterOutro`). Leaving without having played tears down immediately. `hyperspace()` still exists but is unused.
- **Hero** (Oct 20): `heroMax`=3 hull = 3 collisions with ANY ship (1 each, 1 s invulnerability + knock-back); stray enemy lasers can hit the hero too, chipping `LASER_DMG` (.2) each (ignored during the post-collision invulnerability). Nothing actively targets the hero. At 0 HP the hero explodes and the game ends (`onGameOver` → exit → modal). HULL bar in the top-right HUD under the kill counter.

## Starfield / speeds (latest)
- The single star field (`buildStars`) now has an empty centre: stars exist only beyond an ellipsoid `STAR_HOLE=[32,19,19]` (world units ≈ the arcade play volume) out to radius 130, in both the arcade and the main galaxy view; the separate arcade-only far field was removed. N = Star-density slider × 14 (matches the sky density the arcade had before), fixed 1.2 px points (`starSize*40`, no attenuation). The galaxy camera's far plane (100) clips the outer part there; the arcade raises it to 800.
- Capital/support hyperspace arrival resolves in .375 s (was .75). Hero speed ×0.5 (`HSPD` in `updHero`).

- **Capital/support break-up (Oct 19)**: `fragment(s)` replaces the old whole-hull-layer + box-shard debris. `buildAtoms()` splits a model's triangles into connected islands (oversized welded islands are cut on a fine grid), cached per model; at break-up ~80/160 random atoms fly free as small pieces and the rest are grouped on a randomly offset coarse grid into a handful of large sub-constructions. Each piece has its own velocity (away from a random blast point + noise), spin, drag and lifetime. The dying shudder is now smooth sine wobble instead of per-frame random. Fighters still use `shatter()`. Falls back to `shatter()` if fragmenting fails. Debug hooks: `MWBattle._explode(ship)`, `_debris()`.

- **Fighters hunt the hero (Oct 20)**: `HUNT` constants in battle.js. In `pickTarget` a fighter has `HUNT.chance` to lock on the hero (max `HUNT.max` hunters at once); the lock holds `HUNT.lock` seconds (the fighter ignores its normal mode switching), then it backs off for `HUNT.cool` s. While hunting it keeps a standoff (`HUNT.stand`, circling; retreats inside `HUNT.min`), fires with extra spread / slower rate, and shows a flashing red crosshair (`.bt-xh`, DOM overlay in `updBars`). Game-over → **Play again** re-enters the arcade without the hyperspace jump (`openArcade(id,true)`).

## TODO
- **Loading screen** for the arcade (parked): full-screen overlay with a progress bar over the 24 GLBs (~3.7 MB) — load the 4 heroes + first fighters first, hold until hologram/carousel/first ships are ready, then fade into the staggered arrivals (which currently wait on model loads, so the intro stutters on slow connections). Optionally prefetch the models when the Arcade planet is hovered.
- Minikit reward moment (hook: `MWBattle.onUnlock` / `mw:minikit`).

- Star field has two modes (`buildStars` reads `arcadeActive`; rebuilt on arcade enter/exit): arcade = hole `STAR_HOLE_ARC` (≈ play area) out to 130; galaxy view = tight hole `STAR_HOLE_GAL` [6,5,6] around the hologram, shell to 48, ×14 the Star-density slider, 75× star-size px. On leaving the arcade the camera zoom/height reset to the saved galaxy view (`galcam`).

- Galaxy star hole is now `STAR_HOLE_GAL=[30,18,30]` (covers the interactive area incl. the camera at max zoom-out; shell to 95 = the galaxy camera's far plane). Star material has `fog:false` — scene fog was erasing every distant star. Star-density slider range is 50–3000 (step 50).

## Audio (Oct 20 2026, branch feat/arcade-audio)
- `assets/battle/audio.js` (`window.MWAudio`, Web Audio only) + 29 small mono/stereo AAC `.m4a` clips in `assets/audio/` (~5 MB, fetched only when the arcade opens). Edited from the raw SFX library (`mw space battle game/sfx`); the clip → role tables are `FILES` / `POOLS` / `LEVEL` at the top of `audio.js`.
- Hooks: `openArcade` unlocks audio (the planet click is the gesture) and drives the hyperspace jump sounds (`jumpStart` before `MWBattle.init`, `jumpReveal` in the loader's `onReveal`, `jumpCancel` on ESC mid-load). `battle.js`: `init` → `arcadeStart`, `setStage` → `stage`, `update` → `setYaw`, `startArrive` → `arrive`, `killShip` / `startDying` / `breakApart` → `boom`, `dispose` → `stop`.
- Hero select: two muted ambient layers (space-battle bed + hangar). Play: the gameplay ambience's L/R channels are two HRTF virtual speakers anchored in the battle; `setYaw(galaxy.rotation.y − value at entry)` swings the stage as the camera orbits.
- Hyperspace sounds only play for the galaxy → game jump. A random handful (~3–4) of capital/support arrivals get the Star Destroyer exit cue, staggered and detuned.
- Destruction (assignments come from the Battle Sound Review page, notes included; tables at the top of `audio.js`): fighters pick one of 5 clips (rebel ships also play the R2-D2 scream 1 time in 10). Support / capital ships either play a full lead-up *sequence* (their death time is set to the clip's length minus `SEQ_TAIL`) or small layered explosions on each hull blast (`SEQ_CHANCE`). Both modes ALWAYS end with a big final explosion at the break-up (capitals get two blasts a beat apart); the sequence clips are lead-ups, not finales.
- Hero: the Millennial Hawk (id `mil-falcon`) has engine idle/active loops (equal-power crossfade on ship speed), tap = one single-fire clip, hold (>0.4 s) = chained turret bursts until release. Other heroes are silent for engine/fire until their clips exist (`HERO` table). Hit-by-laser, collision (8 impacts) and destruction are shared by all heroes.
- Ducking: support/capital destruction sounds bypass a `duck` bus that carries every other sound (ambience, engines, fire, fighter booms…). The bus dips to `DUCK_LEVEL` (.22) in ~0.2 s when such a ship starts dying and for each break-up, holds for the clip, and eases back over ~1.5 s.
- Mute: the `SND` button next to ESC, or the `M` key; persists in `localStorage['mw_sound']`.
- Not yet covered (no clips yet): low health, non-Falcon hero engines and fire, other ships' weapon fire, minikit open, carousel/button UI sounds.

## Hero invulnerability after a collision (Oct 20 2026)
- A collision now gives `INV_COLLIDE` = 3 s of invulnerability (to further collisions AND to lasers) instead of 1 s, so back-to-back hits no longer chain into a quick death. While it lasts the hero's opacity pulses between ~30% and 100% (`heroFlash`, replaces the old hard visible/hidden blink). The hero model's materials are shared with its prototype, so `ejectHero` restores the opacity.
- `MWAudio` can never break the frame loop: `oneShot` sanitises its numbers and swallows errors (a non-finite pan once threw inside `update` and froze the simulation).
- Testing note: a hidden Browser pane pauses `requestAnimationFrame`, so the game appears frozen/stuck loading; show the pane before checking game state.

## Audio: spatial one-shots + variety (Oct 20 2026)
- Destruction/arrival one-shots are HRTF-positioned from the ship's direction in camera space (`audioAt` → `loc.p`; loudness stays a separate gain), and a support/capital ship's long lead-up sound is re-aimed every frame while it dies (`MWAudio.track`), so it follows the ship and the camera orbit. Fighters are positioned when they die (short sounds, not tracked).
- Variety: clips come from shuffle bags (every clip plays once before any repeats, never twice in a row), pitch is varied widely (~0.8–1.3 for layers, 0.86–1.14 finals, 0.94–1.07 sequences), some finals are low-passed, capitals always get two finals a beat apart (supports 35%), and 30% of deaths add a deep aftershock.
- Hero select: the ship showing on the carousel idles quietly (`LEVEL.selIdle`) under the ambience; cycling swaps it (`MWAudio.carouselShip`, called from `updCarousel`); PLAY hands over to the gameplay engine. Ships without clips stay silent.

- Hero ships are shown as **Millennial Hawk** (`mil-falcon`), **Bounty Hunter’s M-1** (`n1`), **Razor’s Edge** (`razorcrest`) and **Indentured Servant 1** (`slave-1`). Only the display labels changed (battle.js `MODELS[].label`, index.html `ARC_HERO_NAMES`); ids, model files, audio tables and the leaderboard's `HEROES` set still use the original ids.

## Audio: all four heroes (Oct 20 2026)
- `HERO` table in `audio.js` (assignments come from the review page): Millennial Hawk and Indentured Servant 1 use tap + chained burst clips; Bounty Hunter’s M-1 and Razor’s Edge have no burst clip, so they use `chain`: every bolt fired plays a short (≈0.5 s, faded) single through `MWAudio.heroShot()` (called from `updHero` per bolt), with the first/isolated shot playing a full `fire1` clip. Razor’s Edge has no idle engine yet (silent when still; `idle:null`). The Indentured Servant 1 only uses the clips assigned on the page (single 01/03, double as its burst).
- Low health: `boeing777_chime` plays once per life the first time the hero drops to 1 hit point (`heroLowHealth`, called after collision/laser hp loss).
- Chained burst clips keep their own cadence (`burstTiming` in audio.js): the next burst starts one shot-interval after the clip's last shot and the clip is cut there with a short fade, so no silent tail opens a gap while fire is held (Indentured Servant 1's double now repeats every ~1.3 s instead of ~2.4 s).
- Mix pass (Oct 20 2026): gameplay ambience `LEVEL.ambPlay` .7 → .38; low-health chime x2.6 and routed past the duck bus (the source clip is ~-24 dB); master compressor softened (threshold -8 dB, ratio 3, release .18 s, voice cap 28) so overlapping fire clips ring out instead of being squashed; the Mill. Hawk's held bursts end on the rattle cut from `falcon-turret-03` (`rattle` in the HERO table, played from `heroFireUp`; 03 is no longer in the chained pool).
