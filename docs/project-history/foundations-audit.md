# BRIC DS — Foundations audit against prod

*Date: 2026-10-02 · Scope: every value on the Figma Foundations page and in the Figma variables, checked against the live site.*

## Decisions (2026-10-02) and what was applied in Figma

| # | Decision | Applied |
|---|---|---|
| 1 | Adopt prod's dark neutrals | `surface/scene` (new) `#070C0C`, `surface/base` `#0E0F12`, `surface/raised` `#14151A`, overlay recolored to the scene tone; light scene/base = prod `#ECE8E0`. Borders are prod's tinted translucents (`border/subtle|default|strong` = teal at .14 / .30 / .50 dark, .14 / .32 / .55 light). `content/tertiary` D = prod teal-grey `#5A6F6B`, `content/disabled` D = `#41524F`. |
| 2 | Amber = the work | Register narrative rewritten (Foundations color frame, Dual-state language frame, variable descriptions): teal = hologram / structure, amber = the work (planets, case files, kickers, titles, key metrics), purple = HoloNet, red = destructive, off-white = whatever you can act on. Author tooling → teal + off-white. Coming-soon work stays teal (unmaterialized) and materializes amber. |
| 3 | Two tiers | Foundations frames labelled HUD tier (index) vs Document tier (case studies). Layout grid is Document-tier only; type frame split into the two tiers. HUD type tokens (Space Mono / Chakra 8–11px) are NOT yet aligned — open. |
| 4 | Solid text ladder | Kept (`content/primary|secondary|tertiary|disabled` stay solid colors). |
| 5 | Prod-wins fixes | `schematic/line` = prod `#5ABFB8` dark / `#1F7A72` light (all light schematic values now `#1F7A72`; primitive `color/teal/700` = `#1F7A72`); `register/amber/text-hot` = `#F0B848`; new `register/amber/planet-hot` `#F0D080`, `schematic/logo` `#71FDFF`, `holonet/text|hot|soft` (`#A06AF0` / `#C8AAFF` / `#D8CDEC`), `danger/text|edge|solid|deep` (`#FF6B6B` / `#E2716F` / `#E24B4A` / `#8A1F1F`; `feedback/error/fg|icon` dark alias `danger/text`); `float/easing` = `cubic-bezier(0.34, 1.06, 0.64, 1)`. |
| — | 3px corner | NOT adopted. The stair-step corner (`--clip-step`, 3px) is retired; controls use the plain 4px `corner/step`. Corners frame relabelled; no corner tokens changed. |

Consequences worth knowing:
- **Tag outline** (`interactive/outline/tag` = `border/strong`) is now 2.99:1 on dark (was 3.52:1) and 2.09:1 on light. Still acceptable for a static tag.
- **Disabled primary fill** (`interactive/fill/disabled` = `border/subtle`) is now a translucent teal tint instead of a neutral grey.
- **Purple and red have no light-mode values on prod**: `holonet/text` is 2.96:1 and `danger/text` 2.27:1 on `#ECE8E0`. They are mode-independent tokens for now; light variants need a decision.
- `surface/inverted`, `content/inverted` and the interactive fills are unchanged (still the off-white / near-black pair).

## Method

- **Prod = `https://www.mundanework.shop/`.** The live HTML was fetched and is **byte-identical** to `origin/main:index.html` (833,725 bytes), so the audit reads the repo source of exactly what is deployed.
- Extracted from the inline CSS (2 `<style>` blocks, ~86 KB) and inline JS (~685 KB): every color (hex, rgb/rgba, three.js `0x…` literals), custom property, font size/family/weight/tracking/line-height, padding/margin/gap, radius/clip-path, transition/animation duration + easing, shadow/filter, media query and layout rule, with usage counts.
- Cross-referenced against Figma: all 111 live color tokens (both modes, aliases resolved), text styles, the Motion collection, spacing/corner primitives, and the values stated on each Foundations frame.
- Color distance is CIE76 ΔE: **< 0.5 = exact**, ≤ 6 = near (reads as the same color), > 6 = different.
- Counts are *references in code*, not pixels on screen. "Roles" below were derived from which selectors use a color.

## Headline findings

