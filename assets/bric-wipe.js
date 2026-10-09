/*! BRIC screen wipe, v1.0
 *
 * The Star Wars page transition, split across two sites. ONE source file, loaded by the Vercel site
 * (<script src="assets/bric-wipe.js">) and by the Framer case-study pages (Custom Code, end of <body>).
 *
 *   bricWipe.go(url)            exit: wipe a solid panel over this page, then navigate to url?wipe=<variant>
 *   (automatic on load)         entry: if the URL carries ?wipe=<variant>, the page starts covered, then the SAME
 *                               wipe keeps travelling and uncovers it. The param is stripped after.
 *   bricWipe.intercept(hosts)   wipe on ordinary link clicks that leave this site for one of hosts (used on Framer for the way back)
 *   bricWipe.play([variant])    preview in place: cover then uncover, no navigation
 *   bricWipe.variants           list of ids
 *
 * Variants (all feathered): lr rl tb bt, diag-tl diag-tr diag-bl diag-br, clock, iris-in iris-out, oval-in oval-out.
 * One is picked at random on exit (never the same twice in a row), and its id rides along in the URL so the
 * entry half plays the matching shape and direction. The two sites never share memory, the URL is the handoff.
 *
 * How it draws: one fixed full-viewport panel in a flat colour, revealed through a CSS mask whose gradient is
 * driven by a single registered number --p (0 to 1) animated with the Web Animations API. The feathered edge is
 * the gradient's soft stop. Cover and uncover use the same gradient with the opaque/clear ends swapped, so the
 * edge never reverses.
 *
 * Options (all optional): bricWipe.config({ color, feather, outMs, inMs, easing, param })
 *   color    panel colour. Default: the page's --bric-surface-scene token, else #070C0C. Both sites must pass the same value.
 *   feather  soft-edge width as a fraction of the viewport's long side. Default 0.28.
 *
 * prefers-reduced-motion: no wipe, plain navigation, no entry panel.
 */
