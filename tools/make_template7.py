"""ВРЕМЕННЫЙ шаблон 7 на 7 (A4, 3×3). Заменить оригиналом пользователя (template-7.png).
Стиль точь-в-точь как template.png (9 на 9): цвет рамки 53,74,155, рамка 24 px снаружи окна,
радиус окна пропорционален 114/1039, крайние рамки вплотную к краям листа по ширине.
A4 = 2480×3508 px @300dpi. Ровно 7 см (827 px) × 3 = 21 см = вся ширина A4, поэтому
с рамками настоящие 7 см в 3 столбца не помещаются: окно картинки 760 px ≈ 6,4 см,
по внешнему краю рамки 808 px ≈ 6,8 см, промежуток 28 px.
Запуск: python tools/make_template7.py  -> assets/pecs/template-7.png и печать геометрии."""
from PIL import Image, ImageDraw
import json, pathlib
W, H, S, B, GAP = 2480, 3508, 760, 24, 28
R = round(114 * S / 1039)  # как у 9 на 9
COLOR = (53, 74, 155, 255)
outer = S + 2 * B
x0 = (W - (3 * outer + 2 * GAP)) // 2
y0 = (H - (3 * outer + 2 * GAP)) // 2
slots = []
for r in range(3):
    for c in range(3):
        slots.append({"x": x0 + c * (outer + GAP) + B, "y": y0 + r * (outer + GAP) + B, "w": S, "h": S})
K = 4  # сглаживание
big = Image.new("L", (W * K, H * K), 0)
d = ImageDraw.Draw(big)
for s in slots:
    d.rounded_rectangle([(s["x"] - B) * K, (s["y"] - B) * K, (s["x"] + S + B) * K - 1, (s["y"] + S + B) * K - 1], radius=(R + B) * K, fill=255)
    d.rounded_rectangle([s["x"] * K, s["y"] * K, (s["x"] + S) * K - 1, (s["y"] + S) * K - 1], radius=R * K, fill=0)
alpha = big.resize((W, H), Image.LANCZOS)
img = Image.new("RGBA", (W, H), COLOR); img.putalpha(alpha)
out = pathlib.Path(__file__).resolve().parent.parent / "assets/pecs/template-7.png"
img.save(out, optimize=True)
print(json.dumps({"px": [W, H], "radius": R, "slots": [[s["x"], s["y"]] for s in slots], "size": S}))
