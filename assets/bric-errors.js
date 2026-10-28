/*! BRIC error pages, v1.0
 *
 * ONE reusable error-page template. Used by the live site (index.html: overlay on the galaxy, unknown routes) and by the
 * static 404.html fallback Vercel serves, with a real 404 status, for paths the SPA rewrite does not cover.
 * Styles: assets/bric-error.css. Buttons: .bric-btn (assets/bric-components.css).
 *
 * ── ADD A NEW ERROR ───────────────────────────────────────────────────────────────────────────────────────────────
 * Add one entry to ERRORS below. That is all: no markup, no CSS.
 *
 *   'my-key': {
 *     code:      '418',                       big numeral (or a short word like 'OFFLINE'); decorative, hidden from screen readers
 *     status:    'Teapot',                    eyebrow: "Error <code> · <status>" (omit `code` to show just the status)
 *     title:     'Short headline',            becomes the page's <h1>, and receives focus
 *     body:      'One or two sentences.',     plain text
 *     primary:   { label:'Back to the galaxy', href:'/' }        the one call to action: a link, or { label, action:'reload' | 'back' | function }
 *   }
 *
 * Show it from anywhere:  BRICError.show('my-key')   ·   remove it:  BRICError.hide()
 * Per-call overrides:     BRICError.show('500', { body:'The holonet relay is down.' })
 * Hosts can pass { navigate:function(href){…} } to route links client-side (index.html does), { mode:'page' } for the standalone page.
 * Extra: docs/project-history/error-pages.md
 */
