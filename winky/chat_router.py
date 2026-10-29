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

# Универсальные фразы реакций лайва с поддержкой {user} и {gift}
JOIN_PHRASES_RU = [
    "О, {user}, приветик! Рада тебя видеть!",
    "Хей, {user}, добро пожаловать! Располагайся, сейчас всё покажу!",
    "{user}, привет! Залетай к нам, устраивайся поудобнее!",
]
JOIN_PHRASES_EN = [
    "Hey {user}, welcome to the stream! So happy to see you here!",
    "Welcome {user}! Glad to have you on the live stream!",
]

FOLLOW_PHRASES_RU = [
    "{user}, спасибо за подписку! Танцую для тебя! Ссылка на бота в шапке профиля!",
    "Ура, {user}, добро пожаловать в семью! Лови мой фирменный танец!",
]
FOLLOW_PHRASES_EN = [
    "Wow {user}, thank you for following! Dancing just for you! Check the link in bio!",
    "Welcome {user}! Thank you for following, enjoy my dance!",
]

GIFT_PHRASES_RU = [
    "Ого, {user}, огромное спасибо за {gift}! Ты супер! Лови мой танец!",
    "Вау, {user}, какой подарок! {gift} — это супер мило! Танцую для тебя!",
]
GIFT_PHRASES_EN = [
    "Wow {user}, thank you so much for the {gift}! You are awesome!",
    "Thank you {user} for the {gift}! Dancing just for you!",
]

LIKE_PHRASES_RU = [
    "{user}, спасибо огромное за лайки! Лови сердечко!",
    "Ого, сколько лайков от {user}! Спасибо большое, ты лучший!",
    "{user}, спасибо за активность и поддержку стрима!",
]
LIKE_PHRASES_EN = [
    "{user}, thank you so much for the likes! Sending love!",
    "Wow {user}, thanks for tapping the screen! You're awesome!",
]

# Запрещенные шаблоны в никах (мат, казино, спам, боты, ссылки)
_BAD_NAME_PATTERNS = (
    r"https?://", r"t\.me", r"\.com", r"\.ru", r"\.org", r"\.net", r"bot\b",
    r"казино", r"casino", r"1win", r"vavada", r"crypto", r"крипт",
    r"хуй", r"пизд", r"еба", r"ебл", r"бля", r"сука", r"мудак", r"гандон",
    r"fuck", r"bitch", r"dick", r"pussy", r"asshole", r"whore",
)


def detect_reply_lang(text: str) -> str:
    """Определяет язык для ответа: 'ru' если есть кириллица, иначе 'en'."""
    return "ru" if re.search(r"[а-яА-ЯёЁ]", text or "") else "en"


