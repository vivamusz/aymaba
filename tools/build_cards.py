"""Собирает cards/<id>.webp и data/cards.json из пакетов карточек.

Запуск:  python tools/build_cards.py [папка_aymaba_web] [папки глаголов...]
По умолчанию: /workspace/aymaba_web и /workspace/aymaba_verbs68 и /workspace/aymaba_verbs24.
cards/<id>.webp — веб-версии web/<id>.webp (512×512) для сетки и просмотра.
print/<id>.webp — версии для печати: из full/<id>.png, 1063×1063 px (9 см при 300 dpi),
WebP качество 85. Пересоздаются только если исходник новее. Нужен Pillow.
Казахские поля (kk, category_kk) не переносятся: это непроверенные черновики.
"""
import json, shutil, sys, pathlib
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
web = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/aymaba_web")
verb_packs = [pathlib.Path(a) for a in sys.argv[2:]] or [pathlib.Path("/workspace/aymaba_verbs68"), pathlib.Path("/workspace/aymaba_verbs24")]
out_img = ROOT / "cards"; out_img.mkdir(exist_ok=True)
out_print = ROOT / "print"; out_print.mkdir(exist_ok=True)
items, cats, jobs = [], {}, []
PRINT_PX, PRINT_Q = 1063, 85

def make_print(job):
    src, dst = job
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.split()[-1]); im = bg
    else:
        im = im.convert("RGB")
    if im.size != (PRINT_PX, PRINT_PX):
        im.thumbnail((PRINT_PX, PRINT_PX), Image.LANCZOS)
        bg = Image.new("RGB", (PRINT_PX, PRINT_PX), "white")
        bg.paste(im, ((PRINT_PX - im.width) // 2, (PRINT_PX - im.height) // 2)); im = bg
    im.save(dst, "WEBP", quality=PRINT_Q, method=6)
    return dst

def add(src_dir, rec, num):
    p = src_dir / rec["web"]
    assert p.suffix == ".webp" and p.exists(), p
    shutil.copy2(p, out_img / f"{rec['id']}.webp")
    full = src_dir / rec["full"]; assert full.exists(), full
    dst = out_print / f"{rec['id']}.webp"
    if not dst.exists() or dst.stat().st_mtime < full.stat().st_mtime:
        jobs.append((str(full), str(dst)))
    items.append({"id": rec["id"], "ru": rec["ru"].strip(), "cat": num})
    cats.setdefault(num, rec["category"].strip())

for verbs in verb_packs:     # глаголы — первая категория
    for r in json.load(open(verbs / "verbs.json", encoding="utf-8")):
        add(verbs, r, 1)
for r in json.load(open(web / "cards.json", encoding="utf-8")):
    add(web, r, int(r["category_num"]))

if jobs:
    with ProcessPoolExecutor() as ex:
        for _ in ex.map(make_print, jobs, chunksize=8): pass
print("печатных версий пересоздано:", len(jobs))
known = {f"{i['id']}.webp" for i in items}
for d in (out_img, out_print):
    for f in d.glob("*.webp"):
        if f.name not in known: f.unlink(); print("удалён лишний", f)
ids = [i["id"] for i in items]; assert len(ids) == len(set(ids)), "повтор id"
data = {"categories": [{"num": n, "ru": cats[n]} for n in sorted(cats)],
        "cards": items}
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "cards.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(items), "карточек,", len(cats), "категорий")