(function (root) {
  'use strict';

  var HOME = { label: 'Back to the galaxy', href: '/' };

  // Voice: ship-bridge and signal language, short sentences, no blame. Every entry has the one CTA.
  var ERRORS = {
    '400': { code: '400', status: 'Bad request', title: 'Garbled transmission', body: 'That request came through scrambled. Check the address and send it again.', primary: HOME },
    '401': { code: '401', status: 'Unauthorized', title: 'Clearance required', body: 'This part of the workshop asks for credentials, and none came through.', primary: HOME },
    '403': { code: '403', status: 'Forbidden', title: 'Restricted sector', body: 'You do not have clearance to enter. The doors stay sealed.', primary: HOME },
    '404': { code: '404', status: 'Page not found', title: 'Lost in the void', body: 'There is nothing at this address. The page may have moved, or the link may be off by a few light-years.', primary: HOME },
    '408': { code: '408', status: 'Request timeout', title: 'Signal timed out', body: 'The transmission took too long and drifted off. Send it again.', primary: HOME },
    '410': { code: '410', status: 'Gone', title: 'Gone from the map', body: 'This page was here once. It has since left the system for good.', primary: HOME },
    '429': { code: '429', status: 'Too many requests', title: 'Comms array overloaded', body: 'Too many transmissions at once. Give it a moment, then try again.', primary: HOME },
    '500': { code: '500', status: 'Server error', title: 'Fault in the engine room', body: 'Something broke on our end. The workshop is on it.', primary: HOME },
    '502': { code: '502', status: 'Bad gateway', title: 'Relay misfire', body: 'A relay along the route sent back nonsense. Try again shortly.', primary: HOME },
    '503': { code: '503', status: 'Service unavailable', title: 'Docking bay closed', body: 'The workshop is down for repairs or overloaded. Check back soon.', primary: HOME },
    '504': { code: '504', status: 'Gateway timeout', title: 'Relay went dark', body: 'A relay along the route never answered. Try again in a moment.', primary: HOME },
    'offline': { code: '', status: 'No signal', title: 'You are drifting offline', body: 'The connection dropped. The galaxy will be here when you are back in range.', primary: HOME },
    'load-failed': { code: '', status: 'Load failed', title: 'The galaxy would not load', body: 'Part of the scene failed to arrive. A refresh usually brings it back.', primary: HOME },
    'coming-soon': { code: '', status: 'Coming soon', title: 'Still under construction', body: 'This part of the workshop is not open yet. Check back soon.', primary: HOME },
    'generic': { code: '', status: 'Error', title: 'Something went wrong', body: 'An unexpected fault. Head back to known space.', primary: HOME }
  };


  var reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(reduce && reduce.matches); }

  // ── Starfield: perpetual forward flight. Same sky as the galaxy (index.html buildStars): most stars dim, a few bright (random^1.7),
  //    now with a size spread too. Stars sit at depth z and fly toward the viewer; projected size and brightness grow as they near. ──
  function starfield(box) {
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.setAttribute('aria-hidden', 'true');
    box.appendChild(cv);
    var N = 720, stars = [], W = 0, H = 0, P = 2, LEVELS = 24,   // P / LEVELS: the scene's pixelize and posterize (params.pixel, params.levels in index.html)
       ink = '#fff', tint = '#fff', raf = 0, last = 0, SPEED = 0.035;   // SPEED: depth units per second, a full pass takes ~28s
    function seed(st, near) {
      st.x = (Math.random() * 2 - 1) * 1.8; st.y = (Math.random() * 2 - 1) * 1.8;
      st.z = near ? 0.05 + Math.random() * 0.95 : 1;
      st.b = 0.22 + 0.78 * Math.pow(Math.random(), 1.7);          // base brightness, as in the galaxy
      st.s = 0.5 + 2.2 * Math.pow(Math.random(), 3);              // base radius px: mostly pin-pricks, a few large
      st.t = Math.random() < 0.12;                                // a few warm stars (brand token)
    }
    for (var i = 0; i < N; i++) { var st = {}; seed(st, true); stars.push(st); }
    function colors() { var cs = getComputedStyle(box); ink = cs.getPropertyValue('--bric-content-primary').trim() || ink; tint = cs.getPropertyValue('--bric-content-brand').trim() || tint; }
    function size() { W = Math.ceil(box.clientWidth / P); H = Math.ceil(box.clientHeight / P); cv.width = W; cv.height = H; cv.style.width = '100%'; cv.style.height = '100%'; colors(); }   // low-res backing store, scaled up with image-rendering: pixelated
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.55;
      for (var i = 0; i < N; i++) {
        var st = stars[i]; st.z -= SPEED * dt;
        if (st.z < 0.04) seed(st, false);
        var px = Math.round(cx + st.x / st.z * f * 0.5), py = Math.round(cy + st.y / st.z * f * 0.5);
        if (px < -4 || px > W + 4 || py < -4 || py > H + 4) { if (st.z < 0.3) seed(st, false); continue; }
        var near = 1 - st.z;
        ctx.globalAlpha = Math.round(Math.min(1, st.b * 1.5 * (0.6 + 0.8 * near)) * (LEVELS - 1)) / (LEVELS - 1);   // posterized brightness
        ctx.fillStyle = st.t ? tint : ink;
        var r = Math.max(1, Math.round(st.s * (0.35 + 1.3 * near) / P * 2));   // whole pixels: a square 'pixel star', 1px minimum
        ctx.fillRect(px - (r >> 1), py - (r >> 1), r, r);
      }
    }
    function tick(t) { raf = requestAnimationFrame(tick); var dt = Math.min(0.1, (t - last) / 1000 || 0); last = t; draw(dt); }
    function start() { cancelAnimationFrame(raf); if (reduced()) { draw(0); return; } last = performance.now(); raf = requestAnimationFrame(tick); }
    var onResize = function () { size(); if (reduced()) draw(0); };
    size(); window.addEventListener('resize', onResize); start();
    var onMq = function () { start(); }; if (reduce && reduce.addEventListener) reduce.addEventListener('change', onMq);
    return function stop() { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); if (reduce && reduce.removeEventListener) reduce.removeEventListener('change', onMq); };
  }

  // ── Aurebesh decode on hover: same behaviour as the site's GFX (index.html): each glyph scrambles, then settles left to right with scatter. ──
  var FALLBACK = '⌖⍜⌿⍾⍍⍐⍙⊑⋔⋏☍⌰⟒⏃⏚⎅⟊⟟▞▚◢◣', LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', aurOK = false;
  if (document.fonts && document.fonts.load) {
    document.fonts.load("700 20px 'Aurebesh'").then(function () {
      try { var c = document.createElement('canvas').getContext('2d'); c.font = '40px monospace'; var w = c.measureText('MWAEIO').width; c.font = "40px 'Aurebesh', monospace"; aurOK = Math.abs(c.measureText('MWAEIO').width - w) > 0.5; } catch (e) {}
    }, function () {});
  }
  function pick(str) { return str.charAt(Math.floor(Math.random() * str.length)); }
  function decode(node) {
    if (reduced() || node.__dec) return;
    var target = node.getAttribute('data-text') || node.textContent, chars = Array.from(target), n = chars.length;
    var DUR = 450, TICK = 35, SCATTER = 0.3, settle = [], span = Math.max(0, DUR - TICK);
    chars.forEach(function (c, i) { settle[i] = ((n > 1 ? i / (n - 1) : 0) * (1 - SCATTER) + Math.random() * SCATTER) * span; });
    node.setAttribute('data-text', target);
    node.style.height = node.offsetHeight + 'px'; node.style.overflow = 'hidden';   // glyph metrics can never resize the box
    var t0 = performance.now(), lastT = -TICK; node.__dec = true; node.classList.add('is-decoding');
    (function step() {
      var el = performance.now() - t0, html = '';
      if (el >= DUR) { node.textContent = target; node.style.height = ''; node.style.overflow = ''; node.__dec = false; node.classList.remove('is-decoding'); return; }
      if (el - lastT >= TICK) {
        lastT = el;
        for (var i = 0; i < n; i++) html += el >= settle[i] ? chars[i] : '<span class="bric-error__glyph">' + (aurOK ? (Math.random() < 0.3 ? pick(LETTERS) : chars[i]) : pick(FALLBACK + LETTERS)) + '</span>';
        node.innerHTML = html;
      }
      requestAnimationFrame(step);
    })();
  }

  var host = null, prevFocus = null, prevTitle = null, robots = null, keyHandler = null, stopStars = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function actionNode(a, kind, navigate) {
    var isLink = !!a.href;
    var n = el(isLink ? 'a' : 'button', 'bric-btn bric-btn--' + kind, a.label);
    if (isLink) {
      n.href = a.href;
      if (navigate) n.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault(); navigate(a.href);
      });
    } else {
      n.type = 'button';
      n.addEventListener('click', function () {
        if (typeof a.action === 'function') a.action();
        else if (a.action === 'back') history.back();
        else location.reload();
      });
    }
    return n;
  }

  function hide() {
    if (!host) return;
    document.removeEventListener('keydown', keyHandler, true);
    if (stopStars) { stopStars(); stopStars = null; }
    host.remove(); host = null;
    if (prevTitle != null) document.title = prevTitle;
    if (robots) { robots.remove(); robots = null; }
    if (prevFocus && prevFocus.focus && document.contains(prevFocus)) { try { prevFocus.focus({ preventScroll: true }); } catch (e) {} }
    prevFocus = null;
  }

  function show(key, opts) {
    opts = opts || {};
    var base = ERRORS[key] || ERRORS.generic;
    var c = {};
    Object.keys(base).forEach(function (k) { c[k] = base[k]; });
    Object.keys(opts).forEach(function (k) { if (k in c || k === 'path') c[k] = opts[k]; });
    if (host) hide();

    prevFocus = document.activeElement;
    prevTitle = document.title;
    document.title = (c.code ? c.code + ' · ' : '') + c.title + ' — Jason Hsin';
    robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex'; document.head.appendChild(robots);

    host = el('div', 'bric-error');
    host.id = 'bricError';
    host.setAttribute('data-mode', opts.mode === 'page' ? 'page' : 'overlay');
    host.setAttribute('data-error', key);
    host.setAttribute('role', 'region');
    host.setAttribute('aria-labelledby', 'bricErrorTitle');
    var sky = el('div', 'bric-error__stars'); host.appendChild(sky);

    var card = el('div', 'bric-error__card');
    ['tl', 'tr', 'bl', 'br'].forEach(function (p) { var m = el('span', 'bric-error__mark bric-error__mark--' + p); m.setAttribute('aria-hidden', 'true'); card.appendChild(m); });
    card.appendChild(el('p', 'bric-error__eyebrow', (c.code ? 'Error ' + c.code + ' · ' : '') + c.status));
    if (c.code) { var code = el('p', 'bric-error__code', c.code); code.setAttribute('aria-hidden', 'true'); code.setAttribute('data-text', c.code); code.addEventListener('mouseenter', function () { decode(code); }); card.appendChild(code); }
    var h1 = el('h1', 'bric-error__title', c.title);
    h1.id = 'bricErrorTitle'; h1.tabIndex = -1;
    card.appendChild(h1);
    card.appendChild(el('p', 'bric-error__body', c.body));
    if (c.path) { var p = el('p', 'bric-error__path', 'Requested '); p.appendChild(el('code', null, c.path)); card.appendChild(p); }
    var actions = el('div', 'bric-error__actions');
    if (c.primary) actions.appendChild(actionNode(c.primary, 'primary', opts.navigate));
    if (actions.childNodes.length) card.appendChild(actions);
    host.appendChild(card);
    document.body.appendChild(host);
    stopStars = starfield(sky);

    // keep Tab inside the error card while it covers a live page
    keyHandler = function (e) {
      if (e.key !== 'Tab' || !host) return;
      var f = host.querySelectorAll('a[href],button:not([disabled])');
      if (!f.length) { e.preventDefault(); h1.focus(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (!host.contains(a)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (a === first || a === h1)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyHandler, true);
    h1.focus({ preventScroll: true });
    return host;
  }

  root.BRICError = { errors: ERRORS, show: show, hide: hide, isOpen: function () { return !!host; } };
})(window);
