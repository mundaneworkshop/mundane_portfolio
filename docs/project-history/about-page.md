# /about: one shared, crawlable About page (Oct 29 2026)

Decision (Jason): About is a single shared page. Crawlers, the future phone About tab and the desktop minifigure focus view all show the same content; desktop enhances it.

## What was wrong
- `vercel.json` rewrites listed only `cv|arcade|holonet` and `/work/*`, so a hard refresh of `/about` or `/about/<outfit>` returned `404.html` (verified with a local server applying the rules: origin/main 404, now 200).
- `routeKnown()` did not know `about`, so even with a rewrite the in-app 404 overlay would show and the head went `noindex`.
- No About text existed outside the WebGL focus view.

## What changed
- `vercel.json`: rewrites for `/about` and `/about/:path*`.
- `routeKnown()`: `/about` and `/about/<one segment>` are known (unknown outfit id falls back to the default outfit, as `ocOpenAboutRoute` already did).
- `syncRouteHead()`: About title/description, ProfilePage JSON-LD (Person with jobTitle and sameAs), and `/about/<outfit-id>` canonicalizes to `https://www.mundanework.shop/about` (canonical, og:url, JSON-LD url). The address bar still shows `/about/<outfit-id>` for the focus view.
- `#mw-seo`: an About link in the nav plus `<section id="mw-about" data-outfit="work">` with real HTML text. `sitemap.xml` lists `/about`.

## Limits worth knowing
- No build step, one `index.html` for every path. A no-JS fetch of `/about` therefore gets the home `<title>`/canonical and the home h1, with the About section present in the body. Crawlers that run JS get the About head. A true per-route static head needs a separate `about/index.html` or a build step: not done.
- The static text is hand-copied from `assets/outfits.json`; it does not regenerate when the CMS copy changes. Keep them in step.
- A new visitor's focus view opens on the built-in "Big Head Mode" (`head`) because every other outfit is locked, so the desktop view and the crawlable text differ. Decision pending (see below).

## Copy status (nothing invented)
Verbatim existing copy from `assets/outfits.json`: Work outfit (Staff Product Designer bio), the three case-study outfits' blurbs (vr-gamer, slate-dummy, iron-man) as "Selected work" summaries. All of it is placeholder until Jason supplies final text. The case-study links go to `/work/<slug>`; the Framer URLs are still pending (SEO to-do item 1).

## For the phone About tab
Render `#mw-about` content (or the same data) as a card with the current outfit's still above it. The focus view's `aboutData(o)` stays the desktop enhancement. Do not build a second copy.

## Open questions for Jason
1. Final About text: bio, what you do, case-study summaries and links.
2. Which outfit's copy is "the" About for crawlers/phones: Work (used now) or Big Head Mode (what a new visitor sees on desktop)?
3. OK to expose the three unlock-gated case-study blurbs publicly?
