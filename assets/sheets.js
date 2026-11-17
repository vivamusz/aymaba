/* AYMABA — листы для печати карточек: геометрия, отрисовка, PDF, Word, печать.
   Геометрия 9 — из оригинального инструмента пользователя (vivamusz.grok.me), НЕ МЕНЯТЬ.
   7 на 7 (8 шт., 2×4) и 5 на 5 (20 шт., поля 4,8 мм) — tools/make_grid_templates.py, решение пользователя 17.11.2026.
   Всё считается в браузере, на сервер ничего не отправляется. */
(function () {
  var DPI = 300, PT = 72 / DPI;
  function sq(list) { return list.map(function (p) { return { x: p[0], y: p[1], w: p[2], h: p[3] }; }); }
  var SHEETS = {
    "9": { id: "9", cm: 9, px: { w: 2278, h: 3369 }, radius: 114, border: 24, template: "assets/pecs/template.png", prefix: "ПЕЧАТЬ 9 см",
      slots: sq([[24,24,1039,1039],[1215,24,1039,1039],[24,1158,1039,1039],[1215,1158,1039,1039],[24,2306,1039,1039],[1215,2306,1039,1039]]) },
    "7": { id: "7", cm: 7, px: { w: 2480, h: 3508 }, radius: 85, border: 24, template: "assets/pecs/template-7.png", prefix: "ПЕЧАТЬ 7 см",
      slots: sq([[431,106,779,779],[1270,106,779,779],[431,945,779,779],[1270,945,779,779],[431,1784,779,779],[1270,1784,779,779],[431,2623,779,779],[1270,2623,779,779]]) },
    "5": { id: "5", cm: 5, px: { w: 2480, h: 3508 }, radius: 63, border: 18, template: "assets/pecs/template-5.png", prefix: "ПЕЧАТЬ 5 см",
      slots: sq([[75,199,545,545],[669,199,545,545],[1263,199,545,545],[1857,199,545,545],[75,840,545,545],[669,840,545,545],[1263,840,545,545],[1857,840,545,545],[75,1481,545,545],[669,1481,545,545],[1263,1481,545,545],[1857,1481,545,545],[75,2122,545,545],[669,2122,545,545],[1263,2122,545,545],[1857,2122,545,545],[75,2763,545,545],[669,2763,545,545],[1263,2763,545,545],[1857,2763,545,545]]) },
    /* «Сюжетные» — на обычном A4, резать по линиям; рамки прямоугольные, картинка вписывается целиком (fit: contain).
       Геометрия — tools/make_story_templates.py (отступ 5 мм от линии реза до рамки). */
    "a5": { id: "a5", story: true, fit: "contain", capf: 0.1, px: { w: 2480, h: 3508 }, radius: 114, border: 24, template: "assets/pecs/template-a5.png", prefix: "ПЕЧАТЬ A5",
      cuts: { xs: [], ys: [1754] }, slots: sq([[83,83,2314,1588],[83,1837,2314,1588]]) },
    "a6": { id: "a6", story: true, fit: "contain", capf: 0.1, px: { w: 2480, h: 3508 }, radius: 114, border: 24, template: "assets/pecs/template-a6.png", prefix: "ПЕЧАТЬ A6",
      cuts: { xs: [1240], ys: [1754] }, slots: sq([[83,83,1074,1588],[1323,83,1074,1588],[83,1837,1074,1588],[1323,1837,1074,1588]]) },
    "a4": { id: "a4", story: true, fit: "contain", capf: 0.07, px: { w: 2480, h: 3508 }, radius: 114, border: 24, template: "assets/pecs/template-a4.png", prefix: "ПЕЧАТЬ A4",
      cuts: { xs: [], ys: [] }, slots: sq([[83,83,2314,3342]]) }
  };
  // число столбцов (для мини-листа в панели)
  SHEETS["9"].cols = 2; SHEETS["7"].cols = 2; SHEETS["5"].cols = 4; SHEETS.a5.cols = 1; SHEETS.a6.cols = 2; SHEETS.a4.cols = 1;
  Object.keys(SHEETS).forEach(function (k) { SHEETS[k].slots.forEach(function (sl) { sl.capf = SHEETS[k].capf || 0.2; }); });
  var MAX = 5000;            // лимита по сути нет (решение пользователя 17.11.2026)
  var CAP = 0.2;            // доля высоты рамки под подпись
  var FONT_URL = "assets/fonts/DejaVuSans-Bold.ttf";
  var KAPPA = 0.5522847498;

  /* Положение картинки в окне f×p. Как в оригинале: cover × scale, сдвиг ox/oy в долях окна. */
  function clamp(v, m) { return isFinite(v) ? Math.min(m, Math.max(-m, v)) : 0; }
  /* fit: "cover" (как в оригинале, заполняет окно) или "contain" (сюжетные: вся картинка целиком, без искажений).
     it.rot — поворот 0/90/180/270 против часовой; w,h,x,y — рамка уже повёрнутой картинки. */
  function place(f, p, iw, ih, it, fit) {
    var rot = ((it.rot || 0) % 360 + 360) % 360, sw = rot % 180 !== 0, bw = sw ? ih : iw, bh = sw ? iw : ih;
    var n = it.scale || 1, v = (fit === "contain" ? Math.min(f / bw, p / bh) : Math.max(f / bw, p / bh)) * n, dw = bw * v, dh = bh * v;
    var mx = Math.abs(dw / f - 1) / 2, my = Math.abs(dh / p - 1) / 2;
    return { w: dw, h: dh, x: (f - dw) / 2 + clamp(it.ox || 0, mx) * f, y: (p - dh) / 2 + clamp(it.oy || 0, my) * p, mx: mx, my: my, rot: rot };
  }
  function picArea(slot, cap) { return { w: slot.w, h: cap === "off" ? slot.h : Math.round(slot.h * (1 - (slot.capf || CAP))) }; }
  function capText(it, cap) { return cap === "off" || !it ? "" : ((cap === "kk" ? it.kk : it.ru) || "").trim(); }

  var cache = {};
  function loadImg(url) {
    if (!cache[url]) cache[url] = new Promise(function (res, rej) {
      var im = new Image(); im.decoding = "async"; im.onload = function () { res(im); };
      im.onerror = function () { delete cache[url]; rej(new Error("img " + url)); }; im.src = url;
    });
    return cache[url];
  }
  function bytes(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); }); }
  var fontFace = null;
  function ensureFont() {
    if (!fontFace) { fontFace = new FontFace("AymabaCaption", "url(" + FONT_URL + ")", { weight: "700" }); fontFace = fontFace.load().then(function (f) { document.fonts.add(f); return f; }); }
    return fontFace;
  }
  // картинка элемента в JPEG-байтах (pdf-lib понимает только JPG/PNG)
  function jpegBytes(img, maxSide) {
    var s = Math.min(1, (maxSide || 2400) / Math.max(img.naturalWidth, img.naturalHeight));
    var c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return new Promise(function (res) { c.toBlob(function (b) { b.arrayBuffer().then(function (a) { res(new Uint8Array(a)); }); }, "image/jpeg", 0.92); });
  }
  function hiUrl(it) { return it.hi || it.thumb; }
  function fitFont(measure, text, maxW, maxH) { var s = maxH * 0.58; var w = measure(text, s); if (w > maxW) s = s * maxW / w; return s; }

  function chunk(items, per) { var out = []; for (var i = 0; i < items.length; i += per) out.push(items.slice(i, i + per)); if (!out.length) out.push([]); return out; }
  function sheetsOf(items, sheet) {
    var n = items.length; while (n > 0 && !items[n - 1]) n--;
    return chunk(items.slice(0, n), sheet.slots.length);
  }

  /* Линии реза: середины промежутков между рамками и внешние края рамок (в px листа). */
  function clusters(vals) { vals = vals.slice().sort(function (a, b) { return a - b; }); var out = []; vals.forEach(function (v) { if (!out.length || v - out[out.length - 1][0] > 40) out.push([v]); else out[out.length - 1].push(v); }); return out; }
  function cutLines(sheet) {
    if (sheet.cuts) return sheet.cuts;
    var b = sheet.border || 0;
    function axis(p, q) {
      var cs = clusters(sheet.slots.map(function (s) { return s[p]; })).map(function (c) {
        var lo = Math.min.apply(null, c), mem = sheet.slots.filter(function (s) { return s[p] >= lo - 1 && s[p] <= Math.max.apply(null, c) + 1; });
        return { a: lo - b, z: Math.max.apply(null, mem.map(function (s) { return s[p] + s[q]; })) + b };
      });
      var out = [cs[0].a];
      for (var i = 1; i < cs.length; i++) out.push((cs[i - 1].z + cs[i].a) / 2);
      out.push(cs[cs.length - 1].z); return out;
    }
    return { xs: axis("x", "w"), ys: axis("y", "h") };
  }
  var A4PX = { w: 2480, h: 3508 };
  function offA4(sheet) { return { x: Math.max(0, (A4PX.w - sheet.px.w) / 2), y: Math.max(0, (A4PX.h - sheet.px.h) / 2) }; }

  /* ---------- Растровый лист (для печати и Word) ---------- */
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function renderSheetCanvas(sheet, page, cap, opts) {
    return Promise.all([loadImg(sheet.template), cap === "off" ? null : ensureFont()].concat(page.map(function (it) { return it ? loadImg(hiUrl(it)) : null; })))
      .then(function (r) {
        var tpl = r[0], imgs = r.slice(2);
        // весь лист A4 (2480×3508 при 300 dpi), шаблон по центру в натуральную величину
        var c = document.createElement("canvas"), o = offA4(sheet); c.width = A4PX.w; c.height = A4PX.h;
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.translate(o.x, o.y);
        sheet.slots.forEach(function (s, k) {
          var it = page[k], im = imgs[k]; if (!it || !im) return;
          var a = picArea(s, cap), rad = Math.min(sheet.radius, s.w / 2, s.h / 2);
          g.save(); rrect(g, s.x, s.y, s.w, s.h, rad); g.clip();
          g.save(); g.beginPath(); g.rect(s.x, s.y, a.w, a.h); g.clip();
          var q = place(a.w, a.h, im.naturalWidth, im.naturalHeight, it, sheet.fit), sw = q.rot % 180 !== 0;
          g.imageSmoothingQuality = "high";
          g.translate(s.x + q.x + q.w / 2, s.y + q.y + q.h / 2); g.rotate(-q.rot * Math.PI / 180);
          var W0 = sw ? q.h : q.w, H0 = sw ? q.w : q.h; g.drawImage(im, -W0 / 2, -H0 / 2, W0, H0); g.restore();
          var tx = capText(it, cap);
          if (tx) {
            var bh = s.h - a.h; g.fillStyle = "#1a1612"; g.textAlign = "center"; g.textBaseline = "middle";
            var size = fitFont(function (t, z) { g.font = "bold " + z + "px AymabaCaption"; return g.measureText(t).width; }, tx, s.w * 0.9, bh);
            g.font = "bold " + size + "px AymabaCaption"; g.fillText(tx, s.x + s.w / 2, s.y + a.h + bh / 2);
          }
          g.restore();
        });
        g.drawImage(tpl, 0, 0, sheet.px.w, sheet.px.h);
        if ((opts && opts.cut) || sheet.story) {
          var L = cutLines(sheet); g.strokeStyle = "#8a8a8a"; g.lineWidth = 2; g.setLineDash([18, 12]);
          L.xs.forEach(function (x) { g.beginPath(); g.moveTo(x, -o.y); g.lineTo(x, A4PX.h - o.y); g.stroke(); });
          L.ys.forEach(function (y) { g.beginPath(); g.moveTo(-o.x, y); g.lineTo(A4PX.w - o.x, y); g.stroke(); });
        }
        return c;
      });
  }
  function canvasJpeg(c) { return new Promise(function (res) { c.toBlob(function (b) { res(b); }, "image/jpeg", 0.92); }); }

  /* ---------- PDF (pdf-lib, как в оригинале: картинка в скруглённой рамке, сверху шаблон) ---------- */
  function clipPath(page, L, x, y, w, h, r) {
    var s = KAPPA * r;
    page.pushOperators(L.moveTo(x + r, y), L.lineTo(x + w - r, y), L.appendBezierCurve(x + w - r + s, y, x + w, y + r - s, x + w, y + r),
      L.lineTo(x + w, y + h - r), L.appendBezierCurve(x + w, y + h - r + s, x + w - r + s, y + h, x + w - r, y + h),
      L.lineTo(x + r, y + h), L.appendBezierCurve(x + r - s, y + h, x, y + h - r + s, x, y + h - r),
      L.lineTo(x, y + r), L.appendBezierCurve(x, y + r - s, x + r - s, y, x + r, y), L.closePath(), L.clip(), L.endPath());
  }
  function rectClip(page, L, x, y, w, h) {
    page.pushOperators(L.moveTo(x, y), L.lineTo(x + w, y), L.lineTo(x + w, y + h), L.lineTo(x, y + h), L.closePath(), L.clip(), L.endPath());
  }
  var A4PT = { w: 595.28, h: 841.89 };
  function drawCutLines(pg, P, sheet, H) {
    var L = cutLines(sheet), ox = Math.max(0, (A4PT.w - sheet.px.w * PT) / 2), oy = Math.max(0, (A4PT.h - H) / 2);
    var st = { thickness: 0.5, color: P.rgb(0.54, 0.54, 0.54), dashArray: [4.3, 2.9] };
    L.xs.forEach(function (x) { pg.drawLine(Object.assign({ start: { x: x * PT, y: -oy }, end: { x: x * PT, y: A4PT.h - oy } }, st)); });
    L.ys.forEach(function (y) { var yy = H - y * PT; pg.drawLine(Object.assign({ start: { x: -ox, y: yy }, end: { x: A4PT.w - ox, y: yy } }, st)); });
  }
  function buildPdf(sheet, page, cap, assets, opts) {
    var P = window.PDFLib, L = P;
    return P.PDFDocument.create().then(function (doc) {
      // Лист в натуральную величину (300 dpi → 1:1) по центру настоящего A4, чтобы печать «100%» давала ровно 9/7/5 см.
      var W = sheet.px.w * PT, H = sheet.px.h * PT, pg = doc.addPage([A4PT.w, A4PT.h]);
      pg.drawRectangle({ x: 0, y: 0, width: A4PT.w, height: A4PT.h, color: P.rgb(1, 1, 1) });
      pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(1, 0, 0, 1, Math.max(0, (A4PT.w - W) / 2), Math.max(0, (A4PT.h - H) / 2)));
      var font = null, chain = Promise.resolve();
      if (cap !== "off" && page.some(function (it) { return capText(it, cap); })) {
        doc.registerFontkit(window.fontkit);
        chain = doc.embedFont(assets.font, { subset: true }).then(function (f) { font = f; });
      }
      return chain.then(function () {
        return Promise.all(page.map(function (it) { return it ? assets.img(it).then(function (b) { return doc.embedJpg(b); }) : null; }));
      }).then(function (embs) {
        sheet.slots.forEach(function (s, k) {
          var it = page[k], e = embs[k]; if (!it || !e) return;
          var a = picArea(s, cap), x = s.x * PT, w = s.w * PT, h = s.h * PT, y = H - (s.y + s.h) * PT;
          var aw = a.w * PT, ah = a.h * PT, ay = H - (s.y + a.h) * PT;
          pg.pushOperators(L.pushGraphicsState());
          clipPath(pg, L, x, y, w, h, Math.min(sheet.radius * PT, w / 2, h / 2));
          pg.pushOperators(L.pushGraphicsState()); rectClip(pg, L, x, ay, aw, ah);
          var q = place(aw, ah, e.width, e.height, it, sheet.fit), bx = x + q.x, by = ay + ah - q.y - q.h, sw = q.rot % 180 !== 0;
          var dx = q.rot === 90 || q.rot === 180 ? q.w : 0, dy = q.rot === 180 || q.rot === 270 ? q.h : 0;
          pg.drawImage(e, { x: bx + dx, y: by + dy, width: sw ? q.h : q.w, height: sw ? q.w : q.h, rotate: P.degrees(q.rot) });
          pg.pushOperators(L.popGraphicsState());
          var tx = capText(it, cap);
          if (tx && font) {
            var bh = h - ah, size = fitFont(function (t, z) { return font.widthOfTextAtSize(t, z); }, tx, w * 0.9, bh);
            var tw = font.widthOfTextAtSize(tx, size), th = font.heightAtSize(size, { descender: false });
            pg.drawText(tx, { x: x + (w - tw) / 2, y: y + bh / 2 - th / 2, size: size, font: font, color: P.rgb(0x1a / 255, 0x16 / 255, 0x12 / 255) });
          }
          pg.pushOperators(L.popGraphicsState());
        });
        return doc.embedPng(assets.template);
      }).then(function (tp) {
        pg.drawImage(tp, { x: 0, y: 0, width: W, height: H });
        if ((opts && opts.cut) || sheet.story) drawCutLines(pg, P, sheet, H);
        pg.pushOperators(L.popGraphicsState());
        return doc.save();
      });
    });
  }
  function safeName(s) { return (s || "").replace(/[\\/:*?"<>|\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80); }
  function fileBase(sheet, name) { var n = safeName(name); return sheet.prefix + (n ? " " + n : ""); }
  function download(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function makeAssets(sheet, cap) {
    var imgBytes = {};
    return Promise.all([bytes(sheet.template), cap === "off" ? null : bytes(FONT_URL)]).then(function (r) {
      return { template: r[0], font: r[1], img: function (it) {
        var u = hiUrl(it); if (!imgBytes[u]) imgBytes[u] = loadImg(u).then(function (im) { return jpegBytes(im, 2400); }); return imgBytes[u];
      } };
    });
  }
  function exportPdf(sheet, items, cap, name, opts) {
    var pages = sheetsOf(items, sheet), base = fileBase(sheet, name);
    return makeAssets(sheet, cap).then(function (as) {
      return pages.reduce(function (p, pg) { return p.then(function (acc) { return buildPdf(sheet, pg, cap, as, opts).then(function (b) { acc.push(b); return acc; }); }); }, Promise.resolve([]));
    }).then(function (pdfs) {
      if (pdfs.length === 1) { var n1 = (safeName(name) ? base : base + " 1") + ".pdf"; download(new Blob([pdfs[0]], { type: "application/pdf" }), n1); return n1; }
      var files = {}; pdfs.forEach(function (b, i) { files[base + " " + (i + 1) + ".pdf"] = [b, { level: 0 }]; });
      var zip = window.fflate.zipSync(files), zn = base + ".zip";
      download(new Blob([zip], { type: "application/zip" }), zn); return zn;
    });
  }
  function buildPdfs(sheet, items, cap, opts) {
    var pages = sheetsOf(items, sheet);
    return makeAssets(sheet, cap).then(function (as) { return Promise.all(pages.map(function (pg) { return buildPdf(sheet, pg, cap, as, opts); })); });
  }
  // Предпросмотр: все листы одним PDF во вкладке браузера (win открыт заранее, чтобы не сработал блокировщик окон)
  function previewPdf(sheet, items, cap, opts, win) {
    var P = window.PDFLib;
    return buildPdfs(sheet, items, cap, opts).then(function (arr) {
      return P.PDFDocument.create().then(function (all) {
        return arr.reduce(function (p, b) { return p.then(function () { return P.PDFDocument.load(b).then(function (d) { return all.copyPages(d, d.getPageIndices()); }).then(function (ps) { ps.forEach(function (x) { all.addPage(x); }); }); }); }, Promise.resolve())
          .then(function () { return all.save(); });
      });
    }).then(function (bytes) {
      var url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      if (win && !win.closed) win.location.href = url; else window.open(url, "_blank");
      return sheetsOf(items, sheet).length;
    });
  }

  /* ---------- Печать (окно печати Windows / телефона) ---------- */
  function mm(px) { return (px / DPI * 25.4).toFixed(2) + "mm"; }
  function printSheets(sheet, items, cap, opts) {
    var pages = sheetsOf(items, sheet), area = document.getElementById("printArea");
    return Promise.all(pages.map(function (pg) { return renderSheetCanvas(sheet, pg, cap, opts).then(canvasJpeg); })).then(function (blobs) {
      area.innerHTML = "";
      var loads = blobs.map(function (b) {
        var d = document.createElement("div"); d.className = "print-page";
        var im = new Image(); im.style.width = mm(A4PX.w); im.style.height = mm(A4PX.h); im.alt = "";
        d.appendChild(im); area.appendChild(d);
        return new Promise(function (res) { im.onload = res; im.onerror = res; im.src = URL.createObjectURL(b); });
      });
      return Promise.all(loads);
    }).then(function () { if (!window.__AYMABA_NOPRINT) window.print(); return pages.length; });
  }

  /* ---------- Word (.docx): каждый лист — картинка точного размера по центру страницы A4, поля 0 ---------- */
  function xmlEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function buildDocx(sheet, jpgs) {
    // каждая страница — картинка всего листа A4 (шаблон уже стоит по центру в натуральную величину), поля 0
    var EMU = 914400 / DPI, cx = Math.round(A4PX.w * EMU), cy = Math.round(A4PX.h * EMU);
    var A4W = 11906, A4H = 16838, top = 0;
    var enc = new TextEncoder(), files = {}, body = "", rels = "";
    jpgs.forEach(function (b, i) {
      var n = i + 1, rid = "rIdImg" + n;
      files["word/media/sheet" + n + ".jpeg"] = [b, { level: 0 }];
      rels += '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sheet' + n + '.jpeg"/>';
      body += '<w:p><w:pPr>' + (i ? '<w:pageBreakBefore/>' : '') + '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>' +
        '<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/>' +
        '<wp:docPr id="' + n + '" name="' + xmlEsc(sheet.prefix + " " + n) + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + n + '" name="sheet' + n + '.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>' +
        '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
    });
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' +
      body + '<w:sectPr><w:pgSz w:w="' + A4W + '" w:h="' + A4H + '"/><w:pgMar w:top="' + top + '" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>';
    files["[Content_Types].xml"] = enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
    files["_rels/.rels"] = enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
    files["docProps/core.xml"] = enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>' + xmlEsc(sheet.prefix) + '</dc:title><dc:creator>AYMABA</dc:creator></cp:coreProperties>');
    files["word/_rels/document.xml.rels"] = enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>');
    files["word/document.xml"] = enc.encode(doc);
    return window.fflate.zipSync(files);
  }
  function docxBytes(sheet, items, cap, opts) {
    var pages = sheetsOf(items, sheet);
    return Promise.all(pages.map(function (pg) { return renderSheetCanvas(sheet, pg, cap, opts).then(canvasJpeg).then(function (b) { return b.arrayBuffer(); }).then(function (a) { return new Uint8Array(a); }); }))
      .then(function (jpgs) { return buildDocx(sheet, jpgs); });
  }
  function exportDocx(sheet, items, cap, name, opts) {
    return docxBytes(sheet, items, cap, opts).then(function (z) {
      var n = fileBase(sheet, name) + ".docx";
      download(new Blob([z], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), n); return n;
    });
  }

  window.AYMABA_SHEETS = { SHEETS: SHEETS, MAX: MAX, CAP: CAP, place: place, picArea: picArea, capText: capText, sheetsOf: sheetsOf,
    exportPdf: exportPdf, previewPdf: previewPdf, cutLines: cutLines, exportDocx: exportDocx, printSheets: printSheets, buildPdfs: buildPdfs, docxBytes: docxBytes, renderSheetCanvas: renderSheetCanvas, fileBase: fileBase };
})();
