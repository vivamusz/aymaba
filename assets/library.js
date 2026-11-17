/* AYMABA — Библиотека карточек и печать в одном месте (по образцу upecs.ru).
   Разделы (по адресу #...): library, set, settings, help.
   Данные: data/cards.json; превью cards/<id>.webp, печать print/<id>.webp.
   Подписи: русская берётся из карточки; казахская по умолчанию ПУСТАЯ
   (черновики kk не проверены — их не подставляем), пользователь вписывает сам. */
(function () {
  var S = window.AYMABA_SHEETS, t = window.AYMABA_T;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "aymaba-print-v1", VIEWS = ["library", "set", "settings", "help"];
  var DATA = null, catName = {}, cat = "all", uid = 0;
  var st = { sheet: "9", cap: "off", name: "", items: [] };   // items[i] = null | item
  var repIndex = -1;

  function fmt(k, o) { var s = t(k); Object.keys(o || {}).forEach(function (x) { s = s.split("{" + x + "}").join(o[x]); }); return s; }
  function norm(s) { return (s || "").toLowerCase().replace(/ё/g, "е").trim(); }
  function sheet() { return S.SHEETS[st.sheet]; }
  function filled() { return st.items.filter(Boolean).length; }
  function trim() { while (st.items.length && !st.items[st.items.length - 1]) st.items.pop(); }

  /* ---------- сохранение (карточки библиотеки и настройки; свои файлы не сохраняются) ---------- */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ sheet: st.sheet, cap: st.cap, name: st.name,
        items: st.items.map(function (it) { return it && it.kind === "lib" ? { id: it.id, ru: it.ru, kk: it.kk, ox: it.ox, oy: it.oy, scale: it.scale } : null; }) }));
    } catch (e) {}
  }
  function load() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (!o) return;
      if (S.SHEETS[o.sheet]) st.sheet = o.sheet;
      if (["off", "kk", "ru"].indexOf(o.cap) >= 0) st.cap = o.cap;
      st.name = o.name || "";
      var byId = {}; DATA.cards.forEach(function (c) { byId[c.id] = c; });
      st.items = (o.items || []).slice(0, S.MAX).map(function (x) {
        if (!x || !byId[x.id]) return null;
        var it = libItem(byId[x.id]); it.ru = x.ru != null ? x.ru : it.ru; it.kk = x.kk || ""; it.ox = x.ox || 0; it.oy = x.oy || 0; it.scale = x.scale || 1; return it;
      });
      trim();
    } catch (e) {}
  }

  function libItem(c) {
    return { key: ++uid, kind: "lib", id: c.id, ru: c.ru, kk: "", thumb: "cards/" + c.id + ".webp", hi: "print/" + c.id + ".webp", iw: 1, ih: 1, ox: 0, oy: 0, scale: 1 };
  }
  function fileItem(f) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function () { res({ key: ++uid, kind: "file", ru: "", kk: "", thumb: url, hi: url, iw: im.naturalWidth || 1, ih: im.naturalHeight || 1, ox: 0, oy: 0, scale: 1 }); };
      im.onerror = function () { res(null); }; im.src = url;
    });
  }
  function firstFree() { for (var i = 0; i < S.MAX; i++) if (!st.items[i]) return i; return -1; }
  function put(it, at) {
    var i = at >= 0 ? at : firstFree(); if (i < 0) { msg(t("cp.full")); return false; }
    st.items[i] = it; return true;
  }
  function inSet(id) { return st.items.some(function (x) { return x && x.kind === "lib" && x.id === id; }); }
  function removeId(id) { st.items = st.items.map(function (x) { return x && x.kind === "lib" && x.id === id ? null : x; }); compact(); }
  function compact() { st.items = st.items.filter(Boolean); }   // убираем дыры после удаления из библиотеки

  function changed(opts) { trim(); save(); renderCounts(); renderMini(); if (!opts || !opts.keepSheets) renderSheets(); if (!opts || !opts.keepGrid) markGrid(); }
  function msg(s) { $("msg").textContent = s || ""; }

  /* ---------- разделы ---------- */
  function view() { var v = location.hash.replace(/^#\/?/, ""); return VIEWS.indexOf(v) >= 0 ? v : "library"; }
  function showView() {
    var v = view();
    document.querySelectorAll(".view").forEach(function (s) { s.hidden = s.dataset.v !== v; });
    document.querySelectorAll("[data-view]").forEach(function (a) { if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (v === "set") renderSheets();
    window.scrollTo(0, 0);
  }

  /* ---------- библиотека ---------- */
  function renderChips() {
    var box = $("chips"); box.innerHTML = "";
    [{ num: "all", ru: t("lib.all") }].concat(DATA.categories).forEach(function (c) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip";
      var n = c.num === "all" ? DATA.cards.length : DATA.cards.filter(function (x) { return x.cat === c.num; }).length;
      b.dataset.cat = c.num; b.textContent = c.ru + " · " + n; b.setAttribute("aria-pressed", String(c.num) === String(cat));
      b.addEventListener("click", function () { cat = c.num; renderChips(); filter(); });
      box.appendChild(b);
    });
  }
  function renderGrid() {
    var frag = document.createDocumentFragment();
    DATA.cards.forEach(function (c) {
      var li = document.createElement("li"); li.dataset.cat = c.cat; li.dataset.q = norm(c.ru); li.dataset.id = c.id;
      var b = document.createElement("button"); b.type = "button"; b.className = "cardbtn"; b.setAttribute("aria-pressed", "false");
      var im = document.createElement("img"); im.src = "cards/" + c.id + ".webp"; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.width = 256; im.height = 256;
      var cap = document.createElement("span"); cap.className = "cap"; cap.textContent = c.ru;
      var ok = document.createElement("span"); ok.className = "ok"; ok.setAttribute("aria-hidden", "true"); ok.textContent = "✓";
      b.appendChild(im); b.appendChild(cap); b.appendChild(ok);
      b.addEventListener("click", function () {
        if (repIndex >= 0) { st.items[repIndex] = libItem(c); repIndex = -1; changed(); location.hash = "set"; return; }
        if (inSet(c.id)) removeId(c.id); else if (!put(libItem(c))) return;
        changed({ keepSheets: view() !== "set" });
      });
      li.appendChild(b); frag.appendChild(li);
    });
    $("grid").appendChild(frag);
  }
  function filter() {
    var s = norm($("q").value), n = 0;
    $("grid").querySelectorAll("li").forEach(function (li) {
      var ok = (cat === "all" || li.dataset.cat === String(cat)) && (!s || li.dataset.q.indexOf(s) !== -1);
      li.hidden = !ok; if (ok) n++;
    });
    $("empty").hidden = n !== 0;
    $("count").textContent = fmt("lib.count", { n: n, total: DATA.cards.length });
  }
  function markGrid() {
    var ids = {}; st.items.forEach(function (x) { if (x && x.kind === "lib") ids[x.id] = 1; });
    $("grid").querySelectorAll("li").forEach(function (li) { li.querySelector(".cardbtn").setAttribute("aria-pressed", ids[li.dataset.id] ? "true" : "false"); });
  }

  /* ---------- правая панель / счётчики ---------- */
  function renderCounts() {
    var n = filled(), sh = sheet(), sheets = S.sheetsOf(st.items, sh).length;
    $("prCount").textContent = "(" + fmt("set.count", { n: n }) + ")";
    $("prInfo").textContent = t("cp.info" + st.sheet) + (n ? " · " + fmt("set.sheets", { n: sheets }) : "");
    document.querySelectorAll('[data-badge="set"]').forEach(function (b) { b.textContent = n; b.hidden = !n; });
    document.querySelectorAll("[data-out]").forEach(function (b) { b.disabled = !n; });
    $("setEmpty").hidden = n > 0;
    $("setInfo").textContent = t("cp.info" + st.sheet);
  }
  function renderMini() {
    var ul = $("mini"); ul.innerHTML = "";
    st.items.forEach(function (it, i) {
      if (!it) return;
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.title = (it.ru || "") + " — " + t("cp.remove"); b.setAttribute("aria-label", b.title);
      var im = document.createElement("img"); im.src = it.thumb; im.alt = ""; b.appendChild(im);
      b.addEventListener("click", function () { st.items[i] = null; compact(); changed(); });
      li.appendChild(b); ul.appendChild(li);
    });
  }

  /* ---------- листы (Мой набор) ---------- */
  function pct(v, of) { return (v / of * 100) + "%"; }
  function renderSheets() {
    var box = $("sheets"); box.innerHTML = "";
    var sh = sheet(), per = sh.slots.length, n = Math.max(1, Math.ceil(Math.max(st.items.length, 1) / per));
    if (!filled()) return;
    for (var p = 0; p < n; p++) {
      var wrap = document.createElement("div"); wrap.className = "sheet-wrap";
      var h = document.createElement("p"); h.className = "sheet-h"; h.textContent = fmt("cp.sheet", { n: p + 1 }); wrap.appendChild(h);
      var el = document.createElement("div"); el.className = "sheet"; el.style.aspectRatio = sh.px.w + " / " + sh.px.h;
      sh.slots.forEach(function (s, k) { el.appendChild(slotEl(sh, s, p * per + k)); });
      var tp = document.createElement("img"); tp.className = "tpl"; tp.src = sh.template; tp.alt = ""; el.appendChild(tp);
      wrap.appendChild(el); box.appendChild(wrap);
    }
  }
  function layoutImg(im, sh, s, it) {
    var a = S.picArea(s, st.cap), q = S.place(a.w, a.h, it.iw, it.ih, it);
    im.style.width = pct(q.w, a.w); im.style.height = pct(q.h, a.h); im.style.left = pct(q.x, a.w); im.style.top = pct(q.y, a.h);
    return q;
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
      var im = document.createElement("img"); im.src = it.thumb; im.alt = ""; im.draggable = false; pic.appendChild(im); layoutImg(im, sh, s, it);
      var ctl = document.createElement("div"); ctl.className = "ctl";
      [["−", -1], ["+", 1]].forEach(function (z) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = z[0]; b.setAttribute("aria-label", z[0] === "+" ? "+" : "−");
        b.addEventListener("click", function (e) { e.stopPropagation(); it.scale = Math.max(0.3, Math.min(3, Math.round(((it.scale || 1) + z[1] * 0.1) * 10) / 10)); layoutImg(im, sh, s, it); save(); });
        ctl.appendChild(b);
      });
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
      var a = S.picArea(s, st.cap), q = S.place(a.w, a.h, it.iw, it.ih, { scale: it.scale, ox: 0, oy: 0 });
      it.ox = Math.max(-q.mx, Math.min(q.mx, start.ox + dx / start.w)); it.oy = Math.max(-q.my, Math.min(q.my, start.oy + dy / start.h));
      var im = pic.querySelector("img"); if (im) layoutImg(im, sh, s, it);
    });
    function end(e) {
      if (!start) return; var sStart = start; start = null;
      document.querySelectorAll(".slot.over").forEach(function (x) { x.classList.remove("over"); });
      if (!sStart.moved) { openRep(idx); return; }
      if (sStart.over) {
        var j = +sStart.over.dataset.idx, it = st.items[idx];
        if (it) { it.ox = sStart.ox; it.oy = sStart.oy; }
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
  $("repLib").addEventListener("click", function () { $("rep").close(); location.hash = "library"; msg(""); });
  $("rep").addEventListener("close", function () { /* repIndex остаётся, если ушли в библиотеку */ });
  $("replaceFile").addEventListener("change", function () {
    var f = this.files[0], i = repIndex; this.value = ""; repIndex = -1; if (!f || i < 0) return;
    fileItem(f).then(function (it) { if (it) { st.items[i] = it; changed(); } });
  });

  /* ---------- свои картинки ---------- */
  function addFiles(list) {
    var fs = Array.prototype.filter.call(list || [], function (f) { return /^image\//.test(f.type); });
    var room = S.MAX - filled(); if (fs.length > room) msg(t("cp.full"));
    fs = fs.slice(0, Math.max(0, room));
    return Promise.all(fs.map(fileItem)).then(function (its) { its.forEach(function (it) { if (it) put(it); }); changed(); if (its.length) location.hash = "set"; });
  }
  document.querySelectorAll('[data-act="upload"]').forEach(function (b) { b.addEventListener("click", function () { $("files").click(); }); });
  $("files").addEventListener("change", function () { addFiles(this.files); this.value = ""; });
  ["dragover", "drop"].forEach(function (ev) {
    $("sheets").parentNode.addEventListener(ev, function (e) {
      if (!e.dataTransfer || !Array.prototype.some.call(e.dataTransfer.types || [], function (x) { return x === "Files"; })) return;
      e.preventDefault(); if (ev === "drop") addFiles(e.dataTransfer.files);
    });
  });

  /* ---------- настройки ---------- */
  function renderSettings() {
    document.querySelectorAll("#sizeSeg [data-sheet]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.sheet === st.sheet ? "true" : "false"); });
    document.querySelectorAll("#capSeg [data-cap]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.cap === st.cap ? "true" : "false"); });
    $("sheetInfo").textContent = t("cp.info" + st.sheet) + (sheet().temporary ? " · " + t("cp.t7note") : "");
    $("capHint").textContent = t("cp.caphint." + st.cap);
    $("nameHint").textContent = fmt("cp.namehint", { prefix: sheet().prefix });
    $("fname").value = st.name;
  }
  document.querySelectorAll("#sizeSeg [data-sheet]").forEach(function (b) { b.addEventListener("click", function () { st.sheet = b.dataset.sheet; renderSettings(); changed(); }); });
  document.querySelectorAll("#capSeg [data-cap]").forEach(function (b) { b.addEventListener("click", function () { st.cap = b.dataset.cap; renderSettings(); changed(); }); });
  $("fname").addEventListener("input", function () { st.name = this.value; save(); });

  /* ---------- вывод ---------- */
  function busy(on) { document.querySelectorAll("[data-out]").forEach(function (b) { b.disabled = on || !filled(); }); }
  document.querySelectorAll("[data-out]").forEach(function (b) {
    b.addEventListener("click", function () {
      var kind = b.dataset.out; busy(true); msg(kind === "print" ? t("out.preparing") : t("cp.building"));
      var p = kind === "pdf" ? S.exportPdf(sheet(), st.items, st.cap, st.name)
            : kind === "docx" ? S.exportDocx(sheet(), st.items, st.cap, st.name)
            : S.printSheets(sheet(), st.items, st.cap);
      p.then(function (r) { msg(kind === "print" ? "" : fmt("cp.done", { file: r })); })
       .catch(function (e) { console.error(e); msg(t("cp.err")); })
       .then(function () { busy(false); });
    });
  });
  $("clearAll").addEventListener("click", function () { st.items = []; changed(); msg(""); });
  $("addAll").addEventListener("click", function () {
    var room = false;
    $("grid").querySelectorAll("li:not([hidden])").forEach(function (li) {
      if (room) return; var id = li.dataset.id; if (inSet(id)) return;
      var c = DATA.cards.find(function (x) { return x.id === id; });
      if (!put(libItem(c))) room = true;
    });
    changed({ keepSheets: view() !== "set" });
  });

  /* ---------- запуск ---------- */
  $("q").addEventListener("input", filter);
  window.addEventListener("hashchange", showView);
  document.addEventListener("aymaba:lang", function () { if (!DATA) return; renderChips(); filter(); renderSettings(); renderCounts(); if (view() === "set") renderSheets(); });
  fetch("data/cards.json").then(function (r) { return r.json(); }).then(function (d) {
    DATA = d; d.categories.forEach(function (c) { catName[c.num] = c.ru; });
    load(); renderChips(); renderGrid(); filter(); renderSettings(); changed({}); showView();
    window.AYMABA_LIB = { st: st, changed: changed, addFiles: addFiles, libItem: libItem, cards: d.cards };   // для проверки
  }).catch(function (e) { console.error(e); $("count").textContent = t("lib.loaderr"); });
})();
