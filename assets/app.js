/* AYMABA: язык, меню, ссылки из config.js. Без сборки и библиотек. */
(function () {
  var T = window.AYMABA_I18N, C = window.AYMABA_CONFIG || {};
  var KEY = "aymaba-lang";

  function getLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "kk" || q === "ru") return q;
    var s = null; try { s = localStorage.getItem(KEY); } catch (e) {}
    return s === "kk" ? "kk" : "ru";
  }

  function apply(lang) {
    var dict = T[lang] || T.ru;
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (dict[k] !== undefined) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-aria");
      if (dict[k] !== undefined) el.setAttribute("aria-label", dict[k]);
    });
    var t = document.querySelector("title[data-i18n-title]");
    if (t) document.title = dict[t.getAttribute("data-i18n-title")] || document.title;
    document.querySelectorAll(".lang-switch button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
    });
    document.querySelectorAll("[data-show-lang]").forEach(function (el) {
      el.hidden = el.getAttribute("data-show-lang") !== lang;
    });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  // Ссылки из config.js: data-link="CONSTRUCTOR_URL" и т.п.
  document.querySelectorAll("[data-link]").forEach(function (a) {
    var url = C[a.getAttribute("data-link")];
    if (url && url !== "#") { a.href = url; }
    else {
      // Ссылка ещё не задана — показываем «Скоро» и не даём нажать.
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.classList.add("is-disabled");
      var lbl = a.querySelector("[data-i18n]");
      if (lbl) lbl.setAttribute("data-i18n", "soon");
    }
  });

  document.querySelectorAll(".lang-switch button").forEach(function (b) {
    b.addEventListener("click", function () { apply(b.dataset.lang); });
  });

  var toggle = document.querySelector(".menu-toggle"), nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); });
    });
  }

  apply(getLang());
})();
