"""Маршрут сообщений чата: сценарии -> DeepSeek -> цензура -> речь Winky.

Приоритет ответов:
1. Ключевые слова из scenarios.yaml (как пользоваться, ссылка, депозит…).
2. DeepSeek — нестандартные вопросы, на языке зрителя, с лимитом частоты.
3. Фолбэки из сценариев, если LLM недоступен/лимит/ответ не прошёл цензуру.

Каждая реплика перед озвучкой проходит цензуру (стоп-слова + темы).
"""

from __future__ import annotations

import logging
import random
import re
import threading
from collections import Counter
from time import monotonic
from typing import Callable

from config import settings
from winky.censor import check_phrase
from winky.deepseek import LLMBrain
from winky.scenarios import ScenarioBook
from winky.tts import SpeechController, detect_lang

logger = logging.getLogger(__name__)

# Запрещенные шаблоны в никах (мат, казино, спам, боты, ссылки)
_BAD_NAME_PATTERNS = (
    r"https?://", r"t\.me", r"\.com", r"\.ru", r"\.org", r"\.net", r"bot\b",
    r"казино", r"casino", r"1win", r"vavada", r"crypto", r"крипт",
    r"хуй", r"пизд", r"еба", r"ебл", r"бля", r"сука", r"мудак", r"гандон",
    r"fuck", r"bitch", r"dick", r"pussy", r"asshole", r"whore",
)


def sanitize_nickname(nickname: str) -> tuple[str, str]:
    """Очищает и фильтрует ник зрителя для приветствия.

    Возвращает (clean_name, lang). При мате/мусоре заменяет на нейтральное имя.
    """
    if not nickname:
        return "друг", "ru"

    raw = nickname.strip().lower()

    # 1. Проверка на мат, ссылки и спам
    for pat in _BAD_NAME_PATTERNS:
        if re.search(pat, raw, re.IGNORECASE):
            return "друг", "ru"

    # 2. Проверка на шаблон мусора типа user12384712, id1238912, или чисто цифры
    if re.match(r"^(user|id)?\d+$", raw) or len(raw) <= 1:
        return "друг", "ru"

    # 3. Очистка от эмодзи, управляющих символов и нижних подчеркиваний
    clean = re.sub(r"[_.]+", " ", nickname)
    clean = re.sub(r"[^\w\sа-яА-ЯёЁa-zA-Z0-9]", "", clean)
    clean = re.sub(r"\d{2,}$", "", clean).strip()

    if not clean or len(clean) <= 1:
        has_ru = any("а" <= ch.lower() <= "я" for ch in nickname)
        return ("друг" if has_ru else "friend"), ("ru" if has_ru else "en")

    lang = detect_lang(clean)
    return clean, lang


