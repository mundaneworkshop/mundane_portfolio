# Color palette decisions

> BRIC DS palette — B1 Vivid Gold confirmed, neutral light bg locked. Full palette summary and rationale.

## Locked: B1 Vivid Gold on Neutral Light / Warm Dark

| Role | Light | Dark |
|---|---|---|
| Page background | #F5F5F5 (true neutral) | #111110 (warm near-black) |
| Raised surface | #FFFFFF | #1C1B19 |
| Overlay | #F0F0F0 | #2E2B28 |
| Text primary | #111110 | #F5F5F5 |
| Text secondary | #525252 | #8A8480 (warm) |
| Accent fill | #E9A73E (B1 vivid gold) | #D4AC6C (B1 antique gold) |
| Accent hover | #D4961E | #E8C080 |
| Text on accent | #111110 | #111110 |

**Why B1 over alternatives:** B1 (#E9A73E) has the most presence as a fill; other candidates were too close to neutral on dark mode, or risked reading as "off" rather than intentional at small sizes.

**Why neutral (not warm) light background:** an earlier warm off-white shared too much temperature with the amber accent and the two blended instead of contrasting; true neutral (#F5F5F5) lets amber pop through temperature opposition.

**Why warm dark background:** deliberate polarity — crisp/neutral light mode, warm/cozy dark mode; the gold accent bridges both and reads warm in both contexts.

**Accent usage pattern:** light mode — amber is a fill (button bg=#E9A73E, text=#111110). Dark mode — amber can be a fill or used directly as text/glow on the dark surface. Never use accent as body text color on a light background (contrast too low, ~1.8:1).

## Two-register model + link color (locked Jun 15)

- **Two-register model**: the "document" register is a neutral-dominant, accessible reading surface (most of the page). The "display" register is the full amber-phosphor CRT treatment (hero canvas, MFD-style panels, data cards) — maps to a blueprint/white-room vs. live-tactical-display distinction.
- **Dark is the default mode**; light ("white-room") is the secondary supported mode.
- **The display register's screen stays dark in BOTH modes** — a CRT is dark whether the room around it is lit or not. This avoids ever having to build a light-mode amber CRT.
- **Links are teal, not amber.** Amber is reserved for primary actions, live data, and the display register. Teal carries navigation/reference (warm=active, cool=reference). Teal holds AA contrast in both modes; amber links fail AA on light backgrounds without muddying the color.
- Brand duo = Amber + Teal. Brand personification: Mundane Workshop is framed as an in-universe parts foundry ("LEGO in the Star Wars universe").

## Light-mode contrast fixes (Jun 18)

Several schematic/display tokens originally used identical values in both Light and Dark modes and needed real light-mode overrides for AA contrast. New teal/amber primitive ramps were added (teal/700, teal/900, amber/700, amber/900) and 24 semantic tokens were remapped to hit AA (4.5:1) or better against a cream/light background. If touching any schematic/display/interactive token, check both modes render with adequate contrast — this was a real, repeated gap.

See visual-language-direction.md, spacing-decisions.md, foundation-docs.md.
