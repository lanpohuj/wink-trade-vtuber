"""Read-only narration policy. Never produces signals or changes a trade."""

from __future__ import annotations
import math
import time


def seconds(value):
    try:
        n = float(value)
        return n / 1000 if n > 1e11 else n
    except (TypeError, ValueError):
        return 0.0


def context_valid(context, received_at, now=None):
    now = time.time() if now is None else now
    return context.get("auto_stream") is True and 0 <= now - received_at <= 3


def narration_valid(event, context, phase, received_at, now=None):
    now = time.time() if now is None else now
    if not context_valid(context, received_at, now):
        return False
    if event.get("session_id") != context.get("session_id") or event.get(
        "lang"
    ) != context.get("lang", "ru"):
        return False
    if event.get('data_status') == 'NO_DATA' and context.get('data_status') != 'NO_DATA':
        return False
    if event.get("category") == "NARRATE_VOLATILITY":
        if (
            context.get("high_volatility") is not True
            or not 0 <= now - seconds(event.get("market_observed_at")) <= 3
        ):
            return False
    scope = event.get("commentary_scope")
    if scope == "search":
        return (
            phase == "ANALYZING"
            and event.get("search_generation") == context.get("search_generation")
            and (
                event.get("category") == "NARRATE_SCAN"
                or event.get("pair") == context.get("pair")
            )
        )
    if scope == "trade":
        return (
            phase == "IN_TRADE"
            and event.get("trade_seq") == context.get("trade_seq")
            and event.get("pair") == context.get("pair")
        )
    if scope == "result":
        return (
            phase in ("RESULT", "COOLDOWN", "IDLE", "ANALYZING")
            and context.get("last_result", {}).get("outcome") == "LOSS"
            and event.get("result_seq") == context.get("last_result", {}).get("seq")
            and event.get("next_stake") == context.get("next_stake")
        )
    return phase in ("IDLE", "ANALYZING", "IN_TRADE", "COOLDOWN")


def choices(context, phase, now=None):
    """Optional episode beats, never automatic lessons or repeated waiting lines."""
    session = context.get('session_id', '')
    lang = context.get('lang', 'ru')
    if phase == 'ANALYZING':
        episode = f"{session}:{lang}:search:{context.get('search_generation')}"
        yield 'NARRATE_SCAN', episode, 'search', {'purpose': 'search_interest'}, 90
    if phase == 'IN_TRADE' and context.get('open_observed') is True:
        current_time = time.time() if now is None else now
        remaining = context.get('remaining_sec')
        volatility = (context.get('high_volatility') is True
                      and 0 <= current_time - seconds(context.get('market_observed_at')) <= 3)
        closing = isinstance(remaining, (int, float)) and not isinstance(remaining, bool) and 3 <= remaining <= 5
        if volatility or closing:
            moment = f"{session}:{lang}:moment:{context.get('trade_seq')}"
            yield 'NARRATE_MOMENT', moment, 'trade', {'purpose': 'observation'}, 0
        episode = f"{session}:{lang}:hook:{context.get('trade_seq')}"
        yield 'NARRATE_ENGAGE', episode, 'trade', {'purpose': 'moment_question'}, 120
