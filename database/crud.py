"""Асинхронные CRUD-функции Wink Trade.

Каждая функция принимает готовую ``AsyncSession`` и сама фиксирует транзакцию,
поэтому их можно вызывать и из хэндлеров aiogram, и из эндпоинтов FastAPI
(зависимость ``database.get_session``).
"""

from __future__ import annotations

import json
import random
from collections.abc import Sequence
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database.models import (
    AdminSignalQueue,
    PostbackLog,
    SOURCE_LIVE,
    STATUS_OK,
    SignalHistory,
    User,
    VALID_DIRECTIONS,
    VALID_LANGS,
    utcnow,
)

# =========================================================================
# Пользователи
# =========================================================================


async def get_user(session: AsyncSession, tg_id: int) -> User | None:
    """Возвращает пользователя по Telegram ID (он же ``sub_id``) или ``None``."""
    result = await session.execute(select(User).where(User.tg_id == tg_id))
    return result.scalar_one_or_none()


async def get_user_by_trader_id(session: AsyncSession, trader_id: str) -> User | None:
    """Возвращает пользователя по ID его аккаунта на Pocket Option или ``None``."""
    result = await session.execute(select(User).where(User.trader_id == trader_id))
    return result.scalar_one_or_none()


async def get_or_create_user(
    session: AsyncSession,
    tg_id: int,
    username: str | None = None,
    source: str | None = None,
) -> User:
    """Создаёт пользователя при первом входе (``/start``) и обновляет ``username`` при смене.

    ``source`` — метка источника трафика из deep-link payload (например ``live``);
    фиксируется при первом контакте и дальше не меняется.
    """
    user = await get_user(session, tg_id)
    if user is None:
        user = User(tg_id=tg_id, username=username, lang=settings.DEFAULT_LANG, source=source)
        session.add(user)
        await session.commit()
        return user
    changed = False
    if username is not None and user.username != username:
        user.username = username
        changed = True
    if source is not None and user.source is None:
        user.source = source
        changed = True
    if changed:
        await session.commit()
    return user


async def set_language(session: AsyncSession, tg_id: int, lang: str) -> User | None:
    """Меняет язык интерфейса пользователя (``'ru'`` / ``'en'``).

    Бросает ``ValueError`` при недопустимом языке, возвращает ``None``,
    если пользователя нет в базе.
    """
    lang = lang.strip().lower()
    if lang not in VALID_LANGS:
        raise ValueError(f"Недопустимый язык: {lang!r} (допустимо: 'ru', 'en')")
    user = await get_user(session, tg_id)
    if user is None:
        return None
    user.lang = lang
    await session.commit()
    return user


async def mark_registered(session: AsyncSession, tg_id: int, trader_id: str | None = None) -> User | None:
    """Подтверждает регистрацию (вызывается Postback'ом регистрации).

    ``tg_id`` приходит из партнёрской сети как ``sub_id``: пользователь обязан
    регистрироваться по персональной ссылке из бота, поэтому если пользователя
    с таким ``tg_id`` нет, возвращается ``None``.
    """
    user = await get_user(session, tg_id)
    if user is None:
        return None
    user.is_registered = True
    if trader_id:
        user.trader_id = str(trader_id)
    await session.commit()
    return user


async def add_deposit(
    session: AsyncSession,
    amount: float,
    tg_id: int | None = None,
    trader_id: str | None = None,
) -> User | None:
    """Зачисляет депозит (Postback депозита) и автоматически открывает доступ.

    Пользователя можно найти по ``tg_id`` (``sub_id``) либо по ``trader_id`` —
    если по ``tg_id`` он не найден, поиск продолжается по ``trader_id``.
    Суммы накапливаются в ``deposit_amount``; при ``deposit_amount > 0``
    доступ к сигналам открывается автоматически (SPEC, таблица ``users``).
    """
    if tg_id is None and trader_id is None:
        raise ValueError("Для зачисления депозита укажите tg_id или trader_id")
    user: User | None = None
    if tg_id is not None:
        user = await get_user(session, tg_id)
    if user is None and trader_id is not None:
        user = await get_user_by_trader_id(session, str(trader_id))
    if user is None:
        return None
    user.deposit_amount = float(user.deposit_amount or 0.0) + float(amount)
    if user.deposit_amount > 0:
        user.has_access = True
    await session.commit()
    return user


