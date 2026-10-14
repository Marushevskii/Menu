"""Подготовка фото позиций: большое фото + квадратное превью для карточки.

  python tools/photos.py <файл> <id позиции> [<файл> <id> ...]

Результат:
  photos/<id>.webp         — до 1200 px по длинной стороне (открывается по нажатию)
  photos/thumbs/<id>.webp  — квадрат 240×240, центр кадра (в карточке)
Записать в позицию: "photo": "photos/<id>.webp", "thumb": "photos/thumbs/<id>.webp".
"""
import os
import sys
from PIL import Image, ImageOps

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
BIG, THUMB = 1200, 240


def process(src, pid):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    os.makedirs(os.path.join(ROOT, "photos", "thumbs"), exist_ok=True)
    big = im.copy()
    big.thumbnail((BIG, BIG), Image.LANCZOS)
    big.save(os.path.join(ROOT, "photos", f"{pid}.webp"), "WEBP", quality=82, method=6)
    # квадрат из центра; по вертикали чуть выше центра — у напитков верх (украшение) важнее
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = max(0, min(h - side, int((h - side) * 0.42)))
    sq = im.crop((left, top, left + side, top + side)).resize((THUMB, THUMB), Image.LANCZOS)
    sq.save(os.path.join(ROOT, "photos", "thumbs", f"{pid}.webp"), "WEBP", quality=80, method=6)
    sizes = [os.path.getsize(os.path.join(ROOT, "photos", p)) // 1024 for p in (f"{pid}.webp", f"thumbs/{pid}.webp")]
    print(f"{pid}: фото {sizes[0]} КБ, превью {sizes[1]} КБ")


if __name__ == "__main__":
    args = sys.argv[1:]
    for i in range(0, len(args), 2):
        process(args[i], args[i + 1])