(function () {
  'use strict';
  if (window.bricWipe) return;

  var cfg = { color: null, feather: 0.28, outMs: 1100, inMs: 1200, easing: 'cubic-bezier(.45,0,.55,1)', param: 'wipe' };
  var LIN = { lr: 'to right', rl: 'to left', tb: 'to bottom', bt: 'to top',
              'diag-tl': 'to bottom right', 'diag-tr': 'to bottom left', 'diag-bl': 'to top right', 'diag-br': 'to top left' };
  var VARIANTS = Object.keys(LIN).concat(['clock', 'iris-in', 'iris-out', 'oval-in', 'oval-out']);
  var Z = 2147483646;   // one under the reticle's top layer would hide the cursor; the reticle sits at 2147483000 so this covers it, fine for a 1s moment

  var el = null, anim = null, registered = false;

  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function color() {
    if (cfg.color) return cfg.color;
    try { var v = getComputedStyle(document.documentElement).getPropertyValue('--bric-surface-scene').trim(); if (v) return v; } catch (e) {}
    return '#070C0C';
  }
  function supported() {
    try { return !!(window.CSS && CSS.supports && (CSS.supports('mask-image', 'linear-gradient(#000,#000)') || CSS.supports('-webkit-mask-image', 'linear-gradient(#000,#000)')) && Element.prototype.animate); }
    catch (e) { return false; }
  }
  function register() {
    if (registered) return; registered = true;
    try { CSS.registerProperty({ name: '--p', syntax: '<number>', inherits: false, initialValue: '0' }); } catch (e) { /* already registered */ }
  }

  // mask for a variant. --a is the opaque end (panel visible), --b the clear end; swapped for uncover.
  function maskFor(v) {
    var P = 'var(--p)', Q = '(1 - var(--p))', F = 'var(--f)';
    function edge(t) { return 'var(--a) calc(' + t + ' * (100% + ' + F + ') - ' + F + '), var(--b) calc(' + t + ' * (100% + ' + F + '))'; }
    if (LIN[v]) return 'linear-gradient(' + LIN[v] + ', ' + edge(P) + ')';
    if (v === 'clock') return 'conic-gradient(from 0deg at 50% 50%, var(--a) calc(' + P + ' * (360deg + var(--fd)) - var(--fd)), var(--b) calc(' + P + ' * (360deg + var(--fd))))';
    var shape = (v.indexOf('oval') === 0 ? 'ellipse' : 'circle') + ' farthest-corner at 50% 50%';
    if (v === 'iris-out' || v === 'oval-out') return 'radial-gradient(' + shape + ', ' + edge(P) + ')';
    // iris-in / oval-in: the clear hole shrinks toward the centre, so the ends swap order
    return 'radial-gradient(' + shape + ', var(--b) calc(' + Q + ' * (100% + ' + F + ') - ' + F + '), var(--a) calc(' + Q + ' * (100% + ' + F + ')))';
  }

  function build(variant, uncover) {
    register();
    if (!el) {
      el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;inset:0;z-index:' + Z + ';pointer-events:auto;display:none;' +
        'mask-size:100% 100%;-webkit-mask-size:100% 100%;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;will-change:mask-image';
      (document.body || document.documentElement).appendChild(el);
    }
    var long = Math.max(window.innerWidth, window.innerHeight);
    el.style.background = color();
    el.style.setProperty('--f', Math.round(long * cfg.feather) + 'px');
    el.style.setProperty('--fd', '48deg');
    el.style.setProperty('--a', uncover ? 'transparent' : '#000');
    el.style.setProperty('--b', uncover ? '#000' : 'transparent');
    var m = maskFor(variant);
    el.style.webkitMaskImage = m; el.style.maskImage = m;
    el.style.setProperty('--p', 0);
    el.style.display = 'block';
  }

  function run(ms, done) {
    if (anim) { try { anim.cancel(); } catch (e) {} }
    anim = el.animate([{ '--p': 0 }, { '--p': 1 }], { duration: ms, easing: cfg.easing, fill: 'forwards' });
    var fin = false;
    function end() { if (fin) return; fin = true; el.style.setProperty('--p', 1); done && done(); }
    anim.onfinish = end;
    setTimeout(end, ms + 400);   // failsafe if the finish event never fires (background tab)
  }

  function hide() { if (el) el.style.display = 'none'; var h = document.getElementById('bric-wipe-hold'); if (h) h.remove(); }

  function pick(forced) {
    if (forced && VARIANTS.indexOf(forced) > -1) return forced;
    var last = null; try { last = sessionStorage.getItem('bric-wipe-last'); } catch (e) {}
    var pool = VARIANTS.filter(function (v) { return v !== last; });
    var v = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem('bric-wipe-last', v); } catch (e) {}
    return v;
  }

  function withParam(url, v) {
    try { var u = new URL(url, location.href); u.searchParams.set(cfg.param, v); return u.toString(); }
    catch (e) { return url; }
  }

  var bricWipe = {
    variants: VARIANTS.slice(),
    config: function (o) { for (var k in o) if (o[k] != null) cfg[k] = o[k]; return bricWipe; },
    go: function (url, variant) {
      if (reduced() || !supported()) { location.href = url; return; }
      var v = pick(variant);
      build(v, false);
      run(cfg.outMs, function () { location.href = withParam(url, v); });
    },
    play: function (variant) {
      if (!supported()) return;
      var v = pick(variant);
      build(v, false);
      run(cfg.outMs, function () { build(v, true); el.style.setProperty('--p', 0); run(cfg.inMs, hide); });
      return v;
    },
    enter: function () {
      var v = null;
      try { v = new URL(location.href).searchParams.get(cfg.param); } catch (e) {}
      if (!v || VARIANTS.indexOf(v) < 0) return;
      try { var u = new URL(location.href); u.searchParams.delete(cfg.param); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) {}
      if (reduced() || !supported()) { hide(); return; }
      build(v, true);   // p = 0 in uncover mode is fully covered, so this lands exactly where the exit half ended
      var started = false;
      function start() { if (started) return; started = true; setTimeout(function () { run(cfg.inMs, hide); }, 120); }
      if (document.readyState === 'complete') start();
      else { window.addEventListener('load', start); setTimeout(start, 2500); }   // never hold a visitor on a blank panel
    }
  };

  // Wipe on plain same-tab link clicks to the given hosts, e.g. bricWipe.intercept(['www.mundanework.shop']) on Framer
  // so any "back to work" link wipes without being rebuilt as a button. Modified clicks and target=_blank are left alone.
  bricWipe.intercept = function (hosts) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.host === location.host || hosts.indexOf(u.host) < 0 || !/^https?:$/.test(u.protocol)) return;
      e.preventDefault(); bricWipe.go(u.href);
    }, true);
    return bricWipe;
  };

  // coming back with the browser's back button can restore this page mid-wipe from the bfcache
  window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });

  window.bricWipe = bricWipe;
  if (document.body) bricWipe.enter(); else document.addEventListener('DOMContentLoaded', bricWipe.enter);
})();
