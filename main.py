"""Точка входа Wink Trade: FastAPI и Telegram-бот в одном процессе.

FastAPI принимает Postback от Pocket Partners (``/api/postback``), запросы
сигналов от Mini App (``/api/signal``) и раздаёт статику ``webapp/`` по
маршруту ``/webapp``. Telegram-бот работает на long polling в фоновой
задаче, запускаемой через lifespan FastAPI.

Запуск: ``python main.py`` или ``uvicorn main:app --host 0.0.0.0 --port 8000``.
"""

from __future__ import annotations

import asyncio
import logging
import re
from contextlib import asynccontextmanager, suppress
from pathlib import Path

import uvicorn
from aiogram import Bot, Dispatcher
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from api import postback, signals
from bot.handlers import router as bot_router
from bot.teaser import run_teaser_scheduler
from bot.notifications import run_notification_worker
from config import settings
from database import init_db, async_session_factory

# На уровне модуля: под uvicorn __main__ не выполняется,
# без этого INFO-логи жизненного цикла не видны в docker logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)


class SecretFilter(logging.Filter):
    def filter(self, record):
        def redact(value):
            if not isinstance(value, str):
                return value
            value = re.sub(r"(?i)(token=)[^&\s\"']+", r"\1[REDACTED]", value)
            return re.sub(r"/bot\d+:[A-Za-z0-9_-]+", "/bot[REDACTED]", value)
        record.msg = redact(record.getMessage())
        record.args = ()
        return True


logging.getLogger("uvicorn.access").addFilter(SecretFilter())
logging.getLogger("httpx").addFilter(SecretFilter())

WEBAPP_DIR = Path(__file__).parent / "webapp"


async def _run_polling(dispatcher: Dispatcher, bot: Bot) -> None:
    """Polling в фоновой задаче: сбой бота не должен ронять FastAPI."""
    try:
        # handle_signals=False: сигналы обслуживает uvicorn,
        # close_bot_session=False: сессию закрывает lifespan.
        await dispatcher.start_polling(bot, handle_signals=False, close_bot_session=False)
    except Exception:
        logging.exception("Аварийная остановка Telegram-бота — API продолжает работать")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация БД, запуск polling бота и чистое выключение.

    С невалидным BOT_TOKEN приложение продолжает работать (API, Mini App,
    постбеки) — бот стартует после исправления токена в .env и рестарта.
    """
    await init_db()

    bot: Bot | None = None
    try:
        bot = Bot(token=settings.BOT_TOKEN)
        app.state.bot = bot
    except Exception:  # noqa: BLE001 — TokenValidationError при плейсхолдере
        logging.exception("BOT_TOKEN невалиден — Telegram-бот отключён (API работает)")

    tasks: list[asyncio.Task] = []
    if bot is not None:
        dispatcher = Dispatcher()
        dispatcher.include_router(bot_router)
        try:
            await bot.delete_webhook(drop_pending_updates=False)
        except Exception:  # noqa: BLE001
            logging.exception("Не удалось удалить webhook — бот может не работать")

        polling_task = asyncio.create_task(_run_polling(dispatcher, bot), name="telegram-polling")
        app.state.polling_task = polling_task
        tasks.append(polling_task)
        tasks.append(asyncio.create_task(run_teaser_scheduler(bot), name="daily-teaser"))
        tasks.append(asyncio.create_task(run_notification_worker(bot), name="funnel-notifications"))

        # Регистрация глобальной кнопки MenuButtonWebApp и команд бота
        try:
            from aiogram.types import BotCommand, BotCommandScopeChat, MenuButtonWebApp, WebAppInfo

            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="⚡ WINKY AI",
                    web_app=WebAppInfo(url=settings.webapp_url_for(0, "ru")),
                )
            )
            # Публичные команды для всех пользователей (без /vip)
            await bot.set_my_commands([
                BotCommand(command="start", description="🚀 Главное меню Winky"),
                BotCommand(command="app", description="📱 Открыть терминал WINKY AI Mini App"),
                BotCommand(command="id", description="🆔 Узнать мой Telegram ID"),
            ])

            # Приватные команды только для администраторов
            admin_commands = [
                BotCommand(command="start", description="🚀 Главное меню Winky"),
                BotCommand(command="app", description="📱 Открыть терминал WINKY AI Mini App"),
                BotCommand(command="vip", description="💎 Режим Стримера / Выдача VIP (/vip [tg_id])"),
                BotCommand(command="id", description="🆔 Узнать мой Telegram ID"),
                BotCommand(command="award", description="🎁 Начислить баллы (/award tg_id N)"),
            ]
            for admin_id in settings.admin_tg_ids:
                try:
                    await bot.set_my_commands(admin_commands, scope=BotCommandScopeChat(chat_id=admin_id))
                except Exception:
                    pass

            logging.info("Telegram MenuButtonWebApp и команды успешно зарегистрированы")
        except Exception:
            logging.exception("Не удалось настроить MenuButtonWebApp или команды бота")

        logging.info(
            "Wink Trade запущен: FastAPI + Telegram-бот (polling) + тизер %d:00",
            settings.TEASER_HOUR,
        )
    else:
        logging.warning("Wink Trade запущен в режиме ТОЛЬКО API (BOT_TOKEN не задан)")

    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task
        if bot is not None:
            await bot.session.close()


def create_app() -> FastAPI:
    """Сборка приложения: API-роутеры + статика Mini App."""
    app = FastAPI(title="Wink Trade", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/webapp/")

    @app.get("/health", include_in_schema=False)
    async def health():
        try:
            async with async_session_factory() as session:
                await session.execute(text("SELECT 1"))
        except Exception:
            return JSONResponse({"status": "unavailable", "database": False}, status_code=503)
        polling = getattr(app.state, "polling_task", None)
        bot_running = polling is not None and not polling.done()
        return JSONResponse(
            {"status": "ok" if bot_running else "api_only", "database": True, "bot_polling": bot_running},
            status_code=200 if bot_running else 503,
        )

    app.include_router(postback.router, prefix="/api")
    app.include_router(signals.router, prefix="/api")
    app.mount("/webapp", StaticFiles(directory=WEBAPP_DIR, html=True), name="webapp")
    return app


app = create_app()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
