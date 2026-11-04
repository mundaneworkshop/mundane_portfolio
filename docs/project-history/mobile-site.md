# Mobile site (Nov 2026)

A separate phone layout for every view except the arcade. It is **off for everyone** until the arcade is solved, which is the launch rule in the mobile plan.

## Turning it on

| URL | Effect, for this tab |
|---|---|
| `?mobile=1` | On, if the device qualifies (rule below) |
| `?mobile=force` | On, on any device, for testing on a desktop |
| `?mobile=0` | Off |
| `?perf=1` | Shows the FPS chip and its panel (pixel size, posterize levels, wipe speed, replay gate) |
| `?gate=0` | Skips the entry gate |

The setting lives in `sessionStorage['mw_mobile']`, so it survives reloads and trips to the Framer case studies but not a new tab.

## Who gets it

Decided by Jason on Nov 4 2026:

- **Touch as the primary pointer (`pointer: coarse`) and a screen whose shorter side is under 1024px:** the mobile layout. This covers phones and most tablets.
- **Large iPads (shorter side 1024px or more) and anything with a mouse or trackpad as the primary pointer:** the desktop galaxy. Large iPads still need touch added there: pinch zoom, tap replacements for hover, and the audio unlock retry. That work is not done.
- Chosen once on load, from the screen and not the window, so rotating or Split View never swaps layouts. No user agent checks: iPads report themselves as Macs.
- No WebGL: falls through to the desktop path for now. The fallback levels in the plan are still to come.

## How it is built

- **`index.html` changes are small and only run when the layout is on:** the check at the top of `<head>`, `bootMobile()` next to `boot()`, and one line that skips the binary IndexedDB seed. With the flag off, none of the mobile files are requested.
- **`assets/mobile/`** holds the layout: `mobile.js` (views, markup, shaders), `mobile.css`, and `site-data.js` (fallback copy).
- **It mounts instead of the galaxy.** `bootHolotable()` never runs. `mobile.js` removes the desktop DOM and inline styles, because their IDs and CSS collide with its own (`#ctMsg`, `.manual`), and keeps `#mw-seo`, the head and the loaded scripts.
- **Content** comes from the same `BRICStore` copy the galaxy reads, after `reconcileServerContent()`, so CMS edits reach this layout. `site-data.js` only fills gaps.
- **Routes** are the same real paths and slugs as the desktop site, so a shared link works on either.
- **Shaders and sound are the site's.** `mobile.js` carries copies of the holo shaders and `addFx`, and uses the real `audio.js`, `bric-wipe.js` and monogram bundle. If the desktop versions change, these copies do not follow.

## Decisions from prototype testing

- **Hologram:** one fixed camera view that fits the whole text ring and keeps its near and far bands apart. Sideways drag rotates, and vertical swipes always scroll the page. The base grid runs past the hologram's box and behind Change Appearance.
- **Entry gate:** once per tab, only on a load of `/`. Drag the monogram to spin it. A press that travels under 12px is the tap that enters.
- **Accelerometer:** removed. iOS forces a permission prompt on every visitor.
- **HoloNet:** list only, with the console open by default. Transmit plays the firing sound at the tap, runs a 1.4s uplink that holds at 95% until the server answers, then the message slides in at the top of the list. A 3D packet flight was tried and rejected.
- **Screen wipes:** the site's random variants at a shorter 700ms to cover. Desktop is 1100ms.
- **CV:** each entry is its own card, and the CTAs are all the same width.
- **Links in panels:** full-size secondary buttons on outfits, case studies and CV cards.
- **GLB rows:** CV, HoloNet and Space Arcade get a brightness floor, because the planet shader leaves their flat faces nearly black at row size.

## Still to do before launch

- Test on real phones: touch, audio unlock, memory during the gate preload, and the keyboard over the console.
- The arcade on phones: `/arcade` skips this layout and loads the galaxy build, which runs the game with touch controls. Its Exit game returns to `/?mobile=1`. The touch controls are still on `spike/arcade-touch`.
- The per-route JSON-LD from `syncRouteHead()` is not ported. Titles, descriptions and canonicals are. Check how crawlers that identify as phones see this layout before the flag defaults on.
- Touch for the desktop galaxy on large iPads.
- Fallback levels: stills in rows for phones that fail a frame probe or use `saveData`, and a static layout with no WebGL.
- Phone landscape layout outside the arcade (stage left, content right, from the plan).
- An in-app 404: unknown paths show the index on this layout.
