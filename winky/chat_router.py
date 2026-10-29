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

# Мгновенные голосовые филлеры (0.05с отклик для новых вопросов)
FILLERS_RU = [
    "О, отличный вопрос! Сейчас расскажу!",
    "Хм, дай-ка подумать! Сейчас подскажу!",
    "Секундочку, смотрю!",
]
FILLERS_EN = [
    "Oh, great question! Let me tell you!",
    "Hmm, let me think! Give me a second!",
    "One second, checking that out!",
]

# Универсальные фразы для 100% предкэширования реакций лайва
JOIN_PHRASES_RU = [
    "О, приветик! Рада, что заглянул ко мне на стрим!",
    "Хей, добро пожаловать! Садись поудобнее, сейчас будем ловить сигнал!",
    "Привет! Залетай к нам на стрим, располагайся!",
]
JOIN_PHRASES_EN = [
    "Hey, welcome to the stream! So happy to see you here!",
    "Welcome! Glad to have you on the live stream!",
]

FOLLOW_PHRASES_RU = [
    "Вау, спасибо за подписку! Танцую специально для тебя! Залетай по ссылке в профиле в наш бот!",
    "Ура, добро пожаловать к нам! Лови мой фирменный танец!",
]
FOLLOW_PHRASES_EN = [
    "Wow, thank you for following! Dancing just for you! Check out the link in bio for our bot!",
    "Welcome! Thank you for following, enjoy my dance!",
]

