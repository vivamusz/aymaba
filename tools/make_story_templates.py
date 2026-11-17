"""Шаблоны «Сюжетные» (A5, A6, целый A4) на обычном листе A4 2480×3508 px @300dpi.
Стиль как у template.png (9 на 9): цвет 53,74,155, рамка 24 px, скругление 114 px.
От линии реза до рамки — безопасный отступ 5 мм (59 px), чтобы принтер и ножницы ничего не срезали.
  A5: 2 на листе, каждая 21×14,85 см (резать по середине листа);
  A6: 4 на листе, каждая 10,5×14,85 см (резать крестом);
  A4: 1 на листе.
Запуск: python tools/make_story_templates.py -> assets/pecs/template-a5.png, -a6.png, -a4.png и геометрия (JSON)."""
from PIL import Image, ImageDraw
import json, pathlib
W, H, B, R, M = 2480, 3508, 24, 114, 59
COLOR = (53, 74, 155, 255)
LAYOUTS = {"a5": (1, 2), "a6": (2, 2), "a4": (1, 1)}
out = pathlib.Path(__file__).resolve().parent.parent / "assets/pecs"
geo = {}
for name, (cols, rows) in LAYOUTS.items():
    cw, ch = W / cols, H / rows
    slots = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = round(c * cw + M + B), round(r * ch + M + B)
            x1, y1 = round((c + 1) * cw - M - B), round((r + 1) * ch - M - B)
            slots.append([x0, y0, x1 - x0, y1 - y0])
    K = 4
    big = Image.new("L", (W * K, H * K), 0); d = ImageDraw.Draw(big)
    for x, y, w, h in slots:
        d.rounded_rectangle([(x - B) * K, (y - B) * K, (x + w + B) * K - 1, (y + h + B) * K - 1], radius=(R + B) * K, fill=255)
        d.rounded_rectangle([x * K, y * K, (x + w) * K - 1, (y + h) * K - 1], radius=R * K, fill=0)
    img = Image.new("RGBA", (W, H), COLOR); img.putalpha(big.resize((W, H), Image.LANCZOS))
    img.save(out / f"template-{name}.png", optimize=True)
    geo[name] = {"slots": slots, "cuts": {"xs": [round(c * cw) for c in range(1, cols)], "ys": [round(r * ch) for r in range(1, rows)]}}
print(json.dumps(geo))
