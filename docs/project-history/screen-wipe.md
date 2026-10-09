# Screen wipe: Vercel focus view to Framer case study (Oct 9 2026)

The Star Wars page wipe, in 13 variants, one picked at random per trip. Source: `assets/bric-wipe.js` (one file, both sites).

**Variants (all feathered):** `lr rl tb bt` (side to side, top and bottom), `diag-tl diag-tr diag-bl diag-br` (corner to corner), `clock` (clockwise sweep from 12), `iris-in iris-out` (circle), `oval-in oval-out` (ellipse that follows the viewport's aspect). Random pick never repeats the previous one (sessionStorage).

**How the two sites hand off:** they are different origins, so nothing is shared except the URL. Exit on Vercel: a flat panel wipes over the page, then navigation goes to `<case study url>?wipe=<variant>`. Entry on Framer: the page sees the param, starts fully covered by the same panel in the same colour, then the same wipe keeps travelling in the same direction and uncovers the page. The param is removed from the address bar afterwards. Visitors who arrive without the param (search, shared link) see no panel.

**Vercel wiring:** `index.html` loads the file next to the reticle and the manual's "View case study" button calls `bricWipe.go(ctaUrl)` for work projects with an explicit `ctaUrl`. This now opens the Framer page in the SAME tab (it used to open a new one); socials, artifacts and the CV still open new tabs.

**Framer wiring (two Custom Code entries, Site Settings > General > Custom Code):**

1. *Start of `<head>`* (stops the first-paint flash before the main script loads; use the same colour as the panel, the dark `--bric-surface-scene` value is `#070C0C`):
```html
<script>(function(){try{if(/[?&]wipe=/.test(location.search)){var s=document.createElement('style');s.id='bric-wipe-hold';s.textContent='html::before{content:"";position:fixed;inset:0;z-index:2147483646;background:#070C0C}';document.head.appendChild(s);setTimeout(function(){var e=document.getElementById('bric-wipe-hold');if(e)e.remove()},4000)}}catch(e){}})()</script>
```
2. *End of `<body>`* (www.mundanework.shop is the assumed Vercel host, change it if different; pass the same colour the head snippet uses, since Framer has no `--bric-surface-scene`):
```html
<script src="https://www.mundanework.shop/assets/bric-wipe.js" onload="bricWipe.config({color:'#070C0C'}).intercept(['www.mundanework.shop']);bricWipe.enter()"></script>
```
`enter()` is safe to call twice: the param is stripped the first time, so the second call does nothing. Both sites' colours must match or the handoff shows a seam.

**Return trip (Framer to Vercel):** add `bricWipe.intercept(['www.mundanework.shop'])` (the Vercel site's host) to the Framer body snippet and any ordinary link there that points at the Vercel site wipes out and arrives with the matching entry wipe. `index.html` has the same head hold snippet as Framer. The module strips `?wipe=` at load, before the router reads the URL. Untested on live sites.

**Motion notes (CLAUDE.md rule updated: feathered mask animation is allowed for screen wipes):** the feathered edge is a CSS mask whose gradient is driven by a registered number `--p`, animated with the Web Animations API (1100ms out, 1200ms in, `cubic-bezier(.45,0,.55,1)`). A feathered shape cannot be done with transform alone, so this is an exception to the "transform/opacity/filter only" rule in CLAUDE.md; it repaints one full-viewport layer per frame. `prefers-reduced-motion` skips the wipe entirely (plain navigation, no entry panel). If CSS masks or the Web Animations API are missing it also falls back to plain navigation.

**Preview any variant in place:** `bricWipe.play('clock')` in the console on the Vercel site (no arg = random).

**Tunables:** `bricWipe.config({ color, feather, outMs, inMs, easing })`. Feather is a fraction of the viewport's long side (default 0.28).

**Hosts (Oct 9 2026):** Framer case studies are at `small-agency-635770.framer.app` (e.g. `/case-study-template`); set each project's CTA URL (`ctaUrl`, Edit Mode) to its Framer page. Vercel host assumed to be `www.mundanework.shop`, which the Framer snippets point at; confirm. Framer Custom Code only takes effect after a publish. If the Framer site moves to a custom domain, nothing here changes except the `ctaUrl` values.