GIFT_PHRASES_RU = [
    "Ого, подарок! Спасибо огромное, ты супер! Лови мой фирменный танец!",
    "Вау, какой крутой подарок! Это супер мило! Танцую специально для тебя!",
]
GIFT_PHRASES_EN = [
    "Wow, thank you so much for the gift! You are awesome! Here is my dance for you!",
    "Thank you for the gift! Dancing just for you!",
]

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

    raw = nickname.strip()

    # 1. Проверка через общую цензуру check_phrase
    ok, _ = check_phrase(raw)
    if not ok:
        has_ru = any("а" <= ch.lower() <= "я" for ch in raw)
        return ("котик" if has_ru else "friend"), ("ru" if has_ru else "en")

    lower_raw = raw.lower()

    # 2. Проверка на мат, ссылки и спам
    for pat in _BAD_NAME_PATTERNS:
        if re.search(pat, lower_raw, re.IGNORECASE):
            return "друг", "ru"

    # 3. Проверка на шаблон мусора типа user12384712, user_123, id1238912, или чисто цифры
    if re.match(r"^(user|id)[_]?\d+$", lower_raw) or re.match(r"^\d+$", lower_raw) or len(lower_raw) <= 1:
        return "друг", "ru"

    # 4. Очистка от эмодзи, управляющих символов и нижних подчеркиваний
    clean = re.sub(r"[_.]+", " ", raw)
    clean = re.sub(r"[^\w\sа-яА-ЯёЁa-zA-Z0-9]", "", clean)
    clean = re.sub(r"\d{3,}$", "", clean).strip()

    if not clean or len(clean) <= 1:
        has_ru = any("а" <= ch.lower() <= "я" for ch in raw)
        return ("друг" if has_ru else "friend"), ("ru" if has_ru else "en")

    # 5. Повторная проверка очищенного имени через check_phrase
    ok_clean, _ = check_phrase(clean)
    if not ok_clean:
        return "котик", "ru"

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
        on_wave: Callable[[], None] | None = None,
        on_action: Callable[[str, float], None] | None = None,
    ) -> None:
        self._book = book
        self._brain = brain
        self._controller = controller
        self._on_feed = on_feed
        self._on_gift = on_gift
        self._on_wave = on_wave
        self._on_action = on_action
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
        """Комментарий зрителя: классификация типа (комплимент/приветствие/профит) -> keyword -> LLM -> фолбэк."""
        text = text.strip()
        if not text:
            return
        self._bump("comments")
        feed_user = "Зритель" if user in ("Ручной вопрос", "") else user
        self._feed("user", feed_user, text)
        lang = detect_lang(text)

        lower_text = text.lower()
        is_compliment = any(word in lower_text for word in ("красотк", "лучш", "мил", "любл", "топ", "няшк", "красив", "cute", "love", "best", "милашк", "прелесть"))
        is_greeting = any(word in lower_text for word in ("привет", "хей", "ку", "здарова", "добрый", "hi", "hello", "hey", "салют"))
        is_win = any(word in lower_text for word in ("плюс", "профит", "зашло", "выиграл", "ура", "win", "profit", "побед"))

        if is_compliment:
            detected_emo = "blush"
            if self._on_action:
                try:
                    self._on_action("shy", 3.2)
                except Exception:
                    logger.exception("on_action shy упал")
        elif is_greeting:
            detected_emo = "wave"
            if self._on_wave:
                try:
                    self._on_wave()
                except Exception:
                    logger.exception("on_wave упал")
        elif is_win:
            detected_emo = "excited"
            if self._on_action:
                try:
                    self._on_action("cheer", 3.5)
                except Exception:
                    logger.exception("on_action cheer упал")
        else:
            detected_emo = None
            if self._on_action:
                try:
                    self._on_action("thinking", 0.8)
                except Exception:
                    pass

        # 1. Ключевые сценарии — приоритет (универсальные, звучат за 0.05с)
        keyword = self._book.match_keyword(text)
        if keyword is not None:
            emo = detected_emo or keyword.emotion
            if self._say(keyword.text(lang), lang, emo, user):
                self._bump("keyword_hits")
                return

        # 2. Мгновенный голосовой филлер (0.05с отклик) перед генерацией ответа LLM
        filler = random.choice(FILLERS_RU if lang == "ru" else FILLERS_EN)
        self._say(filler, lang, detected_emo or "thinking", user)

        # 3. Фоновая генерация через DeepSeek и синтез ответа
        def _llm_worker() -> None:
            reply = self._brain.reply(text, nickname=user)
            if reply:
                emo = detected_emo or self._emotion_for(reply)
                if self._say(reply, lang, emo, user):
                    self._bump("llm_replies")
                    return
                self._bump("llm_censored")
            elif self._brain.available:
                self._bump("llm_limited")

            # Фолбэк, если LLM недоступен или лимит
            emo = detected_emo or "wink"
            if self._say(self._book.chat_phrases.fallback(lang), lang, emo, user):
                self._bump("fallbacks")

        threading.Thread(target=_llm_worker, daemon=True, name="chat_llm_worker").start()

    def handle_join(self, user: str, force: bool = False) -> None:
        """Новый зритель: приветствие с жестом wave (мгновенный отклик 0.05с)."""
        if not force:
            now = monotonic()
            if now - self._last_greet_at < 18.0:
                return
            if self._controller.speaking or self._controller.status().queue_len > 0:
                return

        clean_name, lang = sanitize_nickname(user)
        self._last_greet_at = monotonic()
        self._bump("joins_greeted")
        self._feed("user", user, "👋 зашёл(ла) в эфир")

        if self._on_wave:
            try:
                self._on_wave()
            except Exception:
                logger.exception("on_wave упал")

        text = random.choice(JOIN_PHRASES_RU if lang == "ru" else JOIN_PHRASES_EN)
        self._say(text, lang, "wave", clean_name)

    def handle_follow(self, user: str) -> None:
        """Подписка зрителя: танец + озвучка благодарности (мгновенный отклик 0.05с)."""
        clean_name, lang = sanitize_nickname(user)
        self._bump("follows")
        self._feed("user", user, "❤️ подписался(лась) на эфир")

        if self._on_action:
            try:
                self._on_action("dance", 4.5)
            except Exception:
                logger.exception("on_action dance упал")

        text = random.choice(FOLLOW_PHRASES_RU if lang == "ru" else FOLLOW_PHRASES_EN)
        self._say(text, lang, "excited", clean_name)

    def handle_gift(self, user: str, gift: str = "Роза") -> None:
        """Подарок: танец + благодарность за подарок (мгновенный отклик 0.05с)."""
        clean_name, lang = sanitize_nickname(user)
        clean_gift = (gift or "").strip() or ("Роза" if lang == "ru" else "Rose")
        self._bump("gifts")
        self._feed("user", user, f"🎁 {clean_gift}")

        if self._on_action:
            try:
                self._on_action("dance", 4.5)
            except Exception:
                logger.exception("on_action dance упал")
        elif self._on_gift:
            try:
                self._on_gift(clean_gift)
            except Exception:
                pass

        text = random.choice(GIFT_PHRASES_RU if lang == "ru" else GIFT_PHRASES_EN)
        self._say(text, lang, "excited", clean_name, gift=clean_gift)

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

        # Замена плейсхолдеров. Исключаем технические имена типа "Ручной вопрос", "Зритель", "user", "viewer"
        clean_user = (user or "").strip()
        if not clean_user or clean_user.lower() in ("ручной вопрос", "зритель", "гость", "user", "viewer", "guest", "друг", "friend"):
            clean_user = "друг" if lang == "ru" else "friend"

        clean_gift = (gift or "").strip() or ("подарок" if lang == "ru" else "gift")

        text = text.replace("{user}", clean_user).replace("{gift}", clean_gift)
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
