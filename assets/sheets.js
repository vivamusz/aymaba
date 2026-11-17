/* AYMABA — листы для печати карточек: геометрия, отрисовка, PDF, Word, печать.
   Геометрия 9 и 5 — из оригинального инструмента пользователя (vivamusz.grok.me), НЕ МЕНЯТЬ.
   7 на 7 — временный шаблон (tools/make_template7.py), заменить оригиналом пользователя.
   Всё считается в браузере, на сервер ничего не отправляется. */
(function () {
  var DPI = 300, PT = 72 / DPI;
  function sq(list) { return list.map(function (p) { return { x: p[0], y: p[1], w: p[2], h: p[3] }; }); }
  var SHEETS = {
    "9": { id: "9", cm: 9, px: { w: 2278, h: 3369 }, radius: 114, template: "assets/pecs/template.png", prefix: "ПЕЧАТЬ 9 см",
      slots: sq([[24,24,1039,1039],[1215,24,1039,1039],[24,1158,1039,1039],[1215,1158,1039,1039],[24,2306,1039,1039],[1215,2306,1039,1039]]) },
    "7": { id: "7", cm: 7, px: { w: 2480, h: 3508 }, radius: 83, template: "assets/pecs/template-7.png", prefix: "ПЕЧАТЬ 7 см", temporary: true,
      slots: sq([[24,538,760,760],[860,538,760,760],[1696,538,760,760],[24,1374,760,760],[860,1374,760,760],[1696,1374,760,760],[24,2210,760,760],[860,2210,760,760],[1696,2210,760,760]]) },
    "5": { id: "5", cm: 5, px: { w: 2451, h: 3308 }, radius: 65, template: "assets/pecs/template-5.png", prefix: "ПЕЧАТЬ 5 см",
      slots: [[18,19,583,583],[632,19,1197,584],[1247,19,1812,583],[1867,19,2432,583],[18,679,583,1244],[632,676,1197,1240],[1250,679,1814,1244],[1867,679,2432,1244],[18,1339,583,1903],[632,1338,1197,1903],[1250,1338,1814,1902],[1866,1338,2431,1902],[18,2026,583,2591],[632,2025,1197,2590],[1251,2025,1815,2590],[1867,2025,2432,2590],[19,2723,583,3287],[633,2724,1197,3288],[1250,2722,1815,3287],[1867,2720,2431,3284]]
        .map(function (r) { return { x: r[0], y: r[1], w: r[2] - r[0] + 1, h: r[3] - r[1] + 1 }; }) }
  };
  var MAX = 60;
  var CAP = 0.2;            // доля высоты рамки под подпись
  var FONT_URL = "assets/fonts/DejaVuSans-Bold.ttf";
  var KAPPA = 0.5522847498;

  /* Положение картинки в окне f×p. Как в оригинале: cover × scale, сдвиг ox/oy в долях окна. */
  function clamp(v, m) { return isFinite(v) ? Math.min(m, Math.max(-m, v)) : 0; }
  function place(f, p, iw, ih, it) {
    var n = it.scale || 1, v = Math.max(f / iw, p / ih) * n, dw = iw * v, dh = ih * v;
    var r = f / p, i = iw / ih;
    var mx = Math.abs(Math.max(1, i / r) * n - 1) / 2, my = Math.abs(Math.max(1, r / i) * n - 1) / 2;
    return { w: dw, h: dh, x: (f - dw) / 2 + clamp(it.ox || 0, mx) * f, y: (p - dh) / 2 + clamp(it.oy || 0, my) * p, mx: mx, my: my };
  }
  function picArea(slot, cap) { return { w: slot.w, h: cap === "off" ? slot.h : Math.round(slot.h * (1 - CAP)) }; }
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

  /* ---------- Растровый лист (для печати и Word) ---------- */
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function renderSheetCanvas(sheet, page, cap) {
    return Promise.all([loadImg(sheet.template), cap === "off" ? null : ensureFont()].concat(page.map(function (it) { return it ? loadImg(hiUrl(it)) : null; })))
      .then(function (r) {
        var tpl = r[0], imgs = r.slice(2);
        var c = document.createElement("canvas"); c.width = sheet.px.w; c.height = sheet.px.h;
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        sheet.slots.forEach(function (s, k) {
          var it = page[k], im = imgs[k]; if (!it || !im) return;
          var a = picArea(s, cap), rad = Math.min(sheet.radius, s.w / 2, s.h / 2);
          g.save(); rrect(g, s.x, s.y, s.w, s.h, rad); g.clip();
          g.save(); g.beginPath(); g.rect(s.x, s.y, a.w, a.h); g.clip();
          var q = place(a.w, a.h, im.naturalWidth, im.naturalHeight, it);
          g.imageSmoothingQuality = "high"; g.drawImage(im, s.x + q.x, s.y + q.y, q.w, q.h); g.restore();
          var tx = capText(it, cap);
          if (tx) {
            var bh = s.h - a.h; g.fillStyle = "#1a1612"; g.textAlign = "center"; g.textBaseline = "middle";
            var size = fitFont(function (t, z) { g.font = "bold " + z + "px AymabaCaption"; return g.measureText(t).width; }, tx, s.w * 0.9, bh);
            g.font = "bold " + size + "px AymabaCaption"; g.fillText(tx, s.x + s.w / 2, s.y + a.h + bh / 2);
          }
          g.restore();
        });
        g.drawImage(tpl, 0, 0, c.width, c.height);
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
  function buildPdf(sheet, page, cap, assets) {
    var P = window.PDFLib, L = P;
    return P.PDFDocument.create().then(function (doc) {
      var W = sheet.px.w * PT, H = sheet.px.h * PT, pg = doc.addPage([W, H]);
      pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: P.rgb(1, 1, 1) });
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
          var q = place(aw, ah, e.width, e.height, it);
          pg.drawImage(e, { x: x + q.x, y: ay + ah - q.y - q.h, width: q.w, height: q.h });
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
  function exportPdf(sheet, items, cap, name) {
    var pages = sheetsOf(items, sheet), base = fileBase(sheet, name);
    return makeAssets(sheet, cap).then(function (as) {
      return pages.reduce(function (p, pg) { return p.then(function (acc) { return buildPdf(sheet, pg, cap, as).then(function (b) { acc.push(b); return acc; }); }); }, Promise.resolve([]));
    }).then(function (pdfs) {
      if (pdfs.length === 1) { var n1 = (safeName(name) ? base : base + " 1") + ".pdf"; download(new Blob([pdfs[0]], { type: "application/pdf" }), n1); return n1; }
      var files = {}; pdfs.forEach(function (b, i) { files[base + " " + (i + 1) + ".pdf"] = [b, { level: 0 }]; });
      var zip = window.fflate.zipSync(files), zn = base + ".zip";
      download(new Blob([zip], { type: "application/zip" }), zn); return zn;
    });
  }
  function buildPdfs(sheet, items, cap) { // для проверки
    var pages = sheetsOf(items, sheet);
    return makeAssets(sheet, cap).then(function (as) { return Promise.all(pages.map(function (pg) { return buildPdf(sheet, pg, cap, as); })); });
  }

  /* ---------- Печать (окно печати Windows / телефона) ---------- */
  function mm(px) { return (px / DPI * 25.4).toFixed(2) + "mm"; }
  function printSheets(sheet, items, cap) {
    var pages = sheetsOf(items, sheet), area = document.getElementById("printArea");
    return Promise.all(pages.map(function (pg) { return renderSheetCanvas(sheet, pg, cap).then(canvasJpeg); })).then(function (blobs) {
      area.innerHTML = "";
      var loads = blobs.map(function (b) {
        var d = document.createElement("div"); d.className = "print-page";
        var im = new Image(); im.style.width = mm(sheet.px.w); im.style.height = mm(sheet.px.h); im.alt = "";
        d.appendChild(im); area.appendChild(d);
        return new Promise(function (res) { im.onload = res; im.onerror = res; im.src = URL.createObjectURL(b); });
      });
      return Promise.all(loads);
    }).then(function () { if (!window.__AYMABA_NOPRINT) window.print(); return pages.length; });
  }

  /* ---------- Word (.docx): каждый лист — картинка точного размера по центру страницы A4, поля 0 ---------- */
  function xmlEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function buildDocx(sheet, jpgs) {
    var EMU = 914400 / DPI, cx = Math.round(sheet.px.w * EMU), cy = Math.round(sheet.px.h * EMU);
    var TW = 1440 / DPI, A4W = 11906, A4H = 16838;
    var top = Math.max(0, Math.floor((A4H - sheet.px.h * TW) / 2) - 20);
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
  function docxBytes(sheet, items, cap) {
    var pages = sheetsOf(items, sheet);
    return Promise.all(pages.map(function (pg) { return renderSheetCanvas(sheet, pg, cap).then(canvasJpeg).then(function (b) { return b.arrayBuffer(); }).then(function (a) { return new Uint8Array(a); }); }))
      .then(function (jpgs) { return buildDocx(sheet, jpgs); });
  }
  function exportDocx(sheet, items, cap, name) {
    return docxBytes(sheet, items, cap).then(function (z) {
      var n = fileBase(sheet, name) + ".docx";
      download(new Blob([z], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), n); return n;
    });
  }

  window.AYMABA_SHEETS = { SHEETS: SHEETS, MAX: MAX, CAP: CAP, place: place, picArea: picArea, capText: capText, sheetsOf: sheetsOf,
    exportPdf: exportPdf, exportDocx: exportDocx, printSheets: printSheets, buildPdfs: buildPdfs, docxBytes: docxBytes, renderSheetCanvas: renderSheetCanvas, fileBase: fileBase };
})();
