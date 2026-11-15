"""Скриншоты: python tools/shots.py [base_url]  -> shots/*.png"""
import sys, pathlib
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/"
out = pathlib.Path(__file__).resolve().parent.parent / "shots"; out.mkdir(exist_ok=True)
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for name, vp in [("desktop", {"width": 1366, "height": 860}), ("mobile", {"width": 390, "height": 844})]:
        ctx = b.new_context(viewport=vp, device_scale_factor=1 if name == "desktop" else 2, is_mobile=name == "mobile")
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        for lang in ["ru", "kk"]:
            pg.goto(base + "?lang=" + lang); pg.wait_for_load_state("networkidle")
            pg.screenshot(path=str(out / f"home_{lang}_{name}.png"), full_page=True)
        pg.goto(base + "?lang=ru")
        if name == "mobile":
            pg.click(".menu-toggle"); pg.screenshot(path=str(out / "menu_open_mobile.png"))
        for doc in ["oferta", "terms", "faq"]:
            pg.goto(base + doc + ".html"); pg.wait_for_load_state("networkidle")
            pg.screenshot(path=str(out / f"{doc}_{name}.png"), full_page=False)
        ctx.close()
    b.close()
print("errors:", errs)
