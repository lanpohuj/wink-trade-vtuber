"""Авто-воронка дожима лидов: 15 минут, 45 минут и ежедневный вечерний тизер в 19:00.

Планировщик проверяет базу каждые 3 минуты (180 сек):
1. Лиды без регистрации (Шаг 1) через 15 минут получают дожим от Winky с реальным сигналом.
2. Лиды с регистрацией, но без депозита (Шаг 2) через 45 минут получают напоминание о бонусе 50START (+50%).
3. В час TEASER_HOUR (19:00) все пользователи без доступа получают тизер со скрытым сигналом.
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from api.signals import OTC_PAIRS, otc_signal
from bot.keyboards import deposit_keyboard, main_menu_keyboard, teaser_keyboard
from bot.locales import get_text
from config import settings
from database import async_session_factory
from database import crud
from database.models import User

logger = logging.getLogger(__name__)

_CHECK_INTERVAL_SECONDS = 180  # опрос базы каждые 3 минуты
_SEND_DELAY_SECONDS = 0.1      # пауза между отправками во избежание flood-лимитов


async def send_15m_followup(bot: Bot, user: User) -> bool:
    """Дожим №1: через 15 минут после /start для незарегистрированных."""
    pair = random.choice(OTC_PAIRS)
    _, accuracy = otc_signal(pair)
    try:
        await bot.send_message(
            user.tg_id,
            get_text(user.lang, "followup_15m", pair=pair, accuracy=accuracy),
            reply_markup=main_menu_keyboard(user.tg_id, user.lang),
            parse_mode="HTML",
        )
        return True
    except TelegramAPIError:
        logger.info("Дожим 15м не доставлен: tg_id=%s (бот заблокирован?)", user.tg_id)
        return False


async def send_45m_followup(bot: Bot, user: User) -> bool:
    """Дожим №2: через 45 минут после регистрации для пользователей без депозита."""
    try:
        await bot.send_message(
            user.tg_id,
            get_text(user.lang, "followup_45m", trader_id=user.trader_id or "—"),
            reply_markup=deposit_keyboard(user.tg_id, user.lang),
            parse_mode="HTML",
        )
        return True
    except TelegramAPIError:
        logger.info("Дожим 45м не доставлен: tg_id=%s (бот заблокирован?)", user.tg_id)
        return False


async def send_teaser(bot: Bot, user: User) -> bool:
    """Ежедневный тизер со скрытым направлением сигнала в 19:00."""
    pair = random.choice(OTC_PAIRS)
    _, accuracy = otc_signal(pair)
    try:
        await bot.send_message(
            user.tg_id,
            get_text(user.lang, "teaser", pair=pair, accuracy=accuracy),
            reply_markup=teaser_keyboard(user.tg_id, user.lang),
            parse_mode="HTML",
        )
        return True
    except TelegramAPIError:
        logger.info("Тизер 19:00 не доставлен: tg_id=%s (бот заблокирован?)", user.tg_id)
        return False


async def process_quick_followups(bot: Bot) -> None:
    """Проверка и отправка быстрых дожимов 15м и 45м."""
    # 1. Дожим 15 минут (Шаг 1 -> Шаг 2)
    async with async_session_factory() as session:
        targets_15m = await crud.get_15m_followup_targets(session, threshold_minutes=15)

    for user in targets_15m:
        await send_15m_followup(bot, user)
        async with async_session_factory() as session:
            await crud.record_15m_followup_sent(session, user.tg_id)
        await asyncio.sleep(_SEND_DELAY_SECONDS)

    if targets_15m:
        logger.info("Авто-воронка: отправлен дожим 15м для %d лидов", len(targets_15m))

    # 2. Дожим 45 минут (Шаг 2 -> Депозит)
    async with async_session_factory() as session:
        targets_45m = await crud.get_45m_followup_targets(session, threshold_minutes=45)

    for user in targets_45m:
        await send_45m_followup(bot, user)
        async with async_session_factory() as session:
            await crud.record_45m_followup_sent(session, user.tg_id)
        await asyncio.sleep(_SEND_DELAY_SECONDS)

    if targets_45m:
        logger.info("Авто-воронка: отправлен дожим 45м для %d лидов", len(targets_45m))


async def run_daily_teasers(bot: Bot) -> None:
    """Одна итерация рассылки вечерних тизеров (19:00)."""
    async with async_session_factory() as session:
        targets = await crud.get_teaser_targets(session)
    sent = 0
    for user in targets:
        if await send_teaser(bot, user):
            sent += 1
        async with async_session_factory() as session:
            await crud.record_teaser_sent(session, user.tg_id)
        await asyncio.sleep(_SEND_DELAY_SECONDS)
    if targets:
        logger.info("Вечерний тизер 19:00: отправлено %d из %d адресатов", sent, len(targets))


async def run_teaser_scheduler(bot: Bot) -> None:
    """Фоновая задача авто-воронки: проверяет базу каждые 3 минуты."""
    last_daily_date = None
    while True:
        try:
            # 1. Быстрые дожимы 15м и 45м
            await process_quick_followups(bot)

            # 2. Ежедневный вечерний тизер в TEASER_HOUR (19:00)
            now = datetime.now()
            if now.hour == settings.TEASER_HOUR and last_daily_date != now.date():
                last_daily_date = now.date()
                await run_daily_teasers(bot)

        except Exception:  # noqa: BLE001 — планировщик не должен падать
            logger.exception("Ошибка в планировщике авто-воронки")

        await asyncio.sleep(_CHECK_INTERVAL_SECONDS)
