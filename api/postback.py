"""Postback API Wink Trade: приём событий регистрации и депозита от Pocket Partners.

Эндпоинт ``/api/postback`` (GET и POST) защищён секретом ``POSTBACK_SECRET``.
Параметры принимаются из query string, формы или JSON-тела:

* ``event`` — ``reg`` / ``registration`` или ``dep`` / ``deposit``;
* ``tg_id`` — Telegram ID пользователя (синонимы: ``sub_id``, ``utm_source``);
* ``trader_id`` — ID аккаунта на Pocket Option;
* ``amount`` — сумма депозита в USD (для события ``dep``);
* ``token`` — секрет (или заголовок ``X-Postback-Token``).

Каждый запрос пишется в журнал ``postback_logs``. Доставка Telegram-уведомления
не влияет на результат: если пользователь заблокировал бота, постбек всё равно
считается обработанным (партнёрская сеть ждёт 200).
"""

from __future__ import annotations

import logging
import math
from typing import Any

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from bot.keyboards import access_keyboard, deposit_keyboard
from bot.locales import get_text
from config import settings
from database import async_session_factory
from database import crud
from database.models import EVENT_DEPOSIT, EVENT_REGISTRATION, STATUS_OK, STATUS_USER_NOT_FOUND, User

router = APIRouter()
logger = logging.getLogger(__name__)

_REG_EVENTS = {"reg", "registration", "register"}
_DEP_EVENTS = {"dep", "deposit", "redep"}


def _parse_event(raw: str | None) -> str | None:
    """Нормализует название события к константам БД или возвращает None."""
    if not raw:
        return None
    value = raw.strip().lower()
    if value in _REG_EVENTS:
        return EVENT_REGISTRATION
    if value in _DEP_EVENTS:
        return EVENT_DEPOSIT
    return None


def _extract_tg_id(params: dict[str, str]) -> int | None:
    """Telegram ID пользователя: sub_id1, click_id, af_sub1, sub_id, tg_id, utm_source."""
    raw = (
        params.get("sub_id1")
        or params.get("click_id")
        or params.get("af_sub1")
        or params.get("sub_id")
        or params.get("tg_id")
        or params.get("utm_source")
    )
    if raw is None:
        return None
    try:
        return int(str(raw).strip())
    except ValueError:
        return None


def _extract_trader_id(params: dict[str, str]) -> str | None:
    """ID аккаунта в Pocket Option: trader_id, uid, user_id, account_id."""
    raw = (
        params.get("trader_id")
        or params.get("uid")
        or params.get("user_id")
        or params.get("account_id")
    )
    if not raw:
        return None
    return str(raw).strip()


def _extract_amount(params: dict[str, str]) -> float:
    """Сумма депозита в USD: amount, sumdep, ftd_amount, payout."""
    raw = (
        params.get("amount")
        or params.get("sumdep")
        or params.get("ftd_amount")
        or params.get("payout")
        or "0.0"
    )
    try:
        val = float(raw)
        return val if math.isfinite(val) and val >= 0 else 0.0
    except (ValueError, TypeError):
        return 0.0


async def _collect_params(request: Request) -> dict[str, str]:
    """Собирает параметры из query string и тела POST (форма или JSON)."""
    params: dict[str, str] = dict(request.query_params)
    if request.method == "POST":
        content_type = request.headers.get("content-type", "")
        if content_type.startswith("application/json"):
            try:
                body: Any = await request.json()
            except ValueError:
                body = None
            if isinstance(body, dict):
                params.update({k: str(v) for k, v in body.items() if v is not None})
        else:
            try:
                form = await request.form()
            except Exception:  # multipart без python-multipart и прочий мусор
                form = {}
            params.update({k: str(v) for k, v in form.items()})
    return {k: v for k, v in params.items() if v != ""}


async def _notify_registered(bot: Bot, user: User) -> None:
    """Пуш о подтверждённой регистрации (на языке пользователя)."""
    try:
        await bot.send_message(
            user.tg_id,
            get_text(user.lang, "push_registered", trader_id=user.trader_id or "—"),
            reply_markup=deposit_keyboard(user.tg_id, user.lang),
        )
    except TelegramAPIError:
        logger.warning("Не доставлено уведомление о регистрации: tg_id=%s", user.tg_id)


