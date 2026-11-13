"""Authenticated Pocket Partners receipts, applied exactly once in a DB transaction."""
from __future__ import annotations

import hashlib
import hmac
import json
import math
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from config import settings
from database import async_session_factory, crud
from database.funnel import amount_cents, apply_partner_event
from database.models import EVENT_DEPOSIT, EVENT_REGISTRATION

router = APIRouter()
_REG_EVENTS = {"reg", "registration", "register"}
_DEP_EVENTS = {"dep", "deposit", "redep"}


def _parse_event(raw: str | None) -> str | None:
    value = (raw or "").strip().lower()
    return EVENT_REGISTRATION if value in _REG_EVENTS else EVENT_DEPOSIT if value in _DEP_EVENTS else None


def _extract_tg_id(params: dict[str, str]) -> int | None:
    explicit = []
    for name in ("sub_id1", "tg_id", "sub_id", "af_sub1"):
        try:
            value = int(params.get(name, ""))
            if value > 0:
                explicit.append(value)
        except ValueError:
            pass
    if len(set(explicit)) > 1:
        raise HTTPException(400, "Conflicting attribution identifiers")
    for name in ("sub_id1", "tg_id", "sub_id", "click_id", "af_sub1", "utm_source"):
        raw = params.get(name)
        if not raw:
            continue
        try:
            value = int(raw.strip())
            if 0 < value < 2**52:
                return value
        except ValueError:
            pass
    return None


def _extract_trader_id(params: dict[str, str]) -> str | None:
    value = next((params[k].strip() for k in ("trader_id", "uid", "user_id", "account_id") if params.get(k)), None)
    if value and (len(value) > 64 or any(c in value for c in "{}<>")):
        raise HTTPException(400, "Invalid trader_id")
    return value


def _extract_amount(params: dict[str, str]) -> float | None:
    raw = next((params[k] for k in ("amount", "sumdep", "ftd_amount", "payout") if params.get(k)), None)
    try:
        value = float(raw)
        return value if math.isfinite(value) else None
    except (ValueError, TypeError):
        return None


def _extract_tx_id(params: dict[str, str]) -> str | None:
    # click_id identifies a click/person, never a payment.
    return next((params[k].strip() for k in (
        "tx_id", "transaction_id", "deposit_id", "payment_id", "order_id", "event_id",
    ) if params.get(k)), None)


def _build_dedup_key(event: str, trader_id: str | None, tg_id: int | None,
                     amount: float | None, params: dict[str, str]) -> str:
    tx_id = _extract_tx_id(params)
    if tx_id:
        identity = [event, "transaction", tx_id]
    elif event == EVENT_REGISTRATION:
        identity = [event, trader_id or str(tg_id)]
    else:
        # Pocket Partners exposes date_time rather than a transaction ID.
        timestamp = params.get("event_time") or params.get("date_time")
        if not timestamp or any(c in timestamp for c in "{}"):
            raise ValueError("missing_event_identity")
        identity = [event, trader_id or str(tg_id), timestamp.strip(),
                    amount_cents(amount), params.get("deposit_kind", "deposit").lower()]
    return f"{event}:" + hashlib.sha256(json.dumps(identity, separators=(",", ":")).encode()).hexdigest()


async def _collect_params(request: Request) -> dict[str, str]:
    if len(await request.body()) > 16384:
        raise HTTPException(413, "Postback too large")
    params = dict(request.query_params)
    if request.method == "POST":
        if request.headers.get("content-type", "").startswith("application/json"):
            try:
                body: Any = await request.json()
            except ValueError:
                raise HTTPException(400, "Invalid JSON")
            if not isinstance(body, dict):
                raise HTTPException(400, "Expected a JSON object")
            params.update({str(k): str(v) for k, v in body.items() if v is not None})
        else:
            try:
                form = await request.form()
            except Exception:
                raise HTTPException(400, "Invalid form")
            params.update({str(k): str(v) for k, v in form.items()})
    return {k.lower(): v for k, v in params.items() if v != ""}


async def _process_postback(request: Request, params: dict[str, str]) -> JSONResponse:
    supplied = params.get("token") or request.headers.get("X-Postback-Token", "")
    if not settings.POSTBACK_SECRET or not supplied or not hmac.compare_digest(supplied, settings.POSTBACK_SECRET):
        return JSONResponse({"status": "error", "detail": "Invalid postback token"}, status_code=403)
    event = _parse_event(params.get("event"))
    if event is None:
        return JSONResponse({"status": "error", "detail": "Unknown event"}, status_code=400)
    tg_id, trader_id = _extract_tg_id(params), _extract_trader_id(params)
    amount = _extract_amount(params)
    cents = amount_cents(amount) if event == EVENT_DEPOSIT else 0
    raw = {k: v for k, v in params.items() if k not in ("token", "sig", "sign", "secret", "authorization")}
    reason = "invalid_amount" if cents is None else None
    try:
        key = _build_dedup_key(event, trader_id, tg_id, amount, params) if reason is None else None
    except ValueError:
        key, reason = None, "missing_event_identity"
    if reason:
        async with async_session_factory() as session:
            await crud.log_postback(session, event, trader_id=trader_id,
                                    sub_id=str(tg_id) if tg_id else None, status=reason, raw_data=raw)
        return JSONResponse({"status": "ignored", "reason": reason})
    async with async_session_factory() as session:
        receipt = await apply_partner_event(
            session, key=key, event_type=event, tg_id=tg_id,
            trader_id=trader_id, cents=cents, raw_data=raw,
        )
    bot = getattr(request.app.state, "bot", None)
    if bot is not None and receipt.user is not None:
        from bot.notifications import deliver_pending_notifications
        await deliver_pending_notifications(bot, tg_id=receipt.user.tg_id if receipt.user else None, limit=2)
    data = {"status": receipt.status, "event": event}
    if receipt.user is not None:
        data.update(tg_id=receipt.user.tg_id, deposit_amount=receipt.user.deposit_amount,
                    has_access=receipt.user.has_access, min_deposit=settings.MIN_DEPOSIT)
    return JSONResponse(data)


@router.get("/postback")
async def postback_get(request: Request) -> JSONResponse:
    return await _process_postback(request, {k.lower(): v for k, v in request.query_params.items()})


@router.post("/postback")
async def postback_post(request: Request) -> JSONResponse:
    return await _process_postback(request, await _collect_params(request))
