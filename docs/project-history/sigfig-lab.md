# Sig Fig Lab (intake artifact for the minifigure sig figs)

> Published artifact: https://claude.ai/artifact/V3az3EFrjqm1g6hSeD3GiA. Source of truth: `tools/sigfig-lab.html` (republish that file to the same URL to update it; capabilities `db` + `downloads`). Modelled on the Arcade Fleet Lab (`arcade-ships.md`). Added Oct 23 2026.

A "sig fig" is one outfit of the hologram minifigure (see `outfits.md`). The Lab is where the first batch (`mw-sigfig-*.io` in `Render staging/mw sig fig`) is taken from Studio file to something `assets/outfits.json` can load.

**Per sig fig the Lab holds:** name, order (carousel order; the first visible one is the free default), show/hide, the Studio `.io` (only its thumbnail and part list are read; the file is not exported), one or more GLBs, a GLB check, the About copy (kicker / title / body / locked teaser), an unlock rule, and idle-loop notes. Ten sig figs are seeded in the page (`SEED`: work, slate-dummy, vr-gamer, rebel-pilot, tie-pilot, og-boba, iron-man, biker, skier, chef) with suggested unlock rules (case study for the two project ones, arcade goals for the Star Wars ones, minikit tiers for the rest) that are meant to be edited.

**Intake.** Drop `.io` / `.glb` files on the top zone: `mw-sigfig-<id>[-v2…].io|glb` goes to the matching card, anything else is listed as not placed (drop it on a card instead). `.io` files are read in the browser (zip + `DecompressionStream`): the Studio thumbnail becomes the card image and `model.ldr` gives the part count and which minifig parts exist.

**GLB check** (per card, across all its GLBs): looks for the seven body parts by node name (`head`, `torso`, `hips`, `arm_l`, `arm_r`, `leg_l`, `leg_r`; loose variants like `Left_Arm` match), an animation clip named like `idle` (with its duration), triangle and texture counts, and size (warns over 3 MB). The Parts and Idle step chips go green only when these pass. **Draco-compressed GLBs cannot be previewed** (the artifact CSP blocks the decoder), so export from Blender uncompressed; the site itself can still load Draco.

**Live preview.** One sticky stage (three r128): pick a card's Preview, choose a clip, pause, speed 0.25–2×, turntable, drag to rotate. The figure is scaled to a common height, like the site's outfit loader.

**Unlock rules** use the arcade's vocabulary (`arcade-ships.md`): `free`, `minikits`, `destroy` (+target), `hunters`, `planets`, `survive`, `plays`, `rank`, `score`, plus `caseStudy` (target = `w0` Meta Horizon Worlds, `w1` Slate Auto, `w2` Josh.ai, `cv`). The Lab previews the locked message the site should show ("Shoot 15 minikits in the Space Arcade to unlock", "View the Slate Auto case study to unlock").

**Export bundle** (zip, unzip at the repo root): `assets/outfits.json` + `assets/models/outfits/<id>/<file>.glb`. Entry shape: `{id, name, enabled, unlock:{type,n?,target?}, unlockAt, about:{kicker?,title?,body?,teaser?}, idle:<clip name>|null, parts:[{file}]}`. `unlockAt` is the minikit count for `minikits` rules and 0 otherwise.
- **The site reads today:** `id`, `name`, `enabled`, `unlockAt`, `about`, `parts`. `unlock` and `idle` are ignored.
- **Not built yet on the site (follow-ups):** (1) play the `idle` clip (the loader only takes `gltf.scene`; needs an `AnimationMixer`, held on the first frame under reduced motion); (2) the unlock engine for every rule type other than `free` and `minikits`, including recording which case studies a visitor has opened. Until (2) lands, a sig fig with another rule type exports as unlocked. The Lab flags those cards.
- The bundle replaces `assets/outfits.json` wholesale and only includes sig figs whose GLB is in the browser doing the export; sig figs without a model here are listed as left out. Re-add the GLBs (or export from the same browser) before the next export once some are already committed.

**Storage.** Names, order, copy, unlock rules, notes and file lists sync through the artifact db (collection `sigfigs`, one doc per sig fig, only fields changed from the seed). GLB files and `.io` thumbnails live in this browser's IndexedDB only, like the Fleet Lab's models.
