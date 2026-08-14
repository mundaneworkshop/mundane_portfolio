# Case study + focus-view direction

> Case study + focus-view layout direction for the portfolio holotable — concepts explored, killed, and converged; BRIC/SW layer framing; next steps.

Direction work for the portfolio homepage's **focus view** (click a planet) and **full case study** (click "View case study"). Continues homepage-holotable-prototype.md and bric-build-progress.md.

**Focus view panel fields** (enriched #casepanel): filters/chips (0→1, Scale, Growth, Engagement, Design Systems, Economy — these become shared CMS filters that also dim/brighten galaxy planets) → title → non-generic one-line framing → spec strip (Scope · Role level · Levers · Outcome) → "View case study" CTA.

**Case study 10-section structure:** 1 Snapshot (role/timeline/team/platform/constraints) · 2 The problem · 3 What success meant · 4 Constraints & trade-offs · 5 Approach (heaviest artifact density) · 6 Collaboration map (XFN + influence — the leadership-signal section, give it room) · 7 Design system/patterns (conditional) · 8 What shipped (artifact cluster) · 9 Impact · 10 Next/learnings. Must-have signals: your DECISIONS not artefacts, the WHY, evidence of leadership/influence.

**Concepts KILLED:** Hyperspace stations, Unfolded blueprint, Orbital reading room (it was the only one needing the canvas to stay LIVE — conflicts with the agreed "WebGL pauses on full takeover" rule). Datacard terminal (#1) and Holo rail+document (#3) judged too similar to be distinct — they're a chrome-weight DIAL (light↔heavy), not two directions. Settled on light-to-medium chrome. **Corner mini-holo KILLED** — adds no value; if persistent context is wanted, use a sticky meta rail with real info instead.

**KEY FRAMING — reconciling Star Wars vs LEGO/BRIC:** they are different LAYERS, not competing. **SW = rendering/lighting layer (how it glows: holo teal, scanlines, bloom, terminal boot). BRIC = construction/structure layer (how it's built: module grid, snap-together assembly, voxel forms).** A holotable shows holograms OF brick-built models. **Studs-rendered-in-profile = too literal, KILLED.** BRIC shows up abstractly as: layout snapping to the stud/module grid, content assembling/snapping in on load (reduced-motion → fade), artifacts as voxel builds. Not as literal nubs.

**Descent-to-ground transition** = the agreed shared ENTRY animation into whatever layout wins: galaxy → focus → dive through atmosphere → atmosphere wipe (the beat that hides the canvas pausing) → resolve into case-study layout. Canvas PAUSES at touchdown.

**Direction shift:** at this granularity, focus moved to **project visuals — full-bleed hero, large inline imagery.** Case studies to be built in **Framer tied to a CMS** (typed fields: text/image/image-list/rich-text; cleaner section→field mapping = less CMS fight). Moons-as-artifacts = a SECOND related "Artifacts" collection linked per project (moons are artifact call-outs, NOT section markers).

**4 layout archetypes presented for research:** (1) cinematic full-bleed hero → narrow ~640px text column + full-bleed image bands [Awwwards-dominant]; (2) sticky meta rail + scrolling visuals; (3) editorial/magazine grid [craft-forward, weak skim]; (4) full-bleed chapter dividers [maps 1:1 to the 10 sections AND a Framer CMS repeater]. Recommended #1 or #4 (they combine).

## LOCKED DIRECTION

- **Artifacts replace "moons"** — placeholder for any media type: .OBJ, .SVG, flat bitmap, video, PDF. Renamed everywhere.
- **LEGO boxed kit = the project object in galaxy view** — replaces spherical planets. Rectangular kit form factor. All faces (sides/top/bottom/back) share the same design so only a unique front cover image needs to be uploaded per project to CMS. Front face = cover art + kit band (BRIC™, kit number, title, piece count).
- **Artifacts orbit the kit** as loose objects (bag .OBJ, specific artifact items per project — NOT spheres).
- **Box-opening = case study entry transition**: focus view → box fronts camera → top+bottom flaps hinge open → numbered bags cascade out with gravity+bounce settle → wipe → case study page assembles.
- **Instruction manual = section navigation metaphor**: right-rail fixed nav with numbered steps (1–10, like instruction manual pages). Step numbers match bag numbers. Shows label on hover/active.
- **Bag number = chapter divider** on the case study page: teal number block (left) + kicker "Bag N of 10 · Phase" + section title + "X pieces" badge (right). Styled like a LEGO bag label — utilitarian, Space Mono.
- **Case study page layout = full-bleed hero + bag-label chapter dividers + narrow text column + full-bleed image bands** (archetypes 1+4 combined). Built in Framer/CMS.

**BOX ROTATION:** The box rotates on the **Z axis** (not X). It starts landscape/horizontal → rotates 90° Z to stand portrait/upright → the **bottom short-side flaps hinge OUTWARD in a V shape** (like opening the bottom of a cereal box) → bags fall straight down out of the opening.

**CASE STUDY PAGE — LIGHT MODE:** Background `#F5F2EC` (warm cream), `--surface: #FFFFFF`. Amber darkened to `#B86C0A` for light-bg AA contrast; teal to `#1A7A72`. All content — including bag dividers — constrained to `max-width: 960px` centered; no elements bleeding to viewport edges. Instruction manual nav (right rail): numbered steps 1–10 with label on hover, active step gets amber filled chip.

## Build history (chronological, condensed)

Opening mechanic corrected from a "V-flaps" idea to the real retail-box mechanic: **4 flaps, one per edge, each hinged on its edge, splay outward**; the **front cover does NOT open** — the box opens at the **short-side end**. Built as `#end-lid` with `#end-interior` + 4 `.elf` flaps.

Steps 5 & 6 (bags falling + wipe) were consolidated into one full-page **cascading 3D LEGO-block page-takeover**. Two style options were built with a live toggle: **B = voxel pixel-stepped amber block**, **C = teal holographic stepped-squircle stud-plate**. Designer ended up leaning HOLO (C) — became the default. A generalized brick system (`.cube` with --w/--d/--h/--u) and a `SHAPES` library (2×2 brick, 1×2, 1×4, 1×1, 2×2 plate, 1×2 slope, 2×2 inverted slope, corner, arch) drives an organic tumbling cascade with a live debug panel (brick size, spacing, jitter, tumble, drop-spin, fall time, cascade speed, randomness, curve weight, hang time). Baked defaults: U88, spacing2.6, jitter0.70, tumble32, spin40, fall1.40, rowDelay120, randDelay460, curve11. **RULE: only build LEGO parts the designer actually references; don't invent pieces** (a round/cylinder piece was built then removed for exactly this reason).

Exit phase: after the pile fills and the page reveals behind it, all bricks keep falling out of view, staggered, synced with the page-reveal fade (both fire at the same instant).

**MERGE (into what is now index.html, then called `homepage-holotable-merged.html`):** the transition prototype was merged into the live holotable file in 5 stages. Key seams: `csPaused` flag freezes the WebGL `animate()` RAF loop; `enterCaseStudy()`/`exitCaseStudy()`; `#cs-root` DOM overlay. **Key correction during merge:** the kit box must REPLACE the focused planet INSIDE the hologram emitter cone (not a DOM overlay) — implemented as a real Three.js mesh swap (`hit.geometry` → shared `kitGeo`), so moons/box share true 3D depth and occlusion. Box front/back faces take an uploaded texture (`planetBoxTex`); sides stay holo material.

**Booklet replaces `#casepanel`** as the focus panel (this is the "manual" — `#manual-scene`/`#manual-book` — referenced throughout the rest of the codebase and other notes here). Box-open is native WebGL 3D (`buildKitFlaps`, 4 hinged flap meshes at the box's +x end); cascade + case-study page stay DOM, triggered after the 3D box-open completes.

**Current pausing point (as of the most recent case-study-direction work):** box-open flap signs/scale/timing were tuned in-browser; "View case study" full takeover reuses the dormant `#cs-root`. Clickable-artifacts (click a floating artifact → swaps into focus, booklet updates) was floated as a future idea, not built.

See also case-study-page-brief-jul8.md for the confirmed Framer/CMS build target that supersedes an HTML-only case study page.
