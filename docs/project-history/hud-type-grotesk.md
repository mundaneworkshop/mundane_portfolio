# HUD type migration: Space Mono → Space Grotesk (Oct 2 2026)

The locked type stack (`visual-language-direction.md`) is Chakra Petch for display, Space Grotesk for body and labels, and Space Mono for data and code only. Prod had been setting Space Mono as the body font (`html,body{font-family:var(--mono)}`, present since the first commit, no recorded rationale), so every label inherited it. This change moves labels and body text to Space Grotesk and keeps Space Mono for readouts.

## Switched to Space Grotesk
Body default; breadcrumb; planet labels; entry hint; CV row labels and pills; HoloNet toggle label, hover card, form labels, inputs, upload button, notes, message sender, delete button; loading text; case-study exit button and placeholder; Instagram slot labels; error messages; manual panel kicker, subtitle, framing, tags, meta, links, CTA and note, flip/drag hints, art chips, cover and back-header labels, band and spine decals; process-page kicker. Google Fonts request now includes weight 700 for Space Grotesk.

## Kept in Space Mono (data / code / author tooling)
Counters (`.ct-count`, `.pt-step`, `.cs-step`, `.cschlbl-n`), file names and slugs, manual metric keys and values (`.snap-k`, `.snap-cell-k/v`), `.front-pieces`, all author-only panels (debug, Projects Manager, marquee, edit panel, layout switcher, URL inputs), the 3D ring text and the marquee font option (canvas text; changing it would alter the Aurebesh ring alignment), and the Aurebesh fallback font stack.

## Not changed (open)
Font sizes. Much of the HUD is 7–10px, below the Figma 11px floor, and Space Grotesk is proportional, so tiny sizes read worse than they did in a monospace face. Raising the floor is a separate decision.
