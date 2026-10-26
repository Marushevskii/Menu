"""Собирает список мероприятий для сайта: data/events.json.

Сайт не умеет смотреть, какие файлы лежат в папке, поэтому при каждой публикации
(.github/workflows/publish.yml) этот скрипт пробегает по data/events/*.json и пишет
короткий список включённых ивентов с датами. Сайт по нему выбирает, какой показать сейчас.

data/events.json хранится в git и обновляется сам при каждой публикации (его коммитит publish.yml).
Если правите мероприятия вручную, а не через админку, — запустите перед коммитом: python tools/build_events.py
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    events = []
    for path in sorted(glob.glob(os.path.join(ROOT, "data", "events", "*.json"))):
        slug = os.path.splitext(os.path.basename(path))[0]
        try:
            ev = json.load(open(path, encoding="utf-8"))
        except Exception as e:
            print(f"Пропущен {slug}: файл не читается ({e})")
            continue
        if not ev.get("enabled"):
            continue
        events.append({"file": slug, "dateFrom": ev.get("dateFrom") or "", "dateTo": ev.get("dateTo") or ""})
    with open(os.path.join(ROOT, "data", "events.json"), "w", encoding="utf-8") as f:
        json.dump({"events": events}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Включённые мероприятия:", ", ".join(e["file"] for e in events) or "нет")


if __name__ == "__main__":
    main()
