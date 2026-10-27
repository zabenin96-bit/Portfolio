/*
 * Scroll trail: a thin white line that travels down the page as you scroll.
 *
 * A guide point plans the route: it keeps clear of page elements (videos,
 * their captions, the title, the photo, text blocks), stays on its side of a
 * video instead of jumping across it, and traces ovals around accents. The
 * visible head follows the guide on a critically damped spring, so every
 * turn is rounded off – the path never has sharp corners. Once per visit it circles the studio
 * name and Nata's name, circles one video twice, sometimes circles a video
 * caption, and now and then curls in open space.
 *
 * Draws only while something is happening; skipped for reduced motion and
 * on low-end devices.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  if (reduceMotion || lowEnd || !window.requestAnimationFrame) return;

  var canvas = document.createElement("canvas");
  canvas.className = "trail";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var COLOR = "255, 255, 255";
  var LINE = 1.3;          // px – the same along the whole line
  var TAIL_MS = 1700;      // how long a point of the tail stays visible
  var LEAD = 0.58;         // where the head heads for, as a share of the viewport height
  var CLEAR = 12;          // px the line keeps away from any element
  var SPRING = 0.024;      // 1/ms – how tightly the head follows the guide
  var W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // head in page coordinates, velocity in px/ms
  var head = { x: W * 0.5, y: window.scrollY + H * 0.3 };
  var vel = { x: 0, y: 0 };
  var guide = { x: head.x, y: head.y };
  var points = [];
  var mode = "follow", m = null;
  var nextCurl = 0, nextCaption = 0, captionsLeft = 2;
  var lastScroll = 0, raf = null, last = 0;

  var ph = [Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3];
  function wander(t) {
    return Math.sin(t * 0.00031 + ph[0]) * 0.55 + Math.sin(t * 0.00073 + ph[1]) * 0.3 + Math.sin(t * 0.0017 + ph[2]) * 0.15;
  }
  function pace(t) { // 0.45 .. 1.5: moments of rushing and of lingering
    var s = Math.sin(t * 0.0009 + ph[3]) * 0.5 + Math.sin(t * 0.0023 + ph[1]) * 0.5;
    return 0.45 + (s + 1) * 0.52;
  }

  // ---------- page geometry ----------
  function textRect(el) {
    if (!el) return null;
    var r = document.createRange();
    r.selectNodeContents(el.querySelector(".i18n") || el);
    var b = r.getBoundingClientRect();
    if (!b.width) b = el.getBoundingClientRect();
    return b.width ? { left: b.left, top: b.top, right: b.right, bottom: b.bottom } : null;
  }
  function union(a, b) {
    if (!a) return b; if (!b) return a;
    return { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
  }
  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function box(el) { var b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; }

  // everything the line must not touch, in viewport coordinates
  function obstacles() {
    var list = [];
    qa(".cat__btn").forEach(function (el) { list.push(box(el)); });
    qa(".cat__label").forEach(function (el) { var r = textRect(el); if (r) list.push(r); });
    [".masthead__title", ".masthead__sub", ".about__photo", ".about__lead", ".about__head .eyebrow", ".cta"].forEach(function (s) {
      var el = q(s); if (!el) return;
      var r = s === ".about__photo" || s === ".cta" ? box(el) : textRect(el); if (r) list.push(r);
    });
    qa(".about__body > span").forEach(function (el) { var r = textRect(el); if (r) list.push(r); });
    return list.filter(function (r) { return r.bottom > -60 && r.top < H + 60; });
  }

  // accents circled once per visit
  var accents = [
    { rect: function () { return union(textRect(q(".masthead__title")), textRect(q(".masthead__sub"))); }, turns: 1, pad: 24, done: false },
    // Nata's name together with her photo next to it
    { rect: function () { var ph = q(".about__photo"); return union(ph && box(ph), union(textRect(q(".about__head .eyebrow")), textRect(q(".about__lead")))); }, turns: 1, pad: 20, done: false },
  ];
  var videoDone = false, videoPick = null;

  function fullyOnScreen(r) { return r.top > H * 0.05 && r.bottom < H * 0.95; }
  function nearLead(r) { var c = (r.top + r.bottom) / 2; return fullyOnScreen(r) && Math.abs(c - H * LEAD) < H * 0.3; }

  // A point on the outline that keeps exactly `r` px around a box of half
  // size hw x hh (a rounded rectangle). u runs 0..1 once around.
  function ringPoint(hw, hh, r, u) {
    var straightH = 2 * hw, straightV = 2 * hh, arc = Math.PI * r / 2;
    var total = 2 * straightH + 2 * straightV + 4 * arc;
    var d = ((u % 1) + 1) % 1 * total;
    // top edge (left→right), top-right arc, right edge, bottom-right arc, ...
    var segs = [
      [straightH, function (t) { return { x: -hw + t, y: -hh - r }; }],
      [arc, function (t) { var a = -Math.PI / 2 + t / r; return { x: hw + Math.cos(a) * r, y: -hh + Math.sin(a) * r }; }],
      [straightV, function (t) { return { x: hw + r, y: -hh + t }; }],
      [arc, function (t) { var a = t / r; return { x: hw + Math.cos(a) * r, y: hh + Math.sin(a) * r }; }],
      [straightH, function (t) { return { x: hw - t, y: hh + r }; }],
      [arc, function (t) { var a = Math.PI / 2 + t / r; return { x: -hw + Math.cos(a) * r, y: hh + Math.sin(a) * r }; }],
      [straightV, function (t) { return { x: -hw - r, y: hh - t }; }],
      [arc, function (t) { var a = Math.PI + t / r; return { x: -hw + Math.cos(a) * r, y: -hh + Math.sin(a) * r }; }],
    ];
    for (var k = 0; k < segs.length; k++) {
      if (d <= segs[k][0] || k === segs.length - 1) return segs[k][1](Math.min(d, segs[k][0]));
      d -= segs[k][0];
    }
  }

  function startOrbit(r, turns, pad, padY) {
    var sy = window.scrollY;
    var cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2 + sy;
    var hw = (r.right - r.left) / 2, hh = (r.bottom - r.top) / 2;
    var rad = pad;
    // never wider than the screen, and flatter vertically when asked (padY)
    if (hw + rad > W / 2 - 3) { rad = Math.max(4, W / 2 - 3 - hw); }
    var squash = padY === undefined ? 1 : Math.min(1, padY / rad);
    // start at the outline point nearest to the guide, keep its current heading
    var best = 0, bestD = Infinity;
    for (var i = 0; i < 96; i++) {
      var pnt = ringPoint(hw, hh, rad, i / 96);
      var dd = Math.hypot(cx + pnt.x - guide.x, cy + pnt.y * (squash < 1 ? (hh + rad * squash) / (hh + rad) : 1) - guide.y);
      if (dd < bestD) { bestD = dd; best = i / 96; }
    }
    var p1 = ringPoint(hw, hh, rad, best), p2 = ringPoint(hw, hh, rad, best + 0.01);
    var dir = (p2.x - p1.x) * vel.x + (p2.y - p1.y) * vel.y >= 0 ? 1 : -1;
    var perimeter = 4 * hw + 4 * hh + 2 * Math.PI * rad;
    mode = "orbit";
    m = {
      cx: cx, cy: cy, hw: hw, hh: hh, rad: rad, squash: squash, u: best, dir: dir, turned: 0, total: turns,
      // one lap takes ~1.7–2.6 s whatever the size of the object
      lapMs: Math.max(1700, Math.min(2600, perimeter * 2.4)), blend: 0,
      until: performance.now() + turns * 3200,
    };
  }

  function maybeTrick(now) {
    for (var i = 0; i < accents.length; i++) {
      var ac = accents[i];
      if (ac.done) continue;
      var r = ac.rect();
      if (r && fullyOnScreen(r)) { ac.done = true; startOrbit(r, ac.turns, ac.pad); return; }
    }
    var tiles = qa(".cat__btn");
    if (!videoDone && tiles.length) {
      if (videoPick === null) videoPick = Math.floor(Math.random() * tiles.length);
      var vt = tiles[videoPick];
      // circle the video together with its caption, so the loop never cuts through it
      var vr = vt && union(box(vt), textRect(vt.parentNode.querySelector(".cat__label")));
      if (vr && fullyOnScreen(vr) && vr.top < H * 0.45) { videoDone = true; startOrbit(vr, 2, 18); return; }
    }
    if (captionsLeft > 0 && now > nextCaption && Math.random() < 0.02) {
      var labels = qa(".cat__label").map(textRect).filter(function (r) { return r && nearLead(r); });
      if (labels.length) {
        captionsLeft--; nextCaption = now + 5000;
        // a flat oval: wide around the words, close above and below (the video is just above)
        startOrbit(labels[Math.floor(Math.random() * labels.length)], 1, 18, 7);
        return;
      }
    }
    if (now > nextCurl && Math.random() < 0.012 && freeAround(head.x, head.y - window.scrollY, 48)) {
      var r0 = 18 + Math.random() * 18, side = Math.random() < 0.5 ? 1 : -1;
      mode = "curl";
      m = { cx: head.x + r0 * side, cy: head.y, r: r0, a: side > 0 ? Math.PI : 0, dir: side, turned: 0, total: Math.PI * 2 * (1.2 + Math.random() * 0.5) };
      nextCurl = now + 6000 + Math.random() * 6000;
    }
  }

  function freeAround(x, vy, rad) {
    return obstacles().every(function (r) {
      return x + rad < r.left - CLEAR || x - rad > r.right + CLEAR || vy + rad < r.top - CLEAR || vy - rad > r.bottom + CLEAR;
    });
  }

  // In a horizontal band, pick the x in free space closest to where the
  // line would like to wander.
  function freeX(obs, vy, wantX, fromX) {
    var blocks = [];
    obs.forEach(function (r) {
      if (vy > r.top - CLEAR - 6 && vy < r.bottom + CLEAR + 6) blocks.push([r.left - CLEAR, r.right + CLEAR]);
    });
    if (!blocks.length) return wantX;
    blocks.sort(function (a, b) { return a[0] - b[0]; });
    var free = [], x = 3;
    blocks.forEach(function (b) { if (b[0] > x + 2) free.push([x, b[0]]); x = Math.max(x, b[1]); });
    if (W - 3 > x + 2) free.push([x, W - 3]);
    if (!free.length) return wantX < W / 2 ? 3 : W - 3;
    // stay in the gap nearest to where the line already is (never jump
    // across a video); inside that gap, wander toward wantX
    var gap = null, gapD = Infinity;
    free.forEach(function (f) {
      var d = fromX < f[0] ? f[0] - fromX : fromX > f[1] ? fromX - f[1] : 0;
      if (d < gapD) { gapD = d; gap = f; }
    });
    return Math.max(gap[0], Math.min(gap[1], wantX));
  }



  // ---------- simulation ----------
  function step(now) {
    var dt = Math.min(40, now - (last || now)); last = now;
    var sy = window.scrollY;
    var scrolling = now - lastScroll < 350;
    var obs = obstacles();

    if (mode === "follow") {
      // the guide leads a little below mid-screen; how far below "breathes",
      // so the line sometimes rushes ahead and sometimes lags behind
      var ty = sy + H * (LEAD + 0.07 * Math.sin(now * 0.0011 + ph[0]));
      var wantX = W / 2 + wander(now) * (W / 2 - 24);
      // look ahead so it moves aside before an element reaches it
      var hereX = freeX(obs, guide.y - sy, wantX, guide.x);
      var tx = hereX;
      for (var look = 40; look <= 200; look += 40) tx = freeX(obs, guide.y - sy + look, tx, guide.x);
      var k = Math.min(1, 0.0032 * pace(now) * dt);
      guide.y += (ty - guide.y) * k;
      // drift slowly while the way is clear, sidestep quickly when something is ahead
      guide.x += (tx - guide.x) * Math.min(1, k * (Math.abs(tx - hereX) > 1 || Math.abs(tx - guide.x) > 40 ? 6 : 1.6));
      if (scrolling) maybeTrick(now);
    } else if (mode === "orbit") {
      var w = dt / m.lapMs * (0.8 + 0.3 * pace(now));
      m.u += m.dir * w; m.turned += w; m.blend = Math.min(1, m.blend + dt / 300);
      var o = ringPoint(m.hw, m.hh, m.rad, m.u);
      if (m.squash < 1) o.y = o.y / (m.hh + m.rad) * (m.hh + m.rad * m.squash); // flatter loop
      guide.x += (m.cx + o.x - guide.x) * m.blend;
      guide.y += (m.cy + o.y - guide.y) * m.blend;
      var cyv = m.cy - sy; // done, the object left the screen, or it took too long
      if (m.turned >= m.total || cyv < -H * 0.1 || cyv > H * 1.1 || now > m.until) mode = "follow";
    } else {
      var w2 = 0.0065 * dt;
      m.a += m.dir * w2; m.turned += w2;
      var rr = m.r * (1 - 0.55 * (m.turned / m.total)); // tightening spiral
      guide.x = m.cx + Math.cos(m.a) * rr;
      guide.y = m.cy + Math.sin(m.a) * rr;
      if (m.turned >= m.total || Math.abs(m.cy - sy - H / 2) > H * 0.65) mode = "follow";
    }
    guide.x = Math.max(3, Math.min(W - 3, guide.x));

    if (mode === "orbit" && m.blend >= 1) {
      // on an orbit the outline is already smooth (rounded corners) – follow
      // it exactly so the line never cuts a corner into the object
      vel.x = (guide.x - head.x) / Math.max(dt, 1); vel.y = (guide.y - head.y) / Math.max(dt, 1);
      head.x = guide.x; head.y = guide.y;
    } else {
      // critically damped spring toward the guide – rounds every corner
      var ax = SPRING * SPRING * (guide.x - head.x) - 2 * SPRING * vel.x;
      var ay = SPRING * SPRING * (guide.y - head.y) - 2 * SPRING * vel.y;
      vel.x += ax * dt; vel.y += ay * dt;
      head.x += vel.x * dt; head.y += vel.y * dt;
    }
    head.x = Math.max(2, Math.min(W - 2, head.x));

    var lp = points[points.length - 1];
    if (!lp || Math.hypot(lp.x - head.x, lp.y - head.y) > 2) points.push({ x: head.x, y: head.y, t: now });
    while (points.length && now - points[0].t > TAIL_MS) points.shift();

    draw(now, sy);

    var settled = mode === "follow" && !scrolling && Math.hypot(guide.x - head.x, guide.y - head.y) < 2 && Math.abs(sy + H * LEAD - guide.y) < H * 0.1;
    if (settled && points.length < 2) { raf = null; last = 0; ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(step);
  }

  // ---------- drawing ----------
  // The tail is drawn in a few bands of equal opacity, each band one
  // continuous smoothed path with flat ends – no overlapping round caps,
  // so there are no brighter dots along the line.
  var BANDS = 14;
  function draw(now, sy) {
    ctx.clearRect(0, 0, W, H);
    var n = points.length;
    if (n < 3) return;
    ctx.lineWidth = LINE; ctx.lineJoin = "round"; ctx.lineCap = "butt";
    var per = Math.max(2, Math.ceil(n / BANDS));
    for (var s = 0; s < n - 1; s += per) {
      var e = Math.min(n - 1, s + per);
      var life = 1 - (now - points[e].t) / TAIL_MS;
      if (life <= 0) continue;
      ctx.strokeStyle = "rgba(" + COLOR + "," + (Math.pow(life, 1.3) * 0.85).toFixed(3) + ")";
      ctx.beginPath();
      // start exactly where the previous band ended (the midpoint before point s)
      if (s === 0) ctx.moveTo(points[0].x, points[0].y - sy);
      else ctx.moveTo((points[s - 1].x + points[s].x) / 2, (points[s - 1].y + points[s].y) / 2 - sy);
      for (var i = Math.max(1, s); i < e; i++) {
        var a = points[i], b = points[i + 1];
        ctx.quadraticCurveTo(a.x, a.y - sy, (a.x + b.x) / 2, (a.y + b.y) / 2 - sy);
      }
      if (e === n - 1) ctx.lineTo(points[e].x, points[e].y - sy);
      ctx.stroke();
    }
  }

  function wake() {
    lastScroll = performance.now();
    if (!raf) {
      var sy = window.scrollY;
      if (head.y < sy - H || head.y > sy + 2 * H) { head.y = guide.y = sy + H * 0.1; guide.x = head.x; points = []; vel.x = 0; vel.y = 0; }
      raf = requestAnimationFrame(step);
    }
  }
  window.addEventListener("scroll", wake, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; last = 0; }
  });
})();
