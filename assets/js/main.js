(function () {
  "use strict";

  var SITE = window.SITE;
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = "ru";

  // ---------- helpers ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "class") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function svg(markup) {
    var t = document.createElement("template");
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  var CLOVER = '<svg class="marquee__sep" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="6.6" r="5"/><circle cx="17.4" cy="12" r="5"/><circle cx="12" cy="17.4" r="5"/><circle cx="6.6" cy="12" r="5"/></svg>';
  var PLAY = '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  // ---------- language ----------
  function t(key) { return SITE.i18n[lang][key]; }

  function applyLang(next) {
    lang = next;
    root.lang = lang;
    document.title = t("metaTitle");
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
      node.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var p = pair.split(":");
        node.setAttribute(p[0], t(p[1]));
      });
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    renderMarquee();
    renderCats();
    if (openCat) renderSheet(openCat);
  }

  function initialLang() {
    var saved = store("lang");
    if (saved === "ru" || saved === "en") return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "ru";
    return /^(ru|uk|be|kk)/i.test(nav) ? "ru" : "en";
  }

  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = b.getAttribute("data-lang");
      if (next === lang) return;
      store("lang", next);
      if (reduceMotion) { applyLang(next); return; }
      // fade the copy out, swap it, fade back in
      root.classList.add("is-switching");
      setTimeout(function () {
        applyLang(next);
        requestAnimationFrame(function () { root.classList.remove("is-switching"); });
      }, 180);
    });
  });

  // ---------- marquee ----------
  function renderMarquee() {
    var track = document.getElementById("marquee");
    track.textContent = "";
    for (var copy = 0; copy < 2; copy++) {
      var group = el("div", { class: "marquee__group" });
      if (copy) group.setAttribute("aria-hidden", "true");
      SITE.brands[lang].forEach(function (b) {
        var item = el("div", { class: "marquee__item" });
        b.names.forEach(function (n) { item.appendChild(el("span", { class: "marquee__name", text: n })); });
        item.appendChild(el("span", { class: "marquee__note", text: b.note }));
        group.appendChild(item);
        group.appendChild(svg(CLOVER));
      });
      track.appendChild(group);
    }
  }

  // ---------- category tiles ----------
  // Preview loops: every tile on screen plays at once; tiles that scroll away
  // pause (and resume where they were), so only visible videos use the decoder.
  // Files load shortly before a tile reaches the viewport and stay cached.
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var stillsOnly = reduceMotion || saveData;
  var visible = new Set();

  function playSafe(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {}); // autoplay blocked (e.g. iOS Low Power): poster stays
  }

  var previewObserver = !stillsOnly && "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var v = entry.target;
      if (entry.isIntersecting) {
        if (!v.getAttribute("src")) { v.src = v.dataset.src; v.preload = "auto"; }
        visible.add(v);
        if (!document.hidden) playSafe(v);
      } else {
        visible.delete(v);
        v.pause();
      }
    });
  }, { rootMargin: "400px 0px" }) : null;

  // Stop decoding when the tab is in the background; resume on return.
  document.addEventListener("visibilitychange", function () {
    visible.forEach(function (v) { if (document.hidden) v.pause(); else playSafe(v); });
  });

  function placeholder(note, withMeter) {
    var ph = el("div", { class: "placeholder", "aria-hidden": "true" });
    ph.appendChild(el("span", { class: "placeholder__note", text: note }));
    if (withMeter) {
      var m = el("div", { class: "meter" });
      for (var i = 0; i < 5; i++) m.appendChild(el("i"));
      ph.appendChild(m);
    }
    return ph;
  }

  function renderCats() {
    var grid = document.getElementById("cats");
    if (previewObserver) previewObserver.disconnect();
    visible.clear();
    grid.textContent = "";
    SITE.categories.forEach(function (cat) {
      var label = cat.title[lang];
      var btn = el("button", { type: "button", class: "cat__btn", "aria-label": label, "data-cursor": "arrow" });
      btn.style.background = cat.tint || "#141414";
      if (cat.poster) {
        // Poster sits under the video, so there is never a black frame while it loads.
        btn.appendChild(el("img", { src: cat.poster, alt: "", decoding: "async" }));
      }
      if (cat.preview && previewObserver) {
        var v = el("video", {
          muted: "", loop: "", playsinline: "", autoplay: "", preload: "none",
          disablepictureinpicture: "", disableremoteplayback: "", "aria-hidden": "true",
        });
        v.muted = true;
        v.dataset.src = cat.preview;
        v.addEventListener("playing", function () { v.classList.add("is-ready"); }, { once: true });
        previewObserver.observe(v);
        btn.appendChild(v);
      } else if (!cat.poster) {
        btn.appendChild(placeholder(t("previewNote"), true));
      }
      btn.appendChild(el("span", { class: "vignette" }));
      btn.addEventListener("click", function () { openSheet(cat); });
      grid.appendChild(el("div", { class: "cat" }, [btn, el("div", { class: "cat__label", text: label, "aria-hidden": "true" })]));
    });
  }

  // ---------- category sheet ----------
  var sheet = document.getElementById("sheet");
  var openCat = null;
  var lastTrigger = null;

  function renderSheet(cat) {
    document.getElementById("sheet-title").textContent = cat.title[lang];
    var cards = document.getElementById("cards");
    cards.className = "cards" + (cat.format === "vertical" ? " cards--vertical" : "");
    cards.textContent = "";
    cat.projects.forEach(function (p) {
      var title = p.title[lang];
      var btn = el("button", { type: "button", class: "card__btn", "aria-label": t("watch") + ": " + title, "data-cursor": "play" });
      if (p.poster) btn.appendChild(el("img", { src: p.poster, alt: "", loading: "lazy", decoding: "async" }));
      else btn.appendChild(placeholder("[poster]", false));
      btn.appendChild(el("span", { class: "vignette" }));
      var play = el("span", { class: "card__play" });
      play.appendChild(svg(PLAY));
      btn.appendChild(play);
      btn.addEventListener("click", function () { playProject(btn, p); });
      cards.appendChild(el("div", { class: "card" }, [btn, el("div", { class: "card__caption", text: title + " (" + t("role") + ")" })]));
    });
  }

  function playProject(btn, p) {
    if (btn.classList.contains("is-playing")) return;
    if (!p.kinescope) {
      if (!btn.querySelector(".card__soon")) {
        var soon = el("span", { class: "card__soon", text: t("soon") });
        btn.appendChild(soon);
        setTimeout(function () { soon.remove(); }, 2200);
      }
      return;
    }
    btn.classList.add("is-playing");
    btn.removeAttribute("data-cursor");
    btn.textContent = "";
    btn.appendChild(el("iframe", {
      src: "https://kinescope.io/embed/" + encodeURIComponent(p.kinescope) + "?autoplay=1",
      title: p.title[lang],
      allow: "autoplay; fullscreen; picture-in-picture; encrypted-media",
      allowfullscreen: "",
    }));
  }

  function openSheet(cat) {
    openCat = cat;
    lastTrigger = document.activeElement;
    renderSheet(cat);
    root.classList.add("html-locked");
    if (sheet.showModal) sheet.showModal(); else sheet.setAttribute("open", "");
    sheet.scrollTop = 0;
  }
  function closeSheet() {
    if (!sheet.open || sheet.classList.contains("is-closing")) return;
    if (reduceMotion) { finishClose(); return; }
    sheet.classList.add("is-closing");
    setTimeout(finishClose, 260);
  }
  function finishClose() {
    sheet.classList.remove("is-closing");
    if (sheet.close) sheet.close(); else sheet.removeAttribute("open");
  }
  // Esc: animate out instead of the browser's instant close
  sheet.addEventListener("cancel", function (e) { e.preventDefault(); closeSheet(); });
  sheet.addEventListener("close", function () {
    openCat = null;
    root.classList.remove("html-locked");
    document.getElementById("cards").textContent = ""; // stops any playing video
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
  });
  document.getElementById("sheet-close").addEventListener("click", closeSheet);

  // ---------- clover cursor ----------
  var cursor = document.getElementById("cursor");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    root.classList.add("has-cursor");
    var x = -100, y = -100, cx = -100, cy = -100, idle;
    window.addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      cursor.classList.add("is-visible");
      clearTimeout(idle);
      idle = setTimeout(function () { cursor.classList.remove("is-visible"); }, 3000);
      var target = e.target.closest ? e.target.closest("[data-cursor]") : null;
      var mode = target ? target.getAttribute("data-cursor") : "";
      cursor.classList.toggle("is-play", mode === "play");
      cursor.classList.toggle("is-arrow", mode === "arrow");
    }, { passive: true });
    document.addEventListener("pointerleave", function () { cursor.classList.remove("is-visible"); });
    (function loop() {
      cx += (x - cx) * (reduceMotion ? 1 : 0.35);
      cy += (y - cy) * (reduceMotion ? 1 : 0.35);
      cursor.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      requestAnimationFrame(loop);
    })();
    // the cursor element must sit above the modal dialog's top layer
    sheet.addEventListener("close", function () { document.body.appendChild(cursor); });
    var origOpen = openSheet;
    openSheet = function (cat) { origOpen(cat); sheet.appendChild(cursor); };
  }

  // ---------- language capsule: vertically centred on the brand strip ----------
  var marquee = document.querySelector(".marquee");
  function placeLang() { root.style.setProperty("--marquee-h", marquee.offsetHeight + "px"); }
  placeLang();
  // the strip grows once its font has loaded
  if ("ResizeObserver" in window) new ResizeObserver(placeLang).observe(marquee);
  else window.addEventListener("resize", placeLang);

  // ---------- smooth in-page scrolling ----------
  // Eased like native iOS/Android scrolling: quick start, long soft landing.
  // Duration grows with distance; any wheel/touch/key input hands control back.
  var scrollAnim = null;
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function stopScrollAnim() { if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; } }
  function smoothScrollTo(targetY) {
    stopScrollAnim();
    var startY = window.scrollY;
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var endY = Math.max(0, Math.min(targetY, maxY));
    var dist = endY - startY;
    if (reduceMotion || Math.abs(dist) < 2) { window.scrollTo(0, endY); return; }
    var duration = Math.min(1100, Math.max(450, Math.abs(dist) * 0.45));
    var ease = Math.abs(dist) > window.innerHeight ? easeInOutCubic : easeOutQuint;
    var t0 = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, startY + dist * ease(t));
      scrollAnim = t < 1 ? requestAnimationFrame(step) : null;
    })(t0);
  }
  ["wheel", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, stopScrollAnim, { passive: true });
  });
  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var id = link.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : document.body;
    if (!target) return;
    e.preventDefault();
    smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - 24);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    // move keyboard focus without a second jump
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  // ---------- misc ----------
  document.getElementById("year").textContent = String(new Date().getFullYear());
  applyLang(initialLang());
})();
