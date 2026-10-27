# Wink Trade & Winky VTuber 🌟

Интерактивная экосистема для стримов и торговых сигналов:
1. **Winky VTuber (macOS)**: 3D-аватар на Three.js / VRM / FBX с физикой дыхания, моргания, жестами (приветствие зрителей, смущение, радость), спектральным Lip-Sync и гибридной озвучкой (Lumean Cartesia/ElevenLabs + Edge-TTS + macOS say). Интеграция с TikTok Live чатом и LLM (DeepSeek-V4.1-Flash / River AI).
2. **Telegram Bot (@winktrade_bot)**: Воронка онбординга «Регистрация → Депозит → Доступ» на aiogram 3.x с двухъязычной поддержкой (RU/EN), счётчиками социального доказательства и прогрессом.
3. **FastAPI Backend**: Postback API для партнёрской программы Pocket Partners, генерация торговых сигналов, аналитика, лидерборд и раздача Mini App.
4. **Telegram Mini App**: Тёмный неоновый UI со свечными графиками, драматургией анализа сигналов, экспирацией и геймификацией (баллы, еженедельный топ-10).

---

## Архитектура проекта

- `winky/` — десктопный VTuber-агент под macOS (pywebview, Three.js, TTS, сценарии, TikTokLive).
- `bot/` — Telegram-бот на aiogram 3.x.
- `api/` — роутеры FastAPI (postback, signals, me).
- `database/` — SQLAlchemy модели и асинхронный CRUD (SQLite / PostgreSQL).
- `webapp/` — Telegram Mini App (Vanilla JS, CSS, HTML).
- `make_snapshot.py` — утилита создания легковесного архива исходного кода.

---

## Быстрый старт

### 1. Настройка окружения
```bash
cp .env.example .env
# Заполните необходимые ключи в .env
```

### 2. Запуск бэкенда и бота
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 3. Запуск VTuber-агента Winky (на Mac)
```bash
python -m winky.app
```
или дважды кликните по `run_winky.command`.

---

## Создание снепшота исходного кода
Для создания легковесного архива только с файлами кода (без секретов и тяжелых ассетов):
```bash
python3 make_snapshot.py
```
Результат будет сохранён в `code_snapshot.zip`.
