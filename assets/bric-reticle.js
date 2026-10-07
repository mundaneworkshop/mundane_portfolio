/*! BRIC targeting reticle cursor, v1.1
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
 * The page keeps its own click handling (open the lightbox, etc.). While the reticle is up the native cursor
 * is hidden and <html data-bric-ret="hot"> is set; <html data-bric-reticle> is set for as long as the module runs,
 * so a component can drop its own static hover reticle.
 */
function bricReticle(options) {
  var o = {
    selector: '[data-bric-media]', // elements the reticle locks onto
    groupAttr: 'data-bric-group', // media sharing this attribute value are counted as "n OF N", in document order
    scope: 'media', // 'media': only over matching elements. 'page': also rides the pointer everywhere (see above)
    ignore: 'a,button,input,textarea,select,summary,label,[role=button],[contenteditable=true]', // page scope: always native cursor
    plainCursors: ['auto', 'default', 'crosshair', 'none'], // page scope: authored cursors the reticle replaces
    color: '#E9A73E',
    arm: 12,
    weight: 2,
    outset: 6, // gap between the media frame and the brackets
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

  var noop = { destroy: function () {}, refresh: function () {} };
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.matchMedia) return noop;
  if (window.__bricReticle) window.__bricReticle.destroy();

  var html = document.documentElement;
  var css =
    '.bric-ret{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:' + o.zIndex + ';opacity:0;transition:opacity ' + o.fade + 'ms linear}' +
    '.bric-ret.on{opacity:1}' +
    '.bric-ret i{position:absolute;left:0;top:0;width:' + o.arm + 'px;height:' + o.arm + 'px;box-sizing:border-box;border:0 solid ' + o.color + ';will-change:transform;transition:transform ' + o.duration + 'ms ' + o.ease + '}' +
    '.bric-ret .tl{border-top-width:' + o.weight + 'px;border-left-width:' + o.weight + 'px}' +
    '.bric-ret .tr{border-top-width:' + o.weight + 'px;border-right-width:' + o.weight + 'px}' +
    '.bric-ret .bl{border-bottom-width:' + o.weight + 'px;border-left-width:' + o.weight + 'px}' +
    '.bric-ret .br{border-bottom-width:' + o.weight + 'px;border-right-width:' + o.weight + 'px}' +
    '.bric-ret b{position:absolute;left:0;top:0;font:' + o.font + ';letter-spacing:' + o.tracking + ';text-transform:uppercase;color:' + o.color + ';white-space:nowrap;opacity:0;will-change:transform;transition:transform ' + o.duration + 'ms ' + o.ease + ',opacity 200ms linear}' +
    '.bric-ret.lock b{opacity:1}' +
    '.bric-ret.snap i,.bric-ret.snap b,.bric-ret.rm i,.bric-ret.rm b,.bric-ret.rm{transition:none}' +
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

  var cur = null, lx = -999, ly = -999, scrollTimer = 0, raf = 0;

  function put(el, x, y) { el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }
  function place(b) {
    put(tl, b.l, b.t);
    put(tr, b.r - o.arm, b.t);
    put(bl, b.l, b.b - o.arm);
    put(br, b.r - o.arm, b.b - o.arm);
    put(lab, b.l, b.t - o.labelOffset);
  }
  function around(x, y) { var h = o.idle / 2; return { l: x - h, t: y - h, r: x + h, b: y + h }; }
  function frameOf(el) {
    var r = el.getBoundingClientRect();
    return { l: r.left - o.outset, t: r.top - o.outset, r: r.right + o.outset, b: r.bottom + o.outset };
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

  function show() {
    if (!root.classList.contains('on')) { jump(around(lx, ly)); root.classList.add('on'); }
  }
  function hide() {
    root.classList.remove('lock');
    root.classList.remove('on');
    html.removeAttribute('data-bric-ret');
    cur = null;
  }
  function enter(el) {
    var c = count(el);
    lab.textContent = o.label(c[0], c[1]);
    show();
    cur = el;
    root.classList.add('lock');
    html.setAttribute('data-bric-ret', 'hot');
    place(frameOf(el)); // expands from the pointer box (or flies from the previous frame) to this frame
  }
  function leave() {
    var wasOn = root.classList.contains('on');
    cur = null;
    root.classList.remove('lock');
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
    place(around(lx, ly));
  }

  function update(target) {
    var el = target && target.closest ? target.closest(o.selector) : null;
    if (el) { if (el !== cur) enter(el); }
    else if (cur) leave();
    else if (o.scope === 'page') follow(target);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    lx = e.clientX; ly = e.clientY;
    update(e.target);
  }
  function onOut(e) { if (!e.relatedTarget) { if (cur || root.classList.contains('on')) { leave(); hide(); } } }
  function onScroll() {
    probeEl = null;
    if (!cur && o.scope !== 'page') return;
    if (cur && !raf) raf = window.requestAnimationFrame(function () { raf = 0; if (cur) { root.classList.add('snap'); place(frameOf(cur)); } });
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(function () {
      root.classList.remove('snap');
      var t = document.elementFromPoint(lx, ly);
      var el = t && t.closest ? t.closest(o.selector) : null;
      if (el && el === cur) { jump(frameOf(cur)); } else update(t);
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
    refresh: function () { if (cur) { jump(frameOf(cur)); } },
    destroy: function () {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('blur', drop);
      if (rmq.removeEventListener) rmq.removeEventListener('change', syncMotion);
      for (var j = 0; j < o.hideOn.length; j++) window.removeEventListener(o.hideOn[j], drop);
      window.clearTimeout(scrollTimer);
      if (raf) window.cancelAnimationFrame(raf);
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
