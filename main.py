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
from contextlib import asynccontextmanager, suppress
from pathlib import Path

import uvicorn
from aiogram import Bot, Dispatcher
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api import postback, signals
from bot.handlers import router as bot_router
from bot.teaser import run_teaser_scheduler
from config import settings
from database import init_db

# На уровне модуля: под uvicorn __main__ не выполняется,
# без этого INFO-логи жизненного цикла не видны в docker logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

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
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception:  # noqa: BLE001
            logging.exception("Не удалось удалить webhook — бот может не работать")

        tasks.append(asyncio.create_task(_run_polling(dispatcher, bot), name="telegram-polling"))
        tasks.append(asyncio.create_task(run_teaser_scheduler(bot), name="daily-teaser"))
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
