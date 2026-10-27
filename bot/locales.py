"""Все тексты бота Wink Trade на русском и английском (SPEC, раздел 4).

Приветствие, состояния проверки регистрации/депозита и подписи кнопок
взяты из SPEC дословно. Текст FAQ составлен по логике воронки
(скриншот 1 в SPEC.md не приложен) — при необходимости замените вручную.
"""

from __future__ import annotations

from typing import Any

from config import settings

TEXTS: dict[str, dict[str, str]] = {
    "ru": {
        "choose_language": (
            "👋 Привет!\n"
            "\n"
            "Добро пожаловать в Wink Trade!\n"
            "\n"
            "Пожалуйста, выберите язык:"
        ),
        "welcome": (
            "👋 Привет!\n"
            "\n"
            "Добро пожаловать в Wink Trade.\n"
            "\n"
            "Чтобы получить доступ к торговым сигналам, сначала зарегистрируйтесь "
            "в Pocket Option по вашей персональной ссылке ниже.\n"
            "\n"
            "После регистрации бот автоматически проверит ваш аккаунт и покажет следующий шаг.\n"
            "\n"
            "🔐 Важно: регистрируйтесь именно по ссылке из этого бота, иначе система "
            "не сможет подтвердить регистрацию.\n"
            "\n"
            "Если у вас уже есть аккаунт Pocket Option, необходимо удалить старый и создать "
            "новый через кнопку «Зарегистрироваться» ниже. Если бот не подтвердил регистрацию, "
            "попробуйте зарегистрироваться повторно через кнопку ниже или обратитесь в поддержку."
        ),
        "status_not_registered": (
            "❌ Регистрация еще не подтверждена. Пожалуйста, создайте новый аккаунт "
            "строго по кнопке «Зарегистрироваться» ниже и подождите 1–2 минуты."
        ),
        "status_registered_no_deposit": (
            "✅ Регистрация подтверждена (Ваш ID: {trader_id})!\n"
            "\n"
            "Последний шаг: пополните свой торговый счет на ЛЮБУЮ СУММУ (от $10), "
            "чтобы бот автоматически открыл вам бесплатный доступ к приложению с сигналами."
        ),
        "status_access_granted": (
            "🎉 Доступ открыт! Нажмите кнопку ниже, чтобы запустить торгового бота Wink Trade."
        ),
        "push_registered": (
            "✅ Ваша регистрация подтверждена! "
            "Теперь внесите депозит на любую сумму для активации бота"
        ),
        "faq": (
            "❓ Частые вопросы — Wink Trade\n"
            "\n"
            "1️⃣ Что такое Wink Trade?\n"
            "Это приложение с торговыми сигналами для Pocket Option: направление сделки "
            "(BUY или SELL), валютная пара, время экспирации и точность сигнала в процентах.\n"
            "\n"
            "2️⃣ Как получить доступ к сигналам?\n"
            "Шаг 1. Зарегистрируйтесь в Pocket Option строго по персональной ссылке "
            "из этого бота — кнопка «Зарегистрироваться».\n"
            "Шаг 2. Пополните торговый счет на любую сумму от $10.\n"
            "Бот автоматически откроет бесплатный доступ к приложению с сигналами.\n"
            "\n"
            "3️⃣ Почему регистрироваться нужно именно по ссылке из бота?\n"
            "Ссылка персональная: по ней система привязывает ваш аккаунт Pocket Option "
            "к боту и автоматически подтверждает регистрацию и депозит.\n"
            "\n"
            "4️⃣ У меня уже есть аккаунт Pocket Option. Что делать?\n"
            "Создайте новый аккаунт по кнопке «Зарегистрироваться»: старый аккаунт "
            "необходимо удалить, иначе система не сможет подтвердить регистрацию.\n"
            "\n"
            "5️⃣ Сколько времени занимает подтверждение?\n"
            "Обычно 1–2 минуты после регистрации. Нажмите «Проверить регистрацию», "
            "чтобы обновить статус.\n"
            "\n"
            "6️⃣ Бот не подтверждает регистрацию или депозит. Что делать?\n"
            "Попробуйте зарегистрироваться повторно по кнопке из главного меню. "
            "Если проблема осталась — напишите в поддержку, мы поможем.\n"
            "\n"
            "💬 Не нашли ответ? Напишите нам — мы на связи 24/7."
        ),
        "grant_usage": "Использование: /grant <tg_id>",
        "grant_invalid": "❌ Некорректный Telegram ID: {tg_id}",
        "grant_not_found": (
            "❌ Пользователь {tg_id} не найден в базе. "
            "Пользователь должен сначала нажать /start в боте."
        ),
        "grant_success": "✅ Доступ к сигналам открыт для пользователя {tg_id}.",
        "setqueue_usage": "Использование: /setqueue BUY,BUY,SELL,BUY",
        "setqueue_invalid": "❌ Некорректная очередь: {error}",
        "setqueue_success": (
            "✅ Очередь сигналов задана: {queue}\n"
            "\n"
            "Всего сигналов: {count}. Mini App будет выдавать их строго по порядку."
        ),
        "stats": (
            "📊 Статистика Wink Trade\n"
            "\n"
            "👥 Пользователей: {total_users}\n"
            "✅ Регистраций: {registered}\n"
            "💰 С депозитом: {with_deposit}\n"
            "💵 Сумма депозитов: ${total_deposits:.2f}\n"
            "\n"
            "📺 С лайва: {live_users} · 🔗 Органика: {organic_users}\n"
            "🔥 Сегодня сигналы: {today_traders} трейдеров"
        ),
        "award_usage": "Использование: /award <tg_id> <баллы> — бонусные баллы турнира",
        "award_invalid": "❌ Нужны целые числа: /award 123456789 50",
        "award_not_found": "❌ Пользователь {tg_id} не найден.",
        "award_success": "✅ Начислено {points} бонусных баллов пользователю {tg_id}.",
        "progress_line": "{bar} Шаг {step} из 3 — {name}",
        "step_registration": "Регистрация",
        "step_deposit": "Депозит",
        "step_access": "Доступ к сигналам",
        "counter_today": "🔥 Сегодня сигналы получили: {n}",
        "counter_total": "👥 Уже {n} трейдеров с нами",
        "teaser": (
            "👋 Это снова Wink Trade!\n"
            "\n"
            "Прямо сейчас бот выдал сигнал по паре {pair} с точностью {accuracy}%.\n"
            "\n"
            "Направление: ████████ — скрыто\n"
            "\n"
            "Хотите его видеть? Доступ открывается сразу после регистрации и депозита "
            "на любую сумму от $10."
        ),
        "teaser_cta": "🚀 Открыть доступ",
        "teaser_stop": "⏸ Не присылать",
        "teaser_off": (
            "🤫 Понял, больше не побеспокою. "
            "Открыть доступ можно в любой момент — /start."
        ),
    },
    "en": {
        "choose_language": (
            "👋 Hello!\n"
            "\n"
            "Welcome to Wink Trade!\n"
            "\n"
            "Please choose your language:"
        ),
        "welcome": (
            "👋 Hello!\n"
            "\n"
            "Welcome to Wink Trade.\n"
            "\n"
            "To get access to trading signals, first register on Pocket Option using "
            "your personal link below.\n"
            "\n"
            "After registration, the bot will automatically verify your account and show "
            "the next step.\n"
            "\n"
            "🔐 Important: register strictly using the link from this bot, otherwise the "
            "system will not be able to confirm your registration.\n"
            "\n"
            "If you already have a Pocket Option account, you must close the old one and "
            "create a new one via the \"Register\" button below. If the bot did not confirm "
            "your registration, try registering again via the button below or contact support."
        ),
        "status_not_registered": (
            "❌ Registration is not confirmed yet. Please create a new account strictly "
            "using the \"Register\" button below and wait 1–2 minutes."
        ),
        "status_registered_no_deposit": (
            "✅ Registration confirmed (Your ID: {trader_id})!\n"
            "\n"
            "Final step: fund your trading account with ANY AMOUNT (from $10) so the bot "
            "automatically unlocks free access to the signals app."
        ),
        "status_access_granted": (
            "🎉 Access granted! Tap the button below to launch the Wink Trade signal bot."
        ),
        "push_registered": (
            "✅ Your registration is confirmed! "
            "Now make a deposit of any amount to activate the bot"
        ),
        "faq": (
            "❓ FAQ — Wink Trade\n"
            "\n"
            "1️⃣ What is Wink Trade?\n"
            "It is a trading signals app for Pocket Option: trade direction (BUY or SELL), "
            "currency pair, expiration time and signal accuracy in percent.\n"
            "\n"
            "2️⃣ How do I get access to the signals?\n"
            "Step 1. Register on Pocket Option strictly using the personal link from this "
            "bot — the \"Register\" button.\n"
            "Step 2. Fund your trading account with any amount from $10.\n"
            "The bot will automatically unlock free access to the signals app.\n"
            "\n"
            "3️⃣ Why must I register via the link from the bot?\n"
            "The link is personal: it links your Pocket Option account to the bot, so "
            "registration and deposits are confirmed automatically.\n"
            "\n"
            "4️⃣ I already have a Pocket Option account. What should I do?\n"
            "Create a new account via the \"Register\" button: the old account must be "
            "closed, otherwise the system cannot confirm your registration.\n"
            "\n"
            "5️⃣ How long does confirmation take?\n"
            "Usually 1–2 minutes after registration. Tap \"Check Registration\" to refresh "
            "the status.\n"
            "\n"
            "6️⃣ The bot does not confirm my registration or deposit. What should I do?\n"
            "Try registering again via the button in the main menu. If the problem "
            "persists, contact support — we will help.\n"
            "\n"
            "💬 Didn't find your answer? Message us — we are online 24/7."
        ),
        "grant_usage": "Usage: /grant <tg_id>",
        "grant_invalid": "❌ Invalid Telegram ID: {tg_id}",
        "grant_not_found": (
            "❌ User {tg_id} not found in the database. "
            "The user must press /start in the bot first."
        ),
        "grant_success": "✅ Access to the signals has been granted to user {tg_id}.",
        "setqueue_usage": "Usage: /setqueue BUY,BUY,SELL,BUY",
        "setqueue_invalid": "❌ Invalid queue: {error}",
        "setqueue_success": (
            "✅ Signal queue set: {queue}\n"
            "\n"
            "Total signals: {count}. The Mini App will serve them strictly in order."
        ),
        "stats": (
            "📊 Wink Trade statistics\n"
            "\n"
            "👥 Users: {total_users}\n"
            "✅ Registrations: {registered}\n"
            "💰 With deposit: {with_deposit}\n"
            "💵 Total deposits: ${total_deposits:.2f}\n"
            "\n"
            "📺 From live: {live_users} · 🔗 Organic: {organic_users}\n"
            "🔥 Today signals: {today_traders} traders"
        ),
        "award_usage": "Usage: /award <tg_id> <points> — bonus tournament points",
        "award_invalid": "❌ Integers expected: /award 123456789 50",
        "award_not_found": "❌ User {tg_id} not found.",
        "award_success": "✅ Awarded {points} bonus points to user {tg_id}.",
        "progress_line": "{bar} Step {step} of 3 — {name}",
        "step_registration": "Registration",
        "step_deposit": "Deposit",
        "step_access": "Access to signals",
        "counter_today": "🔥 Today {n} traders got signals",
        "counter_total": "👥 {n} traders already with us",
        "teaser": (
            "👋 Wink Trade again!\n"
            "\n"
            "The bot has just issued a signal for {pair} with {accuracy}% accuracy.\n"
            "\n"
            "Direction: ████████ — hidden\n"
            "\n"
            "Want to see it? Access unlocks right after registration and a deposit "
            "of any amount from $10."
        ),
        "teaser_cta": "🚀 Unlock access",
        "teaser_stop": "⏸ Stop sending",
        "teaser_off": (
            "🤫 Got it, I'll stay quiet. "
            "You can unlock access anytime via /start."
        ),
    },
}

BUTTONS: dict[str, dict[str, str]] = {
    "ru": {
        "check_registration": "🔄 Проверить регистрацию",
        "register": "🚀 Зарегистрироваться",
        "support": "💬 Поддержка",
        "check_deposit": "🔄 Проверить депозит",
        "top_up": "💳 Пополнить счет",
        "open_app": "⚡ Открыть Wink Trade",
    },
    "en": {
        "check_registration": "🔄 Check Registration",
        "register": "🚀 Register",
        "support": "💬 Support",
        "check_deposit": "🔄 Check Deposit",
        "top_up": "💳 Top up account",
        "open_app": "⚡ Open Wink Trade",
    },
}


def get_text(lang: str, key: str, **kwargs: Any) -> str:
    """Текст на языке пользователя с подстановкой параметров ``str.format``."""
    texts = TEXTS.get(lang) or TEXTS[settings.DEFAULT_LANG]
    return texts[key].format(**kwargs)


def get_buttons(lang: str) -> dict[str, str]:
    """Подписи кнопок на языке пользователя."""
    return BUTTONS.get(lang) or BUTTONS[settings.DEFAULT_LANG]
