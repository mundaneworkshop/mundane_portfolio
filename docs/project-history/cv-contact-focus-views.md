# CV + HoloNet (Contact) focus views

> CV (3D hyperspace route) + Contact/HoloNet (comm console → message-star wall) bespoke focus views in index.html.

CV and HoloNet planets get BESPOKE focus views (not the kit-box/booklet at their top level). `activate()` routes id `'cv'` → `openCV` → `enterCVRoute`, `'contact'` → `openContact` (internal dev id is `contact`; the exposed name/route is HoloNet — see url-slugs-routing.md).

## CV — 3D hyperspace route

`enterCVRoute(grp)`: focuses the cv planet, disables autoRotate, hides the galaxy (`galaxy.visible=false`), shows `cvRouteGroup` (starfield + per-segment lane lines + node spheres + ship). Body gets `mw-altfocus`+`mw-cvroute` classes. **Default on load = overview zoom with the latest node active** (gold, pulsing).

**Node model**: `cvData` is a TREE persisted in `copyOvr['cvRoute']`. Node = `{id, parent, title, sub, kicker, body, tags, pos[x,y,z], disabled, branch}`. `rebuildCVRoute()` is re-runnable. A disabled node renders as a dashed "path not taken" line + dimmed sphere. `cvLatestId` = the deepest LEAF of the main (non-branch) path.

**Per-node edit controls** (Edit Mode): add-linear, add-branch, toggle-branch, toggle-disabled, delete-node (reparents children, guards against deleting the last node).

**Nav has two levels**: overview (wide cam, booklet hidden) and node (dolly-in, booklet shown). Clicking a node uses an invisible larger hit-sphere (a real bug: without it, the tiny node orb was unclickable at overview zoom and clicks fell through to overview). Camera auto-fits the route's bounding box on entry/rebuild.

