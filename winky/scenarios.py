"""Сценарии Winky: что, когда и на каком языке говорить.

Реплики лежат в ``winky/scenarios.yaml`` — файл можно править на ходу,
он автоматически перезагружается при изменении (проверка каждые 2 секунды).
Все реплики проходят цензуру при загрузке: заблокированные не попадают в пульт.
"""

from __future__ import annotations

import logging
import random
import threading
from dataclasses import dataclass
from pathlib import Path
from time import time

import yaml

from winky.censor import check_phrase

logger = logging.getLogger(__name__)

SCENARIOS_FILE = Path(__file__).parent / "scenarios.yaml"
RELOAD_CHECK_INTERVAL = 2.0


@dataclass(frozen=True)
class QuickReply:
    """Двуязычный сценарий быстрой реплики с вариантами на RU и EN."""

    id: str
    label: str
    icon: str
    emotion: str  # idle | happy | excited | thinking | wink | wave | win | blush и т.д.
    texts_ru: tuple[str, ...]
    texts_en: tuple[str, ...]

    def random_text(self, lang: str = "ru") -> str:
        pool = self.texts_ru if (lang or "ru").lower() == "ru" else self.texts_en
        return random.choice(pool) if pool else (self.texts_ru[0] if self.texts_ru else "")

    # Обратная совместимость для старых вызовов
    @property
    def text(self) -> str:
        return self.texts_ru[0] if self.texts_ru else ""

    @property
    def lang(self) -> str:
        return "ru"


@dataclass(frozen=True)
class CtaConfig:
    """Ротация интерактива стрима: 4 вопроса/разогрева чата на 1 напоминание про ассистента."""

    interval_minutes: int
    messages_ru: tuple[str, ...]
    messages_en: tuple[str, ...]
    warmup_ru: tuple[str, ...] = ()
    warmup_en: tuple[str, ...] = ()

    def random_message(self, lang: str) -> str:
        pool = self.messages_ru if (lang or "ru").lower() == "ru" else self.messages_en
        return random.choice(pool) if pool else ""

    def random_warmup(self, lang: str) -> str:
        pool = self.warmup_ru if (lang or "ru").lower() == "ru" else self.warmup_en
        return random.choice(pool) if pool else self.random_message(lang)


@dataclass(frozen=True)
class KeywordReply:
    """Ответ по ключевым словам из чата — приоритетнее LLM."""

    id: str
    keywords: tuple[str, ...]
    emotion: str
    text_ru: str
    text_en: str

    def text(self, lang: str) -> str:
        return self.text_ru if lang == "ru" else self.text_en


@dataclass(frozen=True)
class ChatPhrases:
    """Приветствия, благодарности за подарки, подписки, лайки и фолбэки."""

    greetings_ru: tuple[str, ...] = ()
    greetings_en: tuple[str, ...] = ()
    gift_thanks_ru: tuple[str, ...] = ()
    gift_thanks_en: tuple[str, ...] = ()
    follows_ru: tuple[str, ...] = ()
    follows_en: tuple[str, ...] = ()
    likes_ru: tuple[str, ...] = ()
    likes_en: tuple[str, ...] = ()
    fallbacks_ru: tuple[str, ...] = ()
    fallbacks_en: tuple[str, ...] = ()

    def greeting(self, lang: str) -> str:
        pool = self.greetings_ru if lang == "ru" else self.greetings_en
        return random.choice(pool) if pool else ""

    def gift_thank(self, lang: str) -> str:
        pool = self.gift_thanks_ru if lang == "ru" else self.gift_thanks_en
        return random.choice(pool) if pool else ""

    def follow(self, lang: str) -> str:
        pool = self.follows_ru if lang == "ru" else self.follows_en
        return random.choice(pool) if pool else ""

    def like(self, lang: str) -> str:
        pool = self.likes_ru if lang == "ru" else self.likes_en
        return random.choice(pool) if pool else ""

    def fallback(self, lang: str) -> str:
        pool = self.fallbacks_ru if lang == "ru" else self.fallbacks_en
        return random.choice(pool) if pool else ""


def _load_raw(path: Path) -> dict:
    with path.open(encoding="utf-8") as file:
        return yaml.safe_load(file) or {}


def _parse_quick_replies(raw: list) -> list[QuickReply]:
    replies = []
    for item in raw or []:
        reply_id = str(item.get("id", ""))
        label = str(item.get("label", reply_id))
        icon = str(item.get("icon", "💬"))
        emotion = str(item.get("emotion", "happy"))

        raw_ru = item.get("texts_ru")
        if not raw_ru:
            if "text" in item and item.get("lang", "ru") == "ru":
                raw_ru = [item["text"]]
            elif "texts" in item:
                raw_ru = item["texts"]

        raw_en = item.get("texts_en")
        if not raw_en and "text" in item and item.get("lang", "ru") == "en":
            raw_en = [item["text"]]

        def filter_texts(texts) -> tuple[str, ...]:
            res = []
            for t in texts or []:
                ok, reason = check_phrase(str(t))
                if ok:
                    res.append(str(t))
                else:
                    logger.warning("Реплика %s заблокирована цензурой (%s): %s", reply_id, reason, str(t)[:40])
            return tuple(res)

        clean_ru = filter_texts(raw_ru)
        clean_en = filter_texts(raw_en)

        if not reply_id or (not clean_ru and not clean_en):
            continue

        replies.append(
            QuickReply(
                id=reply_id,
                label=label,
                icon=icon,
                emotion=emotion,
                texts_ru=clean_ru,
                texts_en=clean_en,
            )
        )
    return replies


