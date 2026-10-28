# Error pages (404 and friends), Oct 28 2026

One reusable template renders every error state. Files: `assets/bric-errors.js` (config table + renderer, `window.BRICError`), `assets/bric-error.css` (tokens only, corner marks, no side stripes), `404.html` (static fallback).

## Add a new error
Add one entry to `ERRORS` in `assets/bric-errors.js` (`code`, `status`, `title` = the h1, `body`, `primary`, `secondary`; actions are `{label, href}` or `{label, action:'reload'|'back'|fn}`). Show it with `BRICError.show('key')`, remove with `BRICError.hide()`. Per-call overrides: `BRICError.show('500', {body:'…', secondary:null})`. Shipped keys: 404, 403, 500, offline, load-failed, coming-soon, generic.

## Where it shows
- **In the app** (`index.html`): `applyRouteFromLocation()` calls `routeKnown(parts)`. Unknown first segment, or `/work/<slug>` that matches no project, opens the overlay on the galaxy (soft 404; the client alone knows project slugs). Links route client-side; back/forward to a valid URL closes it.
- **Hosting** (`vercel.json`): only `/`, `/cv`, `/arcade`, `/holonet` and `/work/*` rewrite to `index.html`. Everything else falls through to `404.html`, which Vercel serves with a real 404 status.
- **Renaming a route slug** (`cvSlug`/`holonetSlug` in the CMS): also add it to the `vercel.json` slug list, or a hard refresh on it will hit `404.html`.

## Behaviour
Headline is the `<h1>` and takes focus (restored on close); Tab is trapped in the card while it covers the page; title and `noindex` are set while shown. Motion is a transform/opacity fade-in plus a stepped opacity flicker on the numeral and a drifting starfield on the standalone page; all removed under `prefers-reduced-motion`.
