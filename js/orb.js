/* Hero orb: a breathing wireframe sphere — see-through icosphere shells, noise-displaced, fresnel-weighted
   hairlines, node points and two orbit rings. Modelled on the Codrops audio-visualiser's outer shell
   (codepen.io/filipz/pen/yyyRgry), minus the glow and the audio. Raw WebGL, no library.
   Colour = --orb on the orb's parent (defaults to --ink). Reduced motion → half speed (the orb is the page's one moving thing). */
(function () {
  var c = document.getElementById('orb'); if (!c) return;
  var OPT = (new URLSearchParams(location.search).get('orb') || 'a').toLowerCase();
  var RINGS = OPT === 'a', INNER = OPT !== 'c', WAVE = OPT === 'd' || OPT === 'e', MOUSE = OPT === 'e', DOTS_ONLY = OPT === 'c';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = c.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) { fallback(); return; }

  /* ── geometry: icosphere ─────────────────────────────────────────── */
  function icosphere(sub) {
    var t = (1 + Math.sqrt(5)) / 2, v = [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
    var f = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    v = v.map(function (p) { var l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; });
    for (var s = 0; s < sub; s++) {
      var cache = {}, nf = [];
      var mid = function (a, b) {
        var k = a < b ? a + '_' + b : b + '_' + a; if (cache[k] != null) return cache[k];
        var p = [v[a][0] + v[b][0], v[a][1] + v[b][1], v[a][2] + v[b][2]], l = Math.hypot(p[0], p[1], p[2]);
        v.push([p[0] / l, p[1] / l, p[2] / l]); return cache[k] = v.length - 1;
      };
      f.forEach(function (tri) { var a = mid(tri[0], tri[1]), b = mid(tri[1], tri[2]), cc = mid(tri[2], tri[0]); nf.push([tri[0], a, cc], [tri[1], b, a], [tri[2], cc, b], [a, b, cc]); });
      f = nf;
    }
    var edges = {}, lines = [];
    f.forEach(function (tri) { for (var i = 0; i < 3; i++) { var a = tri[i], b = tri[(i + 1) % 3], k = a < b ? a + '_' + b : b + '_' + a; if (!edges[k]) { edges[k] = 1; lines.push(a, b); } } });
    return { pos: new Float32Array([].concat.apply([], v)), tris: new Uint16Array([].concat.apply([], f)), lines: new Uint16Array(lines) };
  }
  var outer = icosphere(3), inner = icosphere(2), dense = icosphere(4);
  function ring(n) { var p = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; p.push(Math.cos(a), Math.sin(a), 0); } return new Float32Array(p); }
  var RING_N = 256, ringPos = ring(RING_N);

  /* ── shaders ─────────────────────────────────────────────────────── */
  var NOISE = 'vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 perm(vec4 x){return m289(((x*34.0)+1.0)*x);}vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}' +
    'float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}';
  var VS = 'attribute vec3 aPos;uniform mat4 uProj;uniform mat3 uRot;uniform float uTime,uAmp,uScale,uCamZ,uPt,uFlat,uWave;varying float vA;' + NOISE +
    'float disp(vec3 p){return uAmp*(snoise(p*1.25+vec3(0.0,uTime*0.35,uTime*0.22))+0.45*snoise(p*2.7-vec3(uTime*0.5,0.0,uTime*0.3)));}' +
    'void main(){float br=1.0+0.045*sin(uTime*1.1);' +
    'if(uFlat>0.5){vec3 q=aPos*uScale*br;gl_Position=uProj*vec4(q.xy,-uCamZ,1.0);vA=1.0;gl_PointSize=1.0;return;}' +
    'vec3 n=normalize(aPos);float d=disp(n);vec3 wp=uRot*(n*(br+d)*uScale);vec3 wn=uRot*n;vec3 vp=vec3(wp.xy,wp.z-uCamZ);' +
    'float f=dot(wn,normalize(-vp));float rim=pow(1.0-abs(f),1.7);float front=smoothstep(-0.3,0.4,f);' +
    'vA=(0.16+0.84*rim)*mix(0.26,1.0,front)*clamp(1.0+d*5.0,0.55,1.6);' +
    'float wv=uWave*smoothstep(0.22,0.0,abs(n.y-sin(uTime*0.55)*0.95));vA*=1.0+4.0*wv;' +
    'gl_Position=uProj*vec4(vp,1.0);gl_PointSize=uPt*mix(0.5,1.0,front)*(1.0+wv);}';
  var FS = 'precision mediump float;uniform vec3 uCol;uniform float uAlpha,uPoint;varying float vA;' +
    'void main(){float a=uAlpha*vA;if(uPoint>0.5){float r=length(gl_PointCoord-0.5);a*=smoothstep(0.5,0.15,r);}gl_FragColor=vec4(uCol*a,a);}';
  function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var U = {}; ['uProj', 'uRot', 'uTime', 'uAmp', 'uScale', 'uCamZ', 'uPt', 'uFlat', 'uWave', 'uCol', 'uAlpha', 'uPoint'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
  var aPos = gl.getAttribLocation(prog, 'aPos');
  function buf(target, data) { var b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; }
  var O = { pos: buf(gl.ARRAY_BUFFER, outer.pos), lines: buf(gl.ELEMENT_ARRAY_BUFFER, outer.lines) };
  var I = { pos: buf(gl.ARRAY_BUFFER, inner.pos), lines: buf(gl.ELEMENT_ARRAY_BUFFER, inner.lines) };
  var Rg = buf(gl.ARRAY_BUFFER, ringPos), Dn = buf(gl.ARRAY_BUFFER, dense.pos);
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  var CAMZ = 5.6; gl.uniform1f(U.uCamZ, CAMZ);

  /* ── colour from the palette ─────────────────────────────────────── */
  var p2d = document.createElement('canvas').getContext('2d');
  function rgb(str) { p2d.fillStyle = '#000'; p2d.fillStyle = str; var s = p2d.fillStyle; if (s[0] === '#') return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255]; var m = s.match(/[\d.]+/g); return [m[0] / 255, m[1] / 255, m[2] / 255]; }
  function colors() { var s = getComputedStyle(c.parentNode); gl.uniform3fv(U.uCol, rgb(s.getPropertyValue('--orb').trim() || s.getPropertyValue('--ink').trim() || '#12171F')); }

  /* ── size: the canvas bleeds past its column so the rings have room ─ */
  var W, dpr;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = c.getBoundingClientRect().width;
    c.width = c.height = Math.round(W * dpr); gl.viewport(0, 0, c.width, c.height);
    var f = 1 / Math.tan(40 * Math.PI / 360), n = 0.1, fa = 20;
    gl.uniformMatrix4fv(U.uProj, false, [f, 0, 0, 0, 0, f, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]);
  }
  function rot(a, tilt) { var cx = Math.cos(tilt), sx = Math.sin(tilt), cy = Math.cos(a), sy = Math.sin(a);
    return [cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx]; }   // Ry(a)·Rx(tilt), column-major

  /* ── draw ────────────────────────────────────────────────────────── */
  function lines(g, idx, n) { gl.bindBuffer(gl.ARRAY_BUFFER, g); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.drawElements(gl.LINES, n, gl.UNSIGNED_SHORT, 0); }
  function draw(t) {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enableVertexAttribArray(aPos);
    gl.uniform1f(U.uTime, t); gl.uniform1f(U.uPoint, 0);
    // orbit rings: flat, camera-facing, breathe with the sphere
    gl.uniform1f(U.uWave, WAVE ? 1 : 0);
    if (RINGS) { gl.uniform1f(U.uFlat, 1); gl.bindBuffer(gl.ARRAY_BUFFER, Rg); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(U.uScale, 1.24); gl.uniform1f(U.uAlpha, 0.16); gl.drawArrays(gl.LINE_LOOP, 0, RING_N);
    gl.uniform1f(U.uScale, 1.42); gl.uniform1f(U.uAlpha, 0.08); gl.drawArrays(gl.LINE_LOOP, 0, RING_N); }
    gl.uniform1f(U.uFlat, 0);
    // inner shell: coarser, counter-rotating, faint — gives the see-through depth
    gl.uniformMatrix3fv(U.uRot, false, rot(-t * 0.22 + 1.3, 0.5)); gl.uniform1f(U.uScale, 0.6); gl.uniform1f(U.uAmp, 0.05); gl.uniform1f(U.uAlpha, 0.22);
    if (INNER) lines(I.pos, I.lines, inner.lines.length);
    // outer shell + its nodes
    gl.uniformMatrix3fv(U.uRot, false, rot(t * 0.16 + mx * 0.6, -0.32 + my * 0.35)); gl.uniform1f(U.uScale, 1.0); gl.uniform1f(U.uAmp, 0.07); gl.uniform1f(U.uAlpha, 0.55);
    if (!DOTS_ONLY) lines(O.pos, O.lines, outer.lines.length);
    gl.bindBuffer(gl.ARRAY_BUFFER, DOTS_ONLY ? Dn : O.pos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(U.uPoint, 1); gl.uniform1f(U.uPt, (DOTS_ONLY ? 3.0 : 2.6) * dpr); gl.uniform1f(U.uAlpha, DOTS_ONLY ? 0.8 : 0.55);
    gl.drawArrays(gl.POINTS, 0, (DOTS_ONLY ? dense : outer).pos.length / 3);
  }
  var mx = 0, my = 0, tx = 0, ty = 0;
  if (MOUSE) addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; });
  var running = false, t0 = performance.now(), paused = 0, pausedAt = 0;
  var speed = reduced ? 0.5 : 1;
  function frame(now) { if (!running) return; mx += (tx - mx) * 0.04; my += (ty - my) * 0.04; draw((now - t0 - paused) / 1000 * speed); requestAnimationFrame(frame); }
  function start() { if (running) return; running = true; if (pausedAt) { paused += performance.now() - pausedAt; pausedAt = 0; } requestAnimationFrame(frame); }
  function stop() { if (!running) return; running = false; pausedAt = performance.now(); }

  colors(); size(); draw(0);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }).observe(c); else start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  addEventListener('resize', function () { size(); if (!running) draw(0); });
  new MutationObserver(function () { colors(); if (!running) draw(0); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { colors(); if (!running) draw(0); });

  /* ── no WebGL: two hairline circles ──────────────────────────────── */
  function fallback() {
    var ctx = c.getContext('2d'), s = getComputedStyle(c.parentNode), w = c.getBoundingClientRect().width;
    c.width = c.height = w; ctx.strokeStyle = s.getPropertyValue('--orb').trim() || s.getPropertyValue('--ink').trim() || '#12171F';
    [[0.33, 0.5], [0.41, 0.16]].forEach(function (r) { ctx.globalAlpha = r[1]; ctx.beginPath(); ctx.arc(w / 2, w / 2, w * r[0], 0, Math.PI * 2); ctx.stroke(); });
  }
})();
