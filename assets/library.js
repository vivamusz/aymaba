/* AYMABA — Библиотека карточек и печать в одном месте (по образцу upecs.ru, упрощено под специалиста).
   Порядок работы: 1) размер листа  2) отметить карточки в любых темах (поиск — сразу по всем)  3) печать / PDF / Word.
   Разделы (#...): library, set, sets, settings, help.
   Данные: data/cards.json; превью cards/<id>.webp (только для выбора), печать — print/<id>.webp (1063 px).
   Подписи: русская берётся из карточки; казахская по умолчанию ПУСТАЯ (черновики kk не проверены — не подставляем).
   Наборы хранятся в браузере (localStorage). Свои фото не сохраняются (только до закрытия страницы). */
(function () {
  var S = window.AYMABA_SHEETS, t = window.AYMABA_T;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "aymaba-sets-v2", OLD_KEY = "aymaba-print-v1";
  var VIEWS = ["library", "set", "sets", "settings", "help"];
  var READY = ["глаголы", "еда", "фрукты", "овощи", "домашние животные"];   // «Готовые наборы» = целая тема одной кнопкой
  var DATA = null, byId = {}, cat = "all", uid = 0, repIndex = -1;
  var store = { cur: "", sets: [] };
  var st = null;   // текущий набор: { id, name, sheet, cap, cut, fname, items: [null | item] }

  function fmt(k, o) { var s = t(k); Object.keys(o || {}).forEach(function (x) { s = s.split("{" + x + "}").join(o[x]); }); return s; }
  function norm(s) { return (s || "").toLowerCase().replace(/ё/g, "е").trim(); }
  function sheet() { return S.SHEETS[st.sheet] || S.SHEETS["9"]; }
  function filled(items) { return (items || st.items).filter(Boolean).length; }
  function trim() { while (st.items.length && !st.items[st.items.length - 1]) st.items.pop(); }
  function compact() { st.items = st.items.filter(Boolean); }
  function newId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function plural(key, n) {
    var f = t(key).split("|"); if (f.length < 3) return f[0];
    var a = n % 10, b = n % 100; return f[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? 1 : 2];
  }
  function sheetsCount(items, sh) { return filled(items) ? S.sheetsOf(items, sh).length : 0; }
  function sumText(items, sheetId) {
    var sh = S.SHEETS[sheetId], n = filled(items), m = sheetsCount(items, sh), per = sh.slots.length;
    if (!n) return fmt("sum.empty", { size: t("size." + sheetId), per: per });
    return fmt("sum.fmt", { n: n, cards: plural("pl.card", n), size: t("size." + sheetId), m: m, sheets: plural("pl.sheet", m), per: per });
  }

  /* ---------- карточки набора ---------- */
  function libItem(c) { return { key: ++uid, kind: "lib", id: c.id, ru: c.ru, kk: "", thumb: "cards/" + c.id + ".webp", hi: "print/" + c.id + ".webp", iw: 1, ih: 1, ox: 0, oy: 0, scale: 1, rot: 0 }; }
  function cloneItem(it) { var o = {}; Object.keys(it).forEach(function (k) { o[k] = it[k]; }); o.key = ++uid; return o; }
  function fileItem(f) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function () { res({ key: ++uid, kind: "file", ru: "", kk: "", thumb: url, hi: url, iw: im.naturalWidth || 1, ih: im.naturalHeight || 1, ox: 0, oy: 0, scale: 1, rot: 0 }); };
      im.onerror = function () { res(null); }; im.src = url;
    });
  }
  function firstFree() { for (var i = 0; i < S.MAX; i++) if (!st.items[i]) return i; return -1; }
  function put(it, at) { var i = at >= 0 ? at : firstFree(); if (i < 0) { msg(t("cp.full")); return false; } st.items[i] = it; return true; }
  function copiesOf(id) { return st.items.filter(function (x) { return x && x.kind === "lib" && x.id === id; }).length; }
  function removeId(id) { st.items = st.items.map(function (x) { return x && x.kind === "lib" && x.id === id ? null : x; }); compact(); }
  function addCopy(i) {
    if (filled() >= S.MAX) { msg(t("cp.full")); return; }
    compact(); st.items.splice(Math.min(i + 1, st.items.length), 0, cloneItem(st.items[i])); changed();
  }

  /* ---------- хранение наборов ---------- */
  function ser(it) {
    if (!it || it.kind !== "lib") return null;
    var o = { id: it.id }, c = byId[it.id];
    if (it.kk) o.kk = it.kk; if (c && it.ru !== c.ru) o.ru = it.ru;
    if (it.ox) o.ox = +it.ox.toFixed(3); if (it.oy) o.oy = +it.oy.toFixed(3);
    if (it.scale && it.scale !== 1) o.sc = it.scale; if (it.rot) o.r = it.rot;
    return o;
  }
  function deser(o) {
    var c = o && byId[o.id]; if (!c) return null;
    var it = libItem(c); if (o.kk) it.kk = o.kk; if (o.ru != null) it.ru = o.ru;
    it.ox = o.ox || 0; it.oy = o.oy || 0; it.scale = o.sc || 1; it.rot = o.r || 0; return it;
  }
  function packSet(x) { return { id: x.id, name: x.name, sheet: x.sheet, cap: x.cap, cut: !!x.cut, fname: x.fname || "", items: x.items.map(ser).filter(Boolean) }; }
  function unpackSet(o) {
    return { id: o.id || newId(), name: o.name || t("sets.default"), sheet: S.SHEETS[o.sheet] ? o.sheet : "9", cap: ["off", "kk", "ru"].indexOf(o.cap) >= 0 ? o.cap : "off",
      cut: !!o.cut, fname: o.fname || "", items: (o.items || []).slice(0, S.MAX).map(deser).filter(Boolean) };
  }
  function save() {
    if (!st) return;
    var i = store.sets.findIndex(function (x) { return x.id === st.id; }), p = packSet(st);
    if (i < 0) store.sets.unshift(p); else store.sets[i] = p;
    store.cur = st.id;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.sets) store = o; } catch (e) {}
    if (!store.sets.length) {   // перенос со старой версии страницы
      try {
        var old = JSON.parse(localStorage.getItem(OLD_KEY) || "null");
        if (old) store.sets.push({ id: newId(), name: t("sets.default"), sheet: old.sheet, cap: old.cap, fname: old.name, items: (old.items || []).filter(Boolean).map(function (x) { return { id: x.id, kk: x.kk, ru: x.ru, ox: x.ox, oy: x.oy, sc: x.scale }; }) });
      } catch (e) {}
    }
    if (!store.sets.length) store.sets.push({ id: newId(), name: t("sets.default"), sheet: "9", cap: "off", items: [] });
    var cur = store.sets.find(function (x) { return x.id === store.cur; }) || store.sets[0];
    st = unpackSet(cur);
  }
  function switchTo(id) {
    save(); var o = store.sets.find(function (x) { return x.id === id; }); if (!o) return;
    st = unpackSet(o); store.cur = st.id; save(); renderAll();
  }

  /* ---------- ссылка на набор ---------- */
  function b64e(str) { var b = new TextEncoder().encode(str), s = ""; b.forEach(function (x) { s += String.fromCharCode(x); }); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
  function shareUrl(p) {
    var o = { n: p.name, s: p.sheet, c: p.cap, x: p.cut ? 1 : 0, i: p.items.map(function (x) { var k = Object.keys(x); return k.length === 1 ? x.id : x; }) };
    return location.origin + location.pathname + "?set=" + b64e(JSON.stringify(o)) + "#set";
  }
  function fromShare() {
    var m = /[?&]set=([^&#]+)/.exec(location.search); if (!m) return false;
    try {
      var o = JSON.parse(b64d(decodeURIComponent(m[1])));
      var p = { id: newId(), name: o.n || t("sets.shared"), sheet: o.s, cap: o.c, cut: !!o.x, items: (o.i || []).map(function (x) { return typeof x === "string" ? { id: x } : x; }) };
      save(); st = unpackSet(p); save();
      history.replaceState(null, "", location.pathname + "#set");
      setTimeout(function () { msg(fmt("sets.opened", { name: st.name })); }, 50);
      return true;
    } catch (e) { console.warn(e); return false; }
  }
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return false; });
    return Promise.resolve(false);
  }

  function changed(opts) {
    trim(); save(); renderCounts(); renderMini();
    if (!opts || !opts.keepSheets) { if (view() === "set") renderSheets(); }
    if (!opts || !opts.keepGrid) markGrid();
    if (view() === "sets") renderSets();
  }
  function msg(s) { $("msg").textContent = s || ""; var m2 = $("msg2"); if (m2) m2.textContent = s || ""; }

  /* ---------- разделы ---------- */
  function view() { var v = location.hash.replace(/^#\/?/, ""); return VIEWS.indexOf(v) >= 0 ? v : "library"; }
  function showView() {
    var v = view();
    document.querySelectorAll(".view").forEach(function (s) { s.hidden = s.dataset.v !== v; });
    document.querySelectorAll("[data-view]").forEach(function (a) { if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (v === "set") renderSheets();
    if (v === "sets") renderSets();
    renderCounts(); window.scrollTo(0, 0);
  }

  /* ---------- библиотека ---------- */
  function catCount(num) { return DATA.cards.filter(function (x) { return x.cat === num; }).length; }
  function renderChips() {
    var box = $("chips"); box.innerHTML = "";
    [{ num: "all", ru: t("lib.all") }].concat(DATA.categories).forEach(function (c) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.cat = c.num;
      b.textContent = c.ru + " · " + (c.num === "all" ? DATA.cards.length : catCount(c.num)); b.setAttribute("aria-pressed", String(c.num) === String(cat));
      b.addEventListener("click", function () { cat = c.num; $("q").value = ""; renderChips(); filter(); });
      box.appendChild(b);
    });
    var r = $("ready"); r.querySelectorAll("button").forEach(function (x) { x.remove(); });
    READY.forEach(function (name) {
      var c = DATA.categories.find(function (x) { return norm(x.ru) === name; }); if (!c) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "chip chip-ready";
      b.textContent = "＋ " + c.ru + " (" + catCount(c.num) + ")";
      b.addEventListener("click", function () { addCards(DATA.cards.filter(function (x) { return x.cat === c.num; })); });
      r.appendChild(b);
    });
  }
  function addCards(list) {
    var added = 0, full = false;
    list.forEach(function (c) { if (full || copiesOf(c.id)) return; if (filled() >= S.MAX) { full = true; return; } put(libItem(c)); added++; });
    changed({ keepSheets: view() !== "set" });
    msg(full ? fmt("ready.limit", { n: added, max: S.MAX }) : fmt("ready.added", { n: added }));
  }
  function renderGrid() {
    var frag = document.createDocumentFragment();
    DATA.cards.forEach(function (c) {
      var li = document.createElement("li"); li.dataset.cat = c.cat; li.dataset.q = norm(c.ru); li.dataset.id = c.id;
      var b = document.createElement("button"); b.type = "button"; b.className = "cardbtn"; b.setAttribute("aria-pressed", "false");
      b.draggable = true;   // перетаскивание в «Мой набор» (передаётся только id, не картинка)
      var im = document.createElement("img"); im.src = "cards/" + c.id + ".webp"; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.width = 256; im.height = 256; im.draggable = false;
      var cap = document.createElement("span"); cap.className = "cap"; cap.textContent = c.ru;
      var ok = document.createElement("span"); ok.className = "ok"; ok.setAttribute("aria-hidden", "true"); ok.textContent = "✓";
      b.appendChild(im); b.appendChild(cap); b.appendChild(ok);
      b.addEventListener("click", function () {
        if (repIndex >= 0) { st.items[repIndex] = libItem(c); repIndex = -1; changed(); location.hash = "set"; return; }
        if (copiesOf(c.id)) removeId(c.id); else if (!put(libItem(c))) return;
        changed({ keepSheets: view() !== "set" });
      });
      b.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/x-aymaba-card", c.id); e.dataTransfer.effectAllowed = "copy"; });
      li.appendChild(b); frag.appendChild(li);
    });
    $("grid").appendChild(frag);
  }
  function filter() {
    var s = norm($("q").value), n = 0;
    $("grid").querySelectorAll("li").forEach(function (li) {
      var ok = s ? li.dataset.q.indexOf(s) !== -1 : (cat === "all" || li.dataset.cat === String(cat));   // поиск — по всем темам сразу
      li.hidden = !ok; if (ok) n++;
    });
    $("empty").hidden = n !== 0;
    $("count").textContent = fmt("lib.count", { n: n, total: DATA.cards.length }) + (s ? " · " + t("lib.allcats") : "");
    var c = DATA.categories.find(function (x) { return String(x.num) === String(cat); });
    $("addAll").textContent = !s && c ? fmt("cp.addwhole", { cat: c.ru, n: n }) : t("cp.addcat");
  }
  function markGrid() {
    var cnt = {}; st.items.forEach(function (x) { if (x && x.kind === "lib") cnt[x.id] = (cnt[x.id] || 0) + 1; });
    $("grid").querySelectorAll("li").forEach(function (li) {
      var n = cnt[li.dataset.id] || 0, b = li.querySelector(".cardbtn");
      b.setAttribute("aria-pressed", n ? "true" : "false"); b.querySelector(".ok").textContent = n > 1 ? "×" + n : "✓";
    });
  }

  /* ---------- счётчики, панель «Мой набор» ---------- */
  function renderCounts() {
    var n = filled(), txt = sumText(st.items, st.sheet);
    $("prName").textContent = st.name;
    $("prCount").textContent = "(" + fmt("set.count", { n: n }) + ")";
    document.querySelectorAll("[data-sum]").forEach(function (p) { p.textContent = txt; });
    document.querySelectorAll('[data-badge="set"]').forEach(function (b) { b.textContent = n; b.hidden = !n; });
    document.querySelectorAll("[data-out]").forEach(function (b) { b.disabled = !n; });
    $("setEmpty").hidden = n > 0;
    $("setInfo").textContent = t("cp.info" + st.sheet);
    var ms = $("mobSum"); if (ms) { ms.hidden = !n || view() === "set"; var nav = document.querySelector(".mob-nav"); if (nav) ms.style.bottom = nav.offsetHeight + "px"; }
    document.querySelectorAll("[data-sheet]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.sheet === st.sheet ? "true" : "false"); });
  }
  function renderMini() {   // «живой» лист: по листам, столько столбцов, сколько на бумаге
    var box = $("mini"), sh = sheet(), per = sh.slots.length; box.innerHTML = "";
    if (!filled()) return;
    var pages = Math.ceil(st.items.length / per);
    for (var p = 0; p < pages; p++) {
      var h = document.createElement("p"); h.className = "mini-h"; h.textContent = fmt("cp.sheet", { n: p + 1 }); box.appendChild(h);
      var ul = document.createElement("ul"); ul.className = "mini"; ul.style.gridTemplateColumns = "repeat(" + sh.cols + ",1fr)";
      if (sh.story) ul.classList.add("mini-story");
      for (var k = 0; k < per; k++) {
        var i = p * per + k, it = st.items[i], li = document.createElement("li");
        li.style.aspectRatio = sh.slots[k].w + " / " + sh.slots[k].h;
        if (!it) { li.className = "mini-empty"; ul.appendChild(li); continue; }
        var im = document.createElement("img"); im.src = it.thumb; im.alt = it.ru || ""; im.draggable = false; li.appendChild(im);
        var acts = document.createElement("span"); acts.className = "mini-acts";
        [["+1", "cp.copy", function (j) { addCopy(j); }], ["×", "cp.remove", function (j) { st.items[j] = null; compact(); changed(); }]].forEach(function (a) {
          var b = document.createElement("button"); b.type = "button"; b.textContent = a[0]; b.title = t(a[1]) + (it.ru ? " — " + it.ru : ""); b.setAttribute("aria-label", b.title);
          b.addEventListener("click", (function (j) { return function () { a[2](j); }; })(i)); acts.appendChild(b);
        });
        li.appendChild(acts); ul.appendChild(li);
      }
      box.appendChild(ul);
    }
  }

  /* ---------- листы (Мой набор) ---------- */
  function pct(v, of) { return (v / of * 100) + "%"; }
  function renderSheets() {
    var box = $("sheets"); box.innerHTML = "";
    var sh = sheet(), per = sh.slots.length, n = Math.ceil(Math.max(st.items.length, 1) / per);
    if (!filled()) return;
    for (var p = 0; p < n; p++) {
      var wrap = document.createElement("div"); wrap.className = "sheet-wrap";
      var h = document.createElement("p"); h.className = "sheet-h"; h.textContent = fmt("cp.sheet", { n: p + 1 }); wrap.appendChild(h);
      var el = document.createElement("div"); el.className = "sheet"; el.style.aspectRatio = sh.px.w + " / " + sh.px.h;
      sh.slots.forEach(function (s, k) { el.appendChild(slotEl(sh, s, p * per + k)); });
      var tp = document.createElement("img"); tp.className = "tpl"; tp.src = sh.template; tp.alt = ""; tp.draggable = false; el.appendChild(tp);
      if (sh.story || st.cut) {
        var L = S.cutLines(sh);
        L.xs.forEach(function (x) { var d = document.createElement("i"); d.className = "cut cut-v"; d.style.left = pct(x, sh.px.w); el.appendChild(d); });
        L.ys.forEach(function (y) { var d = document.createElement("i"); d.className = "cut cut-h"; d.style.top = pct(y, sh.px.h); el.appendChild(d); });
      }
      wrap.appendChild(el); box.appendChild(wrap);
    }
  }
  function layoutImg(im, sh, s, it) {
    var a = S.picArea(s, st.cap), q = S.place(a.w, a.h, it.iw, it.ih, it, sh.fit), sw = q.rot % 180 !== 0;
    var W0 = sw ? q.h : q.w, H0 = sw ? q.w : q.h;
    im.style.width = pct(W0, a.w); im.style.height = pct(H0, a.h);
    im.style.left = pct(q.x + q.w / 2 - W0 / 2, a.w); im.style.top = pct(q.y + q.h / 2 - H0 / 2, a.h);
    im.style.transform = q.rot ? "rotate(" + (-q.rot) + "deg)" : "";
  }
  function ctlBtn(txt, label, fn) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.title = label; b.setAttribute("aria-label", label);
    b.addEventListener("click", function (e) { e.stopPropagation(); fn(); }); b.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    return b;
  }
  function slotEl(sh, s, idx) {
    var it = st.items[idx], d = document.createElement("div");
    d.className = "slot" + (it ? "" : " empty"); d.dataset.idx = idx;
    d.style.left = pct(s.x, sh.px.w); d.style.top = pct(s.y, sh.px.h); d.style.width = pct(s.w, sh.px.w); d.style.height = pct(s.h, sh.px.h);
    d.style.borderRadius = (sh.radius / s.w * 100) + "% / " + (sh.radius / s.h * 100) + "%";
    var a = S.picArea(s, st.cap);
    var pic = document.createElement("div"); pic.className = "pic"; pic.style.height = pct(a.h, s.h);
    pic.setAttribute("role", "button"); pic.tabIndex = 0;
    pic.setAttribute("aria-label", it ? fmt("cp.replace", { n: idx + 1 }) + (it.ru ? " (" + it.ru + ")" : "") : fmt("cp.frame", { n: idx + 1 }));
    d.appendChild(pic);
    if (!it) { var num = document.createElement("span"); num.className = "num"; num.textContent = idx + 1; pic.appendChild(num); }
    else {
      var im = document.createElement("img"); im.src = it.hi && it.kind === "file" ? it.hi : it.thumb; im.alt = ""; im.draggable = false; pic.appendChild(im);
      if (it.kind === "lib" && sh.story) im.src = it.hi;   // крупная рамка — крупный файл
      layoutImg(im, sh, s, it);
      var ctl = document.createElement("div"); ctl.className = "ctl";
      function zoom(z) { it.scale = Math.max(0.3, Math.min(3, Math.round(((it.scale || 1) + z * 0.1) * 10) / 10)); layoutImg(im, sh, s, it); save(); }
      ctl.appendChild(ctlBtn("−", t("cp.zoomout"), function () { zoom(-1); }));
      ctl.appendChild(ctlBtn("+", t("cp.zoomin"), function () { zoom(1); }));
      ctl.appendChild(ctlBtn("⟲", t("cp.rotate"), function () { it.rot = ((it.rot || 0) + 90) % 360; it.ox = 0; it.oy = 0; layoutImg(im, sh, s, it); save(); }));
      ctl.appendChild(ctlBtn("+1", t("cp.copy"), function () { addCopy(idx); }));
      d.appendChild(ctl);
      if (st.cap !== "off") {
        var inp = document.createElement("input"); inp.className = "capin"; inp.type = "text"; inp.maxLength = 40;
        inp.value = st.cap === "kk" ? (it.kk || "") : (it.ru || ""); inp.placeholder = t("cp.capph"); inp.setAttribute("aria-label", t("set.caption") + " " + (idx + 1));
        inp.style.height = pct(s.h - a.h, s.h);
        inp.addEventListener("input", function () { if (st.cap === "kk") it.kk = inp.value; else it.ru = inp.value; save(); });
        d.appendChild(inp);
      }
    }
    bindPointer(pic, d, sh, s, idx);
    pic.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRep(idx); } });
    return d;
  }
  // сдвиг пальцем/мышкой внутри рамки; отпустили над другой рамкой — меняем местами; без движения — замена
  function bindPointer(pic, slot, sh, s, idx) {
    var start = null;
    pic.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      var it = st.items[idx];
      start = { x: e.clientX, y: e.clientY, moved: false, ox: it ? it.ox : 0, oy: it ? it.oy : 0, w: pic.clientWidth, h: pic.clientHeight, over: null };
      pic.setPointerCapture(e.pointerId);
    });
    pic.addEventListener("pointermove", function (e) {
      if (!start) return; var it = st.items[idx];
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 6) return; start.moved = true;
      var tgt = document.elementFromPoint(e.clientX, e.clientY), os = tgt && tgt.closest ? tgt.closest(".slot") : null;
      document.querySelectorAll(".slot.over").forEach(function (x) { x.classList.remove("over"); });
      start.over = os && os !== slot ? os : null; if (start.over) start.over.classList.add("over");
      if (!it) return;
      var a = S.picArea(s, st.cap), q = S.place(a.w, a.h, it.iw, it.ih, { scale: it.scale, rot: it.rot, ox: 0, oy: 0 }, sh.fit);
      it.ox = Math.max(-q.mx, Math.min(q.mx, start.ox + dx / start.w)); it.oy = Math.max(-q.my, Math.min(q.my, start.oy + dy / start.h));
      var im = pic.querySelector("img"); if (im) layoutImg(im, sh, s, it);
    });
    function end() {
      if (!start) return; var s0 = start; start = null;
      document.querySelectorAll(".slot.over").forEach(function (x) { x.classList.remove("over"); });
      if (!s0.moved) { openRep(idx); return; }
      if (s0.over) {
        var j = +s0.over.dataset.idx, it = st.items[idx];
        if (it) { it.ox = s0.ox; it.oy = s0.oy; }
        var tmp = st.items[j] || null; st.items[j] = it || null; st.items[idx] = tmp; changed();
      } else save();
    }
    pic.addEventListener("pointerup", end);
    pic.addEventListener("pointercancel", function () { start = null; });
  }

  /* ---------- замена картинки в рамке ---------- */
  function openRep(idx) {
    repIndex = idx; $("rep-h").textContent = st.items[idx] ? fmt("cp.replace", { n: idx + 1 }) : fmt("cp.frame", { n: idx + 1 });
    $("repDel").hidden = !st.items[idx]; $("rep").showModal();
  }
  $("repCancel").addEventListener("click", function () { repIndex = -1; $("rep").close(); });
  $("repDel").addEventListener("click", function () { st.items[repIndex] = null; repIndex = -1; $("rep").close(); changed(); });
  $("repDev").addEventListener("click", function () { $("rep").close(); $("replaceFile").click(); });
  $("repLib").addEventListener("click", function () { $("rep").close(); location.hash = "library"; });
  $("replaceFile").addEventListener("change", function () {
    var f = this.files[0], i = repIndex; this.value = ""; repIndex = -1; if (!f || i < 0) return;
    fileItem(f).then(function (it) { if (it) { st.items[i] = it; changed(); } });
  });

  /* ---------- свои картинки, перетаскивание в набор ---------- */
  function addFiles(list) {
    var fs = Array.prototype.filter.call(list || [], function (f) { return /^image\//.test(f.type); });
    var room = S.MAX - filled(); if (fs.length > room) msg(t("cp.full"));
    fs = fs.slice(0, Math.max(0, room));
    return Promise.all(fs.map(fileItem)).then(function (its) { its.forEach(function (it) { if (it) put(it); }); changed(); if (its.length) location.hash = "set"; });
  }
  document.querySelectorAll('[data-act="upload"]').forEach(function (b) { b.addEventListener("click", function () { $("files").click(); }); });
  $("files").addEventListener("change", function () { addFiles(this.files); this.value = ""; });
  function hasType(e, ty) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], ty) >= 0; }
  [$("sheets").parentNode, document.querySelector(".panel-r")].forEach(function (zone) {
    zone.addEventListener("dragover", function (e) { if (hasType(e, "Files") || hasType(e, "text/x-aymaba-card")) { e.preventDefault(); zone.classList.add("drop-on"); } });
    zone.addEventListener("dragleave", function () { zone.classList.remove("drop-on"); });
    zone.addEventListener("drop", function (e) {
      zone.classList.remove("drop-on");
      var id = e.dataTransfer && e.dataTransfer.getData("text/x-aymaba-card");
      if (id && byId[id]) { e.preventDefault(); if (put(libItem(byId[id]))) changed(); return; }
      if (hasType(e, "Files")) { e.preventDefault(); addFiles(e.dataTransfer.files); }
    });
  });

  /* ---------- мои наборы ---------- */
  function renderSets() {
    save();
    var ul = $("setsList"); ul.innerHTML = "";
    store.sets.forEach(function (p) {
      var li = document.createElement("li"); li.className = "set-row" + (p.id === st.id ? " is-cur" : "");
      var items = p.id === st.id ? st.items : p.items.map(deser);
      var info = document.createElement("div"); info.className = "set-info";
      var nm = document.createElement("b"); nm.textContent = p.name; info.appendChild(nm);
      var sm = document.createElement("span"); sm.className = "muted small"; sm.textContent = sumText(items, S.SHEETS[p.sheet] ? p.sheet : "9"); info.appendChild(sm);
      if (p.id === st.id) { var cu = document.createElement("span"); cu.className = "cur-badge"; cu.textContent = t("sets.current"); info.appendChild(cu); }
      li.appendChild(info);
      var acts = document.createElement("div"); acts.className = "set-acts";
      function btn(k, fn, cls) { var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-sm " + (cls || "btn-ghost"); b.textContent = t(k); b.addEventListener("click", fn); acts.appendChild(b); }
      if (p.id !== st.id) btn("sets.open", function () { switchTo(p.id); location.hash = "set"; }, "btn-ink");
      btn("sets.rename", function () {
        var v = prompt(t("sets.renameQ"), p.name); if (v == null || !v.trim()) return;
        if (p.id === st.id) st.name = v.trim(); else p.name = v.trim();
        save(); renderSets(); renderCounts();
      });
      btn("sets.dup", function () {
        save(); var src = store.sets.find(function (x) { return x.id === p.id; });
        var c = JSON.parse(JSON.stringify(src)); c.id = newId(); c.name = fmt("sets.copyname", { name: src.name });
        store.sets.splice(store.sets.indexOf(src) + 1, 0, c); save(); renderSets();
      });
      btn("sets.share", function () {
        save(); var src = store.sets.find(function (x) { return x.id === p.id; }), url = shareUrl(src);
        var hasFiles = p.id === st.id && st.items.some(function (x) { return x && x.kind === "file"; });
        copyText(url).then(function (ok) {
          if (!ok) prompt(t("sets.copyQ"), url);
          msg(t(ok ? "sets.linkCopied" : "sets.linkReady") + (hasFiles ? " " + t("sets.noFiles") : ""));
        });
      });
      btn("sets.del", function () {
        if (!confirm(fmt("sets.delQ", { name: p.name }))) return;
        store.sets = store.sets.filter(function (x) { return x.id !== p.id; });
        if (p.id === st.id) {
          if (!store.sets.length) store.sets.push({ id: newId(), name: t("sets.default"), sheet: st.sheet, cap: st.cap, items: [] });
          st = unpackSet(store.sets[0]);
        }
        save(); renderAll();
      }, "btn-ghost btn-del");
      li.appendChild(acts); ul.appendChild(li);
    });
  }
  $("newSet").addEventListener("click", function () {
    var v = prompt(t("sets.newQ"), fmt("sets.newname", { n: store.sets.length + 1 })); if (v == null) return;
    save(); st = { id: newId(), name: v.trim() || t("sets.default"), sheet: st.sheet, cap: st.cap, cut: st.cut, fname: "", items: [] };
    save(); renderAll(); location.hash = "library";
  });

  /* ---------- настройки ---------- */
  function renderSettings() {
    document.querySelectorAll("[data-cap]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.cap === st.cap ? "true" : "false"); });
    document.querySelectorAll("[data-cut]").forEach(function (b) { b.setAttribute("aria-checked", (b.dataset.cut === "1") === !!st.cut ? "true" : "false"); });
    $("sheetInfo").textContent = t("cp.info" + st.sheet) + (sheet().temporary ? " · " + t("cp.t7note") : "");
    $("capHint").textContent = t("cp.caphint." + st.cap);
    $("nameHint").textContent = fmt("cp.namehint", { prefix: sheet().prefix });
    $("fname").value = st.fname || "";
  }
  document.querySelectorAll("[data-sheet]").forEach(function (b) { b.addEventListener("click", function () { st.sheet = b.dataset.sheet; renderSettings(); changed(); renderMini(); }); });
  document.querySelectorAll("[data-cap]").forEach(function (b) { b.addEventListener("click", function () { st.cap = b.dataset.cap; renderSettings(); changed(); }); });
  document.querySelectorAll("[data-cut]").forEach(function (b) { b.addEventListener("click", function () { st.cut = b.dataset.cut === "1"; renderSettings(); changed(); }); });
  $("fname").addEventListener("input", function () { st.fname = this.value; save(); });

  /* ---------- вывод ---------- */
  function busy(on) { document.querySelectorAll("[data-out]").forEach(function (b) { b.disabled = on || !filled(); }); }
  document.querySelectorAll("[data-out]").forEach(function (b) {
    b.addEventListener("click", function () {
      var kind = b.dataset.out, o = { cut: !!st.cut }, win = null;
      if (kind === "preview") { try { win = window.open("", "_blank"); if (win) win.document.write("<p style='font:16px sans-serif;padding:20px'>" + t("cp.building") + "</p>"); } catch (e) { win = null; } }
      busy(true); msg(kind === "print" ? t("out.preparing") : t("cp.building"));
      var p = kind === "pdf" ? S.exportPdf(sheet(), st.items, st.cap, st.fname, o)
            : kind === "docx" ? S.exportDocx(sheet(), st.items, st.cap, st.fname, o)
            : kind === "preview" ? S.previewPdf(sheet(), st.items, st.cap, o, win)
            : S.printSheets(sheet(), st.items, st.cap, o);
      p.then(function (r) { msg(kind === "pdf" || kind === "docx" ? fmt("cp.done", { file: r }) : ""); })
       .catch(function (e) { console.error(e); msg(t("cp.err")); if (win) try { win.close(); } catch (x) {} })
       .then(function () { busy(false); });
    });
  });
  $("clearAll").addEventListener("click", function () { if (filled() && !confirm(t("cp.clearQ"))) return; st.items = []; changed(); msg(""); });
  $("addAll").addEventListener("click", function () {
    var ids = []; $("grid").querySelectorAll("li:not([hidden])").forEach(function (li) { ids.push(byId[li.dataset.id]); });
    addCards(ids);
  });

  /* ---------- запуск ---------- */
  function renderAll() { renderChips(); filter(); renderSettings(); renderCounts(); renderMini(); markGrid(); if (view() === "set") renderSheets(); if (view() === "sets") renderSets(); }
  $("q").addEventListener("input", filter);
  window.addEventListener("hashchange", showView);
  window.addEventListener("resize", function () { if (st) renderCounts(); });
  document.addEventListener("aymaba:lang", function () { if (DATA) renderAll(); });
  fetch("data/cards.json").then(function (r) { return r.json(); }).then(function (d) {
    DATA = d; d.cards.forEach(function (c) { byId[c.id] = c; });
    load(); fromShare(); renderGrid(); renderAll(); showView();
    window.AYMABA_LIB = { get st() { return st; }, store: function () { return store; }, changed: changed, addFiles: addFiles, libItem: libItem, cards: d.cards, switchTo: switchTo, shareUrl: shareUrl, packSet: packSet };   // для проверки
  }).catch(function (e) { console.error(e); $("count").textContent = t("lib.loaderr"); });
})();