async def grant_access(session: AsyncSession, tg_id: int) -> User | None:
    """Открывает пользователю доступ к сигналам вручную (команда админа)."""
    user = await get_user(session, tg_id)
    if user is None:
        return None
    user.has_access = True
    await session.commit()
    return user


async def revoke_access(session: AsyncSession, tg_id: int) -> User | None:
    """Закрывает пользователю доступ к сигналам вручную (команда админа)."""
    user = await get_user(session, tg_id)
    if user is None:
        return None
    user.has_access = False
    await session.commit()
    return user


# =========================================================================
# Очередь демонстрационных сигналов админа
# =========================================================================


async def set_admin_signal_queue(
    session: AsyncSession,
    admin_tg_id: int,
    directions: Sequence[str],
    accuracy: int | None = None,
) -> list[AdminSignalQueue]:
    """Задаёт очередь демонстрационных сигналов стримера (``/setqueue BUY,BUY,SELL``).

    Неиспользованные записи прежней очереди этого админа удаляются и создаётся
    новая. Если ``accuracy`` не задан, для каждого сигнала генерируется случайная
    точность в диапазоне ``SIGNAL_ACCURACY_MIN``–``SIGNAL_ACCURACY_MAX``.
    Возвращает список созданных записей в порядке подачи.
    """
    if accuracy is not None and not (1 <= accuracy <= 100):
        raise ValueError("Точность сигнала должна быть в диапазоне от 1 до 100")

    cleaned: list[str] = []
    for direction in directions:
        value = str(direction).strip().upper()
        if not value:
            continue
        if value not in VALID_DIRECTIONS:
            raise ValueError(f"Недопустимое направление сигнала: {direction!r} (допустимо: BUY, SELL)")
        cleaned.append(value)
    if not cleaned:
        raise ValueError("Очередь сигналов пуста: передайте хотя бы одно направление (BUY/SELL)")

    await session.execute(
        delete(AdminSignalQueue).where(
            AdminSignalQueue.admin_tg_id == admin_tg_id,
            AdminSignalQueue.is_used.is_(False),
        )
    )

    rows = [
        AdminSignalQueue(
            admin_tg_id=admin_tg_id,
            direction=direction,
            accuracy=accuracy
            if accuracy is not None
            else random.randint(settings.SIGNAL_ACCURACY_MIN, settings.SIGNAL_ACCURACY_MAX),
        )
        for direction in cleaned
    ]
    session.add_all(rows)
    await session.commit()
    return rows


async def get_next_admin_signal(session: AsyncSession, admin_tg_id: int) -> AdminSignalQueue | None:
    """Отдаёт следующий неиспользованный сигнал из очереди админа.

    Запись помечается использованной (каждый сигнал выдаётся ровно один раз).
    Если очередь исчерпана, возвращается ``None``.
    """
    result = await session.execute(
        select(AdminSignalQueue)
        .where(
            AdminSignalQueue.admin_tg_id == admin_tg_id,
            AdminSignalQueue.is_used.is_(False),
        )
        .order_by(AdminSignalQueue.id)
        .limit(1)
    )
    signal = result.scalar_one_or_none()
    if signal is None:
        return None
    signal.is_used = True
    await session.commit()
    return signal


