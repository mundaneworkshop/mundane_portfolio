/*! BRIC targeting reticle cursor, v1.4
 *
 * ONE source file, used by both the Vercel site (<script src="assets/bric-reticle.js">) and Framer
 * (framer-code/sync-reticle.js in the bric-ds folder pastes this file verbatim into the ReticleCursor.tsx code component).
 * Edit it here only. No imports, no globals other than the bricReticle function.
 *
 * Motion is lifted from the Delight Lab "Targeting reticle" tray (case-study-explorations/02-delight-lab.html):
 * 44px bracket box that rides the pointer, locks onto the media frame 6px outside it, 12px arms, 2px amber,
 * every move eased with 250ms cubic-bezier(.34,1.56,.64,1) (the "float" curve, slight overshoot), label fades in on lock.
 * Difference from the lab: the four corners are positioned with transform (compositor only) instead of
 * left/top/width/height, which gives the same motion without layout work.
 *
 * Desktop mouse only. Touch, pen and keyboard are untouched. Honours prefers-reduced-motion (no easing, still shows).
 *
 *   bricReticle({ scope: 'page' })   // returns { destroy(), refresh() }
 *
 * scope 'page' (the site default): the brackets ride the pointer everywhere. They step aside, and the native cursor
 * comes back, over anything that declares its own cursor (links, buttons, text fields, drag handles, a canvas that
 * switches to 'pointer' on hover). crosshair, default, auto and none count as "no cursor of its own".
 * scope 'media': only over elements matching `selector`.
 *
 * Targets it locks onto, in order of precedence:
 *   1. DOM: any element matching `selector` (default [data-bric-media], [data-bric-target]). Optional data-bric-group
 *      ("n OF N" is counted within the group), data-bric-label (e.g. "▸ READ · {n} OF {N}") and
 *      data-bric-label-at="below" to put the label under the frame instead of above it. An empty data-bric-label
 *      shows no label. Per-element geometry comes from CSS custom properties on the element (plain numbers in px):
 *      --bric-ret-arm, --bric-ret-weight, --bric-ret-outset (negative = inside the element, e.g. onto a hero's corner
 *      marks), --bric-ret-glow (1 = amber glow), --bric-ret-label: none (no label). Missing ones fall back to the options below.
 *   2. Virtual: things that are not DOM (a WebGL planet). Pass `targets: function (x, y, el) {}` returning
 *      { key, rect: function () { return { left, top, right, bottom }; }, label?, n?, N?, labelAt?, arm?, weight?, outset?, glow? } or null. `rect` is read every
 *      frame, so the brackets follow a moving object. api.setTargets(fn) swaps the resolver after start.
 *
 * The page keeps its own click handling (open the lightbox, etc.). While the reticle is up the native cursor
 * is hidden and <html data-bric-ret="hot"> is set; <html data-bric-reticle> is set for as long as the module runs,
 * so a component can drop its own static hover reticle.
 */
