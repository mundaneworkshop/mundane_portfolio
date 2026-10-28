# Error pages (404 and friends), Oct 28 2026

One reusable template renders every error state. Files: `assets/bric-errors.js` (config table + renderer, `window.BRICError`), `assets/bric-error.css` (tokens only, corner marks, no side stripes), `404.html` (static fallback).

## Add a new error
Add one entry to `ERRORS` in `assets/bric-errors.js` (`code`, `status`, `title` = the h1, `body`, `primary`; the single CTA is `{label, href}` or `{label, action:'reload'|'back'|fn}`; every shipped entry uses "Back to the galaxy"). Show it with `BRICError.show('key')`, remove with `BRICError.hide()`. Per-call overrides: `BRICError.show('500', {body:'…'})`. Shipped keys: 400, 401, 403, 404, 408, 410, 429, 500, 502, 503, 504, offline, load-failed, coming-soon, generic (ship-bridge / signal voice).

## Where it shows
- **In the app** (`index.html`): `applyRouteFromLocation()` calls `routeKnown(parts)`. Unknown first segment, or `/work/<slug>` that matches no project, opens the overlay on the galaxy (soft 404; the client alone knows project slugs). Links route client-side; back/forward to a valid URL closes it.
- **Hosting** (`vercel.json`): only `/`, `/cv`, `/arcade`, `/holonet` and `/work/*` rewrite to `index.html`. Everything else falls through to `404.html`, which Vercel serves with a real 404 status.
- **Renaming a route slug** (`cvSlug`/`holonetSlug` in the CMS): also add it to the `vercel.json` slug list, or a hard refresh on it will hit `404.html`.

## Behaviour
Headline is the `<h1>` and takes focus (restored on close); Tab is trapped in the card while it covers the page; title and `noindex` are set while shown. The numeral carries the site's hover-glitch (RGB-split copies jittering in short bursts, 2.6s loop; borrowed from the zone labels) and decodes Aurebesh → Latin on hover (same timings as GFX, implemented in `bric-errors.js` so it also works on the static page). The background is a canvas starfield in perpetual forward flight, with the galaxy's brightness curve plus a size spread, colours from tokens, drawn at half resolution (`params.pixel` 2) with alpha posterized to 24 levels (`params.levels`) and `image-rendering: pixelated`, like the scene. Under `prefers-reduced-motion` the glitch, decode and flight stop (the sky draws once).
