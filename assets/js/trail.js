/*
 * Scroll trail: a thin white line that travels down the page as you scroll.
 * It drifts and changes pace, passes the work videos along their sides
 * rather than across them, circles the page's accents once (the studio name
 * and Nata's name), circles one of the videos twice, and now and then curls
 * in open space before carrying on downward.
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

  var COLOR = "#ffffff";
  var LINE = 1.3;          // px, constant along the whole line
  var TAIL_MS = 1600;      // how long a point of the tail stays visible
  var LEAD = 0.58;         // where the head heads for, as a share of the viewport height
  var SIDE_GAP = 9;        // px between a video's edge and the line passing it
  var W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var head = { x: W / 2, y: window.scrollY + H * 0.3 };
  var points = [];          // tail: {x, y, t} in page coordinates
  var mode = "follow";      // follow | orbit | curl
  var m = null;             // state of the current orbit / curl
  var nextCurl = 0;
  var lastScroll = 0, raf = null, last = 0;

  // accents the line circles once per visit: the studio name block and Nata's name
  var accents = [
    { sel: [".masthead__title", ".masthead__sub"], turns: 1, done: false },
    { sel: [".about__head .eyebrow", ".about__lead"], turns: 1, done: false },
  ];
  var videoTurnsDone = false;     // one video gets two full circles per visit
  var videoPick = null;           // which tile (index), chosen once tiles exist

  var ph = [Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3];
  function wander(t) {
    return Math.sin(t * 0.00031 + ph[0]) * 0.55 + Math.sin(t * 0.00073 + ph[1]) * 0.3 + Math.sin(t * 0.0017 + ph[2]) * 0.15;
  }
  function pace(t) { // 0.35 .. 1.6: moments of rushing and of lingering
    var s = Math.sin(t * 0.0009 + ph[3]) * 0.5 + Math.sin(t * 0.0023 + ph[1]) * 0.5;
    return 0.35 + (s + 1) * 0.62;
  }

  function tiles() { return document.querySelectorAll(".cat__btn"); }

  // tight box around the actual text of the given elements (not their
  // full-width blocks): the union of each element's text range
  function textBox(selectors) {
    var box = null;
    selectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var r = document.createRange();
      r.selectNodeContents(el.querySelector(".i18n") || el);
      var b = r.getBoundingClientRect();
      if (!b.width) b = el.getBoundingClientRect();
      box = box ? { left: Math.min(box.left, b.left), top: Math.min(box.top, b.top), right: Math.max(box.right, b.right), bottom: Math.max(box.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    });
    if (box) { box.width = box.right - box.left; box.height = box.bottom - box.top; }
    return box;
  }

  function inBand(r) { // well inside the screen, near where the line is heading
    var c = r.top + r.height / 2;
    return r.top > H * 0.08 && r.bottom < H * 0.94 && Math.abs(c - H * LEAD) < H * 0.3;
  }

  function startOrbit(r, turns, pad) {
    var sy = window.scrollY;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2 + sy;
    var rx = Math.min(r.width / 2 + pad, W / 2 - 3), ry = r.height / 2 + pad;
    mode = "orbit";
    m = {
      cx: cx, cy: cy, rx: rx, ry: ry,
      a: Math.atan2((head.y - cy) / ry, (head.x - cx) / rx),
      dir: Math.random() < 0.5 ? 1 : -1, turned: 0, total: Math.PI * 2 * turns, blend: 0,
      speed: turns > 1 ? 1.15 : 1,
    };
  }

  function maybeStartTrick(now) {
    for (var i = 0; i < accents.length; i++) {
      var a = accents[i];
      if (a.done) continue;
      var r = textBox(a.sel);
      if (!r) continue;
      // accents only need to be fully on screen (the title starts near the top)
      if (r.top > H * 0.04 && r.bottom < H * 0.96) { a.done = true; startOrbit(r, a.turns, 22); return; }
    }
    var t = tiles();
    if (!videoTurnsDone && t.length) {
      if (videoPick === null) videoPick = Math.floor(Math.random() * t.length);
      var vr = t[videoPick] && t[videoPick].getBoundingClientRect();
      if (vr && inBand(vr)) { videoTurnsDone = true; startOrbit(vr, 2, 12); return; }
    }
    // an occasional curl, only in open space
    if (now > nextCurl && Math.random() < 0.012 && !overTile(head.y - window.scrollY)) {
      var r0 = 16 + Math.random() * 22, side = Math.random() < 0.5 ? 1 : -1;
      mode = "curl";
      m = { cx: head.x + r0 * side, cy: head.y, r: r0, a: side > 0 ? Math.PI : 0, dir: side, turned: 0, total: Math.PI * 2 * (1.2 + Math.random() * 0.6) };
      nextCurl = now + 6000 + Math.random() * 6000;
    }
  }

  function overTile(vy) {
    var t = tiles();
    for (var i = 0; i < t.length; i++) {
      var r = t[i].getBoundingClientRect();
      if (vy > r.top - 10 && vy < r.bottom + 10) return true;
    }
    return false;
  }

  // Next to videos, keep x in the free space beside them (closest to where
  // the line wants to wander); elsewhere wander freely.
  function sideX(vy, wantX) {
    var t = tiles(), blocks = [];
    for (var i = 0; i < t.length; i++) {
      var r = t[i].getBoundingClientRect();
      if (vy > r.top - 10 && vy < r.bottom + 10) blocks.push([r.left - SIDE_GAP, r.right + SIDE_GAP]);
    }
    if (!blocks.length) return wantX;
    blocks.sort(function (a, b) { return a[0] - b[0]; });
    var free = [], x = 2;
    blocks.forEach(function (b) { if (b[0] > x) free.push([x, b[0]]); x = Math.max(x, b[1]); });
    if (W - 2 > x) free.push([x, W - 2]);
    if (!free.length) return wantX < W / 2 ? 2 : W - 2;
    var best = null, bestD = Infinity;
    free.forEach(function (f) {
      var px = Math.max(f[0], Math.min(f[1], wantX)), d = Math.abs(px - wantX);
      if (d < bestD) { bestD = d; best = px; }
    });
    return best;
  }

  function oval(a, rx, ry, n) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: Math.sign(c) * Math.pow(Math.abs(c), n) * rx, y: Math.sign(s) * Math.pow(Math.abs(s), n) * ry };
  }

  function step(now) {
    var dt = Math.min(48, now - (last || now)); last = now;
    var sy = window.scrollY;
    var scrolling = now - lastScroll < 350;

    if (mode === "follow") {
      var targetY = sy + H * LEAD;
      var k = 0.0035 * pace(now) * dt;
      head.y += (targetY - head.y) * Math.min(1, k);
      var wantX = W / 2 + wander(now) * (W / 2 - 24);
      var targetX = sideX(head.y - sy, wantX);
      head.x += (targetX - head.x) * Math.min(1, k * 1.4);
      if (scrolling) maybeStartTrick(now);
    } else if (mode === "orbit") {
      var w = 0.0042 * pace(now) * m.speed * dt;
      m.a += m.dir * w; m.turned += w; m.blend = Math.min(1, m.blend + dt / 380);
      var o = oval(m.a, m.rx, m.ry, 0.62);
      head.x += (m.cx + o.x - head.x) * m.blend;
      head.y += (m.cy + o.y - head.y) * m.blend;
      if (m.turned >= m.total) mode = "follow";
    } else if (mode === "curl") {
      var w2 = 0.009 * dt;
      m.a += m.dir * w2; m.turned += w2;
      var rr = m.r * (1 - 0.55 * (m.turned / m.total)); // tightening spiral
      head.x = m.cx + Math.cos(m.a) * rr;
      head.y = m.cy + Math.sin(m.a) * rr;
      if (m.turned >= m.total) mode = "follow";
    }

    var lp = points[points.length - 1];
    if (!lp || Math.abs(lp.x - head.x) + Math.abs(lp.y - head.y) > 1.2) points.push({ x: head.x, y: head.y, t: now });
    while (points.length && now - points[0].t > TAIL_MS) points.shift();

    draw(now, sy);

    var settled = mode === "follow" && !scrolling && Math.abs(sy + H * LEAD - head.y) < 2;
    if (settled && points.length < 2) { raf = null; last = 0; ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(step);
  }

  function draw(now, sy) {
    ctx.clearRect(0, 0, W, H);
    if (points.length < 2) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = COLOR; ctx.lineWidth = LINE;
    // same width everywhere; only the opacity fades towards the tail
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var life = 1 - (now - b.t) / TAIL_MS;
      if (life <= 0) continue;
      ctx.globalAlpha = Math.pow(life, 1.4) * 0.85;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - sy);
      ctx.lineTo(b.x, b.y - sy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function wake() {
    lastScroll = performance.now();
    if (!raf) {
      var sy = window.scrollY;
      if (head.y < sy - H || head.y > sy + 2 * H) { head.y = sy + H * 0.1; points = []; }
      raf = requestAnimationFrame(step);
    }
  }
  window.addEventListener("scroll", wake, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; last = 0; }
  });
})();
