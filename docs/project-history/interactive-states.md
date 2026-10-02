# Interactive states, sizes and tokens (Oct 2 2026)

> Decision record for the redesigned interactive text / button language, the tokens that back it, and how the Figma file maps to code. Figma is the source of truth; `assets/tokens/bric-tokens.css` is generated from it. The components are implemented in `assets/bric-components.css` (linked after the tokens) and adopted in `index.html` — see "Adoption" below. The reference CSS further down is the earlier prototype of the same rules.

Figma file: **BRIC DS** (`O6bdoXtisdLxlsjhI41rqR`). Components page, sections `09 · Button` (node 306:789), `10 · Tag` (306:869), `11 · Breadcrumb` (306:896), plus restyled `01 · Checkbox`, `03 · Range Slider`, `06 · Panel Chrome`, `08 · Scrollbar`. Old register-based components live on the page `🧪 Sandbox & Deprecated`.

## The direction

Refined, high-contrast, spacing-driven, type-first (the Andor CRT-terminal reference), keeping the in-universe UI DNA. **No new colors**: every interactive color is an existing token (see `color-decisions.md`); the only derived values are the ~10% primary hover fill and the alpha variants used for glow and bloom. Hue meaning (revised 2026-10-02, see `foundations-audit.md`): off-white = what you can act on, teal = the hologram and its structure, amber = the work (planets, case files, kickers, key metrics), purple = HoloNet, red = destructive. No hue colors a control any more.

## Roles, sizes, states

| | Idle | Hover | Active | Disabled |
|---|---|---|---|---|
| **Primary** (fill) | solid `interactive/fill/default`, label `interactive/text/on-fill` | fill dims ~10% toward the surface (`interactive/fill/hover`) | fill + inset keyline | `interactive/fill/disabled`, label `interactive/text/disabled` |
| **Secondary** (outline) | 1px `interactive/outline/default` | fills solid | fill + inset keyline | outline `interactive/outline/disabled` |
| **Tertiary** (text) | off-white label only | gains a 1px stroke | fill + inset keyline | dim label |

- **Active is one appearance for every role**: solid fill + an inset 1px keyline (3px gap on Large, 2px on Small). It also marks a menu's current item and a breadcrumb's current page.
- **Sizes**: Large 40px (`type/label/default`, 16px side padding) and Small 24px (`type/label/micro`, 8px). Corner `corner/step` (4px). Both sizes exist for every role.
- **Breadcrumb** = Small Tertiary buttons separated by static "/" text; the last item is the current page (Active). It inherits every tertiary state.
- **Tag** is a static label, **not** a button: no hover, not clickable, no role/tabindex, never decodes. Its outline (`interactive/outline/tag` = `border/strong`) is deliberately dimmer than its label.
- **Focus** is intentionally not designed yet. If added: an inset outline.
- Default text is off-white (`content/primary`); on light it is near-black.

## CRT effects (dark mode only)

Glow and bloom are *emitted light*, so they exist on the dark screen only — the tokens are transparent in light mode, so no mode check is needed in code.

- **Hover glow** — two-layer halo behind the fill (8px + 24px/2px spread). Tertiary uses a dimmer set (`fx/glow/stroke-*`, 55%). Ignites in 80ms, decays over 150ms (`--bric-snap-duration-instant` → `-fast`). Animate **opacity on a pseudo-element only**.
- **Text bloom** — 6px halo behind off-white labels on non-filled elements (not on filled or hovered-secondary labels, whose text is dark).
- **Ignite flicker** — on click the glow plays a 220ms stepped opacity pulse (15% → 100% → 35% → 100%).
- **Hover scanlines were tried and dropped.**
- Everything respects `prefers-reduced-motion` (no transition, no flicker).

## Glyph decode on hover (reuses the existing GFX engine)

The site already has the Aurebesh → Latin engine (`GFX` in `index.html`, defaults 380ms / 35ms tick / 0.3 scatter for buttons). Decisions for the new buttons:

