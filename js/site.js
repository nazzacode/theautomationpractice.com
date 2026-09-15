/* The Automation Practice — site behaviour */
(function () {
  'use strict';

  /* ══ CONFIG ═════════════════════════════════════════════════════════
     When a scheduler exists (Cal.com / Calendly / SavvyCal), put the URL
     here. Every "Book a call" button on the page re-points at it, opening
     in a new tab. Leave as null and they fall through to the phone number.
     ═══════════════════════════════════════════════════════════════════ */
  var BOOKING_URL = null;   // e.g. 'https://cal.com/nathansharp/intro'

  var d = document, root = d.documentElement;

  /* ── Booking links ─────────────────────────────────────────────────── */
  if (BOOKING_URL) {
    [].forEach.call(d.querySelectorAll('[data-cta]'), function (a) {
      a.href = BOOKING_URL;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ── Year ──────────────────────────────────────────────────────────── */
  var yr = d.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── Sticky header shadow ──────────────────────────────────────────── */
  var hdr = d.getElementById('hdr');
  if (hdr) {
    var onScroll = function () { hdr.dataset.stuck = window.scrollY > 8 ? '1' : '0'; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Reveal on scroll ──────────────────────────────────────────────── */
  var rvs = [].slice.call(d.querySelectorAll('.rv'));
  if (!('IntersectionObserver' in window)) {
    rvs.forEach(function (n) { n.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(function (n) { ro.observe(n); });
  }

  /* ── Before / after tabs ───────────────────────────────────────────── */
  var tabB = d.getElementById('tab-before'), tabA = d.getElementById('tab-after');
  if (tabB && tabA) {
    var pick = function (which) {
      tabB.setAttribute('aria-selected', String(which === 'before'));
      tabA.setAttribute('aria-selected', String(which === 'after'));
      var dg = window.TAPDiagrams && window.TAPDiagrams.get('dg-ba');
      if (dg && dg.setState) dg.setState(which);
    };
    tabB.addEventListener('click', function () { pick('before'); });
    tabA.addEventListener('click', function () { pick('after'); });
  }

  /* ── Theme ─────────────────────────────────────────────────────────── */
  var THEMES = ['system', 'light', 'dark'];
  function setTheme(t) {
    if (t === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', t);
    try { localStorage.setItem('tap-theme', t); } catch (e) { }
    syncPanel();
  }
  try {
    var saved = localStorage.getItem('tap-theme');
    if (saved && saved !== 'system') root.setAttribute('data-theme', saved);
  } catch (e) { }

  var tb = d.getElementById('themeBtn');
  if (tb) tb.addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') || 'system';
    setTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]);
  });

  /* ── Variants ──────────────────────────────────────────────────────────
     Layout and palette alternatives Nathan can swap without touching code.
       ?hero=a|b|c       hero layout
       ?palette=forest|ink|slate
       ?theme=light|dark|system
     To make a variant the permanent default, edit the attributes in
     index.html: <html data-palette="…"> and <body data-hero="…">.
     Press V (or ?panel=1) for the live switcher.
     ────────────────────────────────────────────────────────────────────── */
  var q = new URLSearchParams(location.search);
  var HEROES = ['a', 'b', 'c'], PALETTES = ['forest', 'ink', 'slate'];

  if (HEROES.indexOf(q.get('hero')) > -1) d.body.dataset.hero = q.get('hero');
  if (PALETTES.indexOf(q.get('palette')) > -1) root.setAttribute('data-palette', q.get('palette'));
  if (THEMES.indexOf(q.get('theme')) > -1) setTheme(q.get('theme'));

  function setHero(v) {
    d.body.dataset.hero = v;
    if (window.TAPDiagrams) window.TAPDiagrams.mount();
    syncPanel();
  }
  function setPalette(v) { root.setAttribute('data-palette', v); syncPanel(); }

  var panel = null;
  function syncPanel() {
    if (!panel) return;
    [].forEach.call(panel.querySelectorAll('button[data-k]'), function (b) {
      var k = b.dataset.k, v = b.dataset.v, cur;
      if (k === 'hero') cur = d.body.dataset.hero;
      else if (k === 'palette') cur = root.getAttribute('data-palette');
      else cur = root.getAttribute('data-theme') || 'system';
      b.setAttribute('aria-pressed', String(cur === v));
    });
  }

  function buildPanel() {
    panel = d.createElement('div');
    panel.className = 'panel';
    panel.innerHTML =
      '<button class="cls" aria-label="Close">×</button>' +
      '<h4>Variants</h4>' +
      row('Hero layout', 'hero', [['a', 'Split'], ['b', 'Centred'], ['c', 'Editorial']]) +
      row('Palette', 'palette', [['forest', 'Forest'], ['ink', 'Ink'], ['slate', 'Slate']]) +
      row('Theme', 'theme', [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]) +
      '<p class="hint">Press <b>V</b> to hide. Shareable: add <b>?hero=b&amp;palette=slate</b> to the URL.</p>';

    function row(label, k, opts) {
      return '<div class="row"><span>' + label + '</span><div class="opts">' +
        opts.map(function (o) {
          return '<button data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>';
        }).join('') + '</div></div>';
    }

    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.className === 'cls') { togglePanel(false); return; }
      var k = b.dataset.k, v = b.dataset.v;
      if (k === 'hero') setHero(v);
      else if (k === 'palette') setPalette(v);
      else setTheme(v);
    });
    d.body.appendChild(panel);
    syncPanel();
  }

  function togglePanel(on) {
    if (on === undefined) on = !panel || panel.hidden;
    if (!panel) buildPanel();
    panel.hidden = !on;
    syncPanel();
  }

  if (q.get('panel') === '1') togglePanel(true);

  d.addEventListener('keydown', function (e) {
    if (e.key !== 'v' && e.key !== 'V') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || e.target.isContentEditable) return;
    togglePanel();
  });
})();
