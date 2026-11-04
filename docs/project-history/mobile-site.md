# Mobile site (Nov 2026)

A separate phone layout for every view except the arcade. It is **off for everyone** until the arcade is solved, which is the launch rule in the mobile plan.

## Turning it on

| URL | Effect, for this tab |
|---|---|
| `?mobile=1` | On, if the device qualifies (rule below) |
| `?mobile=force` | On, on any device, for testing on a desktop |
| `?mobile=0` | Off |
| `&level=full\|stills\|static` | Forces a fallback level (see below), e.g. `?mobile=force&level=static`. Kept for the tab; `&level=auto` clears it |
| `?perf=1` | Shows the FPS chip and its panel (pixel size, posterize levels, wipe speed, replay gate) |
| `?gate=0` | Skips the entry gate |

The setting lives in `sessionStorage['mw_mobile']`, so it survives reloads and trips to the Framer case studies but not a new tab.

## Who gets it

Decided by Jason on Nov 4 2026:

- **Touch as the primary pointer (`pointer: coarse`) and a screen whose shorter side is under 1024px:** the mobile layout. This covers phones and most tablets.
- **Large iPads (shorter side 1024px or more) and anything with a mouse or trackpad as the primary pointer:** the desktop galaxy. Large iPads still need touch added there: pinch zoom, tap replacements for hover, and the audio unlock retry. That work is not done.
- Chosen once on load, from the screen and not the window, so rotating or Split View never swaps layouts. No user agent checks: iPads report themselves as Macs.
- No WebGL: the static level (below).

## How it is built

- **`index.html` changes are small and only run when the layout is on:** the check at the top of `<head>`, `bootMobile()` next to `boot()`, and one line that skips the binary IndexedDB seed. With the flag off, none of the mobile files are requested.
- **`assets/mobile/`** holds the layout: `mobile.js` (views, markup, shaders), `mobile.css`, and `site-data.js` (fallback copy).
- **It mounts instead of the galaxy.** `bootHolotable()` never runs. `mobile.js` removes the desktop DOM and inline styles, because their IDs and CSS collide with its own (`#ctMsg`, `.manual`), and keeps `#mw-seo`, the head and the loaded scripts.
- **Content** comes from the same `BRICStore` copy the galaxy reads, after `reconcileServerContent()`, so CMS edits reach this layout. `site-data.js` only fills gaps.
- **Routes** are the same real paths and slugs as the desktop site, so a shared link works on either.
- **404:** `route()` in `mobile.js` checks the path against the same table as the galaxy's `routeKnown()` and, for an unknown one, shows the shared error card (`BRICError.show('404')`, `assets/bric-errors.js`) over the layout, with the CTA "Back to the index" and a `noindex` meta plus a "404 · Lost in the void" title (both set and undone by the template). Hosting still answers most unknown paths with the static `404.html` and a real 404 status; this view covers `/work/<unknown-slug>` and in-app navigation, which are 200s.
- **Shaders and sound are the site's.** `mobile.js` carries copies of the holo shaders and `addFx`, and uses the real `audio.js`, `bric-wipe.js` and monogram bundle. If the desktop versions change, these copies do not follow.

## Fallback levels

