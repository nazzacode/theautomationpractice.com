/* The Automation Practice — diagrams
   Hand-built SVG. No dependencies.

   Rules every diagram here follows:
     · it renders its *finished* state first, then animates from it — a
       diagram is never invisible waiting for an observer that may not fire
     · layout is chosen by container width and re-rendered (debounced) on resize
     · prefers-reduced-motion gets the finished state and no animation
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(w, h) {
    var s = el('svg', {
      'class': 'dg', viewBox: '0 0 ' + w + ' ' + h,
      preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false'
    });
    s.style.width = '100%';
    return s;
  }
  function rr(x, y, w, h, cls, r) { return el('rect', { x: x, y: y, width: w, height: h, rx: r == null ? 4 : r, 'class': cls }); }
  function tx(x, y, cls, t, anchor) { return el('text', { x: x, y: y, 'class': cls, 'text-anchor': anchor || 'start' }, t); }
  function sub(x, y, t) {
    var n = tx(x, y, '', t);
    n.setAttribute('style', 'font-size:9px'); n.setAttribute('fill', 'var(--ink-3)');
    return n;
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function tween(ms, fn, done) {
    var t0 = null, raf = 0, dead = false;
    function frame(t) {
      if (dead) return;
      if (t0 === null) t0 = t;
      var p = clamp((t - t0) / ms, 0, 1);
      fn(p);
      if (p < 1) raf = requestAnimationFrame(frame);
      else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return function () { dead = true; cancelAnimationFrame(raf); };
  }

  /* ── 1. Hero: work goes in, finished work comes out ────────────────── */
  function flow(host) {
    var srcs = [
      { t: 'Email', s: 'inbox, chasing' },
      { t: 'Records', s: 'lists, data entry' },
      { t: 'Documents', s: 'drafting, checking' }
    ];
    // Phone widths get a vertical stack — the wide layout would scale the
    // labels down past readable. Keyed off the viewport, not the container:
    // the desktop hero column is ~540px and must still get the wide layout.
    if (window.innerWidth < 640) return flowNarrow(host, srcs);

    var W = 560, H = 364, s = svg(W, H);
    var MID = 198;
    var cx1 = 6, cw = 156, ys = [59, 163, 267], bh = 70;
    var nx = 228, nw = 156, ny = 123, nh = 150;
    var ox = 422, ow = 130, oy = 163, oh = 70;

    s.appendChild(tx(cx1, 24, 'lbl', 'What comes in'));
    s.appendChild(tx(ox + ow, 24, 'lbl', 'What comes out', 'end'));

    var paths = [];
    ys.forEach(function (y) {
      var y0 = y + bh / 2, x0 = cx1 + cw;
      var d = 'M' + x0 + ' ' + y0 + ' C' + (x0 + 40) + ' ' + y0 + ' ' + (nx - 40) + ' ' + MID + ' ' + nx + ' ' + MID;
      var p = el('path', { d: d, 'class': 'ln' });
      s.appendChild(p); paths.push(p);
    });
    var outP = el('path', { d: 'M' + (nx + nw) + ' ' + MID + ' L' + (ox - 2) + ' ' + MID, 'class': 'ln-a' });
    s.appendChild(outP);
    s.appendChild(el('path', {
      d: 'M' + (ox - 10) + ' ' + (MID - 5) + ' l6 5 -6 5', 'class': 'ln-a',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));

    srcs.forEach(function (o, i) {
      var y = ys[i];
      s.appendChild(rr(cx1, y, cw, bh, 'bx'));
      s.appendChild(tx(cx1 + 18, y + 30, '', o.t));
      s.appendChild(sub(cx1 + 18, y + 49, o.s));
    });

    s.appendChild(rr(nx, ny, nw, nh, 'bx-a'));
    s.appendChild(tx(nx + nw / 2, ny + 60, 'ttl', 'AI, set up', 'middle'));
    s.appendChild(tx(nx + nw / 2, ny + 82, 'ttl', 'properly', 'middle'));
    var np = tx(nx + nw / 2, ny + 112, 'lbl', 'tools · people · context', 'middle');
    np.setAttribute('style', 'font-size:8.5px;letter-spacing:.05em');
    s.appendChild(np);

    s.appendChild(rr(ox, oy, ow, oh, 'bx'));
    s.appendChild(tx(ox + 18, oy + 30, '', 'Done'));
    s.appendChild(sub(ox + 18, oy + 49, 'your team checks it'));

    host.innerHTML = '';
    host.appendChild(s);

    var all = paths.concat([outP]);

    if (reduced) {
      all.forEach(function (p) {
        var pt = p.getPointAtLength(p.getTotalLength() * 0.55);
        s.appendChild(el('circle', { cx: pt.x, cy: pt.y, r: 3, 'class': 'fill-a' }));
      });
      return {};
    }

    var dots = [];
    all.forEach(function (p, i) {
      for (var k = 0; k < 2; k++) {
        var c = el('circle', { r: i === 3 ? 3.4 : 2.6, 'class': 'fill-a', opacity: 0 });
        s.appendChild(c);
        dots.push({ c: c, p: p, L: p.getTotalLength(), off: (i * 0.23 + k * 0.5) % 1, sp: i === 3 ? 0.00030 : 0.00022 });
      }
    });

    var raf = 0, last = null;
    function loop(t) {
      if (last === null) last = t;
      var dt = Math.min(t - last, 50); last = t;
      dots.forEach(function (d) {
        d.off = (d.off + dt * d.sp) % 1;
        var pt = d.p.getPointAtLength(d.L * d.off);
        d.c.setAttribute('cx', pt.x.toFixed(2));
        d.c.setAttribute('cy', pt.y.toFixed(2));
        d.c.setAttribute('opacity', (Math.sin(d.off * Math.PI) * 0.9).toFixed(3));
      });
      raf = requestAnimationFrame(loop);
    }
    return {
      start: function () { if (!raf) { last = null; raf = requestAnimationFrame(loop); } },
      pause: function () { cancelAnimationFrame(raf); raf = 0; },
      destroy: function () { cancelAnimationFrame(raf); raf = 0; }
    };
  }

  /* Vertical version of the hero flow, for phone widths. */
  function flowNarrow(host, srcs) {
    var W = 360, H = 444, s = svg(W, H);
    var bx = 27, bw = 306, bh = 54, rail = 10;
    var ys = [32, 94, 156];
    var centres = ys.map(function (y) { return y + bh / 2; });
    var ny = 262, nh = 96, dy = 382;

    s.appendChild(tx(bx, 18, 'lbl', 'What comes in'));

    var paths = [];
    // left rail + stubs into each source
    var railP = el('path', { d: 'M' + rail + ' ' + centres[0] + ' V' + centres[2], 'class': 'ln' });
    s.appendChild(railP);
    centres.forEach(function (c) {
      s.appendChild(el('path', { d: 'M' + rail + ' ' + c + ' H' + bx, 'class': 'ln' }));
    });
    var down = el('path', {
      d: 'M' + rail + ' ' + centres[2] + ' C' + rail + ' ' + (centres[2] + 42) + ' 180 ' + (ny - 44) + ' 180 ' + ny,
      'class': 'ln', fill: 'none'
    });
    s.appendChild(down); paths.push(down);

    srcs.forEach(function (o, i) {
      s.appendChild(rr(bx, ys[i], bw, bh, 'bx'));
      s.appendChild(tx(bx + 16, ys[i] + 23, '', o.t));
      s.appendChild(sub(bx + 16, ys[i] + 41, o.s));
    });

    s.appendChild(rr(bx, ny, bw, nh, 'bx-a'));
    s.appendChild(tx(180, ny + 38, 'ttl', 'AI, set up properly', 'middle'));
    var np = tx(180, ny + 66, 'lbl', 'tools · people · context', 'middle');
    np.setAttribute('style', 'font-size:9px;letter-spacing:.05em');
    s.appendChild(np);

    var outP = el('path', { d: 'M180 ' + (ny + nh) + ' V' + (dy - 2), 'class': 'ln-a' });
    s.appendChild(outP); paths.push(outP);
    s.appendChild(el('path', {
      d: 'M175 ' + (dy - 10) + ' l5 6 5 -6', 'class': 'ln-a',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none'
    }));

    s.appendChild(rr(bx, dy, bw, bh, 'bx'));
    s.appendChild(tx(bx + 16, dy + 23, '', 'Done'));
    s.appendChild(sub(bx + 16, dy + 41, 'your team checks it'));
    s.appendChild(tx(bx + bw, dy - 10, 'lbl', 'What comes out', 'end'));

    host.innerHTML = '';
    host.appendChild(s);

    if (reduced) return {};

    var dots = paths.map(function (p, i) {
      var c = el('circle', { r: 3, 'class': 'fill-a', opacity: 0 });
      s.appendChild(c);
      return { c: c, p: p, L: p.getTotalLength(), off: i * 0.5, sp: 0.00026 };
    });
    var raf = 0, last = null;
    function loop(t) {
      if (last === null) last = t;
      var dt = Math.min(t - last, 50); last = t;
      dots.forEach(function (d) {
        d.off = (d.off + dt * d.sp) % 1;
        var pt = d.p.getPointAtLength(d.L * d.off);
        d.c.setAttribute('cx', pt.x.toFixed(2));
        d.c.setAttribute('cy', pt.y.toFixed(2));
        d.c.setAttribute('opacity', (Math.sin(d.off * Math.PI) * 0.9).toFixed(3));
      });
      raf = requestAnimationFrame(loop);
    }
    return {
      start: function () { if (!raf) { last = null; raf = requestAnimationFrame(loop); } },
      pause: function () { cancelAnimationFrame(raf); raf = 0; },
      destroy: function () { cancelAnimationFrame(raf); raf = 0; }
    };
  }

  /* ── 2. Before / after: 6,000 records ──────────────────────────────── */
  function beforeAfter(host) {
    var narrow = host.clientWidth < 520;
    var COLS = narrow ? 20 : 30, ROWS = narrow ? 12 : 10;
    var W = 640, H = narrow ? 330 : 300;
    var s = svg(W, H);
    var padX = 24, gridW = W - padX * 2;
    var cw = gridW / COLS, ch = 20, top = 34;

    s.appendChild(tx(padX, 18, 'lbl', 'Solicitor list · 6,000 names'));

    var cells = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var dot = el('circle', {
          cx: (padX + c * cw + cw / 2).toFixed(2), cy: (top + r * ch + ch / 2).toFixed(2),
          r: 3, fill: 'var(--ink)', opacity: 0.16
        });
        s.appendChild(dot); cells.push(dot);
      }
    }
    var N = cells.length;

    var cursor = el('circle', { r: 7.5, fill: 'none', stroke: 'var(--accent-hi)', 'stroke-width': 1.4, opacity: 0 });
    s.appendChild(cursor);

    var statY = top + ROWS * ch + 42;
    s.appendChild(el('line', { x1: padX, y1: statY - 30, x2: W - padX, y2: statY - 30, 'class': 'ln' }));

    function big(x, anchor, fill) {
      var n = tx(x, statY + 6, '', '', anchor);
      n.setAttribute('style', "font-family:var(--font-display);font-size:30px;font-variation-settings:'opsz' 40;letter-spacing:-.02em");
      n.setAttribute('fill', fill); s.appendChild(n); return n;
    }
    var nBig = big(padX, 'start', 'var(--accent-hi)');
    var nCost = big(W - padX, 'end', 'var(--ink)');
    var nCap = tx(padX, statY + 28, '', '');
    nCap.setAttribute('style', 'font-size:12px'); nCap.setAttribute('fill', 'var(--ink-2)');
    s.appendChild(nCap);
    var nCostL = tx(W - padX, statY + 28, 'lbl', '', 'end');
    s.appendChild(nCostL);

    host.innerHTML = '';
    host.appendChild(s);

    var stop = null, state = 'before';

    function clear() {
      if (stop) { stop(); stop = null; }
      cells.forEach(function (d) { d.setAttribute('opacity', 0.16); d.setAttribute('fill', 'var(--ink)'); d.setAttribute('r', 3); });
      cursor.setAttribute('opacity', 0);
    }

    function beforeEnd() {
      cursor.setAttribute('opacity', 0);
      nBig.textContent = '6,000 of 6,000';
      nCap.textContent = 'Then it starts going out of date again.';
    }
    function runBefore(animate) {
      clear();
      nCost.textContent = '≈ 1 month'; nCostL.textContent = 'of clerks’ time, a year';
      nCap.textContent = 'One firm website at a time, by hand.';
      if (!animate) { cells.forEach(function (d) { d.setAttribute('opacity', 0.5); }); beforeEnd(); return; }
      stop = tween(7000, function (p) {
        var n = Math.floor(p * N);
        for (var i = 0; i < N; i++) cells[i].setAttribute('opacity', i < n ? 0.5 : 0.16);
        var cur = cells[Math.min(n, N - 1)];
        cursor.setAttribute('cx', cur.getAttribute('cx'));
        cursor.setAttribute('cy', cur.getAttribute('cy'));
        cursor.setAttribute('opacity', 0.9);
        nBig.textContent = Math.floor(p * 6000).toLocaleString('en-GB') + ' of 6,000';
      }, beforeEnd);
    }

    var changed = [];
    for (var k = 0; k < 11; k++) changed.push(Math.floor((k * 0.0871 + 0.043) * N) % N);

    function afterEnd() {
      changed.forEach(function (i) {
        cells[i].setAttribute('fill', 'var(--accent-hi)');
        cells[i].setAttribute('opacity', 1);
        cells[i].setAttribute('r', 4.2);
      });
      nBig.textContent = '11 changed';
      nCap.textContent = 'Everything else confirmed unchanged. Nobody opened a browser.';
    }
    function runAfter(animate) {
      clear();
      nCost.textContent = 'Seconds'; nCostL.textContent = 'then the team checks it';
      if (!animate) { cells.forEach(function (d) { d.setAttribute('opacity', 0.5); }); afterEnd(); return; }
      nCap.textContent = 'Every name, every site, in one pass.';
      stop = tween(750, function (p) {
        var e = easeOut(p), n = Math.floor(e * N);
        for (var i = 0; i < N; i++) cells[i].setAttribute('opacity', i < n ? 0.5 : 0.16);
        nBig.textContent = Math.floor(e * 6000).toLocaleString('en-GB') + ' checked';
      }, function () {
        stop = tween(420, function (p) {
          changed.forEach(function (i) {
            cells[i].setAttribute('fill', 'var(--accent-hi)');
            cells[i].setAttribute('opacity', (0.5 + 0.5 * p).toFixed(2));
            cells[i].setAttribute('r', (3 + 1.2 * easeOut(p)).toFixed(2));
          });
        }, afterEnd);
      });
    }

    function render(animate) { state === 'before' ? runBefore(animate) : runAfter(animate); }

    render(false);            // finished state up front
    var ran = false;
    return {
      start: function () { if (ran) return; ran = true; render(!reduced); },
      settle: function () { if (ran) return; ran = true; render(false); },
      pause: function () { if (stop) { stop(); stop = null; } },
      destroy: function () { if (stop) stop(); },
      setState: function (v) { state = v; ran = true; render(!reduced); }
    };
  }

  /* ── 3. Fan: the audit node down to the three pillar cards ─────────── */
  function fanConnector(host) {
    var from = document.getElementById('auditNode');
    var grid = document.getElementById('pillarGrid');
    if (!from || !grid) return {};

    var hb = host.getBoundingClientRect();
    var W = Math.max(host.clientWidth, 1), H = host.clientHeight || 76;
    var s = svg(W, H);
    s.setAttribute('preserveAspectRatio', 'none');
    s.style.height = H + 'px';

    var fb = from.getBoundingClientRect();
    var x0 = fb.left + fb.width / 2 - hb.left;

    var cards = [].slice.call(grid.children);
    var xs = cards.map(function (c) {
      var r = c.getBoundingClientRect();
      return r.left + r.width / 2 - hb.left;
    });
    // cards stacked (all centres equal) → one straight spine instead of a fan
    var stacked = xs.length < 2 || Math.abs(xs[0] - xs[xs.length - 1]) < 8;

    var paths = [];
    if (stacked) {
      paths.push(el('path', { d: 'M' + x0 + ' 0 V' + H, 'class': 'ln-a' }));
    } else {
      xs.forEach(function (x) {
        paths.push(el('path', {
          d: 'M' + x0 + ' 0 C' + x0 + ' ' + (H * .55) + ' ' + x + ' ' + (H * .45) + ' ' + x + ' ' + H,
          'class': 'ln-a', fill: 'none'
        }));
      });
    }
    paths.forEach(function (p) { p.setAttribute('opacity', '.6'); s.appendChild(p); });

    host.innerHTML = '';
    host.appendChild(s);

    if (reduced) return {};

    var lens = paths.map(function (p) {
      var L = p.getTotalLength();
      p.setAttribute('stroke-dasharray', L);
      return L;
    });
    function finish() { paths.forEach(function (p) { p.setAttribute('stroke-dashoffset', 0); }); }
    paths.forEach(function (p, i) { p.setAttribute('stroke-dashoffset', lens[i]); });

    var ran = false, stop = null;
    return {
      start: function () {
        if (ran) return; ran = true;
        stop = tween(700, function (p) {
          var e = easeOut(p);
          paths.forEach(function (n, i) { n.setAttribute('stroke-dashoffset', (lens[i] * (1 - e)).toFixed(1)); });
        }, finish);
      },
      settle: function () { if (ran) return; ran = true; finish(); },
      destroy: function () { if (stop) stop(); }
    };
  }

  /* ── Mounting + lifecycle ──────────────────────────────────────────── */
  var REG = [
    { id: 'dg-flow', make: flow },
    { id: 'dg-ba', make: beforeAfter },
    { id: 'dg-fan', make: fanConnector }
  ];
  var live = {}, io = null, timers = [];

  function mountAll() {
    timers.forEach(clearTimeout); timers = [];
    REG.forEach(function (r) {
      var host = document.getElementById(r.id);
      if (!host) return;
      if (live[r.id] && live[r.id].destroy) live[r.id].destroy();
      live[r.id] = r.make(host) || {};
    });
    observe();

    // Safety net: if an observer never fires (odd viewport, no IO, a stalled
    // scroll container) nothing is left mid-animation or blank.
    timers.push(setTimeout(function () {
      Object.keys(live).forEach(function (k) {
        var i = live[k];
        if (i.settle) i.settle();
        else if (i.start) i.start();
      });
    }, 3000));
  }

  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) {
      Object.keys(live).forEach(function (k) { if (live[k].start) live[k].start(); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var inst = live[e.target.id];
        if (!inst) return;
        if (e.isIntersecting) { if (inst.start) inst.start(); }
        else if (inst.pause) inst.pause();
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    REG.forEach(function (r) { var h = document.getElementById(r.id); if (h) io.observe(h); });
  }

  var rt = 0, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - lastW) < 40) return;
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(mountAll, 220);
  });

  window.TAPDiagrams = { mount: mountAll, get: function (id) { return live[id]; } };

  function boot() {
    // fonts settle first so measured card positions are final
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(mountAll);
    else mountAll();
    mountAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
