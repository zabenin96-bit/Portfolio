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

  // Both languages are stacked in the same spot and only the active one is
  // visible, so every label always reserves room for its longer version and
  // nothing on the page moves when the language changes.
  function bi(ru, en) {
    return el("span", { class: "i18n" }, [el("span", { lang: "ru", text: ru }), el("span", { lang: "en", text: en })]);
  }

  function applyLang(next) {
    lang = next;
    root.lang = lang;
    document.title = t("metaTitle");
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      if (node.querySelector(".i18n")) return; // already holds both languages
      var key = node.getAttribute("data-i18n");
      node.textContent = "";
      node.appendChild(bi(SITE.i18n.ru[key], SITE.i18n.en[key]));
    });
    document.querySelectorAll(".cat__btn").forEach(function (b) {
      b.setAttribute("aria-label", b.dataset[lang]);
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
  // Preview loops. Files load shortly before a tile reaches the screen; a loop
  // plays once at least half of its tile is visible and pauses (keeping its
  // place) otherwise. Starts are staggered so several tiles never begin
  // decoding in the same frame, and weak devices play at most two at a time.
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var stillsOnly = reduceMotion || saveData;
  var lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  var MAX_PLAYING = lowEnd ? 2 : 3;
  var PLAY_RATIO = 0.5;  // share of the tile that must be on screen
  var START_GAP = 150;   // ms between consecutive starts
  var ratios = new Map(); // video -> visible share of its tile
  var previewsPaused = false; // true while the category sheet covers the page
  var nextStart = 0;

  function playSafe(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {}); // autoplay blocked (e.g. iOS Low Power): poster stays
  }

  // Pick the file that matches the tile's real size. Phone-width tiles never
  // need more than 960px (2.5+ device pixels per CSS pixel already), so the
  // 1280px loop is reserved for large tiles on big/retina screens.
  function previewSrc(v) {
    var css = v.parentNode.getBoundingClientRect().width;
    var px = css * (window.devicePixelRatio || 1);
    var d = v.dataset;
    if (px <= 720 && d.srcSmall) return d.srcSmall;
    if ((px <= 1000 || css < 500) && d.srcMedium) return d.srcMedium;
    return d.src;
  }
  function ensureSrc(v) {
    if (!v.getAttribute("src")) { v.src = previewSrc(v); v.preload = "auto"; }
  }

  function startStaggered(v) {
    v._wantPlay = true;
    if (v._startTimer || !v.paused) return;
    var now = performance.now();
    var at = Math.max(now, nextStart);
    nextStart = at + START_GAP;
    v._startTimer = setTimeout(function () {
      v._startTimer = null;
      if (v._wantPlay) { ensureSrc(v); playSafe(v); }
    }, at - now);
  }
  function stopPreview(v) {
    v._wantPlay = false;
    if (v._startTimer) { clearTimeout(v._startTimer); v._startTimer = null; }
    if (!v.paused) v.pause();
  }
  function reconcilePreviews() {
    var candidates = [];
    ratios.forEach(function (r, v) { if (r >= PLAY_RATIO) candidates.push(v); else stopPreview(v); });
    if (document.hidden || previewsPaused) { candidates.forEach(stopPreview); return; }
    candidates.sort(function (a, b) { return ratios.get(b) - ratios.get(a); });
    candidates.forEach(function (v, i) { if (i < MAX_PLAYING) startStaggered(v); else stopPreview(v); });
  }

  var previewObserver = null;
  if (!stillsOnly && "IntersectionObserver" in window) {
    var loadObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { ensureSrc(e.target); loadObserver.unobserve(e.target); }
      });
    }, { rootMargin: "400px 0px" });
    var playObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
      reconcilePreviews();
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    previewObserver = {
      observe: function (v) { loadObserver.observe(v); playObserver.observe(v); },
      disconnect: function () {
        loadObserver.disconnect(); playObserver.disconnect();
        ratios.forEach(function (r, v) { stopPreview(v); });
        ratios.clear();
      },
    };
  }

  // Stop decoding when the tab is in the background; resume on return.
  document.addEventListener("visibilitychange", reconcilePreviews);

  function placeholder(note, withMeter) {
    var ph = el("div", { class: "placeholder", "aria-hidden": "true" });
    var noteEl = el("span", { class: "placeholder__note" });
    if (typeof note === "string") noteEl.textContent = note; else noteEl.appendChild(note);
    ph.appendChild(noteEl);
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
    grid.textContent = "";
    SITE.categories.forEach(function (cat) {
      var btn = el("button", {
        type: "button", class: "cat__btn", "aria-label": cat.title[lang],
        "data-ru": cat.title.ru, "data-en": cat.title.en,
      });
      btn.style.background = cat.tint || "#141414";
      if (cat.poster) {
        // Poster sits under the video, so there is never a black frame while it loads.
        btn.appendChild(el("img", { src: cat.poster, alt: "", decoding: "async" }));
      }
      if (cat.preview && previewObserver) {
        var v = el("video", {
          muted: "", loop: "", playsinline: "", preload: "none", // started by the scheduler, not autoplay
          disablepictureinpicture: "", disableremoteplayback: "", "aria-hidden": "true",
        });
        v.muted = true;
        v.dataset.src = cat.preview;
        if (cat.previewSmall) v.dataset.srcSmall = cat.previewSmall;
        if (cat.previewMedium) v.dataset.srcMedium = cat.previewMedium;
        v.addEventListener("playing", function () { v.classList.add("is-ready"); }, { once: true });
        previewObserver.observe(v);
        btn.appendChild(v);
      } else if (!cat.poster) {
        btn.appendChild(placeholder(bi(SITE.i18n.ru.previewNote, SITE.i18n.en.previewNote), true));
      }
      btn.appendChild(el("span", { class: "vignette" }));
      btn.addEventListener("click", function () { openSheet(cat); });
      grid.appendChild(el("div", { class: "cat" }, [btn, el("div", { class: "cat__label", "aria-hidden": "true" }, [bi(cat.title.ru, cat.title.en)])]));
    });
  }

  // ---------- category sheet ----------
  var sheet = document.getElementById("sheet");
  var openCat = null;
  var lastTrigger = null;

  function renderSheet(cat) {
    var head = document.getElementById("sheet-title");
    head.textContent = "";
    head.appendChild(bi(cat.title.ru, cat.title.en));
    var cards = document.getElementById("cards");
    cards.className = "cards" + (cat.format === "vertical" ? " cards--vertical" : "");
    cards.textContent = "";
    cat.projects.forEach(function (p) {
      var title = p.title[lang];
      var btn = el("button", { type: "button", class: "card__btn", "aria-label": t("watch") + ": " + title });
      if (p.poster) btn.appendChild(el("img", { src: p.poster, alt: "", loading: "lazy", decoding: "async" }));
      else btn.appendChild(placeholder("[poster]", false));
      btn.appendChild(el("span", { class: "vignette" }));
      var play = el("span", { class: "card__play" });
      play.appendChild(svg(PLAY));
      btn.appendChild(play);
      btn.addEventListener("click", function () { playProject(btn, p); });
      var caption = bi(p.title.ru + " (" + SITE.i18n.ru.role + ")", p.title.en + " (" + SITE.i18n.en.role + ")");
      cards.appendChild(el("div", { class: "card" }, [btn, el("div", { class: "card__caption" }, [caption])]));
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
    // nothing behind the sheet is visible – stop decoding those previews
    previewsPaused = true;
    reconcilePreviews();
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
    previewsPaused = false;
    reconcilePreviews();
    document.getElementById("cards").textContent = ""; // stops any playing video
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
  });
  document.getElementById("sheet-close").addEventListener("click", closeSheet);

  // ---------- language button ----------
  // Hidden at the top of the page. It first appears once the first work
  // video has reached the top of the screen; from there on it shows
  // top-right while scrolling and fades 1.5 s after scrolling stops.
  var marquee = document.querySelector(".marquee");
  var langBox = document.querySelector(".lang");
  var LANG_HIDE_DELAY = 1500;
  var LANG_FROM = 12; // px: first tile's top must be at least this close to the screen top
  var langHideTimer = null;
  function hideLangLater() {
    clearTimeout(langHideTimer);
    langHideTimer = setTimeout(function () {
      // keep it while the pointer is on it or it has keyboard focus
      if (langBox.matches(":hover") || langBox.contains(document.activeElement)) { hideLangLater(); return; }
      langBox.classList.remove("is-visible");
    }, LANG_HIDE_DELAY);
  }
  function langZoneReached() {
    var first = document.querySelector(".cat__btn");
    return first ? first.getBoundingClientRect().top <= LANG_FROM : window.scrollY > window.innerHeight;
  }
  function onScrollLang() {
    var active = langZoneReached();
    langBox.classList.toggle("is-floating", active);
    if (!active) { clearTimeout(langHideTimer); langBox.classList.remove("is-visible"); return; }
    langBox.classList.add("is-visible");
    hideLangLater();
  }
  window.addEventListener("scroll", onScrollLang, { passive: true });
  langBox.addEventListener("click", function () { if (langBox.classList.contains("is-floating")) hideLangLater(); });

  // the brand strip stops animating while it is off screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      marquee.classList.toggle("is-offscreen", !entries[0].isIntersecting);
    }).observe(marquee);
  }

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
  lang = initialLang();
  renderCats();
  applyLang(lang);
})();
