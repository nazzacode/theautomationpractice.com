/* The Automation Practice — site behaviour */
(function () {
  'use strict';

  /* ══ CONFIG ═════════════════════════════════════════════════════════
     Booking = Google Calendar appointment schedule (Workspace, nathan@).
       BOOKING_URL    share link  — opens the booking page in a new tab
       BOOKING_EMBED  embed link  — same schedule, iframe-able (?gv=true)
       BOOKING_MODE   how "Book a call" behaves (override with ?book=):
         link    every button → BOOKING_URL, new tab
         inline  calendar iframe sits in the Book section; buttons scroll to it
         modal   every button opens the calendar in our own popup
         google  Google's own blue button + popup, in the Book section
     Set BOOKING_URL to null and every button falls through to the phone.
     ═══════════════════════════════════════════════════════════════════ */
  var BOOKING_URL = 'https://calendar.app.google/V2VrKdtyti7WyJRn7';
  var BOOKING_EMBED = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1RnKP69rlpD731L420BEoJMlQMSe63iW0t0JeakP47yfuZL7LROFERmTWh3ROwSjXeFVeR4WsX?gv=true';
  var BOOKING_MODE = 'modal';

  var d = document, root = d.documentElement;
  var q = new URLSearchParams(location.search);

  /* ── Booking ───────────────────────────────────────────────────────── */
  var BOOK_MODES = ['link', 'inline', 'modal', 'google'];
  var bookMode = BOOK_MODES.indexOf(q.get('book')) > -1 ? q.get('book') : BOOKING_MODE;
  var ctas = [].slice.call(d.querySelectorAll('[data-cta]'));
  var bookRow = d.querySelector('.book .cta-row');

  function ctaLinkOut() {
    ctas.forEach(function (a) { a.href = BOOKING_URL; a.target = '_blank'; a.rel = 'noopener'; });
  }
  function bookIframe(title) {
    var f = d.createElement('iframe');
    f.title = title; f.setAttribute('loading', 'lazy'); f.src = BOOKING_EMBED;
    return f;
  }

  if (!BOOKING_URL) { /* phone fallthrough — nothing to do */ }
  else if (bookMode === 'link') ctaLinkOut();
  else if (bookMode === 'inline') {
    var emb = d.createElement('div');
    emb.className = 'book__embed';
    emb.appendChild(bookIframe('Book a call'));
    bookRow.parentNode.insertBefore(emb, bookRow);
    bookRow.hidden = true;
  }
  else if (bookMode === 'modal') {
    var dlg = d.createElement('dialog');
    dlg.className = 'bookdlg';
    dlg.innerHTML = '<button class="cls" aria-label="Close">×</button>';
    d.body.appendChild(dlg);
    var openDlg = function (e) {
      if (e) e.preventDefault();
      if (!dlg.querySelector('iframe')) dlg.appendChild(bookIframe('Book a call'));
      dlg.showModal();
    };
    ctas.forEach(function (a) { a.addEventListener('click', openDlg); });
    dlg.querySelector('.cls').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    if (q.get('open') === '1') openDlg();
  }
  else if (bookMode === 'google') {
    var slot = d.createElement('span');
    bookRow.querySelector('[data-cta-primary]').hidden = true;
    bookRow.appendChild(slot);
    var css = d.createElement('link');
    css.rel = 'stylesheet'; css.href = 'https://calendar.google.com/calendar/scheduling-button-script.css';
    d.head.appendChild(css);
    var js = d.createElement('script');
    js.src = 'https://calendar.google.com/calendar/scheduling-button-script.js'; js.async = true;
    js.onload = function () {
      window.calendar.schedulingButton.load({
        url: BOOKING_EMBED,
        color: getComputedStyle(root).getPropertyValue('--accent').trim() || '#1B4D3E',
        label: 'Book a call',
        target: slot
      });
      if (q.get('open') === '1') setTimeout(function () { var b = slot.parentNode.querySelector('.qxCTlb'); if (b) b.click(); }, 300);
    };
    d.head.appendChild(js);
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
       ?hero=a|b|c|d     hero layout (d = the closing "Let's chat" block on top)
       ?palette=forest|ink|slate
       ?theme=light|dark|system
       ?book=link|inline|modal|google   (reloads — see CONFIG)
       ?logos=0|1        tools strip under the hero
       ?photos=0|1       section photos
     To make a variant the permanent default, edit the attributes in
     index.html: <html data-palette="…"> and <body data-hero="…" data-logos="…" data-photos="…">.
     Press V (or ?panel=1) for the live switcher.
     ────────────────────────────────────────────────────────────────────── */
  var HEROES = ['a', 'b', 'c', 'd'], PALETTES = ['forest', 'ink', 'slate'], TOGGLES = ['logos', 'photos'];

  if (HEROES.indexOf(q.get('hero')) > -1) d.body.dataset.hero = q.get('hero');
  if (PALETTES.indexOf(q.get('palette')) > -1) root.setAttribute('data-palette', q.get('palette'));
  if (THEMES.indexOf(q.get('theme')) > -1) setTheme(q.get('theme'));
  TOGGLES.forEach(function (k) { if (q.get(k) === '0' || q.get(k) === '1') d.body.dataset[k] = q.get(k); });

  function setHero(v) {
    d.body.dataset.hero = v;
    if (window.TAPDiagrams) window.TAPDiagrams.mount();
    syncPanel();
  }
  function setPalette(v) { root.setAttribute('data-palette', v); syncPanel(); }
  function setToggle(k, v) { d.body.dataset[k] = v; syncPanel(); }

  var panel = null;
  function syncPanel() {
    if (!panel) return;
    [].forEach.call(panel.querySelectorAll('button[data-k]'), function (b) {
      var k = b.dataset.k, v = b.dataset.v, cur;
      if (k === 'hero') cur = d.body.dataset.hero;
      else if (k === 'palette') cur = root.getAttribute('data-palette');
      else if (k === 'book') cur = bookMode;
      else if (TOGGLES.indexOf(k) > -1) cur = d.body.dataset[k] || '1';
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
      row('Hero layout', 'hero', [['a', 'Split'], ['b', 'Centred'], ['c', 'Editorial'], ['d', 'Chat']]) +
      row('Palette', 'palette', [['forest', 'Forest'], ['ink', 'Ink'], ['slate', 'Slate']]) +
      row('Theme', 'theme', [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]) +
      row('Booking', 'book', [['link', 'Link'], ['inline', 'Inline'], ['modal', 'Popup'], ['google', 'Google']]) +
      row('Tools strip', 'logos', [['1', 'On'], ['0', 'Off']]) +
      row('Photos', 'photos', [['1', 'On'], ['0', 'Off']]) +
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
      else if (k === 'book') { q.set('book', v); q.set('panel', '1'); location.search = q.toString(); }
      else if (TOGGLES.indexOf(k) > -1) setToggle(k, v);
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
