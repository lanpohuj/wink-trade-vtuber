"""Цензура реплик Winky: стоп-слова и запрещённые темы.

Защищает TikTok-аккаунт от бана за финансовые обещания и не даёт
агенту озвучивать то, что говорить нельзя. Проверка выполняется
всегда на выходе — перед озвучкой любой фразы.
"""

from __future__ import annotations

import re

from config import settings

# Стоп-корни: ловят все формы слова (гарант*, без риск*, ...)
_STOP_WORDS = (
    "гарантир",  # гарантирую, гарантия, гарантированный
    "гарантия",
    "100%",
    "100 %",
    "сто процентов",
    "без риска",
    "безрисков",
    "без рисков",
    "лёгкие деньги",
    "легкие деньги",
    "нельзя потерять",
    "обязательно заработа",
    "точно заработа",
    "guarantee",
    "guaranteed",
    "100 percent",
    "risk-free",
    "risk free",
    "easy money",
    "sure win",
    "no risk",
    "you will win",
    "you'll win",
)


def banned_topics() -> tuple[str, ...]:
    """Запрещённые темы из конфига (WINKY_BANNED_TOPICS через запятую)."""
    return tuple(
        topic.strip().lower()
        for topic in settings.WINKY_BANNED_TOPICS.split(",")
        if topic.strip()
    )


def check_phrase(text: str) -> tuple[bool, str]:
    """Проверяет фразу. Возвращает (пройдена, причина блокировки)."""
    haystack = text.lower()

    for word in _STOP_WORDS:
        if word in haystack:
            return False, f"стоп-слово: {word!r}"

    for topic in banned_topics():
        if topic and topic in haystack:
            return False, f"запрещённая тема: {topic!r}"

    return True, ""


def sanitize_scenario(text: str) -> str | None:
    """Реплика из сценария: возвращает текст, если цензура пройдена, иначе None.

    Сценарные тексты пишет владелец — предупреждаем в логах пульта, но
    блокируем озвучку так же, как и любые другие фразы.
    """
    ok, _reason = check_phrase(text)
    return text if ok else None


def strip_emoji_control(text: str) -> str:
    """Убирает управляющие символы, чтобы TTS не спотыкался."""
    return re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", text).strip()