`assets/mobile/level.js` picks one before `mobile.js` loads (`bootMobile()` in `index.html` chains `site-data.js`, `level.js`, then the level's script). It sets `window.__mwLevel` and `html.mw-level-<level>`.

| Level | When | What changes |
|---|---|---|
| `full` | Default | Live 3D everywhere |
| `stills` | `navigator.connection.saveData`, or the probe fails | Rows are drawn once instead of spinning (the same path `prefers-reduced-motion` already uses, so no new images to make or ship), and the stage draws every other frame |
| `static` | No WebGL (`window.__mwNoGL`, set by the head check) | `static.js` + `static.css` replace `mobile.js`: text rows to the case studies and socials, the About text cloned from `#mw-about`, and contact buttons. No 3D, sound, gate or wipes. `/cv` and `/holonet` scroll to their nearest section |

The probe runs a heavy 512px shader three times per frame for 10 frames and reads a pixel back to sync, and watches the rAF interval. It fails on a software renderer (`failIfMajorPerformanceCaveat`), more than 24ms per synced frame, or a median frame gap over 45ms. The result is remembered 3 days in `localStorage['mw_m.level']`. If rAF stalls for 3s the boot continues (`stills` if the page is visible, `full` if hidden) and nothing is remembered. A forced level is never remembered. `?perf=1` shows the level and probe numbers.

**The 24ms and 45ms limits are guesses.** They were only tried on a desktop GPU (2.7ms) and not on any phone, so expect to tune them on real devices.

## Decisions from prototype testing

- **Hologram:** one fixed camera view that fits the whole text ring and keeps its near and far bands apart. Sideways drag rotates, and vertical swipes always scroll the page. The base grid runs past the hologram's box and behind Change Appearance.
- **Head shader, close up:** the head's bright look on desktop and the index comes from its overlapping shells stacking alpha, because depth precision lets them all pass the pre-pass from far away. Close up the pre-pass culls them to one layer and the scan bands go near-black, so the outfit view stacks on purpose (`uStack`, `STACK_CLOSE`), measured to match the index's band values.
- **Entry gate:** once per tab, only on a load of `/`. Drag the monogram to spin it. A press that travels under 12px is the tap that enters.
- **Accelerometer:** removed. iOS forces a permission prompt on every visitor.
- **HoloNet:** list only, with the console open by default. Transmit plays the firing sound at the tap, runs a 1.4s uplink that holds at 95% until the server answers, then the message slides in at the top of the list. A 3D packet flight was tried and rejected.
- **Screen wipes:** the site's random variants at a shorter 700ms to cover. Desktop is 1100ms.
- **CV:** each entry is its own card, and the CTAs are all the same width.
- **Links in panels:** full-size secondary buttons on outfits, case studies and CV cards.
- **GLB rows:** CV, HoloNet and Space Arcade get a brightness floor, because the planet shader leaves their flat faces nearly black at row size.

## Phone landscape

One media query at the end of `mobile.css`, `(orientation:landscape) and (max-height:520px)`, so rotating reflows live and never swaps layouts (stages follow their box through a ResizeObserver, the gate sizes per frame). Index: the hologram and Change appearance are a sticky left column and the rows scroll on the right. Outfits and case studies: stage left, manual right. CV: heading and CTAs sticky left, cards right. HoloNet: a centered column. Console: dish screen beside the fields. Menu: a right-hand panel. The header drops to 44px. Not `position:fixed` for the hologram: the render loop skips hosts whose `offsetParent` is null, which fixed elements are.

## Still to do before launch

- Test on real phones: touch, audio unlock, memory during the gate preload, and the keyboard over the console.
- The arcade on phones: `/arcade` skips this layout and loads the galaxy build, which runs the game with touch controls. Its Exit game returns to `/?mobile=1`.
- **Open bug, not blocking:** tapping Arcade from the menu overlay still plays a placeholder-sounding beep on a real phone. Two extra `confirm` sounds were already removed (the link's own, and the one `activate()` played as `/arcade` loaded). A sound log then showed only the normal `press` and `release` from `mobile.js`, so the source is one of those or something outside `uiPlay`.

  **How to capture it (one tap):** open `https://mundanework.shop/?mobile=1&sounddebug=1` on the phone (it needs a deploy that includes `assets/mobile/sounddebug.js`, so use the PR's Vercel preview URL). A green log panel pins to the bottom. It records every AudioContext, oscillator, buffer source, `HTMLAudioElement.play`, `ctx.resume/suspend`, `MWAudio.ui` kind and click, with the caller's stack, and keeps the log in `sessionStorage` so it survives the `/arcade` navigation (the panel reappears on the arcade page). Open the menu, tap Arcade, listen for the beep, then tap **copy** on the arcade page and paste it. `?sounddebug=0` turns it off. Inert without the flag.

  **What the 393px desktop-browser run showed (not a phone):** a menu tap plays `press` (about 12 oscillators and buffer sources), `release` 70 ms later, then the page unloads and `audio.js` suspends the context on `visibilitychange`. No `HTMLAudioElement` and no oscillator outside `audio.js` appeared. `audio.js` is the only file with oscillators besides `tools/ui-sounds.html`. Not tested: the `/arcade` page's boot audio (the static test server had no `/arcade` rewrite) and iOS's suspended-context resume path, where `uiPlay` defers a sound with `ctx.resume().then(...)` and could play it late. Those are the two places to check in the first phone log.
- The per-route JSON-LD from `syncRouteHead()` is not ported. Titles, descriptions and canonicals are. Check how crawlers that identify as phones see this layout before the flag defaults on.
- Touch for the desktop galaxy on large iPads is built (PR below) but **not tested on a real iPad**. In `index.html`, all gated on a coarse pointer and `pointerType==='touch'`: pinch zoom (the wheel's zoom and clamps), one-finger orbit (canvas `touch-action:none`; the page never scrolls), first tap previews a planet, the figure or the kit box face and the second tap opens it, and an audio-unlock retry on the first six touch releases. Checked only with synthetic pointer events at 1180x820 in the app browser, with the coarse check forced on. Still unchecked: real iPadOS gesture conflicts (edge swipes, Safari back), pinch feel, and the audio unlock.
- Fallback levels, calibration: tune the probe limits on real low-end phones, and decide whether the stage should also freeze under `stills`. The static level has no HoloNet form, no CV timeline and no case study pages of its own.
- Phone landscape: checked in the app browser at 852x393 only, not on a real phone (notch safe areas, the keyboard over the console in landscape, and the gate's controls on very short screens are unverified).
