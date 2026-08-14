# Visual language — cassette futurism (locked)

> BRIC DS visual language: cassette futurism aesthetic locked Jun 14 2026, core design rules, bloom quarantine, component/corner/type history.

## Guiding prompt

**"What if LEGO as a brand existed in the Star Wars universe?"** LEGO brings modularity, bold systematic thinking, constructivist precision. Star Wars brings utilitarian wear, world-building depth, MFD/cockpit UI, lived-in technology. Together they justify the cassette-futurism + amber-CRT aesthetic and push it toward a more physical, tactile, "manufactured object" quality.

## Aesthetic: Cassette Futurism

Reference: Star Wars Rogue One + Andor UI language — high-contrast graphic design, strong line work, digital+analog effects applied sparingly and intentionally. **Effects enhance the subject; they do not define it.** (An earlier exploration was rejected as looking "like an early-2000s WinAmp skin" — bloom/glow was on every element indiscriminately. This rule exists specifically to prevent regressing to that.)

## Core design rules (non-negotiable)

- **Amber is the display medium, not an accent.** Monochrome CRT logic — hierarchy is expressed through brightness, not hue. White is reserved for extreme emphasis only.
- **Bloom is quarantined to exactly 3 locations**: LED status dots, the logo in the hero/header, an active switch thumb. Nothing else gets a glow.
- **One global scanline, structural, never per-component.**
- **Corners — pixel-stepped signature (chamfer retired).** A curve reduced to stud-sized steps, grounded in LEGO's own brick-based "font" of shapes. Never `border-radius`; always vector/clip-path geometry. True round is reserved for circles/avatars/dots only.
- **Background grid**: one system — a squircle baseplate, 32px cell, 16px stud, 8% opacity, stud drawn as an arc-stepped stroked ring (same pixel-corner logic as the corner rule, unifying the two).
- **Button state model (revised, current)**: a Battlefront-2-inspired axis system — Register (Available=amber / Coming-soon=teal) × Selected × Current = 8 variants. No fill = selectable, holo glow = active/current, solid fill = selected, solid+glow = selected+current. Holo is the ACTIVE highlight (colored per register), not a "disabled" state — that reading is retired.
- **Dual-state language (the identity's synthesis)**: every component conceptually has two states — teal holographic schematic (plan/design layer) vs. amber materialized part (built/live). Cool→warm = materialization. The interactive pattern (CTA/menu/nav) is text-first + fill: idle=text only, hover=ghost fill (~14%), selected=solid amber fill with near-black text. No error/tear state on CTAs — this is a portfolio with fixed nav endpoints, not a diegetic terminal that can "fail."
- **Holo treatment**: teal, semi-transparent, scanlined; ambient motion (flicker, scanline drift, chromatic edge) is subtle and must be fully disabled under `prefers-reduced-motion`, not just slowed — this was flagged as the top accessibility risk in the whole language.
- **Elevation is stack/tone/frame, not shadow.** Five levels (inset, flush, raised, stacked, overlay); only the "stacked" level (buttons/draggables) gets an actual soft shadow. Overlays (modals) separate via scrim+border, never a cast shadow.
- **Components read as MFD panels**: panel ID header, status indicator, footer annotation — communicate through information structure, not visual effects.

## Type stack (locked, current — 4 faces)

- Display/headings: **Chakra Petch**
- Body + labels: **Space Grotesk** (labels = uppercase + tracking)
- Data/code (display register): **Space Mono** Regular (fixed-width, aligned digits for readouts)
- Reveal effect: **Aurebesh** — a 1:1 Latin cipher font used for a brief first-paint reveal animation on hero/heading text before swapping to the real Latin font (pure font-family class swap, no translation needed; Aurebesh has no numeral/punctuation glyphs so those elements are excluded from the effect).

Perfect Fourth type scale, line-heights as multiples of 4px. Two registers (document vs. display) with separate but related scales.

## References

Games cited as mood/tone references: Superbrothers Sword & Sorcery EP, Kentucky Route Zero, Lego Builder's Journey, Dave the Diver, Superhot, Return of the Obra Dinn, Disco Elysium, Signalis, Hypnospace Outlaw, Duskers, Caves of Qud, SOMA.

See color-decisions.md, spacing-decisions.md, star-wars-visual-dna.md, foundation-docs.md, bric-build-progress.md.
