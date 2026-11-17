"""Шаблоны 7 на 7 и 5 на 5 на настоящем A4 (2480×3508 px, 300 dpi) в стиле 9 на 9
(цвет рамки 53,74,155, скруглённые окна, рамка снаружи окна).
7×7: 8 штук (2×4), карточка по внешнему краю рамки ровно 7 см.
5×5: 20 штук (4×5), поля от края листа 4,8 мм (решение пользователя 17.11.2026).
Запуск: python tools/make_grid_templates.py -> assets/pecs/template-7.png, template-5.png + геометрия."""
from PIL import Image, ImageDraw
import json, pathlib
W, H = 2480, 3508
COLOR = (53, 74, 155, 255)
ROOT = pathlib.Path(__file__).resolve().parent.parent
def make(name, cols, rows, S, B, R, gx, gy, x0=None):
    outer = S + 2 * B
    tw, th = cols * outer + (cols - 1) * gx, rows * outer + (rows - 1) * gy
    x0 = (W - tw) // 2 if x0 is None else x0
    y0 = (H - th) // 2
    slots = [[x0 + c * (outer + gx) + B, y0 + r * (outer + gy) + B, S, S] for r in range(rows) for c in range(cols)]
    K = 4
    big = Image.new("L", (W * K, H * K), 0); d = ImageDraw.Draw(big)
    for x, y, _, _ in slots:
        d.rounded_rectangle([(x - B) * K, (y - B) * K, (x + S + B) * K - 1, (y + S + B) * K - 1], radius=(R + B) * K, fill=255)
        d.rounded_rectangle([x * K, y * K, (x + S) * K - 1, (y + S) * K - 1], radius=R * K, fill=0)
    img = Image.new("RGBA", (W, H), COLOR); img.putalpha(big.resize((W, H), Image.LANCZOS))
    img.save(ROOT / f"assets/pecs/{name}.png", optimize=True)
    print(name, json.dumps({"radius": R, "border": B, "margin_mm": round(x0 / 300 * 25.4, 2), "top_mm": round(y0 / 300 * 25.4, 2), "slots": slots}))
# 7 см = 827 px по внешнему краю рамки -> окно 827-48 = 779
make("template-7", 2, 4, 779, 24, round(114 * 779 / 1039), 12, 12)
# 5 см: поле 4,8 мм = 57 px; ширина 2480-2*57 = 2366 = 4*(S+36)+3*13 -> S = 545
make("template-5", 4, 5, 545, 18, round(65 * 545 / 565), 13, 60, x0=57)
