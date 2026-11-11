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
    scope = event.get("commentary_scope")
    if scope == "search":
        return phase == "ANALYZING" and event.get("search_generation") == context.get(
            "search_generation"
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
    """Ordered choices with semantic keys; no freshly invented market facts."""
    now = time.time() if now is None else now
    seq = context.get("trade_seq")
    result = context.get("last_result") or {}
    if (
        result.get("outcome") == "LOSS"
        and now - seconds(result.get("closed_at")) <= 30
        and phase != "IN_TRADE"
    ):
        stake = context.get("next_stake")
        kind = (
            "LOSS_110"
            if stake == 110
            else "LOSS_242"
            if stake == 242
            else "LOSS_RESET"
            if stake == 50 and result.get("previous_step") == 2
            else "LOSS_GENERIC"
        )
        yield (
            "NARRATE_RESULT",
            f"result:{result.get('seq')}",
            "result",
            {"result_kind": kind, "result_seq": result.get("seq"), "next_stake": stake},
            0,
        )
        if result.get("near_loss_verified") is True:
            yield (
                "NARRATE_RESULT",
                f"near:{result.get('seq')}",
                "result",
                {
                    "result_kind": "NEAR_LOSS",
                    "result_seq": result.get("seq"),
                    "next_stake": stake,
                },
                0,
            )
    if phase == "IN_TRADE" and context.get("open_observed") is True:
        yield (
            "NARRATE_EXPIRY",
            f"expiry:{seq}",
            "trade",
            {"expiry": context.get("duration")},
            0,
        )
        yield "NARRATE_TRADE", "trade_wait", "trade", {}, 15
    if phase == "ANALYZING":
        if (
            context.get("pair_changed_at")
            and 0 <= now - seconds(context["pair_changed_at"]) <= 8
        ):
            yield (
                "NARRATE_PAIR",
                f"pair:{context.get('pair')}:{context.get('pair_changed_at')}",
                "search",
                {},
                0,
            )
        yield "NARRATE_SCAN", "scan", "search", {}, 12
    observed = seconds(context.get("market_observed_at"))
    if context.get("high_volatility") is True and 0 <= now - observed <= 3:
        yield (
            "NARRATE_VOLATILITY",
            "volatility",
            "trade" if phase == "IN_TRADE" else "search",
            {"high_volatility": True},
            45,
        )
    yield "NARRATE_LESSON", "lesson", "general", {}, 12
    yield "NARRATE_ENGAGE", "engage", "general", {}, 45
