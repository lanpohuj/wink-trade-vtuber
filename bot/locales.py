"""Все тексты бота Wink Trade на русском и английском (образ живой стримерши Winky).

Приветствие, воронка 3 шагов, подтверждение Trader ID, промокод 50START,
пробный демо-сигнал и умный дожим.
"""

from __future__ import annotations

from typing import Any

from config import settings

TEXTS: dict[str, dict[str, str]] = {
    "ru": {
        "choose_language": (
            "💖 <b>Приветик! Это Winky со стрима!</b>\n\n"
            "Добро пожаловать в мой закрытый VIP-клуб сигналов Wink Trade!\n\n"
            "Пожалуйста, выбери язык общения:"
        ),
        "welcome": (
            "💖 <b>Приветик! Это я, твоя Winky со стрима!</b>\n\n"
            "Я рада, что ты заглянул в мой закрытый клуб! Здесь мой ИИ-алгоритм круглосуточно "
            "сканирует рынок и выдаёт <b>точки входа с проходимостью 87–93%</b> 📈\n\n"
            "Чтобы я могла выдавать тебе сигналы бесплатно, давай за 30 секунд подключим твой аккаунт:\n\n"
            "1️⃣ Нажми кнопку <b>«🚀 Зарегистрироваться (30 сек)»</b> ниже — откроется официальная страница быстрой регистрации.\n"
            "2️⃣ Введи Email и пароль (или войди через Google в 1 клик).\n"
            "3️⃣ Вернись сюда и нажми <b>«✅ Я зарегистрировался»</b> (или просто пришли мне в чат свой <b>ID трейдера</b> из профиля!).\n\n"
            "🎁 <i>Бонус для своих: сразу после регистрации я дам тебе бесплатный пробный сигнал + промокод на <b>+50% к балансу</b>!</i>"
        ),
        "status_not_registered": (
            "❌ <b>Регистрация пока не подтверждена</b>\n\n"
            "Если ты только что создал аккаунт, системе требуется 1–2 минуты для обновления статуса.\n\n"
            "💡 <b>Лайфхак:</b> чтобы не ждать, нажми <b>«🆔 Ввести мой ID вручную»</b> ниже или просто "
            "<b>пришли мне свой ID трейдера (8–10 цифр)</b> ответным сообщением прямо в этот чат!"
        ),
        "status_registered_no_deposit": (
            "🔥 <b>Твой аккаунт успешно привязан (ID: <code>{trader_id}</code>)!</b>\n\n"
            "До полного доступа к моим закрытым VIP-сигналам и WebApp-терминалу остался последний шаг — "
            "активировать торговый баланс:\n\n"
            "💎 <b>Минимальное пополнение для доступа:</b> всего от <b>$10</b> "
            "(все деньги остаются на твоём личном счёте для сделок!).\n"
            "🎁 <b>СЕКРЕТНЫЙ БОНУС +50%:</b> если пополняешь от <b>$50</b>, введи при оплате промокод:\n"
            "👉 <code>50START</code> <i>(нажми на код, чтобы скопировать!)</i>\n"
            "Ты получишь <b>$75 вместо $50</b> на счёт для мощного старта!\n\n"
            "Как только пополнишь — жми <b>«🔄 Я пополнил (Проверить баланс)»</b>, и доступ откроется мгновенно!"
        ),
        "status_access_granted": (
            "🎉 <b>УРА! Доступ к VIP-сигналам открыт!</b>\n\n"
            "Твой аккаунт активен, и ИИ Winky готов выдавать самые точные точки входа! "
            "Запускай терминал кнопкой ниже и забирай профитные сделки прямо сейчас 🚀"
        ),
        "push_registered": (
            "🎉 <b>Твоя регистрация подтверждена! (ID: <code>{trader_id}</code>)</b>\n\n"
            "Пополни счёт от $10 (или от $50 с промокодом <code>50START</code> для получения <b>+50% бонуса</b>) "
            "для активации безлимитного VIP-доступа!"
        ),
        "enter_id_prompt": (
            "🆔 <b>Как найти и привязать свой Trader ID:</b>\n\n"
            "1. Открой Pocket Option и нажми на иконку своего профиля (в правом верхнем углу).\n"
            "2. Под твоим именем указан номер счёта из 8–10 цифр (например: <code>84920145</code>).\n"
            "3. <b>Просто отправь эти цифры мне в чат</b> ответным сообщением!\n\n"
            "Я сразу привяжу твой аккаунт к VIP-клубу 💖"
        ),
        "id_bound_success": (
            "✅ <b>ID успешно привязан!</b> Твой аккаунт: <code>{trader_id}</code>\n\n"
            "Теперь пополни баланс от $10 (или от $50 с кодом <code>50START</code> на <b>+50% бонуса</b>) "
            "или протестируй 1 бесплатный пробный сигнал на Демо-счёте прямо сейчас! 👇"
        ),
        "id_invalid": "❌ Пожалуйста, пришли корректный цифровой ID аккаунта (от 6 до 12 цифр, например: <code>84920145</code>).",
        "demo_signal_card": (
            "🎁 <b>Твой бесплатный пробный сигнал от Winky!</b>\n\n"
            "📊 <b>Валютная пара:</b> <code>{pair}</code>\n"
            "📈 <b>Направление:</b> <b>{dir_text}</b>\n"
            "⏱ <b>Время экспирации:</b> <b>1 минута (M1)</b>\n"
            "🎯 <b>Уверенность ИИ:</b> <b>{accuracy}%</b>\n\n"
            "⚡ <i>Открой сделку на Демо-счёте прямо сейчас на 1 минуту! Через 60 секунд подведём итоги!</i>"
        ),
        "demo_already_used": (
            "✨ Ты уже использовал свой бесплатный пробный сигнал!\n\n"
            "Чтобы получать безлимитные сигналы круглосуточно, пополни баланс от $10 "
            "(или от $50 с кодом <code>50START</code> для получения +50% бонуса) "
            "и запускай VIP WebApp! 👇"
        ),
        "demo_followup": (
            "🎉 <b>Ну как, проверил сигнал на демо-счёте? Красота же!</b>\n\n"
            "А теперь представь: на реальном счёте со ставки $20 это уже было бы <b>+$18.40 чистой прибыли</b> за 1 минуту! 💸\n\n"
            "Не трать время впустую на фантики — пополняй счёт от $10 (или от $50 с промокодом <code>50START</code>, "
            "чтобы забрать <b>+50% бонусом</b>) и открывай мой безлимитный VIP-терминал прямо сейчас! 👇"
        ),
        "today_stats": (
            "📊 <b>Статистика сигналов Winky за сегодня</b>\n\n"
            "🔥 <b>Винрейт алгоритма:</b> <b>89.4%</b>\n"
            "👥 <b>Трейдеров получили сигналы сегодня:</b> <b>{today_traders}</b>\n\n"
            "<b>Последние закрытые сделки ИИ:</b>\n"
            "✅ EUR/USD OTC — <b>+92%</b> (M1)\n"
            "✅ GBP/JPY OTC — <b>+89%</b> (M1)\n"
            "✅ USD/CHF OTC — <b>+91%</b> (M1)\n"
            "✅ AUD/USD OTC — <b>+88%</b> (M1)\n"
            "✅ NZD/USD OTC — <b>+93%</b> (M1)\n\n"
            "<i>Алгоритм сканирует рынок 24/7. Подключайся и торгуй вместе со мной!</i>"
        ),
        "followup_15m": (
            "👀 <b>Эй, ты куда пропал?</b>\n\n"
            "Я тут только что закрыла сделку по <b>{pair}</b> в чистый плюс (точность была {accuracy}%)! 🔥\n\n"
            "Регистрация занимает реально 30 секунд — жми кнопку ниже, или если уже создал аккаунт, "
            "просто пришли мне свой <b>ID трейдера</b> цифрами прямо сюда в чат!"
        ),
        "followup_45m": (
            "🎁 <b>Твой бонус +50% по коду <code>50START</code> ещё ждёт тебя!</b>\n\n"
            "Твой аккаунт (ID: <code>{trader_id}</code>) уже подключён, осталось только пополнить баланс "
            "от $10 (или от $50 с промокодом <code>50START</code>, чтобы получить +50% сверху!).\n\n"
            "Сейчас начинается самая прибыльная торговая сессия — заходи, я жду тебя в VIP-терминале! 👇"
        ),
        "faq": (
            "❓ <b>Частые вопросы — Wink Trade</b>\n\n"
            "1️⃣ <b>Что такое Wink Trade?</b>\n"
            "Это закрытый VIP-терминал с торговыми сигналами для Pocket Option от стримерши Winky: "
            "направление сделки (BUY или SELL), валютная пара, экспирация и точность ИИ.\n\n"
            "2️⃣ <b>Как получить бесплатный доступ?</b>\n"
            "Шаг 1. Зарегистрируйся на официальном сайте по кнопке в боте.\n"
            "Шаг 2. Пополни баланс от $10 (или от $50 с промокодом <code>50START</code> на бонус +50%).\n"
            "Бот мгновенно откроет доступ к приложению.\n\n"
            "3️⃣ <b>Где взять промокод на бонус к депозиту?</b>\n"
            "Твой секретный промокод: <code>50START</code>. Он даёт +50% к пополнению от $50!\n\n"
            "4️⃣ <b>У меня уже есть аккаунт Pocket Option. Что делать?</b>\n"
            "Создай новый аккаунт по кнопке «Зарегистрироваться» — старый можно закрыть. "
            "Либо пришли свой ID трейдера в чат.\n\n"
            "💬 <b>Нужна помощь?</b> Напиши в поддержку — мы на связи 24/7!"
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
            "✅ Очередь сигналов задана: {queue}\n\n"
            "Всего сигналов: {count}. Mini App будет выдавать их строго по порядку."
        ),
        "stats": (
            "📊 Статистика Wink Trade\n\n"
            "👥 Пользователей: {total_users}\n"
            "✅ Регистраций: {registered}\n"
            "💰 С депозитом: {with_deposit}\n"
            "💵 Сумма депозитов: ${total_deposits:.2f}\n\n"
            "📺 С лайва: {live_users} · 🔗 Органика: {organic_users}\n"
            "🔥 Сегодня сигналы: {today_traders} трейдеров"
        ),
        "award_usage": "Использование: /award <tg_id> <баллы> — бонусные баллы турнира",
        "award_invalid": "❌ Нужны целые числа: /award 123456789 50",
        "award_not_found": "❌ Пользователь {tg_id} не найден.",
        "award_success": "✅ Начислено {points} бонусных баллов пользователю {tg_id}.",
        "progress_line": "{bar} Шаг {step} из 3 — {name}",
        "step_registration": "Регистрация",
        "step_deposit": "Пополнение и Бонус",
        "step_access": "VIP Доступ",
        "counter_today": "🔥 Сегодня сигналы получили: {n}",
        "counter_total": "👥 Уже {n} трейдеров с нами",
        "teaser": (
            "👋 <b>Это снова Winky со стрима!</b>\n\n"
            "Прямо сейчас мой алгоритм выдал сигнал по паре <b>{pair}</b> с точностью <b>{accuracy}%</b>.\n\n"
            "Направление: ████████ — скрыто\n\n"
            "Хочешь его видеть? Доступ открывается сразу после регистрации и депозита от $10 "
            "(или от $50 с промокодом <code>50START</code> на +50% бонуса)!"
        ),
        "teaser_cta": "🚀 Открыть доступ",
        "teaser_stop": "⏸ Не присылать",
        "teaser_off": (
            "🤫 Поняла, больше не побеспокою. "
            "Открыть доступ можно в любой момент — /start."
        ),
    },
    "en": {
        "choose_language": (
            "💖 <b>Hey there! It's Winky from the live stream!</b>\n\n"
            "Welcome to my private VIP signal club Wink Trade!\n\n"
            "Please select your language:"
        ),
        "welcome": (
            "💖 <b>Hey there! It's me, your Winky from the live stream!</b>\n\n"
            "I'm so glad you joined my private VIP club! Here, my AI algorithm scans the market 24/7 "
            "and delivers <b>entry points with 87–93% win rate</b> 📈\n\n"
            "To start getting free signals, let's link your account in just 30 seconds:\n\n"
            "1️⃣ Tap <b>«🚀 Register on Website (30 sec)»</b> below — the official fast registration page will open.\n"
            "2️⃣ Enter your Email and password (or sign in with Google in 1 tap).\n"
            "3️⃣ Come back here and tap <b>«✅ I Registered (Check)»</b> (or simply send me your <b>Trader ID</b> right here in the chat!).\n\n"
            "🎁 <i>Special perk: right after registration you'll get a free trial signal + a promo code for <b>+50% to your balance</b>!</i>"
        ),
        "status_not_registered": (
            "❌ <b>Registration not confirmed yet</b>\n\n"
            "If you just created an account, it takes 1–2 minutes for the system to process.\n\n"
            "💡 <b>Tip:</b> tap <b>«🆔 Enter my Trader ID»</b> below or simply "
            "<b>send your Trader ID (8–10 digits)</b> directly in this chat!"
        ),
        "status_registered_no_deposit": (
            "🔥 <b>Your account is linked (ID: <code>{trader_id}</code>)!</b>\n\n"
            "Just one final step separates you from my private VIP signals and WebApp terminal — "
            "activating your trading balance:\n\n"
            "💎 <b>Minimum deposit for access:</b> only <b>$10</b> "
            "(all funds stay on your account for trading!).\n"
            "🎁 <b>SECRET +50% BONUS:</b> if you deposit $50 or more, enter the promo code:\n"
            "👉 <code>50START</code> <i>(tap to copy!)</i>\n"
            "You'll get <b>$75 instead of $50</b> on your balance for an explosive start!\n\n"
            "Once funded, tap <b>«🔄 I Topped Up (Check Balance)»</b>, and VIP access will unlock instantly!"
        ),
        "status_access_granted": (
            "🎉 <b>YAY! VIP Access Granted!</b>\n\n"
            "Your account is active, and Winky AI is ready to deliver high-probability signals! "
            "Launch the terminal below and start catching winning trades right now 🚀"
        ),
        "push_registered": (
            "🎉 <b>Your registration is confirmed! (ID: <code>{trader_id}</code>)</b>\n\n"
            "Deposit $10+ (or $50+ with promo code <code>50START</code> for <b>+50% bonus</b>) "
            "to activate your unlimited VIP access!"
        ),
        "enter_id_prompt": (
            "🆔 <b>How to find and link your Trader ID:</b>\n\n"
            "1. Open Pocket Option and tap your profile icon (top right corner).\n"
            "2. Under your name/avatar, you'll see your 8–10 digit account number (e.g. <code>84920145</code>).\n"
            "3. <b>Simply send these digits to me in chat</b> as a message!\n\n"
            "I'll link your account to the VIP club immediately 💖"
        ),
        "id_bound_success": (
            "✅ <b>ID successfully linked!</b> Your account: <code>{trader_id}</code>\n\n"
            "Now top up $10+ (or $50+ with code <code>50START</code> for <b>+50% bonus</b>) "
            "or test 1 free demo signal right now! 👇"
        ),
        "id_invalid": "❌ Please send a valid numeric account ID (6 to 12 digits, e.g. <code>84920145</code>).",
        "demo_signal_card": (
            "🎁 <b>Your Free Demo Trial Signal from Winky!</b>\n\n"
            "📊 <b>Currency Pair:</b> <code>{pair}</code>\n"
            "📈 <b>Direction:</b> <b>{dir_text}</b>\n"
            "⏱ <b>Expiration Time:</b> <b>1 minute (M1)</b>\n"
            "🎯 <b>AI Confidence:</b> <b>{accuracy}%</b>\n\n"
            "⚡ <i>Open a trade on your Demo account right now for 1 minute! In 60 seconds we'll review the result!</i>"
        ),
        "demo_already_used": (
            "✨ You have already used your free demo trial signal!\n\n"
            "To get unlimited 24/7 signals, top up $10+ (or $50+ with code <code>50START</code> for +50% bonus) "
            "and launch the VIP WebApp! 👇"
        ),
        "demo_followup": (
            "🎉 <b>Did you check the signal on your demo account? Amazing, right!</b>\n\n"
            "Now imagine: on a real account with a $20 trade, that would be <b>+$18.40 clean profit</b> in 1 minute! 💸\n\n"
            "Don't waste time on demo candy — top up from $10 (or $50+ with promo code <code>50START</code> to get "
            "<b>+50% bonus</b>) and unlock my unlimited VIP terminal right now! 👇"
        ),
        "today_stats": (
            "📊 <b>Today's Winky Signal Statistics</b>\n\n"
            "🔥 <b>AI Win Rate:</b> <b>89.4%</b>\n"
            "👥 <b>Traders received signals today:</b> <b>{today_traders}</b>\n\n"
            "<b>Latest AI closed trades:</b>\n"
            "✅ EUR/USD OTC — <b>+92%</b> (M1)\n"
            "✅ GBP/JPY OTC — <b>+89%</b> (M1)\n"
            "✅ USD/CHF OTC — <b>+91%</b> (M1)\n"
            "✅ AUD/USD OTC — <b>+88%</b> (M1)\n"
            "✅ NZD/USD OTC — <b>+93%</b> (M1)\n\n"
            "<i>Algorithm scans the market 24/7. Connect and trade with me!</i>"
        ),
        "followup_15m": (
            "👀 <b>Hey, where did you go?</b>\n\n"
            "I just closed a winning trade on <b>{pair}</b> (accuracy was {accuracy}%)! 🔥\n\n"
            "Registration takes literally 30 seconds — tap the button below, or if you already created an account, "
            "simply send your <b>Trader ID</b> digits right here in the chat!"
        ),
        "followup_45m": (
            "🎁 <b>Your +50% bonus with code <code>50START</code> is still waiting for you!</b>\n\n"
            "Your account (ID: <code>{trader_id}</code>) is connected, all that's left is to deposit $10+ "
            "(or $50+ with promo code <code>50START</code> to get +50% on top!).\n\n"
            "The most profitable trading session is starting now — come on in, I'm waiting for you in the VIP terminal! 👇"
        ),
        "faq": (
            "❓ <b>FAQ — Wink Trade</b>\n\n"
            "1️⃣ <b>What is Wink Trade?</b>\n"
            "It is a private VIP terminal with Pocket Option trading signals from streamer Winky: "
            "direction (BUY or SELL), currency pair, duration, and AI confidence.\n\n"
            "2️⃣ <b>How to get free access?</b>\n"
            "Step 1. Register on the official website via the button in the bot.\n"
            "Step 2. Fund your balance with $10+ (or $50+ with promo code <code>50START</code> for +50% bonus).\n"
            "The bot will instantly unlock access.\n\n"
            "3️⃣ <b>Where is the deposit promo code?</b>\n"
            "Your secret code: <code>50START</code>. It grants +50% bonus on deposits from $50!\n\n"
            "4️⃣ <b>I already have a Pocket Option account. What should I do?</b>\n"
            "Create a new one via the \"Register\" button, or send your Trader ID to me in chat.\n\n"
            "💬 <b>Need help?</b> Contact support — we are available 24/7!"
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
            "✅ Signal queue set: {queue}\n\n"
            "Total signals: {count}. The Mini App will serve them strictly in order."
        ),
        "stats": (
            "📊 Wink Trade statistics\n\n"
            "👥 Users: {total_users}\n"
            "✅ Registrations: {registered}\n"
            "💰 With deposit: {with_deposit}\n"
            "💵 Total deposits: ${total_deposits:.2f}\n\n"
            "📺 From live: {live_users} · 🔗 Organic: {organic_users}\n"
            "🔥 Today signals: {today_traders} traders"
        ),
        "award_usage": "Usage: /award <tg_id> <points> — bonus tournament points",
        "award_invalid": "❌ Integers expected: /award 123456789 50",
        "award_not_found": "❌ User {tg_id} not found.",
        "award_success": "✅ Awarded {points} bonus points to user {tg_id}.",
        "progress_line": "{bar} Step {step} of 3 — {name}",
        "step_registration": "Registration",
        "step_deposit": "Deposit & Bonus",
        "step_access": "VIP Access",
        "counter_today": "🔥 Today {n} traders got signals",
        "counter_total": "👥 {n} traders already with us",
        "teaser": (
            "👋 <b>Winky from the stream again!</b>\n\n"
            "The AI algorithm has just issued a signal for <b>{pair}</b> with <b>{accuracy}%</b> accuracy.\n\n"
            "Direction: ████████ — hidden\n\n"
            "Want to see it? Access unlocks right after registration and a deposit from $10 "
            "(or $50+ with promo code <code>50START</code> for +50% bonus)!"
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
        "register": "🚀 Зарегистрироваться (30 сек)",
        "check_registration": "✅ Я зарегистрировался (Проверить)",
        "enter_id": "🆔 Ввести мой ID вручную",
        "today_stats": "📊 Статистика сигналов за сегодня",
        "support": "💬 Написать в поддержку",
        "top_up": "💳 Пополнить баланс (+50% код: 50START)",
        "try_demo_signal": "🎁 Получить 1 пробный сигнал (Демо)",
        "check_deposit": "🔄 Я пополнил (Проверить баланс)",
        "deposit_help": "💬 Помощь с пополнением",
        "open_app": "⚡ Открыть VIP-терминал",
    },
    "en": {
        "register": "🚀 Register on Website (30 sec)",
        "check_registration": "✅ I Registered (Check)",
        "enter_id": "🆔 Enter my Trader ID",
        "today_stats": "📊 Today's Signal Stats",
        "support": "💬 Support",
        "top_up": "💳 Top Up Balance (+50% code: 50START)",
        "try_demo_signal": "🎁 Get 1 Free Demo Signal",
        "check_deposit": "🔄 I Topped Up (Check Balance)",
        "deposit_help": "💬 Deposit Help",
        "open_app": "⚡ Open VIP Terminal",
    },
}


def get_text(lang: str, key: str, **kwargs: Any) -> str:
    """Текст на языке пользователя с подстановкой параметров ``str.format``."""
    texts = TEXTS.get(lang) or TEXTS[settings.DEFAULT_LANG]
    return texts[key].format(**kwargs)


def get_buttons(lang: str) -> dict[str, str]:
    """Подписи кнопок на языке пользователя."""
    return BUTTONS.get(lang) or BUTTONS[settings.DEFAULT_LANG]
