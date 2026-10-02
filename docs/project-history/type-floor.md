# Type-size floor (Oct 2 2026)

Razor: **is this legible on a phone?** (CSS px are the same on iOS and Android; a phone is held ~30–40 cm away.)

## Standards used
- **Apple HIG**: the smallest text style is 11 pt (Caption 2); Material 3's smallest role is Label Small, 11 sp; Body Small is 12 sp. Nothing below 11 px.
- **Lighthouse "legible font sizes"**: flags text under 12 px when it covers a large share of the page. Sentence-case text therefore sits at 13 px; only short uppercase labels stay at 11 px.
- **iOS Safari** zooms the page when a focused field is under 16 px, so inputs are 16 px at ≤640 px.
- **WCAG 1.4.3**: normal text needs 4.5:1. Size and contrast are coupled — small text on a dark ground is the usual failure — so the floor is paired with a contrast rule.
- WCAG has no minimum size; 1.4.4 (resize to 200%) and 2.5.8 (24 px target) are met by the layout and are unchanged here.

## The floor (matches Figma `type/label/micro` 11/16, `type/label/default` 13/16, `type/body/small` 13/20)
| Use | Size |
|---|---|
| Uppercase tracked labels, kickers, tags, counters, status and hints, breadcrumb, small utility buttons/links | **11 px** (floor) |
| Primary CTA labels, sentence-case or reading text, metric values, form field text | **13 px** |
| Form inputs on ≤640 px | **16 px** |
| Text ≤13 px | contrast **≥ 4.5:1** |

## Exempt (not counted against the floor)
- Box-art decals on the 3D kit box and its snap diagram (`.front-band-text`, `.cover-label`, `.back-header`, `.front-pieces`, `.art-chip`, `.snap-k`, the 7 px spine text): artwork, duplicated by readable text in the manual.
- Author-only tooling (debug, Projects Manager, marquee, edit panel, `.tbtn` toolbar, layout switcher): not shown to visitors.

## What changed in `index.html`
- 45 font-size declarations raised to the floor (see the diff); nothing was lowered.
- Colors that failed 4.5:1 for small text: `#5a6f6b` → `#6b8a85` (existing prod teal-grey, 5.1:1) on counters, notes, sender labels, loading text and the CV hint; `#hint` and `#entryHint` no longer use `--line-dim` (3.0:1) and are fully opaque; manual `--c-dim` 0.3 → 0.5 alpha (2.4:1 → 4.7:1) and `--c-secondary` 0.5 → 0.62 to keep the hierarchy.
- `#ctName, #ctMsg` are 16 px under 640 px.

## Verified
At 375×812 and desktop in the in-app browser, with a scan of every visible text node: the only text left under 11 px is the exempt box art and author tooling. No console errors, no overflow in the manual panel.

## Open
- Light-mode `content/tertiary` (`#94908A`, 2.6:1) fails for small text; use it for placeholders and decoration only until a passing value is chosen.
- Tap targets: small utility buttons and links are ~24–30 px tall on phones; the Large button (40 px) and a 44 px mobile target need to land with the `.bric-*` button migration.