**Details reuse the project manual** (`#manual-scene`) via `CS.showBooklet(cvDataForBooklet(id))` — fully editable in Edit Mode, writing to the tree NODE, never the cv planet itself. A booklet subtitle field was added (hidden for projects/artifacts where it doesn't apply). CTA = "Download CV (PDF)" — currently a toast stub, needs a real PDF wired up.

**Ship**: travels the lane path between nodes on selection, GLB-uploadable (falls back to a cone). Orientation/facing and speed are Edit Mode debug controls, persisted.

**Known historical gotcha (fixed):** `.manual-title`/`.manual-framing` are global inline-edit nodes bound to whichever planet is "focused" — CV keeps the cv planet focused underneath, so an early version of editing a CV node title wrote into `case:cv:title` instead, corrupting the menu label. Fixed by rerouting `commitInline` for CV context to the node object, plus a one-time boot cleanup that deletes stray `case:cv:*` keys.

## Contact / HoloNet

`#contactFocus` is a dark holo console: a transmission screen, callsign + message fields with live remaining-character counters, and a transmit action. (Before Oct 28 2026 it also had a GLB upload slot with its own mini WebGL renderer; that slot and the launch animation it fed were removed with the transmission rework below.) Menu label renamed from "Contact" to "HoloNet" — the internal id stays `contact` (routing keys off the stable id).

**Accent = purple `#A06AF0`** (hot `#C8AAFF`) — deliberately maximally separated from amber (work) and teal (system). Applied to the message-star default, the modal, the HoloNet planet itself, the menu button, and a "constellation hover" effect (hovering the HoloNet node draws purple conduit lines to every message star).

Transmit flow (Oct 28 2026, replaces the GLB launch / R@ trundle). It follows Rogue One's Scarif uplink sequence, rebuilt from three film stills: the dish-alignment screen, the red sender bars and the blue receiver bars.

- **Alignment is the compose state.** `#ctScr`'s `#ctAlign` SVG draws the film's side-on dish: bounding box, bowl curve, two rungs, the thick teal rim, the hub plate, the feed housing (diamond, slot, bar) and a two-line mast that narrows as it goes down. The corner furniture is the film's too: two double-diagonal ticks and two outlined triangles, mirrored about the centre line. The top row of vertical ticks and the black bezel were dropped (an explicit call). Line weights and positions were measured off the frames.
- **Tilt.** The dish sits at a static tilt (`CT_TILT` = 12°) and steps level as the fields fill. Progress is `(min(callsign,1) + min(message,2)) / 3`, so one character plus "hi" locks it. There is no idle sway (an explicit call).
- **Lock.** The primary axis is part of the dish group, so it is always perpendicular to the rim. The box and the axis flash at about 3 Hz (under the WCAG 2.3.1 three-flashes limit) until it locks, then go solid.
- **Over the cap.** Either field over its cap tips the dish past its widest angle, and the counters go negative in danger red. `maxlength` was removed on purpose so this can happen. The server still enforces 40/280.
- **Readout.** The footer digits are `MMDD-HHMM`: the local date plus the 24-hour time.
- **Header = status.** The header line is the live status (`ctHint(text, state)`), so there's no "Initiate transmission" title. Its dot is red while misaligned, over the cap or after a lost signal, teal when aligned, amber while recharging and purple during uplink. A ✕ (`#ctClose`, a small BRIC button) at the top right calls `goHome()`. The footer's left side holds two tertiary BRIC buttons: "E-mail Jason" (mailto:jason@mundanework.shop) and "Schedule call" (the Calendly 30-minute link `CV_CHAT_URL` uses, opening in a new tab).
- **Layout.** The panel is up to 820px wide. The screen's width sets the row height, and the field column stretches to match it, with the message box taking up the slack. There's no status chip. Each field's placeholder is its label (with an `aria-label`), and the remaining-character count sits inside the field at the bottom right. Button copy has no glyphs or arrows (an explicit call). Under 520px it drops to one column. The screen, both fields and TRANSMIT all span the full width, and the two tertiary buttons split that width evenly.
- **TRANSMIT** uses `aria-disabled` (the BRIC button's disabled look). It's the large size (56px tall). When the dish locks, `ctArm` ignites it once: two stepped holo rings burst out (`.ct-go.fire`) and the button pops. It then breathes its glow while ready (`.armed`). With reduced motion, it just shows a steady glow. The hint reads "Write your message to align the dish and transmit" until it locks, then "Dish aligned, ready to transmit". `#ctHint` says what's missing, and `#ctLive` announces state changes only.
- **Upload.** One animation, the sender's bars (`#ctRows`). Four rows of 14 segments use the widths measured from the film. They empty from the left, each segment flashing brighter as it switches, and the rows run at slightly different rates. The bar holds at 95% until `/api/holonet-submit` answers, so it never fakes completion. The blue receiver screen was dropped (an explicit call).
- **Failure** shows SIGNAL LOST, keeps the text, and the button becomes "Retry transmit".
- **Success** clears the fields, starts the 8 s cooldown and pins the star. `goHome()` closes the console. `holoShoot(m)` then draws one conduit from the HoloNet planet to the new star using the hover-constellation look (`drawHoloShot`). It is brighter than the hover web because it's a single line. The star stays hidden until the packet lands, then `focusMessageStar(m)` orbits the camera around the pulsing star, as before.
- **Sound** (Oct 28 2026). The clips were cut from the Death Star SFX reel and copied into `assets/audio/holo-*.m4a`. They're registered as `SITE_EVENTS` in `assets/battle/audio.js` and play through `MWAudio.site`, so the SOUND toggle mutes them. `holoAlignStep` (elevator-01) plays when a field newly meets its minimum and the dish steps toward alignment. `holoAligned` (elevator-02) plays when the dish locks, replacing the step sound for that keystroke. `holoUplink` (tractor-beam-01-trim, 6.0 s) plays on TRANSMIT, and `CT_UPLINK_MS` makes the uplink bars span its length. `holoShot` (weapons-firing-10) plays as the packet leaves the HoloNet planet. Its repo copy was raised from -18.3 to -13.7 LUFS, just over the loudest clip in the set (elevator-01, -13.9). A peak limiter holds its true peak at -1.6 dBFS. `ctOpen` preloads all four via `MWAudio.sitePreload`, so the first keystroke cue has no decode lag.
- **Reduced motion:** no flashing (dim, then solid on lock), instant tilt and bars, no packet flight, and the orbit camera holds still.

## Message stars (visitor transmissions)

Real backend as of Aug 2026 (see api/holonet-submit.js, api/holonet-delete.js, and holonet-schema.sql at the repo root) — Supabase-backed shared `messages` table, a serverless submit endpoint with validation + an email alert via Resend, admin-only delete gated by a server-side secret token (`HOLONET_ADMIN_TOKEN`), not the client-side "author mode" flag. Older notes below describe the pre-backend, localStorage-only version — the general rendering/interaction model (canvas-drawn pixelated stars, click → modal, purple constellation hover) is unchanged; only the storage layer changed.

Stars are drawn on a low-res canvas so they inherit the site's global pixelize/posterize post-processing. Scattered on an outer ring beyond the planet plate so they never collide with planets.
