# Техническое задание и промпты для AI-агента Antigravity: Проект «Wink Trade» (Telegram Bot + Postback API + Mini App)

## 1. Обзор системы и стек технологий

Система состоит из трех взаимосвязанных компонентов, работающих в едином асинхронном процессе (или через Docker Compose):

| Компонент | Технологии | Назначение |
| :--- | :--- | :--- |
| **Telegram Bot (Воронка)** | Python 3.11+, `aiogram 3.x`, `SQLAlchemy 2.0` (`aiosqlite` / `asyncpg`) | Принимает трафик с TikTok, выдает выбор языка (RU/EN), генерирует персональную реферальную ссылку с `sub_id`, проверяет статус регистрации и депозита, открывает доступ к Mini App. |
| **Backend & Postback API** | `FastAPI`, `Uvicorn`, `Pydantic` | Принимает GET/POST вебхуки (Postback) от партнерской сети Pocket Partners (регистрация и депозит), раздает статику для Mini App и обрабатывает API-запросы на генерацию торговых сигналов. |
| **Telegram Mini App (WebApp)** | HTML5, CSS3 (Custom Dark UI), Vanilla JS, `telegram-web-app.js` | Встроенное приложение в стиле «Wave Trade» (Скриншот 3): выбор валютной пары (включая OTC), выбор экспирации (5s–5m), кнопка получения сигнала и карточка результата (`BUY`/`SELL` + шкала `Accuracy %`). |

## 2. Структура файлов проекта

Агент должен создать следующую файловую структуру:

```text
wink-trade-project/
├── .env.example
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── main.py                     # Точка входа (запуск FastAPI + Aiogram polling/webhook)
├── config.py                   # Чтение переменных окружения (.env)
├── database/
│   ├── __init__.py
│   ├── models.py               # Модели User, SignalQueue, PostbackLog
│   └── crud.py                 # Функции работы с БД (создание юзера, обновление статуса)
├── bot/
│   ├── __init__.py
│   ├── handlers.py             # Хэндлеры /start, смена языка, проверка регистрации, админ-панель
│   ├── keyboards.py            # Инлайн-клавиатуры (RU/EN) + кнопка запуска WebApp
│   └── locales.py              # Все тексты бота на русском и английском (по скриншотам 1 и 2)
├── api/
│   ├── __init__.py
│   ├── postback.py             # Эндпоинты для приема Postback от Pocket Partners
│   └── signals.py              # API генерации сигналов для Mini App (обычный + админ-режим)
└── webapp/
    ├── index.html              # Разметка Mini App (Скриншот 3)
    ├── style.css               # Темная тема, неоновые акценты BUY/SELL, адаптив
    └── app.js                  # Логика выбора пар, таймера, запроса к /api/signal и смены языка
```

## 3. Схема базы данных (`database/models.py`)

### Таблица `users`
* `id`: Integer, Primary Key
* `tg_id`: BigInteger, Unique, Indexed — Telegram ID пользователя (используется как `sub_id` в реферальной ссылке)
* `username`: String, Nullable — Telegram username
* `lang`: String (по умолчанию `'ru'`) — выбранный язык (`'ru'` или `'en'`)
* `trader_id`: String, Nullable — ID аккаунта на Pocket Option (приходит в Postback)
* `is_registered`: Boolean (по умолчанию `False`) — статус подтвержденной регистрации
* `deposit_amount`: Float (по умолчанию `0.0`) — сумма депозитов в USD
* `has_access`: Boolean (по умолчанию `False`) — открыт ли доступ к сигналам (`True`, если `deposit_amount > 0` или выдан вручную админом)
* `created_at`: DateTime

### Таблица `admin_signal_queue` (для режима демонстрации / стрима)
* `id`: Integer, Primary Key
* `admin_tg_id`: BigInteger — ID стримера/админа
* `direction`: String (`'BUY'` или `'SELL'`) — заранее заданный сигнал
* `accuracy`: Integer (например, `92`, `89`, `84`) — процент точности для отображения
* `is_used`: Boolean (по умолчанию `False`) — использован ли сигнал

## 4. Точные тексты и логика Telegram-бота 

