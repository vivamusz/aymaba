"""Собирает oferta.html, terms.html, faq.html из .docx в tools/legal_src/.

Запуск из корня репозитория:  python tools/build_legal.py
Нужен пакет python-docx (pip install python-docx).
Шапка и подвал берутся из index.html (между <!--HEADER--> и <!--/HEADER-->,
<!--FOOTER--> и <!--/FOOTER-->), поэтому оформление везде одинаковое.
Если правите текст документа — правьте .docx и запускайте скрипт заново.
"""
import html, re, pathlib
import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = [("oferta.docx", "oferta.html", "Публичная оферта"),
        ("terms.docx", "terms.html", "Условия использования"),
        ("faq.docx", "faq.html", "Частые вопросы")]

# Правило сайта: не использовать слово «PECS» в названиях и рекламе.
REPLACE = [
    ("карточек ABA/PECS", "карточек ABA и пиктограмм"),
    ("Карточки ABA/PECS", "Карточки ABA и пиктограммы"),
    ("по подходам ABA и PECS", "по подходу ABA и с пиктограммами"),
]

def fix(t):
    for a, b in REPLACE:
        t = t.replace(a, b)
    return t

def esc(t):
    t = html.escape(fix(t)).replace("\t", " · ")
    return re.sub(r"\[([^\]]+)\]", r'<mark class="ph">[\1]</mark>', t)

def runs_html(p):
    out = []
    for r in p.runs:
        s = esc(r.text)
        out.append(f"<strong>{s}</strong>" if r.bold and s.strip() else s)
    s = "".join(out).strip()
    return s or esc(p.text)

def body_items(d):
    for el in d.element.body.iterchildren():
        tag = el.tag.split("}")[1]
        if tag == "p": yield Paragraph(el, d)
        elif tag == "tbl": yield Table(el, d)

def convert(src):
    d = docx.Document(src)
    out, in_list, after_title = [], False, 0
    for it in body_items(d):
        if isinstance(it, Table):
            if in_list: out.append("</ul>"); in_list = False
            rows = "".join("<tr>" + "".join(f"<td>{esc(c.text)}</td>" for c in r.cells) + "</tr>" for r in it.rows)
            out.append(f"<table>{rows}</table>")
            continue
        st, txt = it.style.name, it.text.strip()
        if not txt: continue
        if st == "List Bullet":
            if not in_list: out.append("<ul>"); in_list = True
            out.append(f"<li>{runs_html(it)}</li>"); continue
        if in_list: out.append("</ul>"); in_list = False
        if st == "Title":
            out.append(f"<h1>{esc(txt)}</h1>"); after_title = 2
        elif st == "Heading 1": out.append(f"<h2>{esc(txt)}</h2>")
        elif st == "Heading 2": out.append(f"<h3>{esc(txt)}</h3>")
        else:
            cls = ' class="sub"' if after_title > 0 else ""
            out.append(f"<p{cls}>{runs_html(it)}</p>")
        if st != "Title" and after_title: after_title -= 1
    if in_list: out.append("</ul>")
    return "\n".join(out)

def main():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    header = re.search(r"<!--HEADER-->.*?<!--/HEADER-->", index, re.S).group(0)
    footer = re.search(r"<!--FOOTER-->.*?<!--/FOOTER-->", index, re.S).group(0)
    for src, dst, title in DOCS:
        content = convert(ROOT / "tools" / "legal_src" / src)
        page = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — AYMABA</title>
<meta name="theme-color" content="#1f7a6d">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<!-- ФАЙЛ СОЗДАН АВТОМАТИЧЕСКИ: tools/build_legal.py из tools/legal_src/{src}. Не правьте вручную. -->
{header}
<main id="main" class="legal">
  <div class="wrap">
    <p class="draft" data-i18n="legal.draft">Черновик документа: реквизиты и контакты будут заполнены позже.</p>
    <p class="draft" data-show-lang="kk" hidden data-i18n="legal.langnote"></p>
    <article class="doc">
      <a class="back" href="./" data-i18n="legal.back">← На главную</a>
{content}
    </article>
  </div>
</main>
{footer}
</body>
</html>
"""
        (ROOT / dst).write_text(page, encoding="utf-8")
        print("OK", dst, len(page))
    # Обновляем шапку и подвал в library.html (страница пишется вручную).
    lib = ROOT / "library.html"
    if lib.exists():
        t = lib.read_text(encoding="utf-8")
        t = re.sub(r"<!--HEADER-->.*?<!--/HEADER-->", lambda m: header, t, flags=re.S)
        t = re.sub(r"<!--FOOTER-->.*?<!--/FOOTER-->", lambda m: footer, t, flags=re.S)
        lib.write_text(t, encoding="utf-8"); print("OK library.html (шапка/подвал)")

if __name__ == "__main__":
    main()
