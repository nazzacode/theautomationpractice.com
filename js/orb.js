/* Hero orb: a breathing, noise-displaced sphere with a fresnel rim and a faint wireframe.
   Raw WebGL, no library (the site ships no third-party scripts). Modelled on the Codrops
   audio-visualiser sphere (wiki/research/site-hero-visual.md), minus the audio.
   Colours come from the palette tokens on the orb's parent. Reduced motion → one still frame. */
(function () {
  var c = document.getElementById('orb'); if (!c) return;
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
  var body = icosphere(5), wire = icosphere(3);

  /* ── shaders ─────────────────────────────────────────────────────── */
  var NOISE = 'vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 perm(vec4 x){return m289(((x*34.0)+1.0)*x);}vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}' +
    'float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 nm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nm.x;p1*=nm.y;p2*=nm.z;p3*=nm.w;vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}';
  var VS = 'attribute vec3 aPos;uniform mat4 uProj;uniform mat3 uRot;uniform float uTime,uAmp,uScale,uCamZ;varying vec3 vN,vV;varying float vD;' + NOISE +
    'float disp(vec3 p){float n1=snoise(p*1.5+vec3(0.0,uTime*0.18,uTime*0.11));float n2=snoise(p*3.6-vec3(uTime*0.3,0.0,uTime*0.17));return uAmp*(n1+0.35*n2);}' +
    'void main(){vec3 n=normalize(aPos);float br=1.0+0.03*sin(uTime*0.9);float d=disp(n);' +
    'vec3 t=normalize(cross(n,abs(n.y)<0.99?vec3(0.,1.,0.):vec3(1.,0.,0.)));vec3 b=cross(n,t);float e=0.02;vec3 nt=normalize(n+t*e);vec3 nb=normalize(n+b*e);' +
    'vec3 p=n*(br+d);vec3 pt=nt*(br+disp(nt));vec3 pb=nb*(br+disp(nb));vec3 dn=normalize(cross(pt-p,pb-p));' +
    'vec3 wp=uRot*(p*uScale);vN=uRot*dn;vec3 vp=vec3(wp.x,wp.y,wp.z-uCamZ);vV=-vp;vD=d;gl_Position=uProj*vec4(vp,1.0);}';
  var FS = 'precision mediump float;uniform vec3 uBody,uDeep,uRim,uSpec,uLight;uniform float uAlpha,uMode;varying vec3 vN,vV;varying float vD;' +
    'void main(){vec3 N=normalize(vN);vec3 V=normalize(vV);vec3 L=normalize(uLight);float fr=pow(1.0-abs(dot(N,V)),2.2);' +
    'if(uMode>1.5){float a=uAlpha*pow(1.0-fr,2.5);gl_FragColor=vec4(uRim*a,a);return;}' +   // halo: strongest at the body edge, fades outward
    'if(uMode>0.5){float a=uAlpha*(0.25+0.75*fr);gl_FragColor=vec4(uRim*a,a);return;}' +     // wireframe
    'float li=max(dot(N,L),0.0);vec3 H=normalize(L+V);float sp=pow(max(dot(N,H),0.0),42.0);' +
    'vec3 base=mix(uDeep,uBody,0.2+0.8*li);base=mix(base,uRim,clamp(vD*3.0,0.0,0.3));base*=1.0-clamp(-vD*3.0,0.0,0.25);' +
    'vec3 col=mix(base,uRim,fr*0.9)+uSpec*sp*0.28;gl_FragColor=vec4(col*uAlpha,uAlpha);}';
  function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  var prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var U = {}; ['uProj', 'uRot', 'uTime', 'uAmp', 'uScale', 'uCamZ', 'uBody', 'uDeep', 'uRim', 'uSpec', 'uLight', 'uAlpha', 'uMode'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
  var aPos = gl.getAttribLocation(prog, 'aPos');
  function buf(target, data) { var b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; }
  var B = { pos: buf(gl.ARRAY_BUFFER, body.pos), tris: buf(gl.ELEMENT_ARRAY_BUFFER, body.tris) };
  var Wm = { pos: buf(gl.ARRAY_BUFFER, wire.pos), lines: buf(gl.ELEMENT_ARRAY_BUFFER, wire.lines) };
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.uniform3f(U.uLight, -0.45, 0.7, 0.9); gl.uniform1f(U.uCamZ, 3.4);

  /* ── colours from the palette ────────────────────────────────────── */
  var p2d = document.createElement('canvas').getContext('2d');
  function rgb(str) { p2d.fillStyle = '#000'; p2d.fillStyle = str; var s = p2d.fillStyle; if (s[0] === '#') return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255]; var m = s.match(/[\d.]+/g); return [m[0] / 255, m[1] / 255, m[2] / 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function colors() {
    var s = getComputedStyle(c.parentNode), get = function (k, d) { return rgb(s.getPropertyValue(k).trim() || d); };
    var acc = get('--accent', '#173352'), hi = get('--accent-hi', '#2F6CA6'), paper = get('--paper', '#FAFAFB'), ink = get('--ink', '#12171F');
    var dark = matchMedia('(prefers-color-scheme: dark)').matches ? document.documentElement.getAttribute('data-theme') !== 'light' : document.documentElement.getAttribute('data-theme') === 'dark';
    // --paper is the ground and --ink the text colour in BOTH themes, so shadows mix toward paper in dark and toward ink in light
    var bodyC = dark ? mix(acc, paper, 0.5) : mix(acc, hi, 0.55), deep = dark ? mix(acc, paper, 0.85) : mix(acc, ink, 0.3), rim = dark ? mix(hi, ink, 0.15) : mix(hi, paper, 0.5);
    gl.uniform3fv(U.uBody, bodyC); gl.uniform3fv(U.uDeep, deep); gl.uniform3fv(U.uRim, rim); gl.uniform3fv(U.uSpec, dark ? mix(hi, ink, 0.5) : paper);
  }

  /* ── size, matrices ──────────────────────────────────────────────── */
  var W, dpr;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = c.parentNode.getBoundingClientRect().width;
    c.width = W * dpr; c.height = W * dpr; c.style.width = W + 'px'; c.style.height = W + 'px'; gl.viewport(0, 0, c.width, c.height);
    var f = 1 / Math.tan(40 * Math.PI / 360), n = 0.1, fa = 10;
    gl.uniformMatrix4fv(U.uProj, false, [f, 0, 0, 0, 0, f, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]);
  }
  function rot(a) { var tilt = -0.32, cx = Math.cos(tilt), sx = Math.sin(tilt), cy = Math.cos(a), sy = Math.sin(a);
    // Ry(a)·Rx(tilt), column-major
    return [cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx]; }

  /* ── draw ────────────────────────────────────────────────────────── */
  function draw(t) {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(U.uTime, t); gl.uniformMatrix3fv(U.uRot, false, rot(t * 0.07));
    gl.bindBuffer(gl.ARRAY_BUFFER, B.pos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, B.tris);
    // halo: bigger, softer, behind
    gl.depthMask(false); gl.uniform1f(U.uMode, 2); gl.uniform1f(U.uScale, 1.2); gl.uniform1f(U.uAmp, 0.06); gl.uniform1f(U.uAlpha, 0.22);
    gl.drawElements(gl.TRIANGLES, body.tris.length, gl.UNSIGNED_SHORT, 0);
    // body
    gl.depthMask(true); gl.uniform1f(U.uMode, 0); gl.uniform1f(U.uScale, 1.0); gl.uniform1f(U.uAmp, 0.07); gl.uniform1f(U.uAlpha, 0.96);
    gl.drawElements(gl.TRIANGLES, body.tris.length, gl.UNSIGNED_SHORT, 0);
    // wireframe, sitting just proud of the body
    gl.bindBuffer(gl.ARRAY_BUFFER, Wm.pos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Wm.lines);
    gl.depthMask(false); gl.uniform1f(U.uMode, 1); gl.uniform1f(U.uScale, 1.025); gl.uniform1f(U.uAlpha, 0.3);
    gl.drawElements(gl.LINES, wire.lines.length, gl.UNSIGNED_SHORT, 0);
  }
  var running = false, t0 = performance.now(), paused = 0, pausedAt = 0;
  function frame(now) { if (!running) return; draw((now - t0 - paused) / 1000); requestAnimationFrame(frame); }
  function start() { if (running || reduced) return; running = true; if (pausedAt) { paused += performance.now() - pausedAt; pausedAt = 0; } requestAnimationFrame(frame); }
  function stop() { if (!running) return; running = false; pausedAt = performance.now(); }

  colors(); size(); draw(0);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }).observe(c); else start();
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  addEventListener('resize', function () { size(); if (!running) draw(0); });
  new MutationObserver(function () { colors(); if (!running) draw(0); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });

  /* ── no WebGL: a soft disc ───────────────────────────────────────── */
  function fallback() {
    var ctx = c.getContext('2d'), s = getComputedStyle(c.parentNode), W = c.parentNode.getBoundingClientRect().width;
    c.width = c.height = W; c.style.width = c.style.height = W + 'px';
    var g = ctx.createRadialGradient(W * 0.42, W * 0.4, W * 0.05, W / 2, W / 2, W * 0.46);
    g.addColorStop(0, s.getPropertyValue('--accent-hi').trim() || '#2F6CA6'); g.addColorStop(1, s.getPropertyValue('--accent').trim() || '#173352');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * 0.44, 0, Math.PI * 2); ctx.fill();
  }
})();