async def get_admin_queue(
    session: AsyncSession,
    admin_tg_id: int,
    include_used: bool = False,
) -> list[AdminSignalQueue]:
    """Возвращает очередь сигналов админа (по умолчанию только неиспользованные)."""
    query = (
        select(AdminSignalQueue)
        .where(AdminSignalQueue.admin_tg_id == admin_tg_id)
        .order_by(AdminSignalQueue.id)
    )
    if not include_used:
        query = query.where(AdminSignalQueue.is_used.is_(False))
    result = await session.execute(query)
    return list(result.scalars().all())


async def clear_admin_queue(session: AsyncSession, admin_tg_id: int) -> int:
    """Полностью очищает очередь сигналов админа. Возвращает число удалённых записей."""
    result = await session.execute(
        delete(AdminSignalQueue).where(AdminSignalQueue.admin_tg_id == admin_tg_id)
    )
    await session.commit()
    return result.rowcount or 0


# =========================================================================
# Журнал Postback
# =========================================================================


async def log_postback(
    session: AsyncSession,
    event_type: str,
    *,
    trader_id: str | None = None,
    sub_id: str | None = None,
    amount: float = 0.0,
    status: str = STATUS_OK,
    raw_data: dict[str, Any] | None = None,
) -> PostbackLog:
    """Сохраняет в журнал запись о входящем Postback-запросе.

    ``raw_data`` (сырые параметры запроса) сериализуется в JSON.
    """
    entry = PostbackLog(
        event_type=event_type,
        trader_id=trader_id,
        sub_id=sub_id,
        amount=float(amount),
        status=status,
        raw_data=json.dumps(raw_data, ensure_ascii=False, default=str) if raw_data else None,
    )
    session.add(entry)
    await session.commit()
    return entry


async def get_postback_logs(
    session: AsyncSession,
    limit: int = 50,
    event_type: str | None = None,
) -> list[PostbackLog]:
    """Последние записи журнала Postback (для админ-панели)."""
    query = select(PostbackLog).order_by(PostbackLog.id.desc()).limit(limit)
    if event_type is not None:
        query = query.where(PostbackLog.event_type == event_type)
    result = await session.execute(query)
    return list(result.scalars().all())


# =========================================================================
# История сигналов (живая лента платформы)
# =========================================================================


async def save_signal(
    session: AsyncSession,
    *,
    tg_id: int,
    pair: str,
    direction: str,
    accuracy: int,
    duration: str,
) -> SignalHistory:
    """Сохраняет выданный сигнал в общую ленту."""
    entry = SignalHistory(
        tg_id=tg_id, pair=pair, direction=direction, accuracy=accuracy, duration=duration
    )
    session.add(entry)
    await session.commit()
    return entry


async def get_recent_signals(session: AsyncSession, limit: int = 6) -> list[SignalHistory]:
    """Последние сигналы платформы (новые первыми)."""
    result = await session.execute(
        select(SignalHistory).order_by(SignalHistory.id.desc()).limit(limit)
    )
    return list(result.scalars().all())


def _utc_day_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def get_today_signal_users(session: AsyncSession) -> int:
    """Сколько уникальных трейдеров получили сигналы сегодня (UTC-день)."""
    result = await session.execute(
        select(func.count(func.distinct(SignalHistory.tg_id))).where(
            SignalHistory.created_at >= _utc_day_start()
        )
    )
    return int(result.scalar() or 0)


async def get_total_users(session: AsyncSession) -> int:
    """Всего пользователей в боте."""
    return int(await session.scalar(select(func.count()).select_from(User)) or 0)


# =========================================================================
# Ежедневный тизер
# =========================================================================


def _as_aware(value: datetime) -> datetime:
    """SQLite не сохраняет offset — наивное время считаем UTC."""
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


