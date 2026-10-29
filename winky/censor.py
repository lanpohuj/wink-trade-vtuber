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


# ============================================================================
# TikTok Live Anti-Ban Sanitizer: замена запрещённых финансовых слов-триггеров
# ============================================================================

_TIKTOK_REPLACEMENTS = (
    # Pocket Option / брокер
    (re.compile(r"\bpocket\s*option\b", re.IGNORECASE), "платформа", "the platform"),
    (re.compile(r"\bпокет\s*опш[еи]?н?\b", re.IGNORECASE), "платформа", "the platform"),
    (re.compile(r"\bпокет[а-я]*\b", re.IGNORECASE), "платформа", "the platform"),
    (re.compile(r"\bброкер[а-я]*\b", re.IGNORECASE), "платформа", "the platform"),
    (re.compile(r"\bbroker[s]?\b", re.IGNORECASE), "платформа", "platform"),

    # Депозит
    (re.compile(r"\bдепозит[а-я]*\b", re.IGNORECASE), "пополнение баланса", "balance top-up"),
    (re.compile(r"\bdeposit[s]?\b", re.IGNORECASE), "пополнение баланса", "balance top-up"),

    # Сигнал
    (re.compile(r"\bсигнал[а-я]*\b", re.IGNORECASE), "подсказка алгоритма", "chart hint"),
    (re.compile(r"\bsignal[s]?\b", re.IGNORECASE), "подсказка алгоритма", "chart hint"),

    # Опционы, бинарки, ставки
    (re.compile(r"\bбинарн[а-я]*\s+опцион[а-я]*\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bбинарк[а-я]*\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bопцион[а-я]*\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bbinary\s+options?\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bставки\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bставк[а-я]*\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bbet(s|ting)?\b", re.IGNORECASE), "разбор графика", "chart session"),
    (re.compile(r"\bgambl(e|ing)?\b", re.IGNORECASE), "разбор сессии", "session"),

    # Прибыль, заработок, деньги, профит
    (re.compile(r"\bзаработ[а-я]*\b", re.IGNORECASE), "результат", "result"),
    (re.compile(r"\bприбыль[а-я]*\b", re.IGNORECASE), "результат", "result"),
    (re.compile(r"\bпрофит[а-я]*\b", re.IGNORECASE), "результат", "result"),
    (re.compile(r"\bденьг[а-я]*\b", re.IGNORECASE), "баланс", "balance"),
    (re.compile(r"\bprofit[s]?\b", re.IGNORECASE), "результат", "result"),
    (re.compile(r"\bearn(ing[s]?)?\b", re.IGNORECASE), "результат", "result"),
    (re.compile(r"\bmoney\b", re.IGNORECASE), "баланс", "balance"),

    # Казино
    (re.compile(r"\bказино\b", re.IGNORECASE), "платформа", "platform"),
    (re.compile(r"\bcasino\b", re.IGNORECASE), "платформа", "platform"),

    # Гарантия / 100%
    (re.compile(r"\bгаранти[а-я]*\b", re.IGNORECASE), "уверенность", "confidence"),
    (re.compile(r"\bguarante[ed]*\b", re.IGNORECASE), "уверенность", "confidence"),
    (re.compile(r"\b100\s*%\b", re.IGNORECASE), "отличный", "great"),
)


def sanitize_for_tiktok(text: str, lang: str = "ru") -> str:
    """Автоматически заменяет опасные слова-триггеры TikTok Live на безопасные синонимы с сохранением регистра."""
    if not text:
        return ""
    result = text
    is_en = (lang == "en") or not any("а" <= ch.lower() <= "я" for ch in text)

    for pattern, repl_ru, repl_en in _TIKTOK_REPLACEMENTS:
        repl = repl_en if is_en else repl_ru

        def _sub(m: re.Match) -> str:
            orig = m.group(0)
            if orig.isupper():
                return repl.upper()
            if orig and orig[0].isupper():
                return repl[:1].upper() + repl[1:]
            return repl.lower()

        result = pattern.sub(_sub, result)
    return result
