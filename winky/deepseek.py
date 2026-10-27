"""Мозг Winky: ответы на нестандартные вопросы чата через DeepSeek.

Правила безопасности зашиты в системный промпт (никаких обещаний дохода),
плюс каждый ответ проходит цензуру перед озвучкой. Лимит частоты —
не чаще одного ответа в ``WINKY_LLM_MIN_INTERVAL`` секунд.
Без ключа (``DEEPSEEK_API_KEY``) модуль отключён — работают сценарии.
"""

from __future__ import annotations

import logging
from threading import Lock
from time import monotonic

import requests

from config import settings

logger = logging.getLogger(__name__)

API_URL = "https://api.deepseek.com/chat/completions"
MAX_REPLY_CHARS = 280  # TTS-реплики должны быть короткими

SYSTEM_PROMPT = """Ты — Winky, неоновая AI-помощница приложения торговых сигналов Wink Trade \
на TikTok-стриме. Характер: энергичная, дружелюбная хайпгёрл, тёплая, немного дерзкая.

Жёсткие правила:
- ВСЕГДА начинай свой ответ с подходящего тега эмоции в квадратных скобках: [happy], [blush], [excited], [wink] или [surprised]. \
Например: «[happy] О, привет! Рада видеть тебя на стриме!» или «[blush] Спасибо большое за поддержку!».
- Отвечай ОЧЕНЬ коротко: 1–2 предложения, максимум 25 слов.
- Отвечай ТОЛЬКО на языке сообщения пользователя (русский → русский, english → english, \
другой язык → на нём).
- НИКОГДА не обещай прибыль, доход или выигрыш. Запрещены слова «гарантия», «100%», \
«без риска». Если просят обещать — мягко переведи тему на то, что сигналы видны вживую.
- Про регистрацию, цену и доступ: ссылка на бота — в шапке TikTok-профиля, депозит \
от 10 долларов открывает сигналы автоматически.
- Не обсуждай политику и запрещённые темы — отшучивайся и переводи на сигналы.
- Если спросят, кто ты — честно: «Я Winky, ИИ-помощница Wink Trade».
- Обращайся к пользователю по нику, если он известен."""


class LLMBrain:
    """Обёртка OpenAI-совместимого API (River AI / DeepSeek) с лимитом частоты и таймаутами."""

    def __init__(self) -> None:
        self._last_call = 0.0
        self._lock = Lock()

    @property
    def api_key(self) -> str:
        return settings.RIVER_API_KEY or settings.DEEPSEEK_API_KEY

    @property
    def api_url(self) -> str:
        if settings.DEEPSEEK_BASE_URL:
            base = settings.DEEPSEEK_BASE_URL.rstrip("/")
            return base if base.endswith("/chat/completions") else f"{base}/chat/completions"
        if settings.RIVER_API_KEY:
            return "https://api.river.ai/v1/chat/completions"
        return "https://api.deepseek.com/chat/completions"

    @property
    def model_name(self) -> str:
        if settings.DEEPSEEK_MODEL:
            return settings.DEEPSEEK_MODEL
        if settings.RIVER_API_KEY:
            return "deepseek-ai/DeepSeek-V4.1-Flash"
        return "deepseek-chat"

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _rate_allowed(self) -> bool:
        with self._lock:
            if monotonic() - self._last_call < settings.WINKY_LLM_MIN_INTERVAL:
                return False
            self._last_call = monotonic()
            return True

    def reply(self, comment: str, nickname: str = "") -> str | None:
        """Ответ на комментарий в языке зрителя. None — лимит/ошибка/нет ключа."""
        if not self.available:
            return None
        if not self._rate_allowed():
            logger.debug("LLM-лимит: пропускаю комментарий")
            return None

        user_line = f" (ник пользователя: {nickname})" if nickname else ""
        try:
            response = requests.post(
                self.api_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": comment + user_line},
                    ],
                    "temperature": 0.9,
                    "max_tokens": 160,
                },
                timeout=10,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            logger.warning("LLM (%s) недоступен: %s", self.api_url, exc)
            return None

        choices = payload.get("choices") or []
        if not choices:
            logger.warning("LLM вернул пустой ответ: %s", payload)
            return None
        text = str(choices[0].get("message", {}).get("content", "")).strip()
        if len(text) > MAX_REPLY_CHARS:
            text = text[: MAX_REPLY_CHARS - 1].rsplit(" ", 1)[0] + "…"
        return text or None
