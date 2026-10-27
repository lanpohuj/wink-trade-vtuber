"""Ежедневный тизер: возвращает холодную аудиторию к воронке.

В час ``TEASER_HOUR`` каждый пользователь без доступа (не отписался,
в лимите ``TEASER_MAX_COUNT``, сегодня тизер не получал) получает реальный
сигнал со скрытым направлением и кнопкой открытия доступа.
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from api.signals import OTC_PAIRS, otc_signal
from bot.keyboards import teaser_keyboard
from bot.locales import get_text
from config import settings
from database import async_session_factory
from database import crud
from database.models import User

logger = logging.getLogger(__name__)

_CHECK_INTERVAL_SECONDS = 60
_SEND_DELAY_SECONDS = 0.1  # не быстрее ~10 сообщений в секунду


async def send_teaser(bot: Bot, user: User) -> bool:
    """Отправляет пользователю тизер с реальным (скрытым) сигналом."""
    pair = random.choice(OTC_PAIRS)
    _, accuracy = otc_signal(pair)
    try:
        await bot.send_message(
            user.tg_id,
            get_text(user.lang, "teaser", pair=pair, accuracy=accuracy),
            reply_markup=teaser_keyboard(user.tg_id, user.lang),
        )
        return True
    except TelegramAPIError:
        logger.info("Тизер не доставлен: tg_id=%s (заблокировал бота?)", user.tg_id)
        return False


async def run_daily_teasers(bot: Bot) -> None:
    """Одна итерация рассылки: цели из БД, отправка с лимитом скорости."""
    async with async_session_factory() as session:
        targets = await crud.get_teaser_targets(session)
    sent = 0
    for user in targets:
        if await send_teaser(bot, user):
            sent += 1
        # Отмечаем даже недоставленные, чтобы не долбить заблокировавших
        async with async_session_factory() as session:
            await crud.record_teaser_sent(session, user.tg_id)
        await asyncio.sleep(_SEND_DELAY_SECONDS)
    if targets:
        logger.info("Тизер: отправлено %d из %d адресатов", sent, len(targets))


async def run_teaser_scheduler(bot: Bot) -> None:
    """Фоновая задача: раз в день в TEASER_HOUR запускает рассылку тизеров."""
    last_run_date = None
    while True:
        try:
            now = datetime.now()
            if now.hour == settings.TEASER_HOUR and last_run_date != now.date():
                last_run_date = now.date()
                await run_daily_teasers(bot)
        except Exception:  # noqa: BLE001 — планировщик не должен умирать
            logging.exception("Ошибка в планировщике тизеров")
        await asyncio.sleep(_CHECK_INTERVAL_SECONDS)