async def get_teaser_targets(session: AsyncSession) -> list[User]:
    """Адресаты тизера: без доступа, без отписки, в лимите, и сегодня тизер не получали.

    Админы (стримеры) исключаются — им тизер не нужен.
    """
    result = await session.execute(
        select(User)
        .where(
            User.has_access.is_(False),
            User.push_paused.is_(False),
            User.teaser_count < settings.TEASER_MAX_COUNT,
        )
        .order_by(User.id)
    )
    candidates = list(result.scalars().all())
    admin_ids = set(settings.admin_tg_ids)
    today = date.today()
    return [
        user
        for user in candidates
        if user.tg_id not in admin_ids
        and (
            user.last_teaser_at is None
            or _as_aware(user.last_teaser_at).astimezone().date() < today
        )
    ]


async def record_teaser_sent(session: AsyncSession, tg_id: int) -> None:
    """Отмечает отправку тизера пользователю."""
    user = await get_user(session, tg_id)
    if user is None:
        return
    user.teaser_count += 1
    user.last_teaser_at = utcnow()
    await session.commit()


async def pause_pushes(session: AsyncSession, tg_id: int) -> User | None:
    """Навсегда отключает пуши пользователю (кнопка «⏸ Не присылать»)."""
    user = await get_user(session, tg_id)
    if user is None:
        return None
    user.push_paused = True
    await session.commit()
    return user


# =========================================================================
# Геймификация: баллы, серия дней, недельный рейтинг
# =========================================================================

POINTS_DAILY_CAP = 27  # общий дневной лимит: сигналы + заход (5) + серия (до 7)
POINTS_VISIT_BONUS = 5
POINTS_STREAK_BONUS_MAX = 7


def _today_key(now: datetime | None = None) -> str:
    return (now or datetime.now(timezone.utc)).strftime("%Y-%m-%d")


def _week_key(now: datetime | None = None) -> str:
    """ISO-неделя вида '2026-W43' — ключ недельного рейтинга."""
    return (now or datetime.now(timezone.utc)).strftime("%G-W%V")


async def register_activity(session: AsyncSession, tg_id: int) -> dict:
    """Отмечает активность в Mini App: серия дней и бонус за первый заход.

    Возвращает {"streak": N, "visit_awarded": bool, "streak_bonus": int}.
    """
    user = await get_user(session, tg_id)
    if user is None:
        return {"streak": 0, "visit_awarded": False, "streak_bonus": 0}

    today = _today_key()
    yesterday = _today_key(datetime.now(timezone.utc) - timedelta(days=1))
    visit_awarded = False
    streak_bonus = 0

    if user.last_active_date != today:
        if user.last_active_date == yesterday:
            user.streak_days += 1
        else:
            user.streak_days = 1
        user.last_active_date = today

    # Ежедневный лимит баллов обнуляется с новой датой
    if user.points_daily_date != today:
        user.points_daily_date = today
        user.points_daily_earned = 0

    # Новая неделя обнуляет недельный рейтинг
    week = _week_key()
    if user.points_week_key != week:
        user.points_week_key = week
        user.points_week = 0

    # Бонус за первый заход дня начисляется один раз
    if user.points_daily_earned == 0:
        streak_bonus = min(user.streak_days, POINTS_STREAK_BONUS_MAX)
        user.points_daily_earned += POINTS_VISIT_BONUS + streak_bonus
        user.points_total += POINTS_VISIT_BONUS + streak_bonus
        user.points_week += POINTS_VISIT_BONUS + streak_bonus
        visit_awarded = True

    await session.commit()
    return {"streak": user.streak_days, "visit_awarded": visit_awarded, "streak_bonus": streak_bonus}


async def award_signal_points(session: AsyncSession, tg_id: int) -> int:
    """Балл за сигнал в пределах дневного лимита. Возвращает начисленное (0 — лимит)."""
    user = await get_user(session, tg_id)
    if user is None:
        return 0

    today = _today_key()
    if user.points_daily_date != today:
        user.points_daily_date = today
        user.points_daily_earned = 0
    if user.points_daily_earned >= POINTS_DAILY_CAP:
        return 0

    # Недельный ключ: новая неделя обнуляет points_week
    week = _week_key()
    if user.points_week_key != week:
        user.points_week_key = week
        user.points_week = 0

    user.points_daily_earned += 1
    user.points_total += 1
    user.points_week += 1
    await session.commit()
    return 1


