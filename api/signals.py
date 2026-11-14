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
from typing import Any, Literal

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from config import settings
from database import async_session_factory, write_transaction
from database import crud
from database.models import DIRECTION_BUY, DIRECTION_SELL, SignalHistory, LiveStats
from api.auth import verify_webapp_init_data, telegram_identity, internal_publisher, require_publisher
from database.signal_access import reserve_signal, release_signal, commit_signal

router = APIRouter()
logger = logging.getLogger(__name__)

# Пары и экспирации из SPEC (раздел 5)
CLASS_PAIRS_TUPLE = ("EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD")
OTC_PAIRS = (
    "AUD/USD OTC",
    "AUD/CHF OTC",
    "EUR/USD OTC",
    "GBP/USD OTC",
    "USD/JPY OTC",
    "USD/CAD OTC",
    "AUD/CAD OTC",
    "MAD/USD OTC",
    "EUR/GBP OTC",
    "USD/CHF OTC",
    "NZD/USD OTC",
    "BTC/USD OTC",
    "ETH/USD OTC",
    "SOL/USD OTC",
    "GOLD OTC",
    "SILVER OTC",
    "BRENT OTC",
    "APPLE OTC",
    "TESLA OTC",
    "MICROSOFT OTC",
    "AMAZON OTC",
    "SP500 OTC",
    "NDX100 OTC",
    "DJI30 OTC",
)
DURATIONS = ("5s", "10s", "15s", "30s", "1m", "2m", "3m", "5m")
DURATION_SECONDS: dict[str, int] = {
    "5s": 5,
    "10s": 10,
    "15s": 15,
    "30s": 30,
    "1m": 60,
    "2m": 120,
    "3m": 180,
    "5m": 300,
}
_ALL_PAIRS = frozenset(CLASS_PAIRS_TUPLE + OTC_PAIRS)


def _is_known_pair(p: str) -> bool:
    up = p.upper()
    if up in _ALL_PAIRS:
        return True
    if "OTC" in up or "/" in up:
        return True
    return False


# Пул профессиональных трейдерских факторов (технический анализ и объёмы)
RATIONALE_BUY = [
    {
        "ru": "📌 Картина графика: Цена упёрлась в сильный нижний уровень — продавцы выдохлись",
        "en": "📌 Chart structure: Price rejected off strong support floor — seller exhaustion",
    },
    {
        "ru": "🎯 Логика входа: Ждём уверенный отскок наверх по основному тренду",
        "en": "🎯 Trade entry: Clean bounce upward aligned with primary trend",
    },
    {
        "ru": "Подтверждение: отскок от локального динамического уровня поддержки",
        "en": "Confirmation: bounce off local dynamic support level",
    },
    {
        "ru": "Скользящие средние: бычье подтверждение импульса выше поддержки",
        "en": "Moving Averages: bullish momentum confirmed above key support",
    },
    {
        "ru": "Анализ объёмов: всплеск дельты покупателей на младшем таймфрейме",
        "en": "Volume Analysis: buyer delta surge on lower timeframe",
    },
    {
        "ru": "Паттерн: поглощение на границе нижней полосы Боллинджера",
        "en": "Pattern: bullish engulfing at lower Bollinger Band",
    },
    {
        "ru": "Индикатор MACD: конвергенция гистограммы в положительной зоне",
        "en": "MACD: histogram convergence in positive territory",
    },
    {
        "ru": "Книга ордеров: доминирование ликвидности в сторону покупок",
        "en": "Order Book: liquidity imbalance tilted strongly toward bids",
    },
    {
        "ru": "Gemini Argon: динамический отскок от институционального уровня поддержки",
        "en": "Gemini Argon: clean bounce from primary institutional support level",
    },
    {
        "ru": "GPT-5 Luna: сверхбыстрый бычий импульс на младшем тиковом потоке",
        "en": "GPT-5 Luna: rapid bullish impulse burst across tick flow",
    },
    {
        "ru": "Claude Fable 5.1: свечная структура подтверждает поглощение продавцов",
        "en": "Claude Fable 5.1: candlestick psychology confirms complete seller exhaustion",
    },
    {
        "ru": "GPT-5 Astra: графический паттерн завершён, фаза продолжения восходящего тренда",
        "en": "GPT-5 Astra: pattern completion confirmed, entering bullish expansion phase",
    },
    {
        "ru": "📌 Картина графика: Мощный пробой сопротивления вверх, покупатели доминируют",
        "en": "📌 Chart structure: Strong resistance breakout upward, buyers dominating",
    },
    {
        "ru": "🎯 Логика входа: Входим вверх по восходящему импульсу вслед за крупными покупками",
        "en": "🎯 Trade entry: Entering UP following primary breakout momentum",
    },
    {
        "ru": "📌 Картина графика: Окончание коррекции в растущем тренде, откат выкуплен",
        "en": "📌 Chart structure: Pullback completed in an uptrend, dip firmly bought up",
    },
    {
        "ru": "🎯 Логика входа: Заходим вверх на откате по основному восходящему тренду",
        "en": "🎯 Trade entry: Entering UP on the dip following the primary uptrend",
    },
]