### Шаг 1: Команда `/start` и выбор языка
При первом входе бот предлагает выбрать язык инлайн-кнопками:
* `🇷🇺 Русский` (`lang_ru`)
* `🇬🇧 English` (`lang_en`)

### Шаг 2: Главное приветственное сообщение 

**Русская версия (`RU`):**
```text
👋 Привет!

Добро пожаловать в Wink Trade.

Чтобы получить доступ к торговым сигналам, сначала зарегистрируйтесь в Pocket Option по вашей персональной ссылке ниже.

После регистрации бот автоматически проверит ваш аккаунт и покажет следующий шаг.

🔐 Важно: регистрируйтесь именно по ссылке из этого бота, иначе система не сможет подтвердить регистрацию.

Если у вас уже есть аккаунт Pocket Option, необходимо удалить старый и создать новый через кнопку «Зарегистрироваться» ниже. Если бот не подтвердил регистрацию, попробуйте зарегистрироваться повторно через кнопку ниже или обратитесь в поддержку.
```

**Кнопки под сообщением (`RU`):**
1. `🔄 Проверить регистрацию` (Callback: `check_status`)
2. `🚀 Зарегистрироваться` (URL-кнопка: `{PARTNER_BASE_URL}?utm_campaign={CAMPAIGN_ID}&utm_source={tg_id}`)
3. `💬 Поддержка` (URL-кнопка: `https://t.me/{SUPPORT_USERNAME}`)

**Английская версия (`EN`):**
```text
👋 Hello!

Welcome to Wink Trade.

To get access to trading signals, first register on Pocket Option using your personal link below.

After registration, the bot will automatically verify your account and show the next step.

🔐 Important: register strictly using the link from this bot, otherwise the system will not be able to confirm your registration.

If you already have a Pocket Option account, you must close the old one and create a new one via the "Register" button below. If the bot did not confirm your registration, try registering again via the button below or contact support.
```

**Кнопки под сообщением (`EN`):**
1. `🔄 Check Registration` (Callback: `check_status`)
2. `🚀 Register` (URL-кнопка: `{PARTNER_BASE_URL}?utm_campaign={CAMPAIGN_ID}&utm_source={tg_id}`)
3. `💬 Support` (URL-кнопка: `https://t.me/{SUPPORT_USERNAME}`)

### Шаг 3: Логика кнопки «Проверить регистрацию» (`check_status`)
1. **Если `is_registered == False`:**
   * RU: `❌ Регистрация еще не подтверждена. Пожалуйста, создайте новый аккаунт строго по кнопке «Зарегистрироваться» ниже и подождите 1–2 минуты.`
   * EN: `❌ Registration is not confirmed yet. Please create a new account strictly using the "Register" button below and wait 1–2 minutes.`
2. **Если `is_registered == True`, но `deposit_amount <= 0` и `has_access == False`:**
   * RU: `✅ Регистрация подтверждена (Ваш ID: {trader_id})!\n\nПоследний шаг: пополните свой торговый счет на ЛЮБУЮ СУММУ (от $10), чтобы бот автоматически открыл вам бесплатный доступ к приложению с сигналами.`
   * EN: `✅ Registration confirmed (Your ID: {trader_id})!\n\nFinal step: fund your trading account with ANY AMOUNT (from $10) so the bot automatically unlocks free access to the signals app.`
   * Кнопки: `🔄 Проверить депозит` (`check_status`), `💳 Пополнить счет` (URL на кассу/платформу), `💬 Поддержка`.
3. **Если `deposit_amount > 0` или `has_access == True`:**
   * RU: `🎉 Доступ открыт! Нажмите кнопку ниже, чтобы запустить торгового бота Wink Trade.`
   * EN: `🎉 Access granted! Tap the button below to launch the Wink Trade signal bot.`
   * Кнопка: `⚡ Открыть Wink Trade` (`InlineKeyboardButton` с параметром `web_app=WebAppInfo(url=WEBAPP_URL)`).

## 5. Спецификация интерфейса Telegram Mini App (Скриншот 3)

Интерфейс должен в точности повторять темный дизайн «Wave Trade» со Скриншота 3:

