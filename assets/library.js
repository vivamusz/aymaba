/* Библиотека карточек: данные из data/cards.json, картинки cards/<id>.webp.
   Показываем только русские названия (казахские — непроверенные черновики). */
(function () {
  var t = window.AYMABA_T;
  var grid = document.getElementById("grid"), chips = document.getElementById("chips");
  var q = document.getElementById("q"), countEl = document.getElementById("count"), empty = document.getElementById("empty");
  var dlg = document.getElementById("viewer");
  var DATA = null, cat = "all", catName = {};

  function norm(s) { return (s || "").toLowerCase().replace(/ё/g, "е").trim(); }

  function renderChips() {
    chips.innerHTML = "";
    var list = [{ num: "all", ru: t("lib.all") }].concat(DATA.categories);
    list.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.cat = c.num;
      var n = c.num === "all" ? DATA.cards.length : DATA.cards.filter(function (x) { return x.cat === c.num; }).length;
      b.textContent = c.ru + " · " + n;
      b.setAttribute("aria-pressed", String(c.num) === String(cat));
      b.addEventListener("click", function () { cat = c.num; renderChips(); filter(); });
      chips.appendChild(b);
    });
  }

  function renderGrid() {
    var frag = document.createDocumentFragment();
    DATA.cards.forEach(function (c) {
      var li = document.createElement("li");
      li.dataset.cat = c.cat; li.dataset.q = norm(c.ru);
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "cardbtn";
      var img = document.createElement("img");
      img.src = "cards/" + c.id + ".webp"; img.alt = c.ru; img.loading = "lazy"; img.decoding = "async";
      img.width = 256; img.height = 256;
      var cap = document.createElement("span"); cap.textContent = c.ru;
      btn.appendChild(img); btn.appendChild(cap);
      btn.addEventListener("click", function () { openViewer(c); });
      li.appendChild(btn); frag.appendChild(li);
    });
    grid.appendChild(frag);
  }

  function filter() {
    var s = norm(q.value), n = 0;
    grid.querySelectorAll("li").forEach(function (li) {
      var ok = (cat === "all" || li.dataset.cat === String(cat)) && (!s || li.dataset.q.indexOf(s) !== -1);
      li.hidden = !ok; if (ok) n++;
    });
    empty.hidden = n !== 0;
    countEl.textContent = t("lib.count").replace("{n}", n).replace("{total}", DATA.cards.length);
  }

  function openViewer(c) {
    document.getElementById("v-img").src = "cards/" + c.id + ".webp";
    document.getElementById("v-img").alt = c.ru;
    document.getElementById("v-name").textContent = c.ru;
    document.getElementById("v-cat").textContent = catName[c.cat] || "";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  document.getElementById("v-close").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  q.addEventListener("input", filter);
  document.addEventListener("aymaba:lang", function () {
    q.placeholder = t("lib.placeholder");
    if (DATA) { renderChips(); filter(); }
  });
  q.placeholder = t("lib.placeholder");

  fetch("data/cards.json").then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    d.categories.forEach(function (c) { catName[c.num] = c.ru; });
    renderChips(); renderGrid(); filter();
  }).catch(function () { countEl.textContent = t("lib.loaderr"); });
})();
