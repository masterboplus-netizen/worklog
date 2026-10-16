# HANDOFF — как войти в Хераборину

> Для нового чата с AI.
> СНАЧАЛА ЧИТАЙ: docs/AI_INSTRUCTIONS.md
> Дата: 2026-10-16. HEAD: 7c767c0.

## 1. ЧТО ЭТО
PWA-трекер времени Andrey для работы с AI.
Стек: HTML/CSS/JS (vanilla) + Service Worker + AES-256-GCM.
Хостинг: GitHub Pages. Репо: masterboplus-netizen/worklog.

## 2. СТРУКТУРА ФАЙЛОВ
- index.html — входная (PIN + дашборд + дневник). ~61 строк.
- style.css — стили (тёмная тема, CSS-переменные). ~509 строк.
- app.js — вся логика UI. ~473 строк.
- crypto.js — PBKDF2 → AES-256-GCM. ~62 строк.
- sw.js — Service Worker (офлайн-кэш).
- manifest.webmanifest — PWA-манифест.
- icon.svg — иконка.
- encrypt.py — шифрование JSON (только .venv/bin/python).
- worklog.json — исходные данные (в git через add -f).
- data.encrypted.json — публикуется на GitHub Pages.

## 3. КАК ОБНОВИТЬ ДАННЫЕ
См. docs/AI_INSTRUCTIONS.md §4.
Коротко: worklog.json → json.tool → encrypt.py → git push.

## 4. CACHE-BUST
После правки app.js/style.css — увеличить ?v=N в index.html.
Проверить: grep -n "v=" index.html

## 5. ГДЕ МЫ
См. docs/STATE.md.

## 6. ЧТО ДАЛЬШЕ
См. docs/STATE.md §TODO.