1. **Цветовая палитра и стилистика:**
   * Фон приложения: глубокий темно-зеленый/угольный градиент (`#0b1512` -> `#070d0b`).
   * Фон карточек (`Signal settings` и блок результата): полупрозрачный темный блок `#111e1a` с тонкой рамкой `1px solid rgba(255, 255, 255, 0.08)` и скруглением `16px`.
   * Акцентный зеленый цвет (`BUY` и прогресс-бар): неоновый изумрудный `#2ebd85` / `#00e676`.
   * Акцентный красный цвет (`SELL`): кораллово-красный `#ff4d4d`.
2. **Шапка (Header):**
   * Слева: логотип с волной и стрелкой вверх + текст `WINK TRADE` (слово `WINK` жирным, `TRADE` тонким шрифтом).
   * Справа: переключатель языка `EN v` / `RU v` (меняет подписи в интерфейсе без перезагрузки страницы).
3. **Карточка №1 — `Signal settings`:**
   * Подпись `Trading pair` и кастомный выпадающий список с иконкой `↔`:
     * Валютные пары OTC: `AUD/CHF OTC`, `EUR/USD OTC`, `GBP/USD OTC`, `USD/JPY OTC`, `AUD/CAD OTC`, `EUR/GBP OTC`, `USD/CHF OTC`, `NZD/USD OTC`.
     * Классические пары: `EUR/USD`, `GBP/USD`, `USD/JPY`, `AUD/USD`.
   * Подпись `Trade duration` и выпадающий список с иконкой часов `🕒`:
     * Опции: `5 seconds`, `15 seconds`, `30 seconds`, `1 minute`, `3 minutes`, `5 minutes`.
   * При смене времени в списке текст на главной кнопке автоматически меняется: например, `Get signal (5s) ↗` или `Get signal (1m) ↗`.
   * Главная кнопка: светло-серая/белая (`#e2e8f0`), черный текст `Get signal (5s) ↗`, скругление `12px`, при нажатии — плавная анимация загрузки (спиннер 1.2 сек).
4. **Карточка №2 — Блок результата сигнала:**
   * Верхний мини-лейбл (`BUY` или `SELL`) и крупный заголовок `BUY` (зеленый) или `SELL` (красный) размером `32px`, `font-weight: 800`.
   * Разделительная тонкая линия.
   * Две колонки в одной строке: слева `Trading pair` -> выбранная пара (`AUD/CHF OTC`), справа `Trade duration` -> выбранное время (`5 seconds`).
   * Разделительная тонкая линия.
   * Строка `Accuracy`: слева текст `Accuracy`, справа зеленый процент (например, `92%`), внизу горизонтальный прогресс-бар с зеленым заполнением на `92%` и мягким свечением (`box-shadow`).
   * В самом низу страницы мелкий водяной знак: `WINK TRADE`.

### Логика работы API сигналов (`/api/signal`)
Когда Mini App отправляет POST-запрос `/api/signal` (передавая `tg_id` из `Telegram.WebApp.initDataUnsafe.user.id`, `pair` и `duration`):
1. **Режим Стримера (Admin Mode):**
   * Если `tg_id` входит в список `ADMIN_TG_IDS` (из `.env`) и в таблице `admin_signal_queue` есть неиспользованные сигналы (заданные командой `/setqueue BUY,BUY,SELL,BUY` в боте), API возвращает строго следующий сигнал из очереди и высокую точность (`81%–93%`).
   * Также для админа доступна скрытая фича: если нажать на логотип `WAVE TRADE` в левом верхнем углу экрана перед нажатием `Get signal`, следующий сигнал принудительно будет `BUY`, а если нажать на переключатель языка — `SELL` (позволяет стримеру управлять сигналом прямо во время прямого эфира без очереди).
2. **Обычный режим (User Mode):**
   * Для классических пар используется расчет индикаторов (через `tradingview-ta` или встроенный алгоритмический модуль RSI + EMA), для OTC-пар — детерминированный по 5-секундному окну времени генератор тренда с расчетом вероятности `Accuracy` в диапазоне `81%–93%` (чтобы у всех пользователей, нажавших кнопку в одну и ту же секунду на одной паре, показывался одинаковый сигнал).
