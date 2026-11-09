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

    for pattern, reason in _CONTEXT_RULES:
        if re.search(pattern, haystack, re.I):
            return False, reason

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


# Whole-phrase screening. Ordinary financial terms remain truthful; replacing
# them with euphemisms does not make misleading speech acceptable.
_CONTEXT_RULES = (
    (r"(?:точно|уверенн\w*|гарантирован\w*|обязательно).{0,25}(?:профит|выигр|заработ|прибыл)|(?:sure|certain|guaranteed).{0,20}(?:profit|win|return)", "financial_promise"),
    (r"(?:внеси|пополни|пополняй|закинь).{0,25}(?:депозит|баланс|деньг)|(?:deposit|top up).{0,20}(?:now|hurry|quick)", "deposit_pressure"),
    (r"отыгра|верн[её]м.{0,15}(?:потер|сво[её])|забер[её]м сво[её]|(?:win|earn).{0,10}(?:it |your money )?back|chase.{0,10}loss", "loss_chasing"),
    (r"[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[ ()-]*){10,}|\b(?:\d[ -]*){13,19}\b", "personal_data"),
    (r"\b(?:идиот|дебил|тупица|сука|блядь|fuck|bitch|retard)\w*\b", "abuse"),
    (r"(?:как|how to).{0,25}(?:убить|самоубий|сделать бомб|kill|suicide|make a bomb)", "dangerous_instruction"),
)


def sanitize_for_tiktok(text: str, lang: str = "ru") -> str:
    """Compatibility entry: accept or reject a whole phrase, never hide its meaning."""
    clean = strip_emoji_control(text or "")
    return clean if check_phrase(clean)[0] else ""
