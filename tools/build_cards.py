"""Собирает cards/<id>.webp и data/cards.json из пакетов карточек.

Запуск:  python tools/build_cards.py [папка_aymaba_web] [папки глаголов...]
По умолчанию: /workspace/aymaba_web и /workspace/aymaba_verbs68 и /workspace/aymaba_verbs24.
Берутся ТОЛЬКО лёгкие веб-версии web/<id>.webp (512×512). Полноразмерные
файлы для печати (full/) на сайт НЕ кладутся — печать будет по подписке.
Казахские поля (kk, category_kk) не переносятся: это непроверенные черновики.
"""
import json, shutil, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
web = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/aymaba_web")
verb_packs = [pathlib.Path(a) for a in sys.argv[2:]] or [pathlib.Path("/workspace/aymaba_verbs68"), pathlib.Path("/workspace/aymaba_verbs24")]
out_img = ROOT / "cards"; out_img.mkdir(exist_ok=True)
items, cats = [], {}

def add(src_dir, rec, num):
    p = src_dir / rec["web"]
    assert p.suffix == ".webp" and p.exists(), p
    shutil.copy2(p, out_img / f"{rec['id']}.webp")
    items.append({"id": rec["id"], "ru": rec["ru"].strip(), "cat": num})
    cats.setdefault(num, rec["category"].strip())

for verbs in verb_packs:     # глаголы — первая категория
    for r in json.load(open(verbs / "verbs.json", encoding="utf-8")):
        add(verbs, r, 1)
for r in json.load(open(web / "cards.json", encoding="utf-8")):
    add(web, r, int(r["category_num"]))

ids = [i["id"] for i in items]; assert len(ids) == len(set(ids)), "повтор id"
data = {"categories": [{"num": n, "ru": cats[n]} for n in sorted(cats)],
        "cards": items}
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "cards.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(items), "карточек,", len(cats), "категорий")
