/*
 * Scroll trail: one fixed, planned route through the page that a thin white
 * line travels along as you scroll – like a bead on a thread.
 *
 * The route is built from the live layout (so it fits phones and desktops):
 *   1. a loop around "Sound design studio" under the name,
 *   2. down a side lane next to the work videos, crossing to the other side
 *      in the free gap below each row,
 *   3. a loop around one video,
 *   4. a flat loop around one caption while crossing between rows,
 *   5. a loop around Nata's photo and name,
 *   6. a loop around the "Have an idea?" circle, where it ends.
 * Corners are rounded and loops are entered and left along their tangent, so
 * the path is one smooth curve. On straight parts the head keeps one height
 * on screen and goes down with the scroll; once an object reaches eye level
 * the line plays its loop at its own pace and then catches up. Scrolling back
 * moves the line back.
 *
 * The line is an SVG laid over the whole document, so it moves with the
 * page and never lags behind the scroll. Skipped for reduced motion and on
 * low-end devices; updates only while the line itself is moving.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  if (reduceMotion || lowEnd || !window.requestAnimationFrame) return;

  // The line lives in the page itself (an SVG over the whole document), so
  // it scrolls together with the content and stays fixed in its place, even
  // on jerky scrolling – nothing is redrawn just because the page moved.
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "trail");
  svg.setAttribute("aria-hidden", "true");
  var group = document.createElementNS(NS, "g");
  group.setAttribute("fill", "none");
  svg.appendChild(group);
  document.body.appendChild(svg);

  var COLOR = "255, 255, 255";
  var LINE = 1.3;        // px, the same along the whole line
  var TAIL = 460;        // px of route visible behind the head
  var STEP = 3;          // px between route samples
  var FILLET = 46;       // px, how much the route's corners are rounded
  var LEAD = 0.72;       // where the head sits on screen on straight parts (share of height)
  var EYE = 0.66;        // an accent starts when its object's centre is this high on screen
  var SPEED = 0.6;       // px/ms – the line's own pace along the route
  var IDLE_MS = 1600;    // after this long without movement the line fades out
  var W = 0, H = 0;

  function resize() {
    // On phones the address bar slides in and out while scrolling and
    // changes the window height a little – keep the old height then, so
    // the route does not shift under the line mid-scroll.
    var w = window.innerWidth, h = window.innerHeight;
    if (w !== W || !H || Math.abs(h - H) > H * 0.25) H = h;
    W = w;
    // cover the whole document (measured without the SVG itself)
    svg.style.height = "0px";
    var docH = document.documentElement.scrollHeight;
    svg.style.width = document.documentElement.clientWidth + "px";
    svg.style.height = docH + "px";
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
  // an accent starts once its object reaches eye level; the loop itself
  // then plays out at the line's own pace, and the line catches up after
  function loopKeys(rect) {
    var k = Math.max(0, (rect.top + rect.bottom) / 2 - H * EYE);
    return [k, k];
  }
  var viewKeys = loopKeys;

  // Go down a lane past `rect`, circling it `laps` times on the way. The
  // ring is joined along the side it shares with the lane, so the joins are
  // tangent; if the lane is further out, the line bends over to the ring first.
  function ringOnLane(rect, r, side, laps, laneX, keys, exitLen) {
    var g = ringInfo(rect, r);
    var sideX = side === "L" ? rect.left - r : rect.right + r;
    // cross over from the lane to the ring's side along a level line in the
    // room that is left above it – like the crossings between rows
    var prevY = ctl.length ? ctl[ctl.length - 1].y : rect.top - 100;
    var room = rect.top - prevY;
    if (Math.abs(sideX - laneX) > 1 && room > 30) {
      var shift = Math.abs(sideX - laneX);
      if (shift < 60) {
        // a small step over (phones): a soft slant reads smoother
        pt(laneX, prevY + room * 0.3); pt(sideX, prevY + room * 0.75);
      } else {
        // below the middle, clear of the thin divider above the section
        var ym = prevY + room * 0.7, rnd = Math.max(8, Math.min(FILLET, room * 0.26));
        pt(laneX, ym, rnd); pt(sideX, ym, rnd);
      }
    }
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

    // 1. start on a loop around "Sound design studio" under the name (the
    //    name itself sits too high to be circled in time), drawn right away
    //    when the page opens; leave it along its bottom edge
    var sub = textOf(q(".masthead__sub")) || title;
    var nameBottom = (textOf(q(".masthead__title")) || sub).bottom;
    var subR = Math.max(6, Math.min(12, sub.top - nameBottom - 6));
    var sg = ringInfo({ left: sub.left - 14, right: sub.right + 14, top: sub.top, bottom: sub.bottom }, subR);
    // (keys below zero: already due at the very top of the page)
    loop(sg, sg.u.topStart, sg.u.bottomEnd + 1, [-H, -H]);
    // a level line out to the lane, then down it beside the videos
    var subExitY = sub.bottom + subR;
    pt(rows[0].lane, subExitY, Math.max(8, Math.min(FILLET, (rows[0].top - subExitY) * 0.8)));
    pt(rows[0].lane, rows[0].top + 20);

    // 2–4. down the lanes, crossing between rows
    var ringRow = Math.min(1, rows.length - 1);
    var capRow = rows.length >= 4 ? 3 : 0;
    // the ring row's lane runs exactly along the side of its ring, so the
    // crossing above leads straight into the loop without an extra bend
    var rr = rows[ringRow];
    var rdist = function (it) { return Math.min(Math.abs(rr.lane - it.left), Math.abs(rr.lane - it.right)); };
    var near = rr.items.reduce(function (a, b) { return rdist(a) <= rdist(b) ? a : b; });
    var side = rr.lane < (near.left + near.right) / 2 ? "L" : "R";
    var r = Math.max(6, Math.min(rr.laneOffset, 18));
    rr.lane = side === "L" ? near.left - r : near.right + r;
    rows.forEach(function (row, i) {
      if (i === ringRow) {
        // one loop around the video next to this row's lane
        // (between rows the crossing right below rounds the exit itself)
        ringOnLane(near, r, side, 1, row.lane, viewKeys(near), rows[i + 1] ? 0 : 24);
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
      crossing(y, row.lane, next.lane, cap, cap ? loopKeys(cap) : null, Math.max(10, (next.top - row.bottom) / 2 - 3));
    });
    var lastRow = rows[rows.length - 1], laneX = lastRow.lane;
    // finish the work section on the lane before bending toward anything else
    // (unless a loop has just left the last row – then go on from there)
    var tail = ctl[ctl.length - 1];
    if (tail.y >= lastRow.bottom) laneX = tail.x;
    else pt(laneX, lastRow.bottom + 24);

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
      // (the contact block starts with the small line above the button)
      var ctaEl = q(".contact__kicker") || q(".cta"), ctaTop = ctaEl ? boxOf(ctaEl).top - 22 : Infinity;
      var after = Math.max(bodyBottom + 20, about.bottom + 24);
      if (after > ctaTop - 70) after = (Math.max(bodyBottom, about.bottom) + ctaTop) / 2;
      // keep to the ring's own side, so the line runs on without a jog
      laneX = exitX = ctl[ctl.length - 1].x;
      pt(laneX, after);
    }

    // 6. around the "Have an idea?" capsule. It is joined at its outer end,
    //    coming straight down beside it, so the line never crosses the small
    //    line of text above the button
    var cta = boxOf(q(".cta"));
    if (cta) {
      // the ring keeps 18px around the button, less on narrow phones so it
      // stays on screen
      var half = (cta.bottom - cta.top) / 2;
      var R = half + Math.max(8, Math.min(18, Math.min(cta.left, W - cta.right) - 6));
      var cx = (cta.left + cta.right) / 2, cy = (cta.top + cta.bottom) / 2;
      var cg = ringInfo({ left: cta.left + half, right: cta.right - half, top: cy, bottom: cy }, R);
      var keys = viewKeys(cta);
      var left = exitX < cx, sideX = left ? cta.left + half - R : cta.right - half + R;
      // step over in the free room below the text and above the small line
      // over the button (first moving the last corner down into that room)
      var last = ctl[ctl.length - 1], kick = textOf(q(".contact__kicker"));
      var kTop = (kick ? kick.top : cta.top) - 14;
      var stepY = Math.min(kTop, last.y + Math.max(30, (kTop - last.y) * 0.5));
      if (stepY > last.y + 10) last.y = stepY;
      if (Math.abs(last.x - sideX) < 60) pt(sideX, Math.min(kTop, last.y + 40)); // a slight slant
      else pt(sideX, last.y);                                                   // a level step
      // down the outer end of the ring and round it once and a quarter
      if (left) loop(cg, cg.u.leftStart, cg.u.leftStart - 1.25, keys);
      else loop(cg, cg.u.rightStart, cg.u.rightStart + 1.25, keys);
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
    // straight parts follow the scroll (the head stays at LEAD on screen);
    // keys never go back
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - H);
    var prev = -Infinity;
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

  // the route point closest to p, looked for near the old place along the
  // route (a double loop passes the same spot twice)
  function nearest(p, hint) {
    var best = 0, bd = Infinity;
    var from = Math.max(0, Math.floor(hint) - 600), to = Math.min(route.length, Math.floor(hint) + 600);
    for (var i = from; i < to; i++) {
      var d = (route[i].x - p.x) * (route[i].x - p.x) + (route[i].y - p.y) * (route[i].y - p.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
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

  function step(now) {
    var dt = Math.min(40, now - (last || now)); last = now;
    if (!route) { raf = null; return; }
    var sy = window.scrollY;
    var target = targetFor(sy);
    var diff = target - sHead;
    if (Math.abs(diff) * STEP > 2500) {
      sHead = target - Math.sign(diff) * 140 / STEP; // long jump: arrive from just behind
    } else {
      // ease toward the target, never faster than SPEED along the route
      var ds = diff * (1 - Math.exp(-dt / 420)), cap = SPEED * dt / STEP;
      sHead += Math.max(-cap, Math.min(cap, ds));
    }
    var moving = Math.abs(target - sHead) > 0.05;
    if (moving) lastMove = now;
    fade = now - lastMove < IDLE_MS ? Math.min(1, fade + dt / 200) : Math.max(0, fade - dt / 700);
    draw();
    if (fade <= 0 && !moving) { raf = null; last = 0; return; }
    raf = requestAnimationFrame(step);
  }

  // a few bands of equal opacity, each one continuous smooth path: one
  // width, no brighter dots where pieces would otherwise overlap
  var BANDS = 14, bands = [];
  for (var bi = 0; bi < BANDS; bi++) {
    var path = document.createElementNS(NS, "path");
    path.setAttribute("stroke", "rgb(" + COLOR + ")");
    path.setAttribute("stroke-width", LINE);
    path.setAttribute("stroke-linejoin", "round");
    group.appendChild(path);
    bands.push(path);
  }
  var shown = "";
  function f1(v) { return Math.round(v * 10) / 10; }
  function draw() {
    group.setAttribute("opacity", fade.toFixed(3));
    var tailS = Math.max(0, sHead - TAIL / STEP);
    var i0 = Math.floor(tailS), i1 = Math.floor(sHead);
    var key = fade > 0 && i1 - i0 >= 2 ? i0 + ":" + sHead.toFixed(2) : "";
    if (key === shown) return;
    shown = key;
    if (!key) { bands.forEach(function (b) { b.setAttribute("d", ""); }); return; }
    // route points are in page coordinates – exactly the SVG's own
    var pts = [];
    for (var i = i0; i <= i1; i++) pts.push({ x: route[i].x, y: route[i].y, life: (i - tailS) / (sHead - tailS) });
    var h = at(sHead); pts.push({ x: h.x, y: h.y, life: 1 });
    var n = pts.length, per = Math.max(2, Math.ceil(n / BANDS)), b = 0;
    for (var s = 0; s < n - 1; s += per, b++) {
      var e = Math.min(n - 1, s + per), d;
      if (s === 0) d = "M" + f1(pts[0].x) + " " + f1(pts[0].y);
      else d = "M" + f1((pts[s - 1].x + pts[s].x) / 2) + " " + f1((pts[s - 1].y + pts[s].y) / 2);
      for (var k = Math.max(1, s); k < e; k++) {
        var a = pts[k], c = pts[k + 1];
        d += "Q" + f1(a.x) + " " + f1(a.y) + " " + f1((a.x + c.x) / 2) + " " + f1((a.y + c.y) / 2);
      }
      if (e === n - 1) d += "L" + f1(pts[e].x) + " " + f1(pts[e].y);
      bands[b].setAttribute("d", d);
      bands[b].setAttribute("stroke-opacity", (Math.pow(Math.max(0, pts[e].life), 1.3) * 0.85).toFixed(3));
    }
    for (; b < BANDS; b++) bands[b].setAttribute("d", "");
  }

  function wake() {
    lastMove = performance.now();
    if (!raf && route) raf = requestAnimationFrame(step);
  }

  // the route follows the layout: rebuild when sizes or fonts change
  var rebuildTimer = null, built = false;
  function rebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () {
      var was = route && built ? at(sHead) : null, wasS = sHead;
      resize();
      var next = buildRoute();
      if (!next) return;
      route = next;
      // the first time, the line draws itself round the subtitle as the page opens
      if (!built && window.scrollY < 40) { sHead = 0; wake(); }
      // later rebuilds (late images, fonts, resizes) keep the line where it
      // is instead of making it jump to a new place
      else if (was) { sHead = nearest(was, wasS); shown = ""; draw(); }
      else sHead = targetFor(window.scrollY);
      built = true;
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