def _parse_cta(raw: dict) -> CtaConfig:
    def filter_texts(items) -> tuple[str, ...]:
        res = []
        for t in items or []:
            ok, reason = check_phrase(str(t))
            if ok:
                res.append(str(t))
            else:
                logger.warning("Реплика CTA заблокирована цензурой (%s): %s", reason, str(t)[:40])
        return tuple(res)

    return CtaConfig(
        interval_minutes=int(raw.get("interval_minutes", 3)),
        messages_ru=filter_texts(raw.get("messages_ru")),
        messages_en=filter_texts(raw.get("messages_en")),
        warmup_ru=filter_texts(raw.get("warmup_ru")),
        warmup_en=filter_texts(raw.get("warmup_en")),
    )


def _parse_keyword_replies(raw: list) -> list[KeywordReply]:
    replies = []
    for item in raw or []:
        reply = KeywordReply(
            id=str(item.get("id", "")),
            keywords=tuple(str(k).lower() for k in (item.get("keywords") or [])),
            emotion=str(item.get("emotion", "happy")),
            text_ru=str(item.get("text_ru", "")),
            text_en=str(item.get("text_en", "")),
        )
        if not reply.id or not reply.keywords or not (reply.text_ru or reply.text_en):
            continue
        for text in (reply.text_ru, reply.text_en):
            ok, reason = check_phrase(text)
            if not ok:
                logger.warning("Ключевая реплика %s заблокирована цензурой (%s)", reply.id, reason)
                break
        else:
            replies.append(reply)
    return replies


def _parse_chat_phrases(raw: dict) -> ChatPhrases:
    def censored(items) -> tuple[str, ...]:
        kept = []
        for text in items or []:
            ok, reason = check_phrase(str(text))
            if ok:
                kept.append(str(text))
            else:
                logger.warning("Фраза чата заблокирована цензурой (%s): %s", reason, text[:40])
        return tuple(kept)

    return ChatPhrases(
        greetings_ru=censored((raw.get("greetings") or {}).get("ru")),
        greetings_en=censored((raw.get("greetings") or {}).get("en")),
        gift_thanks_ru=censored((raw.get("gift_thanks") or {}).get("ru")),
        gift_thanks_en=censored((raw.get("gift_thanks") or {}).get("en")),
        follows_ru=censored((raw.get("follows") or {}).get("ru")),
        follows_en=censored((raw.get("follows") or {}).get("en")),
        likes_ru=censored((raw.get("likes") or {}).get("ru")),
        likes_en=censored((raw.get("likes") or {}).get("en")),
        fallbacks_ru=censored((raw.get("fallbacks") or {}).get("ru")),
        fallbacks_en=censored((raw.get("fallbacks") or {}).get("en")),
    )


class ScenarioBook:
    """Загруженные сценарии с автоперезагрузкой при изменении файла."""

    def __init__(self, path: Path = SCENARIOS_FILE) -> None:
        self._path = path
        self._lock = threading.Lock()
        self._quick_replies: list[QuickReply] = []
        self._keyword_replies: list[KeywordReply] = []
        self._chat_phrases = ChatPhrases()
        self._cta = CtaConfig(interval_minutes=4, messages_ru=(), messages_en=())
        self._loaded_at = 0.0
        self._file_mtime = 0.0
        self.reload(force=True)

    def reload(self, force: bool = False) -> bool:
        """Перечитывает YAML, если файл изменился. Возвращает True при перезагрузке."""
        if not self._path.exists():
            logger.warning("Файл сценариев не найден: %s", self._path)
            return False
        mtime = self._path.stat().st_mtime
        if not force and mtime == self._file_mtime:
            return False

        try:
            raw = _load_raw(self._path)
        except yaml.YAMLError:
            logger.exception("Синтаксическая ошибка в %s — держу прошлую версию", self._path)
            return False

        with self._lock:
            self._quick_replies = _parse_quick_replies(raw.get("quick_replies"))
            self._keyword_replies = _parse_keyword_replies(raw.get("keyword_replies"))
            self._chat_phrases = _parse_chat_phrases({
                "greetings": raw.get("greetings"),
                "gift_thanks": raw.get("gift_thanks"),
                "follows": raw.get("follows"),
                "likes": raw.get("likes"),
                "fallbacks": raw.get("fallbacks"),
            })
            self._cta = _parse_cta(raw.get("cta") or {})
            self._file_mtime = mtime
            self._loaded_at = time()
        logger.info(
            "Сценарии загружены: %d реплик, %d ключевых, CTA каждые %d мин",
            len(self._quick_replies), len(self._keyword_replies), self._cta.interval_minutes,
        )
        return True

    def maybe_reload(self) -> None:
        """Вызывается из фонового цикла: перезагружает файл при изменении."""
        try:
            self.reload(force=False)
        except OSError:
            logger.exception("Не удалось перечитать сценарии")

    @property
    def quick_replies(self) -> list[QuickReply]:
        with self._lock:
            return list(self._quick_replies)

    @property
    def keyword_replies(self) -> list[KeywordReply]:
        with self._lock:
            return list(self._keyword_replies)

    @property
    def keywords(self) -> list[KeywordReply]:
        return self.keyword_replies

    def quick_reply(self, reply_id: str) -> QuickReply | None:
        with self._lock:
            for reply in self._quick_replies:
                if reply.id == reply_id:
                    return reply
        return None

    def match_keyword(self, text: str) -> KeywordReply | None:
        """Ищет первый ключевой ответ, чьё слово встречается в сообщении."""
        haystack = text.lower()
        with self._lock:
            for reply in self._keyword_replies:
                if any(keyword in haystack for keyword in reply.keywords):
                    return reply
        return None

    @property
    def chat_phrases(self) -> ChatPhrases:
        with self._lock:
            return self._chat_phrases

    @property
    def cta(self) -> CtaConfig:
        with self._lock:
            return self._cta
