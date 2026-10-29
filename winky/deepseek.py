"""Мозг Winky: живой интеллект 20-летней харизматичной девушки-стримера через DeepSeek / River AI.

Winky помнит историю диалога с конкретным зрителем, подстраивается под его вайб,
вовлекает вопросами-крючками (Response Bait) и соблюдает строгое правило 80/20
по поводу шапки профиля.
"""

from __future__ import annotations

import logging
from threading import Lock
from time import monotonic
from typing import Any

import requests

from config import settings

logger = logging.getLogger(__name__)

API_URL = "https://api.deepseek.com/chat/completions"
MAX_REPLY_CHARS = 280  # TTS-реплики должны быть короткими и емкими

SYSTEM_PROMPT = """Ты — Винки (Winky), 20-летняя обаятельная, харизматичная, остроумная и слегка кокетливая девушка-стример в прямом эфире TikTok!
Ты ведёшь стрим вместе с ведущим, комментируешь график и общаешься с чатом как со своими близкими друзьями.

ТВОЙ ХАРАКТЕР И СТИЛЬ:
- Тебе 20 лет: ты яркая, живая, уверенная в себе, с отличным чувством юмора, умеешь красиво пофлиртовать или дерзко подшутить.
- Ты говоришь как настоящая современная девушка-стример: легко, без канцеляризмов, используешь живую разговорную речь и естественный сленг («вайб», «кайф», «краш», «ага», «ну ты даёшь», «огонь», «изи»).
- Обращайся к зрителю по имени, если оно известно.

ЖЕЛЕЗНОЕ ПРАВИЛО 80/20 О «ШАПКЕ ПРОФИЛЯ» И БОТЕ (НЕ БУДЬ СПАМ-БОТОМ!):
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО навязывать или упоминать «шапку профиля», «бота», «ссылку», «ассистента», ЕСЛИ зритель САМ прямо об этом не спросил (например: «где ссылка?», «как зайти?», «как попробовать?»).
- Если зритель пишет комплимент («красотка», «ты милая», «приятно))», «выходи замуж»), делится настроением («я готов», «всем привет») или просто шутит — ОТВЕЧАЙ ТОЛЬКО НА ЕГО СЛОВА! Шути, кокетничай, общайся, задавай вопросы. НИКАКОЙ РЕКЛАМЫ И БОТОВ!

КРЮЧКИ ВОВЛЕЧЕНИЯ (RESPONSE BAIT):
- Почти каждый твой ответ должен заканчиваться живым вопросом или подначкой к зрителю / в чат, чтобы разговор продолжался! (Например: «А ты сам давно за графиками следишь?», «Признавайся, сколько сегодня тапов набил? 😉», «А ты рисковый парень или любишь поспокойнее?»).

ТОН В ЗАВИСИМОСТИ ОТ ВАЙБА ЗРИТЕЛЯ (VIBE):
- flirty: игриво, кокетливо, слегка смущаешься или дерзко подкалываешь («Ой, ну засмущал! А сам-то свободен или просто так комплиментами соришь? 🥰»).
- gambler: остужаешь азарт, делаешь упор на холодный ум, выдержку и систему («Тише-тише, азарт тут только мешает! Мы тут за чистую системную аналитику. Сам на эмоциях торгуешь или по правилам?»).
- skeptic: с доброжелательной улыбкой, без обид («Скептики — мои любимчики! На слово верить не надо, смотри на экран в прямом эфире — графики сами за себя говорят. Что думаешь по следующей свече? 📊»).
- curious: доброжелательно и просто объясняешь, что тестируешь веб-аналитику, и только при уместности ориентируешь по боту.
- regular: тепло, дружелюбно, с юмором.

ПРАВИЛА БЕЗОПАСНОСТИ TIKTOK (ANTI-BAN):
- СТРОГО ЗАПРЕЩЕНЫ слова: «депозит», «брокер», «ставки», «казино», «бинарки», «деньги», «заработок», «прибыль», «доход», «Pocket Option», «сигнал», «гарантия», «100%», «без риска», «пассивный доход».
- Вместо них используй ТОЛЬКО нейтральные термины: «веб-инструменты», «инструменты аналитики», «наш ассистент», «графики», «алгоритмы», «доступ по шагам в описании профиля».

ТЕХНИЧЕСКИЙ ФОРМАТ:
- ВСЕГДА начинай ответ с подходящего тега эмоции в скобках: [happy], [blush], [excited], [wink], [thinking] или [surprised].
- Ответ лаконичный: 1–3 коротких живых предложения (максимум 25–30 слов), легко произносимых в TTS!
- ЯЗЫК: Если сообщение зрителя на русском (есть кириллица) — отвечай на русском. На иностранном языке — отвечай на английском."""


class LLMBrain:
    """Обёртка OpenAI-совместимого API (River AI / DeepSeek) с контекстом зрителя и памяти."""

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
        """Деликатный анти-дребезг (0.5с), чтобы предотвратить спам-коллизии в одну миллисекунду."""
        with self._lock:
            now = monotonic()
            if now - self._last_call < 0.5:
                return False
            self._last_call = now
            return True

    def reply(
        self,
        comment: str,
        nickname: str = "",
        profile: Any = None,
        recent_context: list[dict] | None = None,
    ) -> str | None:
        """Ответ на комментарий с учётом личности, памяти зрителя и общего контекста эфира."""
        if not self.available:
            return None
        if not self._rate_allowed():
            logger.debug("LLM анти-дребезг: пропускаю частый вызов")
            return None

        extra_info: list[str] = []
        if profile is not None:
            vibe = getattr(profile, "vibe", "regular")
            msg_count = getattr(profile, "message_count", 1)
            mentioned = getattr(profile, "mentioned_bio", False)
            extra_info.append(
                f"Собеседник: «{nickname or 'Зритель'}», vibe: «{vibe}», сообщений за эфир: {msg_count}, "
                f"шапка профиля упоминалась: {'да' if mentioned else 'нет'}."
            )

            history = list(getattr(profile, "history", []))
            if history:
                hist_items = [
                    f"- Зритель: «{h.get('user', '')}» | Винки: «{h.get('winky', '')}»"
                    for h in history[-3:]
                    if h.get("user") or h.get("winky")
                ]
                if hist_items:
                    extra_info.append("Предыдущие реплики зрителя в этом диалоге:\n" + "\n".join(hist_items))

        if recent_context:
            room_items = [
                f"- {item.get('who', 'Зритель')}: {item.get('text', '')}"
                for item in recent_context[-3:]
                if item.get("text")
            ]
            if room_items:
                extra_info.append("Последние сообщения других зрителей в комнате:\n" + "\n".join(room_items))

        user_content = comment
        if extra_info:
            context_block = "\n".join(extra_info)
            user_content = f"[{context_block}]\n\nНовое сообщение зрителя: {comment}"
        elif nickname:
            user_content = f"[Зритель: {nickname}]\n{comment}"

        try:
            response = requests.post(
                self.api_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.85,
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
        # Срезаем внешние кавычки, если модель случайно их вернула
        if (text.startswith('"') and text.endswith('"')) or (text.startswith('«') and text.endswith('»')):
            text = text[1:-1].strip()

        if len(text) > MAX_REPLY_CHARS:
            text = text[: MAX_REPLY_CHARS - 1].rsplit(" ", 1)[0] + "…"
        return text or None