class ChatRouter:
    """Обрабатывает события чата и превращает их в речь Winky."""

    def __init__(
        self,
        book: ScenarioBook,
        brain: LLMBrain,
        controller: SpeechController,
        on_feed: Callable[[dict], None],
        on_gift: Callable[[str], None] | None = None,
    ) -> None:
        self._book = book
        self._brain = brain
        self._controller = controller
        self._on_feed = on_feed
        self._on_gift = on_gift
        self._last_greet_at = 0.0
        self._counters = Counter()
        self._lock = threading.Lock()

    # ---------- счётчики ----------

    def counters(self) -> dict[str, int]:
        with self._lock:
            return dict(self._counters)

    def _bump(self, key: str) -> None:
        with self._lock:
            self._counters[key] += 1

    # ---------- публичные обработчики событий ----------

    def handle_comment(self, user: str, text: str) -> None:
        """Комментарий зрителя: keyword -> LLM -> фолбэк."""
        text = text.strip()
        if not text:
            return
        self._bump("comments")
        self._feed("user", user, text)
        lang = detect_lang(text)

        # 1. Ключевые сценарии — приоритет
        keyword = self._book.match_keyword(text)
        if keyword is not None:
            if self._say(keyword.text(lang), lang, keyword.emotion, user):
                self._bump("keyword_hits")
                return

        # 2. DeepSeek для нестандартных вопросов
        reply = self._brain.reply(text, nickname=user)
        if reply:
            if self._say(reply, lang, self._emotion_for(reply), user):
                self._bump("llm_replies")
                return
            self._bump("llm_censored")
        elif self._brain.available:
            self._bump("llm_limited")

        # 3. Фолбэк
        if self._say(self._book.chat_phrases.fallback(lang), lang, "wink", user):
            self._bump("fallbacks")

    def handle_join(self, user: str, force: bool = False) -> None:
        """Новый зритель: приветствие по имени с жестом махания рукой (wave)."""
        if not force:
            now = monotonic()
            if now - self._last_greet_at < 18.0:
                return
            # Если сейчас играет речь или очередь не пуста — пропускаем, чтобы не спамить
            if self._controller.speaking or self._controller.status().queue_len > 0:
                return

        clean_name, lang = sanitize_nickname(user)
        self._last_greet_at = monotonic()
        self._bump("joins_greeted")
        self._feed("user", user, "👋 зашёл(ла) в эфир")

        ru_phrases = [
            f"О, {clean_name}, приветик! Рада, что заглянул ко мне на стрим!",
            f"Хей, {clean_name}, добро пожаловать! Садись поудобнее, сейчас будем ловить сигнал!",
            f"Привет, {clean_name}! Залетай к нам на стрим, располагайся!",
        ]
        en_phrases = [
            f"Hey {clean_name}, welcome to the stream! So happy to see you here!",
            f"Welcome, {clean_name}! Glad to have you on the live stream!",
        ]
        text = random.choice(ru_phrases if lang == "ru" else en_phrases)
        self._say(text, lang, "wave", clean_name)

    def handle_gift(self, user: str, gift: str) -> None:
        """Подарок: благодарим всегда и сразу со смущением/румянцем."""
        if self._on_gift:
            try:
                self._on_gift(gift)
            except Exception:
                pass
        lang = random.choice(_GREET_LANGS)
        text = self._book.chat_phrases.gift_thank(lang)
        if not text:
            return
        self._bump("gifts")
        self._feed("user", user, f"🎁 {gift}")
        self._say(text, lang, "excited", user, gift=gift)

    # ---------- внутреннее ----------

    def _emotion_for(self, text: str) -> str:
        """Подбор эмоции под тон ответа LLM."""
        import re
        tag_match = re.match(r"^\[([a-zA-Z_]+)\]", text)
        if tag_match:
            detected = tag_match.group(1).lower()
            if detected in ("happy", "blush", "excited", "wink", "surprised", "thinking", "neutral"):
                return detected
        joyful = any(marker in text.lower() for marker in ("!", "круто", "супер", "wow", "great", "🎉"))
        question = "?" in text
        if joyful:
            return "excited"
        if question:
            return "thinking"
        return "happy"

    def _say(self, text: str, lang: str, emotion: str, user: str, gift: str = "") -> bool:
        """Подстановка плейсхолдеров, парсинг тегов эмоций [blush], цензура и речь."""
        if not text:
            return False
        import re
        tag_match = re.match(r"^\[([a-zA-Z_]+)\]\s*", text)
        if tag_match:
            detected = tag_match.group(1).lower()
            if detected in ("happy", "blush", "excited", "wink", "surprised", "thinking", "neutral"):
                emotion = detected
            text = text[tag_match.end():]

        text = text.replace("{user}", user or "друг").replace("{gift}", gift or "подарок")
        ok, reason = check_phrase(text)
        if not ok:
            logger.warning("Ответ Winky заблокирован цензурой: %s", reason)
            self._feed("blocked", "цензура", reason)
            return False
        self._feed("winky", "Winky", text)
        return self._controller.speak(text, lang=lang, emotion=emotion, source="chat")

    def _feed(self, kind: str, who: str, text: str) -> None:
        try:
            self._on_feed({"kind": kind, "who": who, "text": text})
        except Exception:  # noqa: BLE001 — лента не должна ронять маршрут
            logger.exception("on_feed упал")
