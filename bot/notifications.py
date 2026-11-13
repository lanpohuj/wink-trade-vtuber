"""Durable, leased retries of registration/access notifications."""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta

from aiogram.exceptions import TelegramAPIError, TelegramForbiddenError, TelegramRetryAfter
from sqlalchemy import or_, select

from bot.keyboards import access_keyboard, deposit_keyboard
from bot.locales import get_text
from database import async_session_factory, write_transaction
from database.models import NotificationOutbox, User, utcnow

logger = logging.getLogger(__name__)


async def deliver_pending_notifications(bot, *, tg_id: int | None = None, limit: int = 20) -> None:
    for _ in range(limit):
        async with async_session_factory() as session:
            async with write_transaction(session):
                now = utcnow()
                query = select(NotificationOutbox).where(
                    NotificationOutbox.status.in_(("pending", "sending")),
                    NotificationOutbox.next_attempt_at <= now,
                    or_(NotificationOutbox.claimed_until.is_(None), NotificationOutbox.claimed_until <= now),
                ).order_by(NotificationOutbox.created_at).limit(1)
                if tg_id is not None:
                    query = query.where(NotificationOutbox.tg_id == tg_id)
                item = await session.scalar(query)
                if item is None:
                    return
                user = await session.scalar(select(User).where(User.tg_id == item.tg_id))
                if user is None or user.push_paused:
                    item.status = "blocked"
                    continue
                if item.kind == "registration" and user.has_access:
                    item.status = "superseded"
                    continue
                item.status = "sending"
                item.attempts += 1
                item.claimed_until = now + timedelta(seconds=60)
                key, kind, lang, trader, target, attempts = (
                    item.key, item.kind, user.lang, user.trader_id, user.tg_id, item.attempts,
                )
        status, delay = "sent", 0
        try:
            await bot.send_message(
                target,
                get_text(lang, "status_access_granted") if kind == "access" else get_text(
                    lang, "push_registered", trader_id=trader or "—",
                ),
                reply_markup=access_keyboard(lang, target) if kind == "access" else deposit_keyboard(target, lang),
                parse_mode="HTML",
                request_timeout=20,
            )
        except TelegramForbiddenError:
            status = "blocked"
        except TelegramRetryAfter as exc:
            status, delay = "pending", max(1, exc.retry_after)
        except (TelegramAPIError, OSError, TimeoutError):
            status, delay = "pending", min(300, 5 * 2 ** min(attempts, 6))
        except Exception:
            logger.exception("Notification delivery failed; queued for retry")
            status, delay = "pending", 60
        async with async_session_factory() as session:
            async with write_transaction(session):
                item = await session.get(NotificationOutbox, key)
                item.status, item.claimed_until = status, None
                item.next_attempt_at = utcnow() + timedelta(seconds=delay)
                if status == "blocked":
                    user = await session.scalar(select(User).where(User.tg_id == target))
                    if user:
                        user.push_paused = True
        if status != "sent":
            logger.warning("Funnel notification %s; attempt=%d", status, attempts)


async def run_notification_worker(bot) -> None:
    while True:
        try:
            await deliver_pending_notifications(bot)
        except Exception:
            logger.exception("Notification queue iteration failed")
        await asyncio.sleep(3)
