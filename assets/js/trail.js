/*
 * Scroll trail: a thin comet-like line that travels down the page as you
 * scroll. It drifts sideways, speeds up and slows down, now and then circles
 * one of the work tiles or curls in place, then carries on downward.
 *
 * Runs only while something is happening: it starts on scroll and stops
 * drawing once the line has settled and its tail has faded. Skipped for
 * reduced motion and on low-end devices.
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

  var ACCENT = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff5a2e";
  var TAIL_MS = 1500;      // how long a point of the tail stays visible
  var LEAD = 0.58;         // where the head heads for, as a share of the viewport height
  var W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // head position in page coordinates
  var head = { x: W / 2, y: window.scrollY + H * 0.3 };
  var points = [];          // tail: {x, y, t} in page coordinates
  var mode = "follow";      // follow | orbit | curl
  var m = null;             // state of the current orbit / curl
  var nextTrick = 0;        // earliest time for the next orbit / curl
  var lastScroll = 0, raf = null, last = 0;

  // smooth pseudo-random wandering: a few slow sines with random phases
  var ph = [Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3];
  function wander(t) {
    return Math.sin(t * 0.00031 + ph[0]) * 0.55 + Math.sin(t * 0.00073 + ph[1]) * 0.3 + Math.sin(t * 0.0017 + ph[2]) * 0.15;
  }
  function pace(t) { // 0.35 .. 1.6: moments of rushing and of lingering
    var s = Math.sin(t * 0.0009 + ph[3]) * 0.5 + Math.sin(t * 0.0023 + ph[1]) * 0.5;
    return 0.35 + (s + 1) * 0.62;
  }

  function visibleTile() {
    var tiles = document.querySelectorAll(".cat__btn"), best = null, bestD = Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var r = tiles[i].getBoundingClientRect();
      if (r.top < H * 0.12 || r.bottom > H * 0.92) continue; // must be well inside the screen
      var d = Math.abs(r.top + r.height / 2 - H * LEAD);
      if (d < bestD) { bestD = d; best = r; }
    }
    return best;
  }

  function startTrick(now) {
    var tile = Math.random() < 0.6 ? visibleTile() : null;
    var sy = window.scrollY;
    if (tile) {
      var cx = tile.left + tile.width / 2, cy = tile.top + tile.height / 2 + sy;
      mode = "orbit";
      m = {
        cx: cx, cy: cy, rx: tile.width / 2 + 14, ry: tile.height / 2 + 14,
        a: Math.atan2((head.y - cy) / (tile.height / 2 + 14), (head.x - cx) / (tile.width / 2 + 14)),
        dir: Math.random() < 0.5 ? 1 : -1, turned: 0, total: Math.PI * 2 * (1 + Math.random() * 0.35),
        blend: 0,
      };
    } else {
      mode = "curl";
      var r0 = 18 + Math.random() * 26, side = Math.random() < 0.5 ? 1 : -1;
      m = { cx: head.x + r0 * side, cy: head.y, r: r0, a: side > 0 ? Math.PI : 0, dir: side, turned: 0, total: Math.PI * 2 * (1.3 + Math.random() * 0.8) };
    }
    nextTrick = now + 4500 + Math.random() * 5000;
  }

  // superellipse: an oval that hugs a rounded rectangle
  function oval(a, rx, ry) {
    var c = Math.cos(a), s = Math.sin(a), n = 0.6;
    return { x: Math.sign(c) * Math.pow(Math.abs(c), n) * rx, y: Math.sign(s) * Math.pow(Math.abs(s), n) * ry };
  }

  function step(now) {
    var dt = Math.min(48, now - (last || now)); last = now;
    var sy = window.scrollY;
    var scrolling = now - lastScroll < 350;

    if (mode === "follow") {
      var targetY = sy + H * LEAD;
      var targetX = W / 2 + wander(now) * (W / 2 - 28);
      var k = 0.0035 * pace(now) * dt;
      head.y += (targetY - head.y) * Math.min(1, k);
      head.x += (targetX - head.x) * Math.min(1, k * 0.8);
      if (scrolling && now > nextTrick && Math.random() < 0.02) startTrick(now);
    } else if (mode === "orbit") {
      var w = 0.0042 * pace(now) * dt;
      m.a += m.dir * w; m.turned += w; m.blend = Math.min(1, m.blend + dt / 350);
      var o = oval(m.a, m.rx, m.ry);
      var px = m.cx + o.x, py = m.cy + o.y;
      head.x += (px - head.x) * m.blend; head.y += (py - head.y) * m.blend;
      if (m.turned >= m.total) mode = "follow";
    } else if (mode === "curl") {
      var w2 = 0.009 * dt;
      m.a += m.dir * w2; m.turned += w2;
      var rr = m.r * (1 - 0.55 * (m.turned / m.total)); // tightening spiral
      head.x = m.cx + Math.cos(m.a) * rr;
      head.y = m.cy + Math.sin(m.a) * rr;
      if (m.turned >= m.total) mode = "follow";
    }

    // record the tail
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
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = ACCENT;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var life = 1 - (now - b.t) / TAIL_MS;
      if (life <= 0) continue;
      ctx.globalAlpha = Math.pow(life, 1.6) * 0.9;
      ctx.lineWidth = 0.6 + 1.8 * life;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - sy);
      ctx.lineTo(b.x, b.y - sy);
      ctx.stroke();
    }
    // glowing head while it is moving
    var hl = 1 - (now - points[points.length - 1].t) / TAIL_MS;
    if (hl > 0) {
      ctx.globalAlpha = 0.9 * hl;
      ctx.fillStyle = ACCENT;
      ctx.beginPath(); ctx.arc(head.x, head.y - sy, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function wake() {
    lastScroll = performance.now();
    if (!raf) {
      // after a long pause, start the line from just above the screen edge
      // instead of letting it crawl across half the page
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