def clean_nickname(raw_user: str, default_lang: str = "auto") -> tuple[str, str]:
    """Превращает сырой никнейм зрителя TikTok (например 'alex_2004', 'дима_777', 'kate.love')
    в красивое произносимое имя ('Alex', 'Дима', 'Kate Love').
    Возвращает (clean_name, lang).
    """
    if not raw_user:
        target_lang = "en" if default_lang == "en" else "ru"
        return ("friend" if target_lang == "en" else "друг"), target_lang

    raw = raw_user.strip()
    has_ru = bool(re.search(r"[а-яА-ЯёЁ]", raw))
    fallback_lang = "en" if default_lang == "en" else "ru"
    fallback_name = "friend" if fallback_lang == "en" else "друг"

    # 1. Проверка через общую цензуру check_phrase
    ok, _ = check_phrase(raw)
    if not ok:
        return fallback_name, fallback_lang

    lower_raw = raw.lower()

    # 2. Проверка на мат, ссылки и спам
    for pat in _BAD_NAME_PATTERNS:
        if re.search(pat, lower_raw, re.IGNORECASE):
            return fallback_name, fallback_lang

    # 3. Проверка на шаблон мусора типа user12384712, user_123, id1238912, или чисто цифры
    if re.match(r"^(user|id)[_]?\d+$", lower_raw) or re.match(r"^\d+$", lower_raw) or len(lower_raw) <= 1:
        return fallback_name, fallback_lang

    # 4. Удаляем хвостовые цифры: alex_2004 -> alex_, дима_777 -> дима_
    clean = re.sub(r"\d+$", "", raw).strip()

    # Заменяем точки, подчеркивания и дефисы на пробелы
    clean = re.sub(r"[_.]+", " ", clean)

    # Очищаем от спецсимволов/эмодзи, оставляем буквы, цифры и пробелы
    clean = re.sub(r"[^\w\sа-яА-ЯёЁa-zA-Z-]", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    # Капитализируем каждое слово для красивого произношения
    if clean:
        clean = " ".join(word.capitalize() for word in clean.split())

    if not clean or len(clean) <= 1:
        return fallback_name, fallback_lang

    # 5. Повторная проверка очищенного имени через check_phrase
    ok_clean, _ = check_phrase(clean)
    if not ok_clean:
        return fallback_name, fallback_lang

    detected_l = detect_reply_lang(clean)
    target_l = default_lang if default_lang in ("ru", "en") else detected_l
    return clean, target_l


sanitize_nickname = clean_nickname


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
        self._last_like_at = 0.0
        self._last_follow_at = 0.0
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
        lang = detect_reply_lang(text)

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

        # Защита от перегрузки очереди: если в очереди уже >=4 реплик, отображаем в ленте, но не добавляем речь
        if self._controller.queue_size() >= 4:
            logger.info("Пропуск голосового ответа на «%s»: очередь перегружена (%d)", text[:30], self._controller.queue_size())
            return

        # 1. Ключевые сценарии — приоритет (универсальные, звучат за 0.05с)
        keyword = self._book.match_keyword(text)
        if keyword is not None:
            emo = detected_emo or keyword.emotion
            if self._say(keyword.text(lang), lang, emo, user):
                self._bump("keyword_hits")
                return

        # 2. Фоновая генерация через DeepSeek и синтез ответа (без промежуточных аудио-филлеров)
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

    def handle_join(self, user: str, force: bool = False, lang: str = "auto") -> None:
        """Новый зритель: счётчик и лента обновляются сразу; голос — только при свободной очереди (25с кулдаун)."""
        self._bump("joins_greeted")
        self._feed("user", user, "👋 зашёл(ла) в эфир")

        now = monotonic()
        if not force:
            if now - self._last_greet_at < 25.0:
                return
            if self._controller.speaking or self._controller.queue_size() > 0:
                return

        self._last_greet_at = now
        clean_name, detected_lang = clean_nickname(user, default_lang=lang)
        target_lang = lang if lang in ("ru", "en") else detected_lang

        scenario_phrase = self._book.chat_phrases.greeting(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(JOIN_PHRASES_RU if target_lang == "ru" else JOIN_PHRASES_EN)
        self._say(text, target_lang, "wave", clean_name, action="wave", action_duration=3.0)

    def handle_follow(self, user: str, force: bool = False, lang: str = "auto") -> None:
        """Подписка зрителя: лента обновляется сразу; голос — танец dance с кулдауном 5с."""
        self._bump("follows")
        self._feed("user", user, "❤️ подписался(лась) на эфир")

        now = monotonic()
        if not force and now - self._last_follow_at < 5.0:
            return

        self._last_follow_at = now
        clean_name, detected_lang = clean_nickname(user, default_lang=lang)
        target_lang = lang if lang in ("ru", "en") else detected_lang

        scenario_phrase = self._book.chat_phrases.follow(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(FOLLOW_PHRASES_RU if target_lang == "ru" else FOLLOW_PHRASES_EN)
        self._say(text, target_lang, "excited", clean_name, action="dance", action_duration=4.5)

    def handle_gift(self, user: str, gift: str = "Роза", lang: str = "auto") -> None:
        """Подарок: персональная благодарность за конкретный подарок + танец dance (всегда озвучивается)."""
        clean_name, detected_lang = clean_nickname(user, default_lang=lang)
        target_lang = lang if lang in ("ru", "en") else detected_lang
        clean_gift = (gift or "").strip() or ("Роза" if target_lang == "ru" else "Rose")
        self._bump("gifts")
        self._feed("user", user, f"🎁 {clean_gift}")

        scenario_phrase = self._book.chat_phrases.gift_thank(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(GIFT_PHRASES_RU if target_lang == "ru" else GIFT_PHRASES_EN)
        self._say(text, target_lang, "excited", clean_name, gift=clean_gift, action="dance", action_duration=4.5)

    def handle_like(self, user: str, count: int = 1, force: bool = False, lang: str = "auto") -> None:
        """Лайки: счётчик и лента обновляются сразу; голос — только при свободной очереди (25с кулдаун)."""
        self._bump("likes")
        feed_msg = f"❤️ поставил(а) {count} лайков" if (lang == "ru" or (lang == "auto" and detect_reply_lang(user) == "ru")) else f"❤️ sent {count} likes"
        self._feed("user", user, feed_msg)

        now = monotonic()
        if not force:
            if now - self._last_like_at < 25.0:
                return
            if self._controller.speaking or self._controller.queue_size() > 0:
                return

        self._last_like_at = now
        clean_name, detected_lang = clean_nickname(user, default_lang=lang)
        target_lang = lang if lang in ("ru", "en") else detected_lang

        scenario_phrase = self._book.chat_phrases.like(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(LIKE_PHRASES_RU if target_lang == "ru" else LIKE_PHRASES_EN)
        self._say(text, target_lang, "excited", clean_name, count=count, action="cheer", action_duration=3.0)

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

    def _say(
        self,
        text: str,
        lang: str,
        emotion: str,
        user: str,
        gift: str = "",
        count: int = 1,
        action: str | None = None,
        action_duration: float = 3.5,
    ) -> bool:
        """Подстановка плейсхолдеров, парсинг тегов эмоций [blush], цензура и конвейер речи."""
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

        text = text.replace("{user}", clean_user).replace("{gift}", clean_gift).replace("{count}", str(count))
        ok, reason = check_phrase(text)
        if not ok:
            logger.warning("Ответ Winky заблокирован цензурой: %s", reason)
            self._feed("blocked", "цензура", reason)
            return False
        self._feed("winky", "Winky", text)
        return self._controller.speak(
            text,
            lang=lang,
            emotion=emotion,
            action=action,
            action_duration=action_duration,
            source="chat",
        )

    def _feed(self, kind: str, who: str, text: str) -> None:
        try:
            self._on_feed({"kind": kind, "who": who, "text": text})
        except Exception:  # noqa: BLE001 — лента не должна ронять маршрут
            logger.exception("on_feed упал")
