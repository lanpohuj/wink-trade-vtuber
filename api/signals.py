"""API торговых сигналов для Mini App (SPEC, раздел 5).

Режимы работы ``POST /api/signal``:

* **Admin Mode** — для ``tg_id`` из ``ADMIN_TG_IDS``: принудительный сигнал
  ``force_dir`` (скрытая фича стримера: тап по логотипу — BUY, по переключателю
  языка — SELL) либо следующий сигнал из очереди ``admin_signal_queue``
  (команда ``/setqueue``);
* **User Mode** — классические пары: теханализ TradingView (``tradingview-ta``)
  с фоллбэком на математический расчёт импульса; OTC-пары: детерминированный
  сигнал по 5-секундному окну времени — у всех пользователей, нажавших кнопку
  в одну и ту же секунду на одной паре, результат одинаков.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import random
import time
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import settings
from database import async_session_factory
from database import crud
from database.models import DIRECTION_BUY, DIRECTION_SELL

router = APIRouter()
logger = logging.getLogger(__name__)

# Пары и экспирации из SPEC (раздел 5)
CLASSIC_PAIRS = ("EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD")
OTC_PAIRS = (
    "AUD/CHF OTC",
    "EUR/USD OTC",
    "GBP/USD OTC",
    "USD/JPY OTC",
    "AUD/CAD OTC",
    "EUR/GBP OTC",
    "USD/CHF OTC",
    "NZD/USD OTC",
)
DURATIONS = ("5s", "15s", "30s", "1m", "3m", "5m")
_ALL_PAIRS = frozenset(CLASSIC_PAIRS + OTC_PAIRS)

# tradingview-ta — синхронная библиотека; допускаем её отсутствие
try:
    from tradingview_ta import TA_Handler

    TA_AVAILABLE = True
except ImportError:  # pragma: no cover - зависит от окружения
    TA_AVAILABLE = False

# Кэш результатов TradingView: не чаще одного запроса на пару за TTL секунд
_ta_cache: dict[str, tuple[float, tuple[str, int]]] = {}
_ta_fail_until: dict[str, float] = {}
_TA_CACHE_TTL = 30.0
_TA_FAILURE_COOLDOWN = 60.0
_TA_TIMEOUT = 5.0


class SignalRequest(BaseModel):
    """Запрос Mini App: tg_id из Telegram.WebApp, пара и экспирация."""

    tg_id: int
    pair: str
    duration: str
    force_dir: Literal["BUY", "SELL"] | None = None


class SignalResponse(BaseModel):
    direction: Literal["BUY", "SELL"]
    accuracy: int = Field(ge=1, le=100)
    pair: str
    duration: str


class HistoryItem(BaseModel):
    """Пункт живой ленты сигналов."""

    pair: str
    direction: str
    accuracy: int
    duration: str
    created_at: datetime


class HistoryResponse(BaseModel):
    """Лента + счётчики для Mini App."""

    signals: list[HistoryItem]
    today_traders: int
    total_traders: int | None  # None — пока ниже порога показа (TOTAL_COUNTER_THRESHOLD)


class MeResponse(BaseModel):
    """Личная статистика и прогресс пользователя."""

    total_signals: int = 0
    favorite_pair: str | None = None
    streak_days: int = 0
    points_total: int = 0
    points_week: int = 0
    rank: int | None = None
    rules: str


class LeaderboardEntry(BaseModel):
    place: int
    name: str
    points: int


class LeaderboardResponse(BaseModel):
    """Недельный топ + место запросившего."""

    week: str
    entries: list[LeaderboardEntry]
    your_rank: int | None = None


def _accuracy_from(value: int) -> int:
    """Точность в диапазоне SIGNAL_ACCURACY_MIN..MAX из целого числа."""
    span = settings.SIGNAL_ACCURACY_MAX - settings.SIGNAL_ACCURACY_MIN + 1
    return settings.SIGNAL_ACCURACY_MIN + value % span


def otc_signal(pair: str, now: float | None = None) -> tuple[str, int]:
    """Детерминированный сигнал для OTC-пары по 5-секундному окну времени."""
    moment = int((now if now is not None else time.time()) // 5)
    digest = hashlib.sha256(f"{pair}:otc:{moment}".encode()).digest()
    direction = DIRECTION_BUY if digest[0] % 2 == 0 else DIRECTION_SELL
    return direction, _accuracy_from(digest[1])


def momentum_signal(pair: str, now: float | None = None) -> tuple[str, int]:
    """Фоллбэк для классических пар: «импульс» как сумма дрейфов минутных окон.

    Направление устойчиво внутри минуты (окно 60 c), точность — из хеша окна.
    """
    current = int((now if now is not None else time.time()) // 60)
    drift = 0
    for offset in range(6):  # импульс суммируется за последние 6 минут
        window_digest = hashlib.sha256(f"{pair}:m:{current - offset}".encode()).digest()
        drift += window_digest[0] - 128
    digest = hashlib.sha256(f"{pair}:momentum:{current}".encode()).digest()
    if drift > 0:
        direction = DIRECTION_BUY
    elif drift < 0:
        direction = DIRECTION_SELL
    else:
        direction = DIRECTION_BUY if digest[0] % 2 == 0 else DIRECTION_SELL
    return direction, _accuracy_from(digest[1])


def _fetch_tradingview_sync(pair: str) -> tuple[str, int]:
    """Синхронный запрос сводного мнения индикаторов TradingView (1 минута)."""
    handler = TA_Handler(
        symbol=pair.replace("/", ""),
        screener="forex",
        exchange="FX",
        interval="1m",
    )
    analysis = handler.get_analysis()
    summary = analysis.summary
    recommendation = str(summary.get("RECOMMENDATION", "")).upper()
    if "SELL" in recommendation:
        direction = DIRECTION_SELL
    elif "BUY" in recommendation:
        direction = DIRECTION_BUY
    else:
        raise ValueError(f"TradingView вернул NEUTRAL для {pair}")

    buys = int(summary.get("BUY", 0))
    sells = int(summary.get("SELL", 0))
    neutrals = int(summary.get("NEUTRAL", 0))
    total = buys + sells + neutrals
    share = (buys if direction == DIRECTION_BUY else sells) / total if total else 0.5
    accuracy = settings.SIGNAL_ACCURACY_MIN + round(
        (settings.SIGNAL_ACCURACY_MAX - settings.SIGNAL_ACCURACY_MIN) * share
    )
    return direction, accuracy


async def tradingview_signal(pair: str) -> tuple[str, int]:
    """Теханализ классической пары; при любой проблеме — расчёт импульса."""
    if not TA_AVAILABLE:
        return momentum_signal(pair)
    now = time.time()
    if now < _ta_fail_until.get(pair, 0.0):
        return momentum_signal(pair)
    cached = _ta_cache.get(pair)
    if cached is not None and now - cached[0] < _TA_CACHE_TTL:
        return cached[1]
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_fetch_tradingview_sync, pair),
            timeout=_TA_TIMEOUT,
        )
    except Exception:
        # Кэшируем неудачу, чтобы не подвешивать запросы на таймаутах
        _ta_fail_until[pair] = now + _TA_FAILURE_COOLDOWN
        logger.warning("TradingView недоступен для %s — используется расчёт импульса", pair)
        return momentum_signal(pair)
    _ta_cache[pair] = (now, result)
    _ta_fail_until.pop(pair, None)
    return result


async def _user_signal(pair: str) -> tuple[str, int]:
    """Сигнал общего алгоритма: OTC — детерминированный, классика — теханализ/импульс."""
    if pair in OTC_PAIRS:
        return otc_signal(pair)
    return await tradingview_signal(pair)


@router.post("/signal", response_model=SignalResponse)
async def get_signal(payload: SignalRequest) -> SignalResponse:
    """Генерация торгового сигнала для Mini App. Каждый выданный сигнал пишется в ленту."""
    pair = payload.pair.strip().upper()
    duration = payload.duration.strip().lower()
    if pair not in _ALL_PAIRS:
        raise HTTPException(status_code=400, detail=f"Unknown pair: {payload.pair!r}")
    if duration not in DURATIONS:
        raise HTTPException(status_code=400, detail=f"Unknown duration: {payload.duration!r}")

    is_admin = settings.is_admin(payload.tg_id)
    if not is_admin:
        async with async_session_factory() as session:
            user = await crud.get_user(session, payload.tg_id)
        if user is None or not user.has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    # --- Режим стримера: принудительный сигнал или заранее заданная очередь ---
    if is_admin:
        if payload.force_dir is not None:
            direction = payload.force_dir
            accuracy = random.randint(settings.SIGNAL_ACCURACY_MIN, settings.SIGNAL_ACCURACY_MAX)
        else:
            async with async_session_factory() as session:
                queued = await crud.get_next_admin_signal(session, payload.tg_id)
            if queued is not None:
                direction, accuracy = queued.direction, queued.accuracy
            else:
                direction, accuracy = await _user_signal(pair)
    else:
        direction, accuracy = await _user_signal(pair)

    async with async_session_factory() as session:
        await crud.save_signal(
            session,
            tg_id=payload.tg_id,
            pair=pair,
            direction=direction,
            accuracy=accuracy,
            duration=duration,
        )
        await crud.register_activity(session, payload.tg_id)
        await crud.award_signal_points(session, payload.tg_id)
    return SignalResponse(direction=direction, accuracy=accuracy, pair=pair, duration=duration)


@router.get("/history", response_model=HistoryResponse)
async def get_history() -> HistoryResponse:
    """Живая лента последних сигналов + счётчики для Mini App.

    «Всего N трейдеров» возвращается только после преодоления порога
    TOTAL_COUNTER_THRESHOLD — чтобы не показывать маленькие числа.
    """
    async with async_session_factory() as session:
        signals = await crud.get_recent_signals(session, limit=6)
        today_traders = await crud.get_today_signal_users(session)
        total_users = await crud.get_total_users(session)

    def as_utc(value: datetime) -> datetime:
        # SQLite-диалект не сохраняет offset: читаем наивный UTC, помечаем явно
        return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)

    return HistoryResponse(
        signals=[
            HistoryItem(
                pair=item.pair,
                direction=item.direction,
                accuracy=item.accuracy,
                duration=item.duration,
                created_at=as_utc(item.created_at),
            )
            for item in signals
        ],
        today_traders=today_traders,
        total_traders=total_users if total_users >= settings.TOTAL_COUNTER_THRESHOLD else None,
    )


TOURNAMENT_RULES = {
    "ru": (
        "Баллы за активность: сигнал +1, первый заход дня +5, серия дней до +7; "
        "дневной лимит 27 баллов. Недельный цикл: сброс в понедельник. "
        "Правила прозрачны и не обещают финансовый результат."
    ),
    "en": (
        "Points for activity: signal +1, first daily visit +5, streak up to +7; "
        "daily cap 27 points. Weekly cycle: reset on Monday. "
        "Rules are transparent and promise no financial result."
    ),
}


@router.get("/me", response_model=MeResponse)
async def get_me(tg_id: int) -> MeResponse:
    """Личный прогресс пользователя + правила турнира (язык по Accept-Language)."""
    lang = "en"
    async with async_session_factory() as session:
        await crud.register_activity(session, tg_id)
        stats = await crud.get_personal_stats(session, tg_id)
        user = await crud.get_user(session, tg_id)
        if user is not None:
            lang = user.lang
    return MeResponse(rules=TOURNAMENT_RULES.get(lang, TOURNAMENT_RULES["en"]), **stats)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(tg_id: int | None = None) -> LeaderboardResponse:
    """Недельный топ-10; your_rank — место запросившего."""
    async with async_session_factory() as session:
        entries = await crud.get_leaderboard(session, limit=10)
        your_rank = await crud.get_week_rank(session, tg_id) if tg_id else None
    return LeaderboardResponse(
        week=crud._week_key(),
        entries=[LeaderboardEntry(**entry) for entry in entries],
        your_rank=your_rank,
    )
