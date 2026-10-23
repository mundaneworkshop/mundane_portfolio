# Arcade ships: the manifest and the Arcade Fleet Lab

> Ships are defined by the built-in `MODELS` table in `assets/battle/battle.js`, optionally overlaid by `assets/battle/ships.json`. The published **Arcade Fleet Lab** artifact (formerly "Site Sound Review") edits that overlay and exports it. Added Oct 23 2026.

**What the manifest can do.** One entry per ship: `{id, name, cls, side, file, size, n, unlock, flip, removed}`.
- `cls`: `hero` | `fighter` | `support` | `capital` (the built-in `base` Death Star and the `minikit` pickup are fixed; they can't be retyped).
- `side`: `rebel` | `imperial` (ignored for heroes, who are always the player's team).
- `file`: a `.glb` in `assets/battle/models/` (no extension). Built-ins keep theirs; new ships use `custom-<id>`.
- `size` (max bbox dimension, world units), `n` (count at density 1; heroes don't use it), `flip` (turn the nose 180°, same as `rot:[0,π,0]`; every model is authored nose +Z).
- `unlock` (heroes only): one condition `{type, n, target?}`, see the table below. The legacy `unlockAt` (= shoot that many minikits) is still read. **The first hero in the manifest is always free**, so the select page can't be fully locked. The debug panel has one session-only "Unlock every ship" switch (never saved).
- `removed: true` takes a built-in out of the game.
- Manifest order = hero carousel order; built-ins it doesn't mention are appended. A missing or broken `ships.json` means the built-in table is used unchanged (`applyShips()` runs at the top of `MWBattle.init`, before `loadCfg()`; the fetch starts when the script loads).

**Plumbing touched.** `battle.js` (`applyShips`, `heroNeed`, `MWBattle.heroLabel`), `index.html` (leaderboard hero names follow the manifest), `api/leaderboard-submit.js` (hero ids are validated by shape, `/^[a-z0-9][a-z0-9_-]{0,40}$/i`, not a fixed list, or a new hero's scores would be rejected). Audio needs nothing: a ship with no clips in `audio.js` `HERO` / `FILES` is silent for engine and fire (add clips there for a new ship once the sound review has picked them).

**Workflow.** Open the Arcade Fleet Lab → Ships tab: edit names / types / sides / thresholds, upload a `.glb` for a new ship → **Export bundle** (zip) → unzip at the repo root (it holds `assets/battle/ships.json` and `assets/battle/models/custom-<id>.glb`) → commit, push, deploy. Every ship in the Lab also gets its sound-review cards automatically (same page, same database).

**Not covered.** Nose orientation beyond the 180° flip (use `tools/battle-orient.html` and ask), per-ship agility (`turn`/`spd`/`fire`/`bright`/`lift` stay in the built-in table for the built-ins; new ships use defaults), engine/fire audio for new ships.

## Where the sound review lives now (Oct 23 2026)

- **Arcade Fleet Lab** (published artifact, the former "Site Sound Review", same URL and database): Ships tab + the ARCADE's sound cards (ambient select/play, heroes, destruction pools, game events, every ship's fire/engine/death). Ship cards are generated from the Ships tab, so a new ship gets its cards at once.
- **Site Sound Review is hosted** (published artifact, https://claude.ai/artifact/KCdBEpSKEM74WGTtmgLbyk) and is GENERATED from `tools/ui-sounds.html` by `python3 tools/build-site-sound-review.py <out.html>`, which inlines the design tokens, `assets/battle/audio.js` and the 20 site clips (`site-ambient`, `gate-*`, `holo-*`; ~2.9 MB base64) so nothing depends on repo files; publish the output with capabilities `{"db":{}}`. In the hosted build the notes and candidate list sync through the artifact db (collection `site`, docs `rows` and `notes`); the candidate audio files stay in that browser. **Re-run the build and republish whenever `audio.js`, the tokens or a site clip changes.** The repo page still works locally through a server. (The two earlier notes below describe the page itself.)
- Site Sound Review, the page (`tools/ui-sounds.html`) (renamed from "Arcade UI sound lab"): the NON-arcade sound cards (site-wide ambient bed; entry gate, dock, boot, planets, hologram idle) plus the synthesised interface-sound lab. Each slot first lists the clips the site plays today (the `SHIPPED` table in the page, a mirror of `SITE_EVENTS` / `gateIdle` / `holoIdle` / `ambSite` in `assets/battle/audio.js`; served from `../assets/audio/`, so open the page through a local server), each with a play button and a note. Update `SHIPPED` when `audio.js` changes. Drop zones below take new candidates. It is a static repo page with no database: candidates are auditioned from IndexedDB and notes are kept in localStorage, in that browser only (`mw_site_sound_rows`, `mw_site_sound_notes`). The moved cards had no saved notes, and their clips are already in `assets/audio/`, so nothing was lost; the artifact's old `sfx` rows for them are now simply not shown.

## Unlock conditions (Oct 23 2026)

One condition per hero, edited on the Fleet Lab's Ships tab ("Unlock when") and stored in `ships.json` as `unlock:{type,n,target?}` (`n` = a count; seconds for `survive`; the rank for `rank`; `n: 0` = free).

| type | meaning | counted how |
|---|---|---|
| `minikits` | shoot N minikits | lifetime, `mw_kits_total` |
| `destroy` | destroy N ships; `target` = `any` / `fighter` / `support` / `capital` / a specific ship id (x-wing, tie-fighter…) | lifetime, per ship id and per class, `mw_ark_stats.kills` |
| `hunters` | destroy N fighters that were targeting you when they died | lifetime (`s.target===heroShip` at the kill) |
| `planets` | see N different BACKDROP planets in the arcade (it picks 1 of 7 at random each visit; max 7, larger values are clamped) | lifetime set of planet names, `mw_ark_stats.planets`, recorded when the planet model finishes loading (`noteSeenPlanet`) |
| `survive` | stay alive N seconds in one life | best single life |
| `plays` | start N runs | lifetime; counted at a run's first spawn, so the Nth start unlocks it immediately |
| `rank` | place in the top N on the leaderboard | best rank; set by `MWBattle.noteRank(rank)` after a score submit |
| `score` | reach N points in one run | best single run |

Progress is plain numbers in localStorage (`mw_ark_stats`, `mw_kits_total`), so a condition is simply met or not from them: changing a condition in the Lab re-evaluates everyone's existing progress (raising a bar can re-lock a ship someone had unlocked).

**Telling the player.** `checkUnlocks()` runs after every stat change and banners (top centre) any ship that just became available. The game-over modal lists the ships that became available during that run, each with the reason (`condDone`: "Survived 2:00", "Placed in the top 3"); a rank unlock appears once the score is submitted (`arcAppendUnlocked`). The locked ship's select page shows the condition with progress (`condText`), e.g. "destroy 10 × X-wing · 4/10"; the minikit icon appears only for the minikit condition.

**Not built / known.** Real kills call `noteKill` from the two hero-kill sites in `hitShip` (verified through the `MWBattle._noteKill` test hook, not by shooting). Only one condition per ship (no AND/OR combinations). Rank counts the submit response, so it needs the leaderboard API to be reachable.