async def _notify_access(bot: Bot, user: User) -> None:
    """Пуш об открытом доступе с кнопкой запуска Mini App."""
    try:
        await bot.send_message(
            user.tg_id,
            get_text(user.lang, "status_access_granted"),
            reply_markup=access_keyboard(user.lang),
        )
    except TelegramAPIError:
        logger.warning("Не доставлено уведомление о доступе: tg_id=%s", user.tg_id)


async def _process_postback(request: Request, params: dict[str, str]) -> JSONResponse:
    """Общая логика GET- и POST-постбеков."""
    if not settings.POSTBACK_SECRET:
        return JSONResponse(
            {"status": "error", "detail": "Postback secret is not configured"},
            status_code=403,
        )
    supplied = params.get("token") or request.headers.get("X-Postback-Token", "")
    if supplied != settings.POSTBACK_SECRET:
        return JSONResponse({"status": "error", "detail": "Invalid postback token"}, status_code=403)

    event = _parse_event(params.get("event"))
    if event is None:
        return JSONResponse(
            {"status": "error", "detail": "Unknown event, expected reg or dep"},
            status_code=400,
        )

    tg_id = _extract_tg_id(params)
    trader_id = _extract_trader_id(params)
    amount = _extract_amount(params)

    # Если tg_id не пришел, но есть trader_id — пробуем найти пользователя по trader_id
    if tg_id is None and trader_id is not None:
        async with async_session_factory() as session:
            existing_user = await crud.get_user_by_trader_id(session, trader_id)
            if existing_user is not None:
                tg_id = existing_user.tg_id

    bot: Bot | None = getattr(request.app.state, "bot", None)
    if bot is None:
        logger.warning("Telegram-бот отключён (токен?) — постбек применён в БД, пуш не отправлен")
    raw_data = {k: v for k, v in params.items() if k.lower() != "token"}

    # Если tg_id все еще нет — сохраняем в PostbackLog по trader_id (для ручной привязки)
    if tg_id is None:
        async with async_session_factory() as session:
            await crud.log_postback(
                session,
                event,
                trader_id=trader_id,
                sub_id=None,
                amount=amount,
                status=STATUS_USER_NOT_FOUND,
                raw_data=raw_data,
            )
        logger.info(
            "Постбек сохранен без sub_id1: event=%s, trader_id=%s, amount=%s (будет связан при ручном вводе ID)",
            event, trader_id, amount
        )
        return JSONResponse(
            {"status": "logged_waiting_user", "event": event, "trader_id": trader_id},
            status_code=200,
        )

    if event == EVENT_REGISTRATION:
        async with async_session_factory() as session:
            user = await crud.mark_registered(session, tg_id, trader_id)
            await crud.log_postback(
                session,
                event,
                trader_id=trader_id,
                sub_id=str(tg_id),
                amount=amount,
                status=STATUS_OK if user is not None else STATUS_USER_NOT_FOUND,
                raw_data=raw_data,
            )
        if user is None:
            return JSONResponse({"status": "user_not_found", "event": event})
        if bot is not None:
            await _notify_registered(bot, user)
        return JSONResponse(
            {"status": "ok", "event": event, "tg_id": tg_id, "trader_id": user.trader_id}
        )

    # Событие dep
    async with async_session_factory() as session:
        user = await crud.add_deposit(session, amount, tg_id=tg_id, trader_id=trader_id)
        if user is not None and not user.has_access:
            # Депозит всегда открывает доступ, даже если amount == 0
            user = await crud.grant_access(session, user.tg_id)
        await crud.log_postback(
            session,
            event,
            trader_id=trader_id,
            sub_id=str(tg_id),
            amount=amount,
            status=STATUS_OK if user is not None else STATUS_USER_NOT_FOUND,
            raw_data=raw_data,
        )
    if user is None:
        return JSONResponse({"status": "user_not_found", "event": event})
    if bot is not None:
        await _notify_access(bot, user)
    return JSONResponse(
        {
            "status": "ok",
            "event": event,
            "tg_id": tg_id,
            "deposit_amount": user.deposit_amount,
            "has_access": user.has_access,
        }
    )


@router.get("/postback")
async def postback_get(request: Request) -> JSONResponse:
    """GET-постбек: все параметры в query string."""
    return await _process_postback(request, dict(request.query_params))


@router.post("/postback")
async def postback_post(request: Request) -> JSONResponse:
    """POST-постбек: параметры в query string, форме или JSON-теле."""
    params = await _collect_params(request)
    return await _process_postback(request, params)