async def award_bonus_points(session: AsyncSession, tg_id: int, amount: int) -> User | None:
    """Бонусные баллы от админа (/award) — идут и в общий, и в недельный зачёт."""
    user = await get_user(session, tg_id)
    if user is None or amount == 0:
        return user
    week = _week_key()
    if user.points_week_key != week:
        user.points_week_key = week
        user.points_week = 0
    user.points_total += amount
    user.points_week += amount
    await session.commit()
    return user


async def get_leaderboard(session: AsyncSession, limit: int = 10) -> list[dict]:
    """Топ недели по points_week (ник или маскированный tg_id)."""
    week = _week_key()
    result = await session.execute(
        select(User)
        .where(User.points_week > 0, User.points_week_key == week)
        .order_by(User.points_week.desc(), User.id)
        .limit(limit)
    )
    board = []
    for place, user in enumerate(result.scalars().all(), start=1):
        name = user.username if user.username else f"trader{user.tg_id % 10000}"
        board.append({"place": place, "name": name, "points": user.points_week})
    return board


async def get_week_rank(session: AsyncSession, tg_id: int) -> int | None:
    """Место пользователя в недельном рейтинге (None — нет баллов на этой неделе)."""
    user = await get_user(session, tg_id)
    if user is None or user.points_week <= 0 or user.points_week_key != _week_key():
        return None
    higher = await session.scalar(
        select(func.count())
        .select_from(User)
        .where(User.points_week > user.points_week, User.points_week_key == _week_key())
    )
    return int(higher or 0) + 1


async def get_personal_stats(session: AsyncSession, tg_id: int) -> dict:
    """Личная статистика для Mini App: сигналы, любимая пара, серия, баллы, место."""
    user = await get_user(session, tg_id)
    if user is None:
        return {}
    total_signals = await session.scalar(
        select(func.count()).select_from(SignalHistory).where(SignalHistory.tg_id == tg_id)
    ) or 0
    top_pair_row = await session.execute(
        select(SignalHistory.pair, func.count().label("cnt"))
        .where(SignalHistory.tg_id == tg_id)
        .group_by(SignalHistory.pair)
        .order_by(func.count().desc())
        .limit(1)
    )
    top_pair = top_pair_row.first()
    return {
        "total_signals": int(total_signals),
        "favorite_pair": top_pair.pair if top_pair else None,
        "streak_days": user.streak_days,
        "points_total": user.points_total,
        "points_week": user.points_week,
        "rank": await get_week_rank(session, tg_id),
    }


# =========================================================================
# Статистика
# =========================================================================


async def get_stats(session: AsyncSession) -> dict[str, int | float]:
    """Сводная статистика бота для админ-команды /stats."""
    total_users = await session.scalar(select(func.count()).select_from(User)) or 0
    registered = (
        await session.scalar(
            select(func.count()).select_from(User).where(User.is_registered.is_(True))
        )
        or 0
    )
    with_deposit = (
        await session.scalar(select(func.count()).select_from(User).where(User.deposit_amount > 0))
        or 0
    )
    total_deposits = (
        await session.scalar(
            select(func.coalesce(func.sum(User.deposit_amount), 0.0)).select_from(User)
        )
        or 0.0
    )
    live_users = (
        await session.scalar(
            select(func.count()).select_from(User).where(User.source == SOURCE_LIVE)
        )
        or 0
    )
    return {
        "total_users": int(total_users),
        "registered": int(registered),
        "with_deposit": int(with_deposit),
        "total_deposits": float(total_deposits),
        "live_users": int(live_users),
        "organic_users": int(total_users) - int(live_users),
        "today_traders": await get_today_signal_users(session),
    }