function bricReticle(options) {
  var o = {
    selector: '[data-bric-media],[data-bric-target]', // elements the reticle locks onto
    labelAttr: 'data-bric-label', // per-element label template, {n} and {N} are replaced
    targets: null, // virtual target resolver, see above
    groupAttr: 'data-bric-group', // media sharing this attribute value are counted as "n OF N", in document order
    scope: 'media', // 'media': only over matching elements. 'page': also rides the pointer everywhere (see above)
    ignore: 'a,button,input,textarea,select,summary,label,[role=button],[contenteditable=true]', // page scope: always native cursor
    plainCursors: ['auto', 'default', 'crosshair', 'none'], // page scope: authored cursors the reticle replaces
    color: '#E9A73E',
    arm: 12,
    weight: 2,
    outset: 6, // gap between the media frame and the brackets
    glow: 'drop-shadow(0 0 6px rgba(255,225,150,.7)) drop-shadow(0 0 16px rgba(233,167,62,.5))', // filter used when a target asks for --bric-ret-glow:1
    armMax: 32, // longest arm / thickest weight any target may ask for (the corner pieces are drawn at this size and scaled)
    weightMax: 4,
    idle: 44, // bracket box size while riding the pointer
    duration: 250,
    ease: 'cubic-bezier(.34,1.56,.64,1)',
    fade: 150,
    labelOffset: 20,
    label: function (n, N) { return '▸ OPEN · ' + n + ' OF ' + N; },
    font: "500 11px/16px 'Space Grotesk',system-ui,sans-serif",
    tracking: '.12em',
    zIndex: 9998,
    hideOn: ['bric:lightbox'] // window events that drop the reticle (modal opened)
  };
  var k;
  for (k in options || {}) if (options[k] !== undefined) o[k] = options[k];

  var noop = { destroy: function () {}, refresh: function () {}, setTargets: function () {} };
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.matchMedia) return noop;
  if (window.__bricReticle) window.__bricReticle.destroy();

  var html = document.documentElement;
  var css =
    '.bric-ret{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:' + o.zIndex + ';opacity:0;transition:opacity ' + o.fade + 'ms linear}' +
    '.bric-ret.on{opacity:1}' +
    '.bric-ret i{position:absolute;left:0;top:0;width:' + o.armMax + 'px;height:' + o.armMax + 'px;will-change:transform;transition:transform ' + o.duration + 'ms ' + o.ease + ',filter ' + o.duration + 'ms linear}' +
    '.bric-ret i::before,.bric-ret i::after{content:"";position:absolute;background:' + o.color + ';will-change:transform;transition:transform ' + o.duration + 'ms ' + o.ease + '}' +
    '.bric-ret i::before{width:' + o.armMax + 'px;height:' + o.weightMax + 'px;transform:scale(var(--ra),var(--rw))}' +
    '.bric-ret i::after{width:' + o.weightMax + 'px;height:' + o.armMax + 'px;transform:scale(var(--rw),var(--ra))}' +
    '.bric-ret .tl::before,.bric-ret .tl::after{left:0;top:0;transform-origin:0 0}' +
    '.bric-ret .tr::before,.bric-ret .tr::after{right:0;top:0;transform-origin:100% 0}' +
    '.bric-ret .bl::before,.bric-ret .bl::after{left:0;bottom:0;transform-origin:0 100%}' +
    '.bric-ret .br::before,.bric-ret .br::after{right:0;bottom:0;transform-origin:100% 100%}' +
    '.bric-ret.glow i{filter:' + o.glow + '}' +
    '.bric-ret b{position:absolute;left:0;top:0;font:' + o.font + ';letter-spacing:' + o.tracking + ';text-transform:uppercase;color:' + o.color + ';white-space:nowrap;opacity:0;will-change:transform;transition:transform ' + o.duration + 'ms ' + o.ease + ',opacity 200ms linear}' +
    '.bric-ret.lock b{opacity:1}' +
    '.bric-ret.snap i,.bric-ret.snap i::before,.bric-ret.snap i::after,.bric-ret.snap b,.bric-ret.rm i,.bric-ret.rm i::before,.bric-ret.rm i::after,.bric-ret.rm b,.bric-ret.rm{transition:none}' +
    'html[data-bric-ret="hot"],html[data-bric-ret="hot"] *{cursor:none!important}';
  var style = document.createElement('style');
  style.setAttribute('data-bric-ret', '');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.className = 'bric-ret';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i><b></b>';
  document.body.appendChild(root);
  var tl = root.children[0], tr = root.children[1], bl = root.children[2], br = root.children[3], lab = root.children[4];
  html.setAttribute('data-bric-reticle', '');

  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion() { root.classList.toggle('rm', rmq.matches); }
  syncMotion();

  var cur = null, lx = -999, ly = -999, scrollTimer = 0, raf = 0, syncRaf = 0, lastCheck = 0, lastFrame = '', below = false, geoKey = '';

  function put(el, x, y) { el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }
  function place(b) {
    var key = b.l + '|' + b.t + '|' + b.r + '|' + b.b + '|' + below;
    if (key === lastFrame) return;
    lastFrame = key;
    put(tl, b.l, b.t);
    put(tr, b.r - o.armMax, b.t);
    put(bl, b.l, b.b - o.armMax);
    put(br, b.r - o.armMax, b.b - o.armMax);
    put(lab, b.l, below ? b.b + 4 : b.t - o.labelOffset);
  }
  function around(x, y) { var h = o.idle / 2; return { l: x - h, t: y - h, r: x + h, b: y + h }; }
  function idleGeo() { applyGeo({ arm: o.arm, weight: o.weight, glow: false }); }
  function cssNum(cs, name) { var v = parseFloat(cs.getPropertyValue(name)); return isNaN(v) ? null : v; }
  // arm / weight / outset / glow of a target: its --bric-ret-* custom properties, else the options
  function geoOf(c) {
    var g, cs;
    if (c.virt) g = { arm: c.virt.arm, weight: c.virt.weight, outset: c.virt.outset, glow: c.virt.glow };
    else {
      cs = window.getComputedStyle(c.el);
      g = { arm: cssNum(cs, '--bric-ret-arm'), weight: cssNum(cs, '--bric-ret-weight'), outset: cssNum(cs, '--bric-ret-outset'), glow: cssNum(cs, '--bric-ret-glow') };
    }
    return {
      arm: g.arm != null ? g.arm : o.arm,
      weight: g.weight != null ? g.weight : o.weight,
      outset: g.outset != null ? g.outset : o.outset,
      glow: !!g.glow
    };
  }
  function applyGeo(g) {
    var key = g.arm + '|' + g.weight + '|' + g.glow;
    if (key === geoKey) return;
    geoKey = key;
    root.style.setProperty('--ra', Math.min(1, g.arm / o.armMax));
    root.style.setProperty('--rw', Math.min(1, g.weight / o.weightMax));
    root.classList.toggle('glow', g.glow);
  }
  function frameOf(c) {
    var r = c.el ? c.el.getBoundingClientRect() : c.virt.rect();
    if (!r) return null;
    var d = c.g ? c.g.outset : o.outset;
    return { l: r.left - d, t: r.top - d, r: r.right + d, b: r.bottom + d };
  }
  // jump without easing (first appearance at the pointer, scroll tracking)
  function jump(b) {
    root.classList.add('snap');
    place(b);
    void root.offsetWidth;
    root.classList.remove('snap');
  }
  function count(el) {
    var g = el.getAttribute(o.groupAttr), all = document.querySelectorAll(o.selector), n = 0, N = 0, i;
    for (i = 0; i < all.length; i++) {
      if (all[i].getAttribute(o.groupAttr) === g) { N++; if (all[i] === el) n = N; }
    }
    return [n || 1, N || 1];
  }
  function labelOf(c) {
    if (c.virt) return c.virt.label != null ? c.virt.label : o.label(c.virt.n || 1, c.virt.N || 1);
    if (window.getComputedStyle(c.el).getPropertyValue('--bric-ret-label').trim() === 'none') return '';
    var tpl = c.el.getAttribute(o.labelAttr), n = count(c.el);
    return tpl !== null ? tpl.replace('{n}', n[0]).replace('{N}', n[1]) : o.label(n[0], n[1]);
  }
  // what is the pointer over that the reticle should lock onto?
  function describe(t) {
    var el = t && t.closest ? t.closest(o.selector) : null;
    if (el) return { key: el, el: el };
    var v = o.targets ? o.targets(lx, ly, t) : null;
    return v ? { key: v.key, virt: v } : null;
  }

  function show() {
    if (!root.classList.contains('on')) { idleGeo(); jump(around(lx, ly)); root.classList.add('on'); }
  }
  function stopTick() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
  function hide() {
    stopTick();
    root.classList.remove('lock');
    root.classList.remove('on');
    html.removeAttribute('data-bric-ret');
    cur = null;
  }
  // follow the locked target every frame (it may move: scroll, a rotating planet, a projected beacon) and let go when the
  // pointer is no longer over it
  function tick(now) {
    raf = 0;
    if (!cur) return;
    var b = frameOf(cur), t;
    if (b) place(b);
    if (!b || now - lastCheck > 90) {
      lastCheck = now;
      t = document.elementFromPoint(lx, ly);
      var d = describe(t);
      if (!b || !d || d.key !== cur.key) { update(t); if (!cur) return; }
    }
    if (!raf) raf = window.requestAnimationFrame(tick);
  }
  function enter(d) {
    var b = frameOf(d);
    if (!b) return;
    cur = d;
    d.g = geoOf(d);
    below = d.virt ? d.virt.labelAt === 'below' : d.el.getAttribute('data-bric-label-at') === 'below';
    lab.textContent = labelOf(d);
    show();
    applyGeo(d.g); // after show(): a first appearance starts from the idle geometry, then grows to the target's
    root.classList.add('lock');
    html.setAttribute('data-bric-ret', 'hot');
    place(b); // expands from the pointer box (or flies from the previous frame) to this frame
    if (!raf) raf = window.requestAnimationFrame(tick);
  }
  function leave() {
    var wasOn = root.classList.contains('on');
    stopTick();
    cur = null;
    root.classList.remove('lock');
    idleGeo();
    if (o.scope === 'page' && wasOn) { place(around(lx, ly)); return; }
    if (wasOn) place(around(lx, ly)); // contracts to the pointer while it fades
    root.classList.remove('on');
    html.removeAttribute('data-bric-ret');
  }
  // The cursor the page itself would show over `target`, read with our own hiding rule switched off. The answer is
  // cached per element until something that can change it does (the element's class or inline cursor, body classes).
  var probeEl = null, probeKey = '', probeVal = false;
  function interactive(target) {
    if (!target || target.nodeType !== 1) return false;
    var key = (target.getAttribute('class') || '') + '|' + (target.style && target.style.cursor) + '|' + document.body.className;
    if (target === probeEl && key === probeKey) return probeVal;
    var had = html.getAttribute('data-bric-ret'), c;
    if (had) html.removeAttribute('data-bric-ret');
    c = window.getComputedStyle(target).cursor;
    if (had) html.setAttribute('data-bric-ret', had);
    probeEl = target;
    probeKey = key;
    probeVal = !!target.closest(o.ignore) || o.plainCursors.indexOf(c) < 0;
    return probeVal;
  }
  function follow(target) {
    if (interactive(target)) { hide(); return; }
    show();
    html.setAttribute('data-bric-ret', 'hot');
    idleGeo();
    place(around(lx, ly));
  }

  function update(target) {
    var d = describe(target);
    if (d) { if (!cur || d.key !== cur.key) enter(d); }
    else if (cur) leave();
    else if (o.scope === 'page') follow(target);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    lx = e.clientX; ly = e.clientY;
    update(e.target);
    // a virtual target's own hover state (a WebGL raycast) is usually updated by the page's listener after this one
    if (o.targets && !syncRaf) syncRaf = window.requestAnimationFrame(function () { syncRaf = 0; update(document.elementFromPoint(lx, ly)); });
  }
  function onOut(e) { if (!e.relatedTarget) { if (cur || root.classList.contains('on')) { leave(); hide(); } } }
  function onScroll() {
    probeEl = null;
    if (cur) { cur.g = geoOf(cur); applyGeo(cur.g); }
    if (!cur && o.scope !== 'page') return;
    root.classList.add('snap');
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(function () {
      root.classList.remove('snap');
      update(document.elementFromPoint(lx, ly));
    }, 120);
  }
  function drop() { if (root.classList.contains('on')) { leave(); hide(); } }

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('blur', drop);
  if (rmq.addEventListener) rmq.addEventListener('change', syncMotion);
  for (k = 0; k < o.hideOn.length; k++) window.addEventListener(o.hideOn[k], drop);

  var api = {
    refresh: function () { if (cur) { cur.g = geoOf(cur); applyGeo(cur.g); var b = frameOf(cur); if (b) jump(b); } },
    setTargets: function (fn) { o.targets = fn; },
    destroy: function () {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('blur', drop);
      if (rmq.removeEventListener) rmq.removeEventListener('change', syncMotion);
      for (var j = 0; j < o.hideOn.length; j++) window.removeEventListener(o.hideOn[j], drop);
      window.clearTimeout(scrollTimer);
      stopTick();
      if (syncRaf) window.cancelAnimationFrame(syncRaf);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (style.parentNode) style.parentNode.removeChild(style);
      html.removeAttribute('data-bric-ret');
      html.removeAttribute('data-bric-reticle');
      if (window.__bricReticle === api) window.__bricReticle = null;
    }
  };
  window.__bricReticle = api;
  return api;
}
