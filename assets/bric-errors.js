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
 *     primary:   { label:'Back to the galaxy', href:'/' },        a link …
 *     secondary: { label:'Try again',         action:'reload' }   … or an action: 'reload' | 'back' | function
 *   }
 *
 * Show it from anywhere:  BRICError.show('my-key')   ·   remove it:  BRICError.hide()
 * Per-call overrides:     BRICError.show('500', { body:'The holonet relay is down.', secondary:null })
 * Hosts can pass { navigate:function(href){…} } to route links client-side (index.html does), { mode:'page' } for the standalone page.
 * Extra: docs/project-history/error-pages.md
 */
(function (root) {
  'use strict';

  var HOME = { label: 'Back to the galaxy', href: '/' };
  var CV = { label: 'Open CV', href: '/cv' };

  var ERRORS = {
    '404': { code: '404', status: 'Page not found', title: 'Lost in the void', body: 'There is nothing at this address. The page may have moved, or the link may be off by a few light-years.', primary: HOME, secondary: CV },
    '403': { code: '403', status: 'Restricted', title: 'This sector is off limits', body: 'You do not have clearance for this page.', primary: HOME, secondary: CV },
    '500': { code: '500', status: 'Server error', title: 'Something broke on our end', body: 'The workshop hit a fault. Try again in a moment.', primary: { label: 'Try again', action: 'reload' }, secondary: HOME },
    'offline': { code: 'OFFLINE', status: 'No signal', title: 'You are offline', body: 'The connection dropped. This page will work again once you are back online.', primary: { label: 'Try again', action: 'reload' }, secondary: HOME },
    'load-failed': { code: '', status: 'Load failed', title: 'The galaxy would not load', body: 'Part of the scene failed to load. A refresh usually fixes it.', primary: { label: 'Reload', action: 'reload' }, secondary: CV },
    'coming-soon': { code: '', status: 'Coming soon', title: 'Still under construction', body: 'This part of the workshop is not open yet. Check back soon.', primary: HOME, secondary: CV },
    'generic': { code: '', status: 'Error', title: 'Something went wrong', body: 'An unexpected error occurred.', primary: HOME, secondary: null }
  };

  var host = null, prevFocus = null, prevTitle = null, robots = null, keyHandler = null, bodyAttr = null;

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
    if (opts.mode === 'page') host.appendChild(el('div', 'bric-error__stars'));

    var card = el('div', 'bric-error__card');
    ['tl', 'tr', 'bl', 'br'].forEach(function (p) { var m = el('span', 'bric-error__mark bric-error__mark--' + p); m.setAttribute('aria-hidden', 'true'); card.appendChild(m); });
    card.appendChild(el('p', 'bric-error__eyebrow', (c.code ? 'Error ' + c.code + ' · ' : '') + c.status));
    if (c.code) { var code = el('p', 'bric-error__code', c.code); code.setAttribute('aria-hidden', 'true'); card.appendChild(code); }
    var h1 = el('h1', 'bric-error__title', c.title);
    h1.id = 'bricErrorTitle'; h1.tabIndex = -1;
    card.appendChild(h1);
    card.appendChild(el('p', 'bric-error__body', c.body));
    if (c.path) { var p = el('p', 'bric-error__path', 'Requested '); p.appendChild(el('code', null, c.path)); card.appendChild(p); }
    var actions = el('div', 'bric-error__actions');
    if (c.primary) actions.appendChild(actionNode(c.primary, 'primary', opts.navigate));
    if (c.secondary) actions.appendChild(actionNode(c.secondary, 'secondary', opts.navigate));
    if (actions.childNodes.length) card.appendChild(actions);
    host.appendChild(card);
    document.body.appendChild(host);

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