1. **The foundations were designed top-down; prod grew bottom-up, and they describe two different systems.** Figma: warm-neutral surfaces, Space Grotesk body, an 11–64px type ramp, a stud grid, 12-column layout, 8px control radius. Prod: a teal-black HUD, **Space Mono** UI at **8–11px**, all-caps, hairline teal borders, a 3px pixel-step corner, one media query and no grid.
2. **Colors match where they were copied from prod, and diverge everywhere they were invented.** The amber/teal accent values are exact. The neutrals (surfaces, borders, muted text) are a different hue family from prod.
3. **The most-used structural color on prod has no semantic token.** `#5ABFB8` (57 refs, the `--line` / body-text color) exists only as the primitive `color/teal/500`; the semantic `schematic/line` is a lighter `#8FE6DC` that prod barely uses (3 refs).
4. **Several things on prod are missing from Figma entirely:** the HoloNet purple (3 colors), the danger red (4), the logo cyan, the teal-grey muted text, and the 3D planet "hot" amber.
5. **55 of 111 Figma color tokens appear nowhere on prod** (placeholder neutrals/brand, the whole feedback set, most register "hot" variants, borders).
6. **Prod has no token consumers**, so none of this is a regression, but any token file that encodes the current Figma values would encode values prod doesn't use. *(The unpushed `chore/bric-interactive-tokens` branch is in this state — hold it until the decisions below.)*

## 1 · Color

### 1a · Role-by-role (the values that matter most)

| Role | Prod value (where) | Figma token | ΔE | Verdict |
|---|---|---|---|---|
| Scene / page background (dark) | `#070C0C` (hue 180°) — `--bg`, three.js `DARK.bg` | `surface/base` D `#111110` (hue 60°) | 2.5 | **Drift — hue.** Same lightness, teal-tinted vs warm |
| Manual / panel background | `#0E0F12` (hue 225°, 18 refs) — manual scope `--bg` | `surface/base` D | 2.4 | **Drift — hue.** A third dark base |
| Card surface | `#14151A` — manual `--surface` | `surface/raised` D `#1A1917` | 5.6 | **Drift** |
| Off-white text | `#F0EDE8` at 92% / 50% / 30% (manual `--c-primary/secondary/dim`, 50 refs) and `#F5F2EC` (`--text`, 4 refs) | `content/primary` `#F5F2EC` | 1.8 | **Near.** Prod's ladder is *alpha*; Figma's is *three solids* |
| Muted text | `#94908A` — `--muted` | `content/secondary` D `#94908A` | 0.0 | **Exact** |
| Page background (light) | `#ECE8E0` — `body.light --bg` | `surface/base` L `#F5F4F2` | 5.3 | **Drift** |
| Structural line (dark) | `#5ABFB8` — `--line`, body color (57 refs) | `schematic/line` D `#8FE6DC` | 14.7 | **Drift.** Prod's value exists only as primitive `color/teal/500` |
| Structural line (light) | `#1F7A72` | `schematic/line` L `#2A8079` | 2.6 | Near |
| Holo edge / bright | `#AAF5EE`, `#78E0D6`, `#EAFEFB` | `schematic/edge`, `schematic/solid`, `schematic/text-hot` | 0.0 | **Exact** |
| Amber | `#E9A73E` (89 refs) | `content/brand` D, `color/amber/500` | 0.0 | **Exact** |
| Amber "hot" (UI) | `#F0B848` (`--amber-hot`, 8 refs) | `register/amber/text-hot` `#FFE9B0` | 36.5 | **Drift** (Figma only has it in the now-deprecated `interactive/primary/hover`) |
| Amber "hot" (3D planets) | `#F0D080` (19 refs, `params.planetHot`) | same | 15.7 | **Missing** |
| Danger red | `#FF6B6B` (+ `#E2716F`, `#E24B4A`, `#8A1F1F`) | `feedback/error/*` | 21.0 | **Missing / different** |
| Borders (dark) | `rgba(90,191,184,.3)` — translucent **teal** | `border/default` `#4A4742` — warm **grey** | n/a | **Drift — concept.** Prod borders are tinted translucents |

### 1b · Exact matches (17 prod colors ↔ Figma)

