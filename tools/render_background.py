"""Рисует фон сайта (дымка + шёлковые волны + зерно) в готовые картинки:
  assets/bg.webp       — вертикальная, для телефонов (1440×2880)
  assets/bg-wide.webp  — горизонтальная, для компьютеров (2560×1440)

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
    for k, w, op, dy in (("w1", 1, .32, 0), ("w1", .6, .22, 9), ("w1", .5, .15, 20),  # тонкие линии
                         ("w2", 1.3, .75, 0), ("w2", .8, .5, 8), ("w2", .6, .35, 18), ("w2", .4, .25, 31),
                         ("w3", 1, .55, 0), ("w3", .6, .35, 10)):
        over(line_color, SILK * op * line_fade * stroke(WAVES[k], w, .5, dy))

    # ---------- зерно: прячет «ступеньки» в плавных переходах ----------
    rng = np.random.default_rng(7)
    img += rng.normal(0, 2.0, (H, W, 1)).astype(np.float32)

    path_out = os.path.join(ASSETS, out)
    Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8)).save(path_out, "WEBP", quality=86, method=6)
    print("saved", out, f"{W}x{H}", os.path.getsize(path_out) // 1024, "KB")


if __name__ == "__main__":
    render(1440, 2880, "bg.webp")
    render(2560, 1440, "bg-wide.webp")