RATIONALE_SELL = [
    {
        "ru": "📌 Картина графика: Цена ударилась в потолок сопротивления — рост остановился",
        "en": "📌 Chart structure: Price hit resistance ceiling — upward momentum stalled",
    },
    {
        "ru": "🎯 Логика входа: Заходим на откате вниз вместе с крупными продавцами",
        "en": "🎯 Trade entry: Clean rejection downward following institutional sellers",
    },
    {
        "ru": "Подтверждение: резкий отскок от локального уровня сопротивления",
        "en": "Confirmation: sharp rejection from local resistance level",
    },
    {
        "ru": "Скользящие средние: медвежье подтверждение импульса ниже сопротивления",
        "en": "Moving Averages: bearish momentum confirmed below resistance",
    },
    {
        "ru": "Анализ объёмов: давление институционального предложения на дельте",
        "en": "Volume Analysis: institutional supply pressure on volume delta",
    },
    {
        "ru": "Паттерн: ложный пробой максимума с закрытием пин-баром",
        "en": "Pattern: false breakout of high with pin bar rejection",
    },
    {
        "ru": "Индикатор MACD: дивергенция сигнальной линии в сторону снижения",
        "en": "MACD: signal line bearish divergence confirmed",
    },
    {
        "ru": "Книга ордеров: концентрация плотных лимитных заявок на продажу",
        "en": "Order Book: heavy ask cluster capping upside movement",
    },
    {
        "ru": "Gemini Argon: отскок от сильного динамического уровня сопротивления",
        "en": "Gemini Argon: rejection from strong dynamic resistance level",
    },
    {
        "ru": "GPT-5 Luna: затухание восходящего тика и резкий разворот вниз",
        "en": "GPT-5 Luna: upward micro-tick exhaustion and immediate downward reversal",
    },
    {
        "ru": "Claude Fable 5.1: свечной паттерн ложного пробоя и фиксация прибыли",
        "en": "Claude Fable 5.1: false breakout rejection with heavy profit taking",
    },
    {
        "ru": "GPT-5 Astra: графический разворотный паттерн двойная вершина подтверждён",
        "en": "GPT-5 Astra: double top reversal pattern completed on chart",
    },
    {
        "ru": "📌 Картина графика: Пробой уровня поддержки вниз, сильное безоткатное движение",
        "en": "📌 Chart structure: Support floor breakdown with strong unidirectional momentum",
    },
    {
        "ru": "🎯 Логика входа: Входим вниз по тренду пробоя — не ловим падающий нож!",
        "en": "🎯 Trade entry: Entering DOWN on trend breakout — never catch a falling knife!",
    },
    {
        "ru": "📌 Картина графика: Слабая попытка отката захлебнулась, медведи давят рынок",
        "en": "📌 Chart structure: Weak relief rally collapsed, bears pushing back to lows",
    },
    {
        "ru": "🎯 Логика входа: Заходим вниз на откате по основному нисходящему тренду",
        "en": "🎯 Trade entry: Entering DOWN on the pullback aligned with dominant downtrend",
    },
]


