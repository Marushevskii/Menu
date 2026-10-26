"""Автоперевод меню: русский → английский, грузинский, турецкий (Google Cloud Translation).

Запускается роботом GitHub после каждого сохранения (см. .github/workflows/publish.yml).

Правила:
- Текст на 4 языках в данных — это объект {"ru": …, "en": …, "ka": …, "tr": …}.
- Изменился русский текст → переводим его заново на все языки (перезаписываем) и ставим
  метку "auto": "🔄 изменено", чтобы в админке было видно, что проверить.
- Новый текст → заполняем только пустые переводы.
- Русский не менялся → переводы не трогаем (ручные правки сохраняются).
- Слова из data/glossary.json не переводятся машиной: подставляется готовый вариант.

Запуск вручную:
  python tools/translate.py --base <commit>      сравнить с версией из коммита
  python tools/translate.py --fill-empty         только заполнить пустые переводы
  --fake                                         без Google, для проверки (пишет «[en] текст»)
Ключ Google берётся из переменной окружения GOOGLE_TRANSLATE_KEY.
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
FILES = ["data/hookah.json", "data/bar.json", "data/snacks.json", "data/promo.json", "data/event.json", "data/ui.json"]
TARGETS = ["en", "ka", "tr"]
MARK = "🔄 изменено"
API = "https://translation.googleapis.com/language/translate/v2"


def is_lang(obj):
    return isinstance(obj, dict) and "ru" in obj and any(k in obj for k in TARGETS) \
        and all(isinstance(obj.get(k, ""), str) for k in ["ru", *TARGETS])


def walk(node, path=()):
    """Все языковые объекты с устойчивым «адресом» (по id позиций, а не по номеру в списке)."""
    if is_lang(node):
        yield path, node
        return
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, path + (k,))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            key = v.get("id") if isinstance(v, dict) and v.get("id") else i
            yield from walk(v, path + (f"[{key}]",))


def load_old(rel, base):
    if not base:
        return None
    try:
        raw = subprocess.check_output(["git", "show", f"{base}:{rel}"], cwd=ROOT, stderr=subprocess.DEVNULL)
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return None


# ---------- словарь «не переводить» ----------
def load_glossary():
    p = os.path.join(ROOT, "data", "glossary.json")
    if not os.path.exists(p):
        return []
    terms = json.load(open(p, encoding="utf-8"))["terms"]
    return sorted(terms, key=lambda t: -len(t["ru"]))   # длинные первыми: «Мартини Россо» раньше «Мартини»


def protect(text, lang, glossary):
    """Заменяем словарные слова на готовый перевод внутри <span translate=no>."""
    out = html.escape(text, quote=False)
    for t in glossary:
        target = t.get(lang) or t.get("en") or t["ru"]
        pat = re.compile(r"(?<![\wА-Яа-яЁё])" + re.escape(html.escape(t["ru"], quote=False)) + r"(?![\wА-Яа-яЁё])", re.I)
        out = pat.sub(lambda m: f'<span translate="no" class="notranslate">{html.escape(target, quote=False)}</span>', out)
    return out


def unprotect(text):
    text = re.sub(r"</?span[^>]*>", "", text)
    return html.unescape(text).strip()


# ---------- переводчик ----------
def google(texts, lang, key):
    body = json.dumps({"q": texts, "source": "ru", "target": lang, "format": "html"}).encode("utf-8")
    req = urllib.request.Request(f"{API}?key={key}", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    return [t["translatedText"] for t in data["data"]["translations"]]


def fake(texts, lang, key):
    return [f"[{lang}] {t}" for t in texts]


def translate_all(jobs, glossary, engine, key):
    """jobs: список (объект, язык). Переводит пачками по 100 строк."""
    by_lang = {}
    for obj, lang in jobs:
        by_lang.setdefault(lang, []).append(obj)
    chars = 0
    for lang, objs in by_lang.items():
        for i in range(0, len(objs), 100):
            chunk = objs[i:i + 100]
            src = [protect(o["ru"], lang, glossary) for o in chunk]
            chars += sum(len(s) for s in src)
            for o, res in zip(chunk, engine(src, lang, key)):
                o[lang] = unprotect(res)
    return chars


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", help="коммит, с которым сравнивать (что было до сохранения)")
    ap.add_argument("--fill-empty", action="store_true", help="только заполнить пустые переводы")
    ap.add_argument("--fake", action="store_true", help="не обращаться к Google (проверка)")
    a = ap.parse_args()

    key = os.environ.get("GOOGLE_TRANSLATE_KEY", "")
    if not a.fake and not key:
        print("Нет ключа GOOGLE_TRANSLATE_KEY — перевод пропущен.")
        return 0
    engine = fake if a.fake else google
    glossary = load_glossary()

    changed_files = []
    total_jobs = 0
    total_chars = 0
    for rel in FILES:
        path = os.path.join(ROOT, rel)
        new = json.load(open(path, encoding="utf-8"))
        old = None if a.fill_empty else load_old(rel, a.base)
        old_map = {p: o for p, o in walk(old)} if old is not None else {}

        jobs = []
        for p, obj in walk(new):
            ru = (obj.get("ru") or "").strip()
            if not ru:
                continue
            prev = old_map.get(p)
            ru_changed = old is not None and prev is not None and (prev.get("ru") or "").strip() != ru
            is_new = old is not None and prev is None
            if ru_changed:
                targets = TARGETS                                       # русский поменяли — переводим заново
            elif is_new or a.fill_empty or old is None:
                targets = [l for l in TARGETS if not (obj.get(l) or "").strip()]   # заполняем пустое
            else:
                targets = []
            if targets:
                jobs += [(obj, l) for l in targets]
                obj["auto"] = MARK
        if jobs:
            total_chars += translate_all(jobs, glossary, engine, key)
            total_jobs += len(jobs)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(new, f, ensure_ascii=False, indent=2)
                f.write("\n")
            changed_files.append(rel)

    print(f"Переведено строк: {total_jobs}, символов: {total_chars}. Файлы: {', '.join(changed_files) or 'нет'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
