/*
 * Scroll trail: one fixed, planned route through the page that a thin white
 * line travels along as you scroll – like a bead on a thread.
 *
 * The route is built from the live layout (so it fits phones and desktops):
 *   1. a loop around the studio name,
 *   2. down a side lane next to the work videos, crossing to the other side
 *      in the free gap below each row,
 *   3. two loops around one video (with its caption),
 *   4. a flat loop around one caption while crossing between rows,
 *   5. a loop around Nata's photo and name,
 *   6. a loop around the "Have an idea?" circle, where it ends.
 * Corners are rounded and loops are entered and left along their tangent, so
 * the path is one smooth curve. The scroll position picks the place on the
 * route; scrolling back moves the line back.
 *
 * As a safety net the line is erased wherever it would cross an element, so
 * it reads as passing behind content. Skipped for reduced motion and on
 * low-end devices; draws only while something is happening.
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
  var LINE = 1.3;        // px, the same along the whole line
  var TAIL = 460;        // px of route visible behind the head
  var STEP = 3;          // px between route samples
  var FILLET = 46;       // px, how much the route's corners are rounded
  var LEAD = 0.55;       // where the head sits on screen on straight parts (share of height)
  var IDLE_MS = 1600;    // after this long without movement the line fades out
  var W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- page geometry (page coordinates) ----------
  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function pageRect(b) { var sy = window.scrollY; return { left: b.left, right: b.right, top: b.top + sy, bottom: b.bottom + sy }; }
  function boxOf(el) { return el ? pageRect(el.getBoundingClientRect()) : null; }
  function textOf(el) {
    if (!el) return null;
    var r = document.createRange();
    r.selectNodeContents(el.querySelector(".i18n") || el);
    var b = r.getBoundingClientRect();
    if (!b.width) b = el.getBoundingClientRect();
    return b.width ? pageRect(b) : null;
  }
  function union(a, b) {
    if (!a) return b; if (!b) return a;
    return { left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) };
  }

  // ---------- rounded-rectangle ring ----------
  // A ring keeps exactly r px around a box. u runs 0..1 once around
  // clockwise, starting at the left end of the top edge.
  function ringInfo(rect, r) {
    var hw = (rect.right - rect.left) / 2, hh = (rect.bottom - rect.top) / 2;
    var SH = 2 * hw, SV = 2 * hh, A = Math.PI * r / 2, T = 2 * SH + 2 * SV + 4 * A;
    return {
      cx: (rect.left + rect.right) / 2, cy: (rect.top + rect.bottom) / 2, hw: hw, hh: hh, r: r, T: T,
      u: {
        topStart: 0, topEnd: SH / T,
        rightStart: (SH + A) / T, rightEnd: (SH + A + SV) / T,
        bottomStart: (SH + 2 * A + SV) / T, bottomEnd: (2 * SH + 2 * A + SV) / T,
        leftStart: (2 * SH + 3 * A + SV) / T, leftEnd: (2 * SH + 3 * A + 2 * SV) / T,
      },
    };
  }
  function ringAt(g, u) {
    var hw = g.hw, hh = g.hh, r = Math.max(g.r, 0.001), SH = 2 * hw, SV = 2 * hh, A = Math.PI * g.r / 2;
    var d = (((u % 1) + 1) % 1) * g.T, p;
    if (d <= SH) p = { x: -hw + d, y: -hh - r };
    else if ((d -= SH) <= A) { var a1 = -Math.PI / 2 + d / r; p = { x: hw + Math.cos(a1) * r, y: -hh + Math.sin(a1) * r }; }
    else if ((d -= A) <= SV) p = { x: hw + r, y: -hh + d };
    else if ((d -= SV) <= A) { var a2 = d / r; p = { x: hw + Math.cos(a2) * r, y: hh + Math.sin(a2) * r }; }
    else if ((d -= A) <= SH) p = { x: hw - d, y: hh + r };
    else if ((d -= SH) <= A) { var a3 = Math.PI / 2 + d / r; p = { x: -hw + Math.cos(a3) * r, y: hh + Math.sin(a3) * r }; }
    else if ((d -= A) <= SV) p = { x: -hw - r, y: hh - d };
    else { d -= SV; var a4 = Math.PI + d / r; p = { x: -hw + Math.cos(a4) * r, y: -hh + Math.sin(a4) * r }; }
    return { x: g.cx + p.x, y: g.cy + p.y };
  }

  // ---------- route builder ----------
  // ctl: control points. Plain points get rounded off (corner: true); loop
  // points are dense samples carrying the scroll range of their loop.
  var ctl;
  function pt(x, y, round) { ctl.push({ x: x, y: y, corner: true, round: round }); }
  function loop(g, uFrom, uTo, keys) {
    var n = Math.max(2, Math.ceil(Math.abs(uTo - uFrom) * g.T / STEP));
    for (var i = 0; i <= n; i++) {
      var p = ringAt(g, uFrom + (uTo - uFrom) * i / n);
      ctl.push({ x: p.x, y: p.y, k: keys[0] + (keys[1] - keys[0]) * i / n });
    }
  }
  // scroll range in which the object sits well on screen while it is circled
  function loopKeys(rect, from, to) {
    var c = (rect.top + rect.bottom) / 2;
    var a = c - H * from, b = c - H * to;
    // keep the whole object on screen while the line goes round it
    var lo = rect.bottom + 30 - H, hi = rect.top - 30;
    if (hi > lo) { a = Math.min(Math.max(a, lo), hi); b = Math.min(Math.max(b, lo), hi); }
    return [Math.max(0, a), Math.max(0, b)];
  }
  // a big object is circled while it passes the middle of the screen – at
  // eye level – from the moment its centre is at 3/4 of the screen height
  // until it is at 1/4 (and never while part of it is off screen)
  function viewKeys(rect) { return loopKeys(rect, 0.75, 0.25); }

  // Go down a lane past `rect`, circling it `laps` times on the way. The
  // ring is joined along the side it shares with the lane, so the joins are
  // tangent; if the lane is further out, the line bends over to the ring first.
  function ringOnLane(rect, r, side, laps, laneX, keys, exitLen) {
    var g = ringInfo(rect, r);
    var sideX = side === "L" ? rect.left - r : rect.right + r;
    // bend over from the lane to the ring's side within the room that is
    // left above it – always moving onward, never back up
    var prevY = ctl.length ? ctl[ctl.length - 1].y : rect.top - 100;
    var room = rect.top - prevY;
    if (Math.abs(sideX - laneX) > 1 && room > 30) { pt(laneX, prevY + room * 0.3); pt(sideX, prevY + room * 0.75); }
    if (side === "R") loop(g, g.u.rightStart, g.u.rightEnd + laps, keys);
    else loop(g, g.u.leftEnd, g.u.leftStart - laps, keys);
    // leave along the same side for a moment, so the turn after it is rounded
    if (exitLen !== 0) pt(ctl[ctl.length - 1].x, rect.bottom + (exitLen || 24));
  }

  // Cross horizontally at `y` from fromX to toX; optionally make one flat loop
  // around a caption whose ring's bottom edge lies on that crossing.
  function crossing(y, fromX, toX, caption, keys, round) {
    pt(fromX, y, round);
    if (caption) {
      var g = ringInfo(caption, caption.r);
      if (toX > fromX) loop(g, g.u.bottomEnd, g.u.bottomStart - 1, keys);
      else loop(g, g.u.bottomStart, g.u.bottomEnd + 1, keys);
    }
    pt(toX, y, round);
  }

  function buildRoute() {
    ctl = [];
    var tiles = qa(".cat");
    var title = union(textOf(q(".masthead__title")), textOf(q(".masthead__sub")));
    if (!tiles.length || !title) return null;

    // rows of tiles (a tile wrapper includes its caption)
    var rows = [];
    tiles.forEach(function (el) {
      var b = boxOf(el), lastRow = rows[rows.length - 1];
      if (lastRow && Math.abs(lastRow.top - b.top) < 6) { lastRow.items.push(b); lastRow.bottom = Math.max(lastRow.bottom, b.bottom); }
      else rows.push({ top: b.top, bottom: b.bottom, items: [b] });
    });
    rows.forEach(function (row, i) {
      row.items.sort(function (a, b) { return a.left - b.left; });
      var free = [], x = 0;
      row.items.forEach(function (it) { if (it.left - x >= 8) free.push((x + it.left) / 2); x = it.right; });
      if (W - x >= 8) free.push((x + W) / 2);
      // alternate sides row by row: left lane, right lane, left lane...
      row.lane = free.length ? free[i % 2 === 0 ? 0 : free.length - 1] : 6;
      row.laneOffset = Math.min.apply(null, row.items.map(function (it) {
        return Math.min(Math.abs(row.lane - it.left), Math.abs(row.lane - it.right));
      }));
    });

    // 1. start on a loop around the studio name, leave it along its bottom edge
    var tg = ringInfo(title, 20);
    // done before the top of the ring scrolls off the screen
    var titleEnd = Math.min(Math.max(140, Math.min(260, tg.cy - H * 0.25)), Math.max(40, tg.cy - tg.hh - tg.r - 14));
    loop(tg, tg.u.topStart, tg.u.bottomEnd + 1, [0, titleEnd]);
    pt(rows[0].lane, title.bottom + 20);

    // 2–4. down the lanes, crossing between rows
    var ringRow = Math.min(1, rows.length - 1);
    var capRow = rows.length >= 4 ? 3 : 0;
    rows.forEach(function (row, i) {
      if (i === ringRow) {
        // two loops around the video next to this row's lane
        var dist = function (it) { return Math.min(Math.abs(row.lane - it.left), Math.abs(row.lane - it.right)); };
        var near = row.items.reduce(function (a, b) { return dist(a) <= dist(b) ? a : b; });
        var side = row.lane < (near.left + near.right) / 2 ? "L" : "R";
        var r = Math.max(6, Math.min(row.laneOffset, 18));
        // between rows the crossing right below rounds the exit itself
        ringOnLane(near, r, side, W < 760 ? 1 : 2, row.lane, viewKeys(near), rows[i + 1] ? 0 : 24);
      }
      var next = rows[i + 1];
      if (!next) return;
      var y = (row.bottom + next.top) / 2, cap = null;
      if (i === capRow) {
        // the caption this crossing passes under, between the two lanes
        var lo = Math.min(row.lane, next.lane), hi = Math.max(row.lane, next.lane);
        var labelEl = qa(".cat__label").filter(function (l) {
          var b = textOf(l); return b && Math.abs(b.bottom - row.bottom) < 40 && b.left > lo && b.right < hi;
        })[0];
        var lb = textOf(labelEl), above = labelEl && boxOf(labelEl.parentNode.querySelector(".cat__btn"));
        if (lb && above) {
          var cr = Math.max(4, Math.min(8, lb.top - above.bottom - 5));
          cap = { left: lb.left - 22 + cr, right: lb.right + 22 - cr, top: lb.top, bottom: y - cr, r: cr };
        }
      }
      // corners on a crossing stay inside the gap between the rows
      crossing(y, row.lane, next.lane, cap, cap ? loopKeys(cap, 0.68, 0.3) : null, Math.max(10, (next.top - row.bottom) / 2 - 3));
    });
    var lastRow = rows[rows.length - 1], laneX = lastRow.lane;
    // finish the work section on the lane before bending toward anything else
    pt(laneX, lastRow.bottom + 24);

    // 5. a loop around Nata's photo and name (or the photo alone if the
    //    bigger loop would run into the text beside it)
    var photo = boxOf(q(".about__photo"));
    var name = union(textOf(q(".about__head .eyebrow")), textOf(q(".about__lead")));
    var body = qa(".about__body > span").map(textOf).filter(Boolean);
    var around = union(photo, name);
    var clash = around && body.some(function (b) {
      return b.top < around.bottom + 14 && b.bottom > around.top && b.right > around.left && b.left < around.right;
    });
    var about = clash ? photo : around;
    var exitX = laneX;
    if (about) {
      var side2 = laneX < (about.left + about.right) / 2 ? "L" : "R";
      var r2 = Math.max(8, Math.min(16, side2 === "L" ? about.left - 6 : W - about.right - 6));
      ringOnLane(about, r2, side2, 1, laneX, viewKeys(about));
      var bodyBottom = body.length ? Math.max.apply(null, body.map(function (b) { return b.bottom; })) : about.bottom;
      // past the text, but leaving room to turn toward the circle below
      var ctaEl = q(".cta"), ctaTop = ctaEl ? boxOf(ctaEl).top - 22 : Infinity;
      var after = Math.max(bodyBottom + 20, about.bottom + 24);
      if (after > ctaTop - 70) after = (Math.max(bodyBottom, about.bottom) + ctaTop) / 2;
      // keep to the ring's own side, so the line runs on without a jog
      laneX = exitX = ctl[ctl.length - 1].x;
      pt(laneX, after);
    }

    // 6. around the "Have an idea?" circle, entered at its top along a level line
    var cta = boxOf(q(".cta"));
    if (cta) {
      var R = (cta.right - cta.left) / 2 + 22;
      var cx = (cta.left + cta.right) / 2, cy = (cta.top + cta.bottom) / 2;
      var cg = ringInfo({ left: cx, right: cx, top: cy, bottom: cy }, R);
      pt(exitX, cy - R);
      var keys = viewKeys(cta);
      if (exitX < cx) loop(cg, 0, 1.25, keys); else loop(cg, 0, -1.25, keys);
    }
    return finish();
  }

  // round the corners, resample evenly, and give every sample its scroll key
  function finish() {
    var pts = [];
    for (var i = 0; i < ctl.length; i++) {
      var c = ctl[i];
      if (!c.corner || i === 0 || i === ctl.length - 1) { pts.push(c); continue; }
      var a = ctl[i - 1], b = ctl[i + 1];
      var da = Math.hypot(c.x - a.x, c.y - a.y), db = Math.hypot(b.x - c.x, b.y - c.y);
      if (da < 0.5 || db < 0.5) continue;
      var t = Math.min(c.round || FILLET, da * 0.5, db * 0.5);
      var p1 = { x: c.x + (a.x - c.x) * t / da, y: c.y + (a.y - c.y) * t / da };
      var p2 = { x: c.x + (b.x - c.x) * t / db, y: c.y + (b.y - c.y) * t / db };
      for (var s = 0; s <= 10; s++) {
        var f = s / 10, mf = 1 - f;
        pts.push({ x: mf * mf * p1.x + 2 * mf * f * c.x + f * f * p2.x, y: mf * mf * p1.y + 2 * mf * f * c.y + f * f * p2.y });
      }
    }
    // resample every STEP px; loop samples carry their keys
    var out = [{ x: pts[0].x, y: pts[0].y, k: pts[0].k }], acc = 0;
    for (var j = 1; j < pts.length; j++) {
      var p = pts[j - 1], n = pts[j], d = Math.hypot(n.x - p.x, n.y - p.y);
      acc += d;
      while (acc >= STEP) {
        acc -= STEP;
        var f2 = d ? 1 - acc / d : 1;
        var k = p.k !== undefined && n.k !== undefined ? p.k + (n.k - p.k) * f2 : undefined;
        out.push({ x: p.x + (n.x - p.x) * f2, y: p.y + (n.y - p.y) * f2, k: k });
      }
    }
    // between two loops the line moves at an even pace, so it arrives at
    // each accent exactly when its loop is due
    var lastKeyed = -1;
    for (var q2 = 0; q2 < out.length; q2++) {
      if (out[q2].k === undefined) continue;
      if (lastKeyed >= 0 && q2 - lastKeyed > 1) {
        var ka = out[lastKeyed].k, kb = out[q2].k;
        var ya = out[lastKeyed].y, yb = out[q2].y, dy = yb - ya;
        for (var g2 = lastKeyed + 1; g2 < q2; g2++) {
          // mostly by height (keeps it on screen), a little by length (so
          // level stretches still take some scroll)
          var byLen = (g2 - lastKeyed) / (q2 - lastKeyed);
          var byY = dy > 1 ? Math.min(1, Math.max(0, (out[g2].y - ya) / dy)) : byLen;
          out[g2].k = ka + (kb - ka) * (byY * 0.75 + byLen * 0.25);
        }
      }
      lastKeyed = q2;
    }
    // before the first and after the last loop the head stays at LEAD on
    // screen; keys never go back
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - H);
    var prev = 0;
    for (var m = 0; m < out.length; m++) {
      var key = out[m].k !== undefined ? out[m].k : out[m].y - H * LEAD;
      key = Math.max(key, prev + (m ? STEP * 0.02 : 0));
      out[m].k = prev = key;
    }
    // squeeze the end so the route finishes exactly at the bottom of the page
    var lastK = out[out.length - 1].k;
    if (lastK > maxScroll) {
      var from = out.length - 1;
      for (var z = 0; z < out.length; z++) if (out[z].k > maxScroll - H * 0.9) { from = z; break; }
      var k0 = out[from].k, base = Math.min(k0, maxScroll - 1), span = lastK - k0 || 1;
      for (var z2 = from; z2 < out.length; z2++) out[z2].k = base + (out[z2].k - k0) / span * (maxScroll - base);
    }
    return out;
  }

  // ---------- following the route ----------
  var route = null, sHead = 0, lastMove = 0, raf = null, last = 0, fade = 0;

  function targetFor(scroll) {
    if (scroll <= route[0].k) return 0;
    if (scroll >= route[route.length - 1].k) return route.length - 1;
    var lo = 0, hi = route.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (route[mid].k <= scroll) lo = mid; else hi = mid; }
    var a = route[lo].k, b = route[hi].k;
    return lo + (b > a ? (scroll - a) / (b - a) : 0);
  }
  function at(s) {
    var i = Math.max(0, Math.min(route.length - 1, Math.floor(s))), j = Math.min(route.length - 1, i + 1), f = s - i;
    return { x: route[i].x + (route[j].x - route[i].x) * f, y: route[i].y + (route[j].y - route[i].y) * f };
  }

  // elements the line must never be drawn over (viewport coordinates)
  function obstacles() {
    var list = [];
    function add(b, extra) { if (b && b.width) list.push(Object.assign({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }, extra || {})); }
    qa(".cat__btn").forEach(function (el) { add(el.getBoundingClientRect(), { round: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12 }); });
    qa(".about__photo").forEach(function (el) { add(el.getBoundingClientRect(), { round: 10 }); });
    [".cat__label", ".masthead__title", ".masthead__sub", ".about__lead", ".about__head .eyebrow", ".about__body > span", ".footer__grid > *", ".footer__links a", ".footer__word"].forEach(function (s) {
      qa(s).forEach(function (el) { var r = document.createRange(); r.selectNodeContents(el.querySelector(".i18n") || el); add(r.getBoundingClientRect()); });
    });
    [".cta", ".spinner"].forEach(function (s) { var el = q(s); if (el) add(el.getBoundingClientRect(), { circle: true }); });
    return list.filter(function (r) { return r.bottom > -40 && r.top < H + 40; });
  }

  function step(now) {
    var dt = Math.min(40, now - (last || now)); last = now;
    if (!route) { raf = null; return; }
    var sy = window.scrollY;
    var target = targetFor(sy);
    var diff = target - sHead;
    if (Math.abs(diff) * STEP > 2500) {
      sHead = target - Math.sign(diff) * 140 / STEP; // long jump: arrive from just behind
    } else {
      // ease toward the target, never faster than ~4 px/ms along the route
      var ds = diff * (1 - Math.exp(-dt / 70)), cap = 4 * dt / STEP;
      sHead += Math.max(-cap, Math.min(cap, ds));
    }
    var moving = Math.abs(target - sHead) > 0.05;
    if (moving) lastMove = now;
    fade = now - lastMove < IDLE_MS ? Math.min(1, fade + dt / 200) : Math.max(0, fade - dt / 700);
    draw(sy);
    if (fade <= 0 && !moving) { raf = null; last = 0; ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(step);
  }

  var BANDS = 14;
  function draw(sy) {
    ctx.clearRect(0, 0, W, H);
    if (fade <= 0) return;
    var tailS = Math.max(0, sHead - TAIL / STEP);
    var i0 = Math.floor(tailS), i1 = Math.floor(sHead);
    if (i1 - i0 < 2) return;
    var pts = [];
    for (var i = i0; i <= i1; i++) pts.push({ x: route[i].x, y: route[i].y - sy, life: (i - tailS) / (sHead - tailS) });
    var h = at(sHead); pts.push({ x: h.x, y: h.y - sy, life: 1 });
    ctx.lineWidth = LINE; ctx.lineJoin = "round"; ctx.lineCap = "butt";
    // a few bands of equal opacity, each one continuous smooth path: one
    // width, no brighter dots where pieces would otherwise overlap
    var n = pts.length, per = Math.max(2, Math.ceil(n / BANDS));
    for (var s = 0; s < n - 1; s += per) {
      var e = Math.min(n - 1, s + per);
      ctx.strokeStyle = "rgba(" + COLOR + "," + (Math.pow(Math.max(0, pts[e].life), 1.3) * 0.85 * fade).toFixed(3) + ")";
      ctx.beginPath();
      if (s === 0) ctx.moveTo(pts[0].x, pts[0].y);
      else ctx.moveTo((pts[s - 1].x + pts[s].x) / 2, (pts[s - 1].y + pts[s].y) / 2);
      for (var k = Math.max(1, s); k < e; k++) {
        var a = pts[k], b = pts[k + 1];
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      if (e === n - 1) ctx.lineTo(pts[e].x, pts[e].y);
      ctx.stroke();
    }
    // safety net: the line passes behind every element
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    obstacles().forEach(function (r) {
      var g = 3, x = r.left - g, y = r.top - g, w = r.right - r.left + 2 * g, hh = r.bottom - r.top + 2 * g;
      ctx.beginPath();
      if (r.circle) ctx.arc(x + w / 2, y + hh / 2, Math.min(w, hh) / 2, 0, Math.PI * 2);
      else roundRect(x, y, w, hh, (r.round || 3) + g);
      ctx.fill();
    });
    ctx.restore();
  }
  function roundRect(x, y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function wake() {
    lastMove = performance.now();
    if (!raf && route) raf = requestAnimationFrame(step);
  }

  // the route follows the layout: rebuild when sizes or fonts change
  var rebuildTimer = null;
  function rebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () {
      resize();
      route = buildRoute();
      if (route) sHead = targetFor(window.scrollY);
    }, 120);
  }
  resize();
  rebuild();
  window.addEventListener("resize", rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  if ("ResizeObserver" in window) new ResizeObserver(rebuild).observe(document.body);
  window.addEventListener("scroll", wake, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; last = 0; }
  });
})();