`#E9A73E`, `#5ABFB8` (primitive only), `#78E0D6`, `#AAF5EE`, `#FFFFFF`, `#EAFEFB`, `#F5F2EC`, `#2A8079`, `#1A0F02`, `#D4961E`, `#7A5614`, `#94908A`, `#111110`, `#525252`, `#F7CE88`, `#F5D28C`, `#A8761A`. (Several of the last ones are used once — they match because the Figma values were derived from prod's `--amber-edge` / `--amber-scan` etc.)

### 1c · On prod, missing from Figma (21 colors, none within ΔE 6 of any token)

| Family | Colors (refs) | Where on prod | Suggested home |
|---|---|---|---|
| **Purple** | `#A06AF0` (16), `#C8AAFF` (10), `#D8CDEC` (1) | HoloNet: planet label, message toggle, message cards, comm-console strokes (canvas) | new `holonet/*` family *(you said keep it)* |
| **Danger red** | `#FF6B6B` (7), `#E2716F` (4), `#E24B4A` (2), `#8A1F1F` (3) | delete buttons, confirm-delete, zero counts, pulse | normalize to one `danger/*` (Figma `feedback/error/*` are different hues) |
| **Logo cyan** | `#71FDFF` (6), `#70FDFF` (2) | monogram / logo hologram (`logoHot`, `logoTint`, 3D) | `holo/hot` or logo-specific |
| **Teal-grey** | `#5A6F6B` (8), `#6B8A85` (3), `#7A8A86`, `#41524F` | muted/hint text and dim UI on the teal-black bg | the prod "tertiary" — Figma's `content/tertiary` is warm grey `#6E6A64` |
| **Deep teals** | `#0C3D38` (4), `#0C2B28` (3), `#1A6862` (5), `#2F5F59` (2) | 3D scene shading / box material | scene-only; likely not DS tokens |
| **Cool-neutral darks** | `#0E0F12` (18), `#14151A` (4), `#12131A`, `#0A0B0E`, `#0C0D13`, `#0D0E15` | manual / panel surfaces | see 1a |
| **Warm dark** | `#1A1512` (5) | one panel family | likely consolidate |
| **Neutral grey** | `#9E9E9E` (4), `#9FB6B8` (3) | `mfTint`/`bfTint` 3D tints | scene-only |

### 1d · Figma color tokens that appear nowhere on prod (55 of 111)

- **Placeholders:** `color/neutral/50–900`, `color/brand/primary|accent/*` (`#555` placeholders, noted as such already).
- **Feedback:** all of `color/feedback/*` and `feedback/*/{bg,fg,icon}` — prod has no success/warning/info UI at all.
- **Ramps:** `color/teal/100|900`, `color/amber/100|700|900`.
- **Semantic:** `content/disabled`, `border/default`, `border/strong`, `register/amber/text-hot`, `register/teal/scanline`, `register/teal/on-solid`, `schematic/on-solid`, `schematic/scanline-solid`.
- **New this session (expected — not shipped yet):** `interactive/text/disabled`, `interactive/outline/disabled`, `interactive/outline/tag`, `interactive/fill/hover`.

### 1e · Two palettes on prod

Prod defines **two parallel token sets**: the global one (`--bg #070C0C`, `--line #5ABFB8`, `--amber`, `--holo`) and a second one scoped to the manual/booklet (`--bg #0E0F12`, `--surface #14151A`, `--teal #78E0D6`, `--teal-edge`, `--teal-hot`, `--c-primary/secondary/dim`, `--f-d/--f-b/--f-m`). They overlap in intent but not in value. This is the biggest cleanup the token file can enable.

## 2 · The registers (amber / teal / purple)

### What each hue actually does on prod

| Hue | Role on prod | Evidence (selectors, ~counts) |
|---|---|---|
| **Teal** | **Structure and the hologram itself** — default text color, chrome, borders, grids, moons/artifacts, zone and breadcrumb labels, hints, toasts | `html,body{color:var(--line)}`; ~87 selectors; moons teal in 3D (`moonTint #5ABFB8`) |
| **Amber** | A mix: **(1)** author/edit tooling ≈ 40 selectors, visible only in author mode (toolbar, Projects Manager, marquee panel, debug resets, inline-edit outlines, tag-add); **(2)** project identity ≈ 15 (planet labels, planet meshes, case-file box art, case-panel kicker, wordmark, highlighted case-study metrics); **(3)** visitor CTAs/back links ≈ 11 (`#cpEnter`, `.back`, `.manual-cta-btn`, `.ct-send`); **(4)** selected state ≈ 5 | 70 selectors total |
| **Purple** | **HoloNet only** | planet label, message toggle, message cards, comm-console strokes |
| **Red** | **Destructive** only | delete, confirm-delete, zero counts |

### Why amber lost its meaning

Figma's old narrative was *"amber = available/live, teal = coming-soon; the cool→warm shift is materialization."* That narrative is retired: controls (buttons, links, tags, toggles) are now off-white, and the (3) CTA and (4) selected-state roles above moved to off-white too. What's left on amber: tooling and project identity.

### Options for what amber means

| | Meaning | Keeps | Loses | Fit with teal |
|---|---|---|---|---|
| **A (recommended)** | **"The work"** — project identity and its key facts: planets, case files, project titles/kickers, highlighted metrics | planet meshes, `.plabel.amber`, box art, kicker, wordmark, metrics | nothing visitors see | Teal = the *system's light* (hologram, structure); amber = *what that light is showing you*. Warm/cool complement |
| B | **"Author mode"** — everything only the author sees: toolbar, Projects Manager, debug, marquee, inline-edit | the ~40 tooling selectors (≈ 57% of all amber rules) | planets and case-file identity go off-white/teal | Clean *visitor vs author* split, but invisible to the audience the portfolio is for |
| C | **"Signal"** — attention / live / current: status, "available for work", unread, key highlight | `.ct-count.low`, `snap-v.highlight` | almost everything else | A status color, not an identity color — overlaps `feedback/warning` |

**Recommendation: A, and move the author tooling to teal + off-white** (it is the system's own chrome, which is what teal means). Result: **off-white = what you can act on · teal = the hologram and its structure · amber = the work · purple = communication (HoloNet) · red = destructive.**

Follow-on: "coming-soon / locked" used to be teal-vs-amber. Under A it needs its own treatment (a dimmed/hatched teal, not a second hue).

## 3 · Typography

| Aspect | Figma | Prod | Verdict |
|---|---|---|---|
| Families | Chakra Petch (display), Space Grotesk (body), Space Mono (data), Aurebesh (reveal) | all four on prod; **Space Mono is the UI/body font** (`html,body{font-family:var(--mono)}`, ~60 refs); Chakra ~32; **Space Grotesk ~5** | **Drift — body font.** Grotesk is almost unused |
| Size ramp | 11 / 13 / 16 / 20 / 28 / 36 / 48 / 64 | UI: **8 (21), 9 (29), 10 (24), 11, 12, 13, 14, 15**; display: 46 (`.pt-title`), 26, 24, 22, 18 | **Drift — different scale.** Only 11 and 13 overlap. **76 refs are ≤ 10px** |
| Body 16/24, 20/32 | `type/body/default`, `type/body/large` | 16px ×1; line-height 1.3–1.9 unitless | Unused on prod |
| Tracking | label 8% / 12% | px: 2px ×22, 1px ×19, 3px ×8; em: .08–.18em | Roughly consistent (px vs %) |
| Weights | Bold / SemiBold / Medium / Regular | 700 ×16, 600 ×14, 400 ×6, 500 ×4 | Match |
| Case | label styles UPPER; body sentence | `text-transform:uppercase` ×68 | Match for labels |

**Accessibility flag:** 8–10px type (≈ 74 refs) is below any common legibility floor; Figma's own floor is 11px. Decide whether the HUD tier gets a 9/10px "micro" token or migrates up to 11.

## 4 · Spacing

Figma: stud scale 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 96 / 128, plus responsive semantics (`inline/gap`, `content/gap`, `component/padding`, `card/padding`, `section/gap`, `page/margin`).

Prod padding/margin/gap values (269 refs): **8 ×39, 6 ×29, 12 ×25, 14 ×21, 10 ×20, 16 ×18, 4 ×15, 5 ×14, 18 ×9, 11, 7, 3, 2, 22, 9, 26 …**

- **41% of refs are on the 4px grid; 24% on the 8px stud.** The rest (6, 14, 10, 5, 18, 11, 7, 3, 9, 22, 26) have no token.
- The semantic spacing tokens have **no prod consumer**.
- `--step: 4px` exists on prod but is used for the pixel-step corner, not spacing.

## 5 · Corners

| Figma | Prod | Verdict |
|---|---|---|
| `corner/sharp` 0 | `border-radius:0` ×21 | **Match** |
| `corner/step` **4** (½ stud); Foundations: "arc-stepped staircase" | `--clip-step`: a **3px**-step, 2-step staircase polygon, ×16; plus `border-radius: 2px` ×12, `3px` ×2, `4px` ×4 | **Drift — 3 vs 4.** The prod comment says it "matches Figma prC" |
| `corner/step-hero` 8 | not used | Unused |
| `corner/control` **8**, `corner/pill` ∞ | 8px radius never used; `50%` ×1 | **Contradicts prod** |

## 6 · Motion

| Figma token | Value | Prod | Verdict |
|---|---|---|---|
| `snap/duration/instant` | 80ms | .05s ×3, .06s ×2, .1s ×7, .12s ×4 | **No 80ms on prod** (nearest 60–100ms) |
| `snap/duration/fast` | 150ms | .15s ×8 (+ .15s ×2) | **Match** |
| `snap/duration/normal` | 200ms | .2s ×3 | **Match** |
| `snap/easing` | cubic-bezier(.4,0,.2,1) | ×3 | **Match** |
| `float/duration/short` | 300ms | .3s ×5 | **Match** |
| `float/duration/normal` | 450ms | .45s ×2 | **Match** |
| `float/duration/long` | 600ms | .5s ×4, .7s ×3 | Near |
| `float/easing` | cubic-bezier(.34, **1.56**, .64, 1) | cubic-bezier(.34, **1.06**, .64, 1) ×2 | **Drift — overshoot** (1.56 vs 1.06) |
| — | — | `ease` ×20 (the default), `steps(1)` ×3, other bespoke curves | Not tokenized |
| `prefers-reduced-motion` | required | one `@media (prefers-reduced-motion:reduce)` block | Present |

## 7 · Effects, elevation, layout, grid

- **Glow:** prod uses `0 0 5–6px`, `0 0 12px + 3px`, `0 0 22px` text/box glows; Figma `effect/holo/glow` is r16. **Drift.**
- **Shadow:** `effect/shadow/contact` (0·1·2 + 0·3·7) has no prod counterpart; prod's only large shadow is `0 40px 70px` on the case box. **Unused.**
- **Backdrop blur:** prod uses 4/8/10px; Figma has none.
- **Layout tokens** (12/4 columns, 24/16 gutter, 1200 / 720 / 1440 max-widths): **not applicable to prod** — one media query (`max-width: 640px`), 4 `grid-template-columns` uses, 68 `display:flex`, sizes in `vw`/`vh`. They describe the planned Framer case-study pages, not the shipped HUD.
- **Dot-matrix grid** (Fine / Balanced / Coarse on an 8pt base): prod has 5 radial-gradient dot backgrounds with **8 / 14 / 15 / 16px** tiles — 14 and 15 are off the 8pt grid.

## 8 · Other Foundations frames

- **CTA Button Palette (B1 / B2 / B3), top of the page:** B1 `#E9A73E` is what shipped. B2 (`#E1A546` / `#C9AE82`) and B3 (`#D4AC6C` / `#C1B298`) appear nowhere on prod — **stale exploration frames**. The *Dark mode* swatch for B1 (`#D4AC6C`) also contradicts the shipped dark amber (`#E9A73E`).
- **Dual-state language frame:** the register narratives (amber = available/built, teal = coming-soon/plan) are the ones now retired — see §2. The *materialization* idea (teal wireframe → amber part) is still true of the 3D entrance and can stay as motion language.
- **Spacing / corners / elevation / layout / type frames:** see §3–§7; each states values that are internally consistent but diverge from prod as listed.

## Recommended actions (in order)

1. **Decide the dark neutral axis.** Recommendation: adopt prod's cool/teal-black (it is the visible identity and sits with the teal hologram). Three real surfaces: scene `#070C0C`, base `#0E0F12`, raised `#14151A`; keep light `#ECE8E0`. Rebind `surface/*` and `border/*` (borders → tinted translucents).
2. **Give prod's structural teal a semantic name.** `schematic/line` → `#5ABFB8` (= `teal/500`); keep `#8FE6DC` as a *bright* step.
3. **Decide the amber role** (§2; recommend A) and rename the registers accordingly — `holo/*` (teal), `work/*` (amber) — retiring "available / coming-soon".
4. **Add the missing families:** `holonet/*` (purple), one `danger/*`, `holo/hot` (logo cyan), prod's teal-grey as the tertiary text.
5. **Pick the text-ladder approach:** prod's translucent off-white (92/50/30%) or Figma's three solids. Recommendation: keep solids (predictable contrast, already tokenized).
6. **Type:** decide whether prod's HUD scale (9/10/11/12 + Space Mono UI) becomes a named "HUD" tier, and whether ≤ 10px migrates up. Mark Grotesk as the *document* (Framer) tier.
7. **Corners:** pick 3px or 4px; delete `corner/control` = 8 or set it to the real radius (2px).
8. **Motion:** fix `float/easing` to prod's curve (or vice versa); decide whether `instant` is 80 or 100ms.
9. **Prune or label:** mark placeholder neutrals/brand, feedback, layout tokens and the B2/B3 frames as *document-tier / not on prod*, or remove them.
10. **Rebuild the token file** from the reconciled Figma values, then run the prod migration in small PRs.

## Decisions needed

1. Dark neutral axis: teal-black (prod) or warm neutral (Figma)?
2. Amber: A (the work), B (author mode), or C (signal)?
3. Is the Foundations page describing the shipped HUD, the planned Framer pages, or both (as two tiers)?
4. Off-white ladder: alpha (prod) or solids (Figma)?
5. OK to apply the unambiguous "Figma should match prod" corrections now (structural teal, float easing, corner 3px, missing purple/danger/cyan)?
