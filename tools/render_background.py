"""Рисует фон сайта (дымка + шёлковые волны + зерно) в готовые картинки:
  assets/bg.webp       — вертикальная, для телефонов (1080×2160)
  assets/bg-wide.webp  — горизонтальная, для компьютеров (1920×1080)

Зачем: если рисовать это прямо на странице (SVG-фильтры, размытие, анимация),
iPhone тормозит. Готовая картинка показывается мгновенно.
Цвета — палитра «Warm Graphite», как в assets/style.css. Запуск: python tools/render_background.py
После перерисовки увеличить ?v= у bg.webp / bg-wide.webp в assets/style.css и index.html.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
# яркость всех волн (складки, блики, линии): 1 — исходная, 0.5 — вдвое тусклее
SILK = 0.5
# прозрачность тонких векторных линий поверх фона: 1 — как раньше, 0.5 — вдвое прозрачнее
LINE_ALPHA = 0.35


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def bezier(p0, p1, p2, p3, n=200):
    t = np.linspace(0, 1, n)[:, None]
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3


def path(d):
    """M x y C x y, x y, x y S x y, x y — как в SVG, в системе 400×800."""
    nums = [float(v) for v in d.replace("M", " ").replace("C", " ").replace("S", " ").replace(",", " ").split()]
    p = np.array(nums).reshape(-1, 2)
    p0, c1, c2, p1 = p[0], p[1], p[2], p[3]
    pts = [bezier(p0, c1, c2, p1)]
    if len(p) > 4:
        c3 = 2 * p1 - c2
        pts.append(bezier(p1, c3, p[4], p[5]))
    return np.vstack(pts)


WAVES = {
    "w1": path("M450 70 C 340 150, 320 300, 180 345 S -10 330, -60 460"),
    "w2": path("M-60 545 C 50 495, 140 630, 245 650 S 385 585, 470 690"),
    "w3": path("M150 870 C 240 770, 320 715, 470 735"),
}


def render(W, H, out):
    sx, sy = W / 400, H / 800          # кривые растягиваются под пропорции картинки
    S = (sx * sy) ** 0.5               # толщина и размытие — по среднему масштабу
    short = min(W, H)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.zeros((H, W, 3), np.float32)

    def over(color, alpha):
        nonlocal img
        a = np.clip(alpha, 0, 1)[..., None]
        c = hexrgb(color) if isinstance(color, str) else color
        img = img * (1 - a) + c * a

    def radial(cx, cy, rx, ry, inner=0.0, outer=1.0):
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        t = np.clip((d - inner) / (outer - inner), 0, 1)
        return 1 - (t * t * (3 - 2 * t))

    def stroke(pts, width, blur, dy=0):
        layer = Image.new("L", (W, H), 0)
        ImageDraw.Draw(layer).line([(x * sx, (y + dy) * sy) for x, y in pts], fill=255,
                                   width=max(1, int(round(width * S))), joint="curve")
        if blur:
            layer = layer.filter(ImageFilter.GaussianBlur(blur * S))
        return np.asarray(layer, np.float32) / 255

    # ---------- основа: графит, сверху чуть светлее ----------
    img[:] = hexrgb("#232323")
    over("#303030", radial(W * .5, 0, W * 1.2, H * .8 * .62, 0, 1))

    # ---------- дымка (пятна света) ----------
    over("#4a4844", .40 * radial(W * .05, H * .12, short * .95, short * .95, 0, .62))
    over("#a99d8b", .10 * radial(W * .95, H * .45, short * .75, short * .75, 0, .60))
    over("#41403e", .50 * radial(W * .25, H * 1.0, short * .9, short * .9, 0, .62))
    over("#c5bbaa", .07 * radial(W * .8, H * .02, short * .45, short * .45, 0, .60))

    # ---------- шёлковые волны ----------
    gx = xx / W
    line_fade = np.interp(gx, [0, .3, .7, 1], [0, .95, .6, 0])
    line_color = np.dstack([np.interp(gx, [0, .5, 1], [236, 232, 224]),
                            np.interp(gx, [0, .5, 1], [230, 222, 208]),
                            np.interp(gx, [0, .5, 1], [214, 202, 182])]).astype(np.float32)
    band_fade = np.interp((xx / W + yy / H) / 2, [0, .5, 1], [0, .7, 0])

    for k, w, op in (("w1", 80, .28), ("w2", 100, .5), ("w3", 70, .4)):            # мягкие складки
        over("#8f8576", SILK * op * band_fade * stroke(WAVES[k], w, 16))
    for k, w, op, dy in (("w1", 6, .12, -14), ("w2", 8, .4, -18)):                    # блик вдоль складки
        over(line_color, SILK * op * line_fade * stroke(WAVES[k], w, 4, dy))
    # тонкие линии рисуются не здесь, а векторно (SVG) — см. write_lines(): в сжатой картинке
    # тонкая яркая линия рассыпается «лесенкой», а вектор телефон рисует идеально ровно

    # ---------- зерно: прячет «ступеньки» в плавных переходах ----------
    # Сжатие БЕЗ потерь + упорядоченное сглаживание (матрица Байера 8×8): плавные тёмные переходы
    # не превращаются ни в квадраты (как при обычном сжатии), ни в ступеньки (как без сглаживания).
    b2 = np.array([[0, 2], [3, 1]])
    bayer = b2
    for _ in range(2):
        bayer = np.block([[4 * bayer, 4 * bayer + 2], [4 * bayer + 3, 4 * bayer + 1]])
    bayer = (bayer + 0.5) / 64 - 0.5                       # от −0,5 до +0,5 оттенка
    dither = np.tile(bayer, (H // 8 + 1, W // 8 + 1))[:H, :W, None]
    out_img = np.clip(np.floor(img + 0.5 + dither), 0, 255).astype(np.uint8)

    path_out = os.path.join(ASSETS, out)
    Image.fromarray(out_img).save(path_out, "WEBP", lossless=True, quality=100, method=6)
    print("saved", out, f"{W}x{H}", os.path.getsize(path_out) // 1024, "KB")
    write_lines(W, H, out.replace(".webp", "-lines.svg"))


LINES = (("w1", 1, .32, 0), ("w1", .6, .22, 9), ("w1", .5, .15, 20),
         ("w2", 1.3, .75, 0), ("w2", .8, .5, 8), ("w2", .6, .35, 18), ("w2", .4, .25, 31),
         ("w3", 1, .55, 0), ("w3", .6, .35, 10))
LINE_DEFS = {"w1": "M450 70 C 340 150, 320 300, 180 345 S -10 330, -60 460",
             "w2": "M-60 545 C 50 495, 140 630, 245 650 S 385 585, 470 690",
             "w3": "M150 870 C 240 770, 320 715, 470 735"}


def write_lines(W, H, out):
    """Тонкие светящиеся линии — векторный слой того же размера, что и картинка (накладывается поверх)."""
    sx, sy = W / 400, H / 800
    S = (sx * sy) ** 0.5

    def scaled(d, dy):
        nums = [float(v) for v in d.replace("M", " ").replace("C", " ").replace("S", " ").replace(",", " ").split()]
        p = [(nums[i] * sx, (nums[i + 1] + dy) * sy) for i in range(0, len(nums), 2)]
        f = lambda q: f"{q[0]:.1f} {q[1]:.1f}"
        txt = f"M{f(p[0])} C{f(p[1])} {f(p[2])} {f(p[3])}"
        if len(p) > 4:
            txt += f" S{f(p[4])} {f(p[5])}"
        return txt

    paths = "\n".join(
        f'<path d="{scaled(LINE_DEFS[k], dy)}" stroke-width="{max(.8, w * S):.2f}" stroke-opacity="{LINE_ALPHA * SILK * op:.3f}"/>'
        for k, w, op, dy in LINES)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{W}" y2="0">
<stop offset="0" stop-color="#ece8e0" stop-opacity="0"/><stop offset=".3" stop-color="#e8e2d6" stop-opacity=".95"/>
<stop offset=".7" stop-color="#ddd3c3" stop-opacity=".6"/><stop offset="1" stop-color="#d6cab6" stop-opacity="0"/>
</linearGradient></defs>
<g fill="none" stroke="url(#g)" stroke-linecap="round">
{paths}
</g></svg>'''
    with open(os.path.join(ASSETS, out), "w", encoding="utf-8") as fh:
        fh.write(svg)
    print("saved", out)


if __name__ == "__main__":
    render(1080, 2160, "bg.webp")
    render(1920, 1080, "bg-wide.webp")
