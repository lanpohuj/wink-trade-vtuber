"""Shared Telegram identity and separate, server-only publisher credentials."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from fastapi import HTTPException, Request

from config import settings


def verify_webapp_init_data(init_data: str, bot_token: str) -> dict | None:
    if not init_data or not bot_token or len(init_data) > 16384:
        return None
    try:
        pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=True)
        if len(dict(pairs)) != len(pairs):
            return None
        data = dict(pairs)
        received = data.pop("hash", "")
        key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        check = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        expected = hmac.new(key, check.encode(), hashlib.sha256).hexdigest()
        if not received or not hmac.compare_digest(expected, received):
            return None
        auth_date = int(data["auth_date"])
        age = time.time() - auth_date
        if age < -30 or age > settings.WEBAPP_AUTH_MAX_AGE_SECONDS:
            return None
        user = json.loads(data["user"])
        if not isinstance(user, dict) or type(user.get("id")) is not int:
            return None
        if not 0 < user["id"] < 2**52:
            return None
        return user
    except (KeyError, ValueError, TypeError):
        return None


def internal_publisher(request: Request) -> bool:
    supplied = request.headers.get("X-Internal-Token", "")
    return bool(settings.INTERNAL_API_TOKEN and supplied and hmac.compare_digest(
        supplied, settings.INTERNAL_API_TOKEN
    ))


def telegram_identity(request: Request, init_data: str | None = None) -> int:
    data = request.headers.get("X-Telegram-Init-Data") or init_data or ""
    user = verify_webapp_init_data(data, settings.BOT_TOKEN)
    if user is None:
        raise HTTPException(401, "UNAUTHORIZED_WEBAPP: Reopen the app in Telegram")
    return user["id"]


def require_publisher(request: Request) -> None:
    if internal_publisher(request):
        return
    if not settings.is_admin(telegram_identity(request)):
        raise HTTPException(403, "ADMIN_REQUIRED")
