# Mobile site (Nov 2026)

A separate phone layout for every view except the arcade. It is **on by default** for the devices listed under "Who gets it". Everything else gets the galaxy.

## Overriding it

| URL | Effect, for this tab |
|---|---|
| `?mobile=1` | Back to the default: on, if the device qualifies (rule below) |
| `?mobile=force` | On, on any device, for testing on a desktop |
| `?mobile=0` | Off, on any device |
| `&level=full\|stills\|static` | Forces a fallback level (see below), e.g. `?mobile=force&level=static`. Kept for the tab; `&level=auto` clears it |
| `?perf=1` | Shows the FPS chip and its panel (pixel size, posterize levels, wipe speed, replay gate) |
| `?gate=0` | Skips the entry gate |

The setting lives in `sessionStorage['mw_mobile']`, so it survives reloads and trips to the Framer case studies but not a new tab.

## Who gets it

Decided by Jason on Nov 4 2026:

- **Touch as the primary pointer (`pointer: coarse`) and a screen whose shorter side is under 1024px:** the mobile layout. This covers phones and most tablets.
- **Large iPads (shorter side 1024px or more) and anything with a mouse or trackpad as the primary pointer:** the desktop galaxy. Touch for large iPads is covered under "Still to check".
- Chosen once on load, from the screen and not the window, so rotating or Split View never swaps layouts. No user agent checks: iPads report themselves as Macs.
- Leaving the arcade follows the same decision, kept in `window.__mwMobileHome` (set on `/arcade` too, though the layout doesn't boot there). Devices on the mobile layout reload `/` past its gate. Large iPads return to the galaxy in place, like a desktop, because reloading `/` there lands on the galaxy's entry gate, which doesn't read `mw_gate_passed`.
- No WebGL: the static level (below).

## How it is built

- **`index.html` changes are small and only run when the layout is on:** the check at the top of `<head>`, `bootMobile()` next to `boot()`, and one line that skips the binary IndexedDB seed. When the layout is off, none of the mobile files are requested.
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

## Structured data and crawlers (Nov 4 2026)

- **JSON-LD is ported.** The builder moved out of `syncRouteHead()` (it lives inside `bootHolotable()`, so the mobile layout cannot call it) into `window.mwSetRouteLd(kind, title, url)` in a small inline script in the head of `index.html`. The galaxy and `routeHead()` in `mobile.js` both call it, so `/cv` (and `/about/<outfit>`) emit the `ProfilePage` block and `/work/<slug>` the `CreativeWork` plus `BreadcrumbList`. The home, `/holonet` and `/arcade` emit only the two static head blocks. Checked on a local server with `?mobile=force` and `?mobile=0`, switching routes with pushState/popstate: same blocks, titles and counts on both layouts.
- **What crawlers see.** The server returns the same `index.html` for every path, so the initial HTML is identical on both layouts: the static head, `#mw-seo` copy and Person/WebSite JSON-LD. Per-route head, including this JSON-LD, only exists after JS runs, on either layout. The layout is chosen in the first head script from `sessionStorage['mw_mobile']`, `pointer: coarse`, the screen's short side under 1024 and WebGL. A crawler has no flag today, so it gets the galaxy whatever its user agent. Once the flag defaults on, a phone-identifying crawler that renders with touch emulation and WebGL would take the mobile path. That path keeps `#mw-seo`, sets title, description, canonical and JSON-LD per route, and hides the body (`visibility: hidden`) only until mount, so it should index the same, but this is unverified: no crawler was run against it (Search Console URL Inspection on a preview is the real test).
- **Cheap mitigation, in place:** the head script skips the mobile path when the user agent matches a common crawler or link-preview fetcher (`bot`, `crawl`, `spider`, `lighthouse`, `facebookexternalhit`, `slurp`), so those always get the galaxy path the SEO work was checked against. It is a user agent check, which the layout rule otherwise avoids on purpose, so it only lists bots and never decides between phone and desktop. Same URLs and content either way.
- **Not covered:** fully server-rendered per-route head (all routes still share one HTML file); Google's real renderer behaviour; a Googlebot variant that does not say "bot" in its user agent.

## Phone landscape

One media query at the end of `mobile.css`, `(orientation:landscape) and (max-height:520px)`, so rotating reflows live and never swaps layouts (stages follow their box through a ResizeObserver, the gate sizes per frame). Index: the hologram and Change appearance are a sticky left column and the rows scroll on the right. Outfits and case studies: stage left, manual right. CV: heading and CTAs sticky left, cards right. HoloNet: a centered column. Console: dish screen beside the fields. Menu: a right-hand panel. The header drops to 44px. Not `position:fixed` for the hologram: the render loop skips hosts whose `offsetParent` is null, which fixed elements are.

## Outfit unlocks

`locked()` in `mobile.js` follows the same rules as the galaxy's `ocProg()`. Arcade progress is shared, because `/arcade` runs in the galaxy build and writes `mw_ark_stats` and `mw_kits_total`, which the layout reads fresh on each render. Site events stay in the layout's own `mw_m.events`, separate from the galaxy's `mw_oc_events`. Opening a case view counts as seeing that case study, as it does in the galaxy. A tap on any link to linkedin.com or instagram.com counts as a visit, also as in the galaxy. Those links open in a new tab, so the outfit view redraws when the tab becomes visible again if its lock changed.

## Buttons follow the desktop settings

The case study button reads the same saved keys as the desktop manual (`case:<id>:ctaActive`, `ctaHidden`, `cta`, `ctaUrl`) with the same defaults, so only Josh.ai starts active. Disabled shows a disabled button with no link, and hidden shows nothing. The CV download reads the same stop's `ctaHidden`, `ctaActive` and `cta`. The static level drops the link from its row when a case study button is disabled or hidden.

## Launch (Nov 5 2026)

PR #132 turned the layout on by default for the devices under "Who gets it". Checked on Jason's iPhone (Chrome): the layout loads with no flag, outfits unlock, and buttons follow the desktop settings.

## Sound on page changes

**The beep is fixed.** A short beep played on real phones when going to the Arcade and when leaving it, including with the browser's back, which taps no site button. Each page closed with audio still running and was suspended at full level. The sound log couldn't record the beep itself, so the cause was narrowed down by retesting on the iPhone. PR #134 fixed it in two steps, each retested on the phone:

- Fading the output before suspending, on `visibilitychange` and `pagehide`, stopped the beep on exit. Going to the Arcade still played a split second of it.
- `MWAudio.leave()` eases the output down from the start of the screen wipe, in `bricWipe.go()`. That stopped the rest.

PR #134 also stopped the touch audio retry from starting the site ambience and hum inside the arcade.

**`/arcade` needs a first tap for sound.** iPhone browsers won't start audio on a newly loaded page until it's tapped, and the tap that got there belonged to the previous page. Jason chose to keep this rather than run the arcade inside the same page, which would be a large change with a memory risk. The hyperspace jump is silent on phones as a result.

**Known and left alone:** on `/arcade` before the first tap, the jump and arrival clips queue on the suspended context and all start together when the tap resumes it. Other first-gesture sounds rely on that queueing.

**To debug sound on a phone:** open `/?sounddebug=1` (`?sounddebug=0` turns it off). A green log panel records every AudioContext, oscillator, buffer source, `HTMLAudioElement.play`, `ctx.resume/suspend`, `MWAudio.ui` kind and click, with the caller's stack. The log lives in `sessionStorage`, so it survives page changes in the tab. Tap **copy** to get it. Oscillators that set their pitch with automation, such as `mBody`, log `f=440`, which is the default value and not a real 440 Hz tone.

## Toasts

`assets/mobile/toast.js` gives both the full and static levels `window.mwToast`. Styles are `#mToast` in `mobile.css`. It sits below the header, like the galaxy's toast sits below its top bar. Three events show one: an outfit unlocking, an e-mail link with no mail app to open (the address is copied), and a sent transmission. The galaxy's "new transmission received" has no mobile version, since this layout has no live message feed.

## Still to check

- Real phones: memory during the gate preload, and the keyboard over the console.
- Run Search Console URL Inspection (live test) on production for `/cv` and a `/work/` page, and confirm the rendered head and JSON-LD.
- Touch for the desktop galaxy on large iPads is built (PR below) but **not tested on a real iPad**. In `index.html`, all gated on a coarse pointer and `pointerType==='touch'`: pinch zoom (the wheel's zoom and clamps), one-finger orbit (canvas `touch-action:none`; the page never scrolls), first tap previews a planet, the figure or the kit box face and the second tap opens it, and an audio-unlock retry on the first six touch releases. Checked only with synthetic pointer events at 1180x820 in the app browser, with the coarse check forced on. Still unchecked: real iPadOS gesture conflicts (edge swipes, Safari back), pinch feel, and the audio unlock.
- Fallback levels, calibration: tune the probe limits on real low-end phones, and decide whether the stage should also freeze under `stills`. The static level has no HoloNet form, no CV timeline and no case study pages of its own.
- Phone landscape: checked in the app browser at 852x393 only, not on a real phone (notch safe areas, the keyboard over the console in landscape, and the gate's controls on very short screens are unverified).
