# Arcade ships: the manifest and the Arcade Fleet Lab

> Ships are defined by the built-in `MODELS` table in `assets/battle/battle.js`, optionally overlaid by `assets/battle/ships.json`. The published **Arcade Fleet Lab** artifact (formerly "Site Sound Review") edits that overlay and exports it. Added Oct 23 2026.

**What the manifest can do.** One entry per ship: `{id, name, cls, side, file, size, n, unlockAt, flip, removed}`.
- `cls`: `hero` | `fighter` | `support` | `capital` (the built-in `base` Death Star and the `minikit` pickup are fixed; they can't be retyped).
- `side`: `rebel` | `imperial` (ignored for heroes, who are always the player's team).
- `file`: a `.glb` in `assets/battle/models/` (no extension). Built-ins keep theirs; new ships use `custom-<id>`.
- `size` (max bbox dimension, world units), `n` (count at density 1; heroes don't use it), `flip` (turn the nose 180°, same as `rot:[0,π,0]`; every model is authored nose +Z).
- `unlockAt` (heroes only): lifetime minikits shot (`localStorage['mw_kits_total']`) needed to unlock. **The first hero in the manifest is always free**, so the select page can't be fully locked. Debug-panel overrides are session-only and never saved, so the manifest stays authoritative.
- `removed: true` takes a built-in out of the game.
- Manifest order = hero carousel order; built-ins it doesn't mention are appended. A missing or broken `ships.json` means the built-in table is used unchanged (`applyShips()` runs at the top of `MWBattle.init`, before `loadCfg()`; the fetch starts when the script loads).

**Plumbing touched.** `battle.js` (`applyShips`, `heroNeed`, `MWBattle.heroLabel`), `index.html` (leaderboard hero names follow the manifest), `api/leaderboard-submit.js` (hero ids are validated by shape, `/^[a-z0-9][a-z0-9_-]{0,40}$/i`, not a fixed list, or a new hero's scores would be rejected). Audio needs nothing: a ship with no clips in `audio.js` `HERO` / `FILES` is silent for engine and fire (add clips there for a new ship once the sound review has picked them).

**Workflow.** Open the Arcade Fleet Lab → Ships tab: edit names / types / sides / thresholds, upload a `.glb` for a new ship → **Export bundle** (zip) → unzip at the repo root (it holds `assets/battle/ships.json` and `assets/battle/models/custom-<id>.glb`) → commit, push, deploy. Every ship in the Lab also gets its sound-review cards automatically (same page, same database).

**Not covered.** Nose orientation beyond the 180° flip (use `tools/battle-orient.html` and ask), per-ship agility (`turn`/`spd`/`fire`/`bright`/`lift` stay in the built-in table for the built-ins; new ships use defaults), engine/fire audio for new ships.