- **Left-anchored**: glyphs start at the resolved label's left edge and width variance plays out left → right (Aurebesh is ~25–40% wider than the Latin label).
- **Contain**: scramble glyphs render at ~0.78em so the box never overflows.
- Wrap the scrambled text in **one** child element — if each glyph is its own flex item, `gap` is applied between glyphs.
- **Do not set `overflow:hidden`** during the decode (the engine's `lock()` does by default): it clips the glow for the first 380ms. Pass `noClip` for these buttons.

## Tokens

- `assets/tokens/bric-tokens.css` — all live Figma tokens as `--bric-*` custom properties (106: spacing, corner, motion, color). Values follow prod after the 2026-10-02 audit: teal-black neutrals (`surface/scene` `#070C0C`, `surface/base` `#0E0F12`, `surface/raised` `#14151A`), translucent teal borders, structural teal `schematic/line`, plus `holonet/*`, `danger/*`, `schematic/logo`, `register/amber/planet-hot`. Dark on `:root`, light under `body.light` (the site's own mechanism). Linked from `index.html`, declarations only.
- `assets/tokens/bric-tokens.json` — flat list derived from the CSS.
- New semantic tokens: `interactive/text/{idle,on-fill,disabled}`, `interactive/fill/{default,hover,disabled}`, `interactive/outline/{default,disabled,tag}` (aliases of existing surface/content/border tokens except `fill/hover`), and `fx/glow/{near,far,stroke-near,stroke-far}`, `fx/bloom/text`.
- Deprecated and **omitted from code**: `interactive/primary|secondary|ghost/*` (still in Figma, marked DEPRECATED, no consumers).
- Figma Dev Mode shows the matching `var(--bric-…)` as code syntax on every exported variable.

**Alias gotcha (a real bug, caught in verification):** CSS resolves `var()` where the property is *declared*. An alias such as `--bric-interactive-fill-default: var(--bric-surface-inverted)` declared only on `:root` keeps its dark value under `body.light`, because the substitution already happened on `:root`. So alias tokens are emitted in **both** blocks. `tools/derive-token-json.py` asserts this invariant.

**Regenerating** (after changing variables in Figma): run `tools/figma-export-tokens.js` through the figma-console MCP (`figma_execute`) with the BRIC DS file open, write the returned `css` to `assets/tokens/bric-tokens.css`, then `python3 tools/derive-token-json.py`. The committed CSS is byte-identical to that script's output as of this change; the git diff of a regeneration should contain only intentional token changes.

## Adoption (Oct 2 2026, branch `feat/bric-buttons`)

`assets/bric-components.css` holds `.bric-btn` (+ `--primary`, `--secondary`, `--sm`, `--block`, `.is-active`), `.bric-tag` and the breadcrumb pieces. Migrated controls:

| Control | Now |
|---|---|
| `#cpEnter` (case panel CTA) | primary, block |
| `#cpBack`, `#homeBtn` (breadcrumb root) | tertiary, small |
| `#csExit`, CV pills (`#csPrev/#csNext/#csRingBtn/#cvmOverview`), `.manual-link` | secondary, small |
| `.manual-cta-btn`, `#ctSend` | primary |
| `.manual-tag` (static + CMS-built) | `.bric-tag` |
| Breadcrumb | root = small tertiary button; separators are `/`; the last segment is the current page (`.is-active`, `aria-current="page"`); middle segments are plain dim text because only the root navigates |

Notes:
- Decode (GFX): `.bric-btn` is left-anchored, unclipped, renders the scramble in one child span, and the Aurebesh glyphs are `.78em` (`.bric-btn .gfx-u`). Other buttons keep the old behaviour. `BTN_SEL` now includes `.bric-btn` and skips disabled buttons. Click adds `.is-ignite` for 220ms.
- Hover rules sit in `@media (hover:hover)`; on `pointer:coarse` devices `.bric-btn--sm` gets an invisible 44px-tall hit area (`::before`), so the icon on `.manual-link` moved to `.ml-label::before`.
- Focus is an inset outline (`:focus-visible`), the one state the design left open.
- `.manual-cta-btn.disabled` and `[aria-disabled]` both map to the disabled look.
- Not migrated: author-only tools (`.tbtn`, `.link-add`, `.tag-add`, debug and Projects Manager buttons), `.ct-upload`/`.glb-up` (author upload), `.mm-del` (destructive: no BRIC variant is designed), the `+`/`−` CV label controls, `#msgToggle`, `.cs-step`. `--clip-step` is still used by those and by panel chrome, so it stays until the panel-chrome PR.

## Panel chrome (Oct 2 2026, branch `feat/bric-panel-chrome`, stacked on `feat/bric-buttons`)

Figma: Components › 06 Panel Chrome (surface/raised fill, 1px border/subtle, header = eyebrow + title, sections split by hairlines, back button in the footer).

- **`.bric-dark`** (new, in `bric-tokens.css`: `:root,.bric-dark{…}`) re-declares the dark token values on a subtree. Panels that stay dark in light mode — the manual (`#cs-root`) and the HoloNet console (`.ct-panel`) — carry it; the case panel stays theme-aware.
- **One palette.** The global palette (`--bg --line --line-dim --text --muted --border --on-brand`) now aliases the tokens (computed values identical in both themes — verified). The manual's private palette is now tokens too: surface/base and raised, teal solid/edge/hot, structural teal for the corner brackets, border/subtle for borders and the dot grid, and the solid text ladder (`--c-primary/secondary/dim` = content primary/secondary/tertiary instead of 92/62/50% alphas).
- **Case panel** (`#casepanel`): raised fill, hairline separators between header, body, moons and a new `.cp-actions` footer (primary CTA + back), amber eyebrow with a `▸`, Chakra title at 20px.
- **Manual** (`#manual-book`): fill from `--bric-surface-base` at the tunable `--mb-alpha` (via `color-mix`). The brackets, tilt and dot grid stay — the manual's dock / rail / drawer layouts are grids, so it gets no horizontal separators.
- **HoloNet console**: raised fill, border/default, 4px corner, token inputs with an inset focus ring, holonet purple and danger red from tokens (CSS only; the canvas strokes in JS still use the literals).
- Not done: toast, `.plabel.amber/.locked`, `#debug`, `#uploadpanel` (still `--panel`), author panels, and the remaining `--clip-step` users (the author toolbar, debug, ml-switch, a few chips) — so `--clip-step` is not removed yet.
## Author UI (Oct 2 2026, branch `feat/bric-author-ui`)

Debug, Edit Mode and the other author-only panels take the same language as the visitor UI. `assets/bric-author.css` (loaded after the page's inline `<style>`) holds the panel chrome, Range Slider and Checkbox; the buttons are `.bric-btn`.

- **Buttons:** an author adopter script (end of `index.html`) adds the classes by selector and re-applies them to controls the page generates later (Projects Manager rows) via a `MutationObserver`. Save, Set default view and New zone are primary; the other toolbar buttons, `.pm-btn`, `.resetbtn`, `.upload-btn`, `.tag-add` and `.link-add` are secondary; the close button, segmented controls and face buttons are tertiary. `.on` is treated as `.is-active` (toggles and segments). Everything adopted gets `data-gfx="off"`.
- **No glyph decode** on any of it: adopted controls are flagged `data-gfx="off"`, `#debug` was already excluded, and the decode listener now also returns while `body.editing` (Edit Mode) is on.
- **Panel chrome:** raised fill, border/subtle, 11px tertiary header with a hairline (Debug, Upload, Projects Manager), 11px Space Grotesk labels with Space Mono readouts, token text fields with an inset focus ring. Section labels in Debug and the edit panel's eyebrow use the structural teal; amber no longer means "tooling".
- **Range slider:** 2px track (empty = `interactive/outline/tag`, filled = `interactive/fill/default`), 16px square thumb. WebKit has no progress pseudo-element, so the fill is a gradient driven by `--p`, which the adopter keeps in sync (input events, and a wrapper on `HTMLInputElement.value` so values set from code are reflected).
- **Checkbox:** 20px box, filled with an inset keyline and a check mark when checked.
- **Edit panel markup** lost its inline colours (classes now); the banner states are `.is-dirty` (pulsing danger ring) and `.is-error` (danger fill) instead of inline amber and red. Inline copy-edit outlines are teal.
- **Destructive:** `.pm-danger` is the secondary look in the danger tokens, `.pm-confirm` a solid danger fill. There is no Figma variant for either yet.
- Removed the superseded CSS for `.tbtn`, `#saveBtn`, the Debug segments, checkboxes and sliders, `.upload-btn`, `.axis-*`, the layout switcher, the Projects Manager buttons, `.tag-add`, `.link-add` and `.inline-edit-on`. `--clip-step` is now only used by `.plabel`, `.cs-step` and `#msgToggle`.
- Not done: the toast, `#debug`'s remaining label colours inside JS-generated rows (verify in use), and a phone-width pass (author tools are desktop-only).

## Dot matrix (Oct 2 2026)

The panel texture is the BRIC dot matrix: Fine 8px, Balanced 16px, Coarse 32px tiles; the dot is `border/subtle` (translucent teal). Prod had off-grid 14px (`.elf::before`, box side flaps) and 15px (`#manual-book`) tiles; both are now 16px. The 8px and 32px tiles were already on grid. The box-face dots stay amber at 6% (box art = the work).

## Reference implementation (earlier prototype of `assets/bric-components.css`)

Validated in a browser against the real token file in both themes. Roles: default = tertiary, `--secondary`, `--primary`; size `--sm`; `.is-active` for selected/current.

```css
.bric-btn{position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;gap:var(--bric-space-stud);height:var(--bric-space-5-stud);padding:0 var(--bric-space-2-stud);border:0;border-radius:var(--bric-corner-step);background:transparent;color:var(--bric-interactive-text-idle);cursor:pointer;white-space:nowrap;text-transform:uppercase;font:500 13px/16px 'Space Grotesk',sans-serif;letter-spacing:.08em;outline:none}
.bric-btn--sm{height:var(--bric-space-3-stud);padding:0 var(--bric-space-stud);font-size:11px;letter-spacing:.12em}
.bric-btn--secondary{box-shadow:inset 0 0 0 1px var(--bric-interactive-outline-default)}
.bric-btn--primary{background:var(--bric-interactive-fill-default);color:var(--bric-interactive-text-on-fill)}
/* hover glow: opacity-only pseudo-element */
.bric-btn::after{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity var(--bric-snap-duration-fast) linear;box-shadow:0 0 8px 0 var(--bric-fx-glow-stroke-near),0 0 24px 2px var(--bric-fx-glow-stroke-far)}
.bric-btn--secondary::after,.bric-btn--primary::after{box-shadow:0 0 8px 0 var(--bric-fx-glow-near),0 0 24px 2px var(--bric-fx-glow-far)}
.bric-btn:hover:not([aria-disabled="true"])::after{opacity:1;transition-duration:var(--bric-snap-duration-instant)}
/* hover */
.bric-btn:hover:not(.is-active):not([aria-disabled="true"]):not(.bric-btn--secondary):not(.bric-btn--primary){box-shadow:inset 0 0 0 1px var(--bric-interactive-outline-default)}
.bric-btn--secondary:hover:not(.is-active):not([aria-disabled="true"]){background:var(--bric-interactive-fill-default);color:var(--bric-interactive-text-on-fill)}
.bric-btn--primary:hover:not(.is-active):not([aria-disabled="true"]){background:var(--bric-interactive-fill-hover)}
/* active: fill + inset keyline (all roles) */
.bric-btn.is-active{background:var(--bric-interactive-fill-default);color:var(--bric-interactive-text-on-fill);box-shadow:inset 0 0 0 3px var(--bric-interactive-fill-default),inset 0 0 0 4px var(--bric-interactive-text-on-fill)}
.bric-btn--sm.is-active{box-shadow:inset 0 0 0 2px var(--bric-interactive-fill-default),inset 0 0 0 3px var(--bric-interactive-text-on-fill)}
/* disabled */
.bric-btn[aria-disabled="true"]{background:transparent;box-shadow:none;color:var(--bric-interactive-text-disabled);cursor:not-allowed}
.bric-btn--secondary[aria-disabled="true"]{box-shadow:inset 0 0 0 1px var(--bric-interactive-outline-disabled)}
.bric-btn--primary[aria-disabled="true"]{background:var(--bric-interactive-fill-disabled)}
/* text bloom on non-filled labels (transparent in light mode) */
.bric-btn:not(.bric-btn--primary):not(.is-active):not([aria-disabled="true"]){text-shadow:0 0 6px var(--bric-fx-bloom-text)}
.bric-btn--secondary:hover:not(.is-active):not([aria-disabled="true"]){text-shadow:none}
.bric-btn:focus-visible{outline:2px solid var(--bric-interactive-outline-default);outline-offset:3px}
/* tag: static label, never interactive */
.bric-tag{display:inline-flex;align-items:center;height:var(--bric-space-3-stud);padding:0 var(--bric-space-stud);border-radius:var(--bric-corner-step);box-shadow:inset 0 0 0 1px var(--bric-interactive-outline-tag);color:var(--bric-interactive-text-idle);cursor:default;user-select:none;white-space:nowrap;text-transform:uppercase;font:500 11px/16px 'Space Grotesk',sans-serif;letter-spacing:.12em}
@media (prefers-reduced-motion:reduce){.bric-btn::after{transition:none}}
```

## Known contrast notes

`interactive/outline/tag` (`border/strong`) is 1.82:1 on the light surface — below 3:1, acceptable only because tags are static and the label carries the meaning. Disabled text is intentionally below 3:1 (WCAG exempts inactive controls). `border/default` and `content/tertiary` are also below 3:1 in light mode, which is why the secondary outline uses `content/primary`.

## Open items

- Fonts: the locked stack (`visual-language-direction.md`) applies — button/tag/breadcrumb labels are Space Grotesk. Prod currently sets Space Mono as the body font (`index.html:79`, `--mono`), with no recorded reason; migrate HUD body/labels to `--grotesk` and keep Space Mono for readouts. Until then `.bric-*` classes set their own font-family and don't inherit.
- Panel chrome (manual, case and HoloNet panels) is next; then the remaining non-visitor controls and a destructive variant.
- Decide whether to delete the legacy Button (Deprecated page) and the Sandbox components (Segment Toggle, Status Chip, Toast, Divider — still old register style, not used in production).
- Focus state is undesigned.