def _build_rationale(pair: str, direction: str, model: str = "claude-fable-5.1", now: float | None = None) -> tuple[list[str], list[str]]:
    """Детерминированная выборка 2-3 факторов теханализа под сигнал с учётом модели."""
    moment = int((now if now is not None else time.time()) // 5)
    digest = hashlib.sha256(f"{pair}:{direction}:{model}:{moment}".encode()).digest()
    pool = RATIONALE_BUY if direction == DIRECTION_BUY else RATIONALE_SELL

    model_factor_idx: int | None = None
    if "argon" in model:
        model_factor_idx = 8
    elif "luna" in model:
        model_factor_idx = 9
    elif "fable" in model:
        model_factor_idx = 10
    elif "astra" in model:
        model_factor_idx = 11

    count = 2 if digest[0] % 3 == 0 else 3
    indices: list[int] = []
    if model_factor_idx is not None and model_factor_idx < len(pool):
        indices.append(model_factor_idx)

    offset = 1
    while len(indices) < count and offset < len(digest):
        idx = digest[offset] % len(pool)
        if idx not in indices:
            indices.append(idx)
        offset += 1
    ru_list = [f"• {pool[i]['ru']}" for i in indices]
    en_list = [f"• {pool[i]['en']}" for i in indices]
    return ru_list, en_list

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
    """Запрос Mini App или Chrome расширения: tg_id, пара и экспирация."""

    tg_id: int = 0
    pair: str = "AUD/CAD OTC"
    duration: str = "30s"
    force_dir: Literal["BUY", "SELL"] | None = None
    model: str = "claude-fable-5.1"
    init_data: str | None = None


class SignalResponse(BaseModel):
    direction: Literal["BUY", "SELL"]
    accuracy: int = Field(ge=1, le=100)
    pair: str
    duration: str
    model: str = "claude-fable-5.1"
    confluence: float = 4.8
    family: str = "TREND_PULLBACK"
    rationale_ru: list[str] = Field(default_factory=list)
    rationale_en: list[str] = Field(default_factory=list)
    entry_delay_sec: int = 3
    duration_sec: int = 5
    is_vip: bool = False
    free_signals_left: int = 0
    register_url: str = ""
    deposit_url: str = ""
    promo_code: str = "50START"
    # Tactical Sniper Fields
    signal_strength: int = 78
    strength_verdict_ru: str = "сильный сигнал"
    strength_verdict_en: str = "strong signal"
    entry_window_sec: int = 12
    recommended_expiry: str = "30s"
    move_percent: float = 0.019
    move_window_sec: int = 30
    move_to_noise: float = 3.4
    horizons_agreeing: str = "5 из 5"
    voice_phrase_ru: str = ""
    voice_phrase_en: str = ""


class LiveStatsRequest(BaseModel):
    wins: int | None = Field(default=None, ge=0, le=1000000000)
    losses: int | None = Field(default=None, ge=0, le=1000000000)
    pair: str | None = None
    reset: bool = False


class LiveStatsResponse(BaseModel):
    wins: int
    losses: int
    winrate: str
    pair: str


# Синхронизированный сигнал со стрима (расширение -> сервер -> Mini App)
_latest_synced_signal: dict[str, Any] | None = None


class SignalSyncRequest(BaseModel):
    pair: str
    direction: Literal["BUY", "SELL"]
    accuracy: int = Field(default=94, ge=1, le=100)
    duration: str = "30s"
    confluence: float = Field(default=4.8, ge=0, le=5)
    rationale_ru: list[str] = Field(default_factory=list)
    rationale_en: list[str] = Field(default_factory=list)
    model: str = "claude-fable-5.1"


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
    is_vip: bool = False
    is_admin: bool = False
    free_signals_left: int = 0
    register_url: str = ""
    deposit_url: str = ""
    promo_code: str = "50START"


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
async def get_signal(
    payload: SignalRequest,
    request: Request,
    x_telegram_init_data: str | None = Header(default=None, alias="X-Telegram-Init-Data"),
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> SignalResponse:
    """Генерация торгового сигнала для Mini App. Каждый выданный сигнал пишется в ленту."""
    pair = payload.pair.strip()
    duration = payload.duration.strip().lower()
    if not _is_known_pair(pair):
        raise HTTPException(status_code=400, detail=f"Unknown pair: {payload.pair!r}")
    if duration not in DURATIONS:
        raise HTTPException(status_code=400, detail=f"Unknown duration: {payload.duration!r}")

    if internal_publisher(request) and not (x_telegram_init_data or payload.init_data):
        if not settings.is_admin(payload.tg_id):
            raise HTTPException(403, "ADMIN_REQUIRED")
    else:
        payload.tg_id = telegram_identity(request, x_telegram_init_data or payload.init_data)
    user, is_vip, lease = await reserve_signal(payload.tg_id)
    is_admin = settings.is_admin(payload.tg_id)
    free_signals_left = 999 if is_vip else 0

    try:
        # --- Режим стримера: принудительный сигнал или заранее заданная очередь ---
        synced_rationale_ru: list[str] | None = None
        synced_rationale_en: list[str] | None = None

        if _latest_synced_signal is not None and time.time() < _latest_synced_signal.get("expires_at", 0):
            if _latest_synced_signal.get("pair") == pair:
                direction = _latest_synced_signal["direction"]
                accuracy = _latest_synced_signal["accuracy"]
                if _latest_synced_signal.get("rationale_ru"):
                    synced_rationale_ru = _latest_synced_signal["rationale_ru"]
                if _latest_synced_signal.get("rationale_en"):
                    synced_rationale_en = _latest_synced_signal["rationale_en"]
            elif is_admin and payload.force_dir is not None:
                direction = payload.force_dir
                accuracy = random.randint(settings.SIGNAL_ACCURACY_MIN, settings.SIGNAL_ACCURACY_MAX)
            else:
                direction, accuracy = await _user_signal(pair)
        elif is_admin:
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

        # Генерация реалистичного профессионального теханализа под сигнал
        if synced_rationale_ru and synced_rationale_en:
            rationale_ru, rationale_en = synced_rationale_ru, synced_rationale_en
        else:
            rationale_ru, rationale_en = _build_rationale(pair, direction, model=payload.model or "claude-fable-5.1")
        duration_sec = DURATION_SECONDS.get(duration, 5)

        free_signals_left = await commit_signal(
            tg_id=payload.tg_id, lease=lease, pair=pair, direction=direction,
            accuracy=accuracy, duration=duration,
        )
        if is_vip:
            free_signals_left = 999
    finally:
        await asyncio.shield(release_signal(lease))

    user_lang = "ru"
    if user is not None and user.lang:
        user_lang = user.lang

    # Тактические снайперские параметры телеметрии
    seed_hash = hashlib.sha256(f"{pair}:{direction}:{int(time.time() // 10)}".encode()).digest()
    families = ("TREND_PULLBACK", "BREAKOUT_RETEST", "RANGE_REJECTION", "LOCAL_REVERSAL")
    family = families[seed_hash[3] % len(families)]
    confluence = round(4.5 + (seed_hash[4] % 6) * 0.1, 1)
    signal_strength = max(68, min(94, int(accuracy * 0.82 + (seed_hash[0] % 12))))
    strength_verdict_ru = "сильный сигнал" if signal_strength >= 65 else "на границе шума"
    strength_verdict_en = "strong signal" if signal_strength >= 65 else "edge of noise"
    entry_window_sec = 12 if duration in ("5s", "10s", "15s", "30s") else 40
    move_percent = round(0.012 + (seed_hash[1] % 15) * 0.001, 3)
    move_to_noise = round(2.8 + (seed_hash[2] % 12) * 0.1, 1)
    horizons_agreeing_ru = "5 из 5" if accuracy >= 93 else "4 из 5"
    horizons_agreeing_en = "5 of 5" if accuracy >= 93 else "4 of 5"

    clean_pair_ru = pair.replace(" OTC", " на ОТС").replace("/", " ")
    if direction == "BUY":
        voice_phrase_ru = f"По {clean_pair_ru} отличная точка входа! Продавцы выдохлись у уровня поддержки, заходим ВВЕРХ на {duration}!"
        voice_phrase_en = f"Great entry on {pair}! Support floor holding strong, taking BUY for {duration}!"
    else:
        voice_phrase_ru = f"На графике {clean_pair_ru} цена упёрлась в потолок сопротивления! Заходим ВНИЗ на {duration} на уверенном откате!"
        voice_phrase_en = f"Resistance hit on {pair}! Selling pressure confirmed, taking SELL for {duration}!"

    return SignalResponse(
        direction=direction,
        accuracy=accuracy,
        pair=pair,
        duration=duration,
        model=payload.model or "claude-fable-5.1",
        confluence=confluence,
        family=family,
        rationale_ru=rationale_ru,
        rationale_en=rationale_en,
        entry_delay_sec=3,
        duration_sec=duration_sec,
        is_vip=is_vip,
        free_signals_left=free_signals_left,
        register_url=settings.partner_url(payload.tg_id, user_lang),
        deposit_url=settings.deposit_url(payload.tg_id, user_lang),
        promo_code=settings.PROMO_CODE,
        signal_strength=signal_strength,
        strength_verdict_ru=strength_verdict_ru,
        strength_verdict_en=strength_verdict_en,
        entry_window_sec=entry_window_sec,
        recommended_expiry=duration,
        move_percent=move_percent,
        move_window_sec=30,
        move_to_noise=move_to_noise,
        horizons_agreeing=horizons_agreeing_ru if user_lang == "ru" else horizons_agreeing_en,
        voice_phrase_ru=voice_phrase_ru,
        voice_phrase_en=voice_phrase_en,
    )


@router.post("/signal/sync")
async def sync_stream_signal(payload: SignalSyncRequest, request: Request) -> dict[str, Any]:
    """Синхронизация активного сигнала со стрима Pocket Option."""
    require_publisher(request)
    if not _is_known_pair(payload.pair.strip()) or payload.duration.lower() not in DURATIONS:
        raise HTTPException(400, "Invalid pair or duration")
    global _latest_synced_signal
    duration_sec = DURATION_SECONDS.get(payload.duration.lower(), 30)
    now = time.time()
    _latest_synced_signal = {
        "pair": payload.pair.strip(),
        "direction": payload.direction,
        "accuracy": payload.accuracy,
        "confluence": payload.confluence,
        "duration": payload.duration,
        "model": payload.model,
        "rationale_ru": payload.rationale_ru,
        "rationale_en": payload.rationale_en,
        "created_at": now,
        "expires_at": now + duration_sec + 5,
    }
    logger.info("Синхронизирован сигнал со стрима: %s %s (%s)", payload.pair, payload.direction, payload.duration)
    return {"ok": True, "expires_at": _latest_synced_signal["expires_at"]}


@router.get("/signal/sync")
async def get_synced_stream_signal(request: Request) -> dict[str, Any]:
    """Получение текущего активного сигнала со стрима (если валиден)."""
    tg_id = telegram_identity(request)
    async with async_session_factory() as session:
        user = await crud.get_user(session, tg_id)
        if not settings.is_admin(tg_id) and not (user and user.has_access):
            raise HTTPException(403, "DEPOSIT_REQUIRED")
    global _latest_synced_signal
    if _latest_synced_signal is not None and time.time() < _latest_synced_signal.get("expires_at", 0):
        remaining = int(_latest_synced_signal["expires_at"] - time.time())
        return {"active": True, "signal": _latest_synced_signal, "remaining_sec": remaining}
    return {"active": False, "signal": None}


@router.get("/history", response_model=HistoryResponse)
async def get_history(request: Request) -> HistoryResponse:
    """Живая лента последних сигналов + счётчики для Mini App.

    «Всего N трейдеров» возвращается только после преодоления порога
    TOTAL_COUNTER_THRESHOLD — чтобы не показывать маленькие числа.
    """
    tg_id = telegram_identity(request)
    async with async_session_factory() as session:
        user = await crud.get_user(session, tg_id)
        query = select(SignalHistory).order_by(SignalHistory.id.desc()).limit(6)
        if not settings.is_admin(tg_id) and not (user and user.has_access):
            query = query.where(SignalHistory.tg_id == tg_id)
        signals = list((await session.scalars(query)).all())
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
async def get_me(request: Request, tg_id: int | None = None) -> MeResponse:
    """Личный прогресс пользователя + правила турнира (язык по Accept-Language)."""
    tg_id = telegram_identity(request)
    lang = "en"
    async with async_session_factory() as session:
        user = await crud.get_or_create_user(session, tg_id=tg_id)
        stats = await crud.get_personal_stats(session, tg_id)
        if user is not None:
            lang = user.lang

        is_admin = settings.is_admin(tg_id)
        is_vip = is_admin or bool(user.has_access)
        if is_vip:
            free_signals_left = 999
        else:
            used = stats.get("total_signals")
            if used is None:
                used = await session.scalar(
                    select(func.count()).select_from(SignalHistory).where(SignalHistory.tg_id == tg_id)
                ) or 0
            free_signals_left = max(0, 3 - used)

    return MeResponse(
        rules=TOURNAMENT_RULES.get(lang, TOURNAMENT_RULES["en"]),
        is_vip=is_vip,
        free_signals_left=free_signals_left,
        register_url=settings.partner_url(tg_id, lang),
        is_admin=is_admin,
        deposit_url=settings.deposit_url(tg_id, lang),
        promo_code=settings.PROMO_CODE,
        **stats,
    )


@router.post("/activity")
async def register_visit(request: Request) -> dict:
    tg_id = telegram_identity(request)
    async with async_session_factory() as session:
        await crud.get_or_create_user(session, tg_id)
        await session.commit()
        async with write_transaction(session):
            return await crud.register_activity(session, tg_id, commit=False)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(request: Request, tg_id: int | None = None) -> LeaderboardResponse:
    """Недельный топ-10; your_rank — место запросившего."""
    if tg_id is not None:
        tg_id = telegram_identity(request)
    async with async_session_factory() as session:
        entries = await crud.get_leaderboard(session, limit=10)
        your_rank = await crud.get_week_rank(session, tg_id) if tg_id else None
    return LeaderboardResponse(
        week=crud._week_key(),
        entries=[LeaderboardEntry(**entry) for entry in entries],
        your_rank=your_rank,
    )


def _stats_response(state: LiveStats | None) -> LiveStatsResponse:
    wins, losses = (state.wins, state.losses) if state else (0, 0)
    total = wins + losses
    return LiveStatsResponse(wins=wins, losses=losses,
                            winrate=f"{wins / total * 100:.1f}%" if total else "0.0%",
                            pair=state.pair if state else "EUR/USD OTC")


@router.get("/live_stats", response_model=LiveStatsResponse)
async def get_live_stats() -> LiveStatsResponse:
    async with async_session_factory() as session:
        return _stats_response(await session.get(LiveStats, 1))


@router.post("/live_stats", response_model=LiveStatsResponse)
async def update_live_stats(payload: LiveStatsRequest, request: Request) -> LiveStatsResponse:
    require_publisher(request)
    async with async_session_factory() as session:
        async with write_transaction(session):
            state = await session.get(LiveStats, 1)
            if state is None:
                state = LiveStats(id=1, wins=0, losses=0, pair="EUR/USD OTC")
                session.add(state)
            if payload.reset:
                state.wins, state.losses = 0, 0
            else:
                if payload.wins is not None:
                    state.wins = payload.wins
                if payload.losses is not None:
                    state.losses = payload.losses
            if payload.pair:
                if not _is_known_pair(payload.pair):
                    raise HTTPException(400, "Invalid pair")
                state.pair = payload.pair
            return _stats_response(state)
