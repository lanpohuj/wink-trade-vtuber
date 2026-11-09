"""Режиссёр Стрима (StreamDirector) для Winky VTuber.

Координирует фазы торговли на Pocket Option и живое общение с TikTok-чатом:
Готовые торговые записи и ответы зрителям передаются одному SpeechController.
Подготовка двух ответов в фоне не блокирует готовую речь; текущая фраза
договаривается, а торговля продолжает работать независимо от аудио.
"""

from __future__ import annotations

import logging
import concurrent.futures
import re
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass
class ChatItem:
    """Элемент очереди сообщений чата с упреждающим синтезом."""

    user: str
    text: str
    lang: str = "ru"
    created_at: float = field(default_factory=time.time)
    reply_text: str = ""
    emotion: str = "happy"
    media_path: Path | None = None
    ready: bool = False
    failed: bool = False
    played: bool = False
    dispatched: bool = False


class StreamDirector:
    """Режиссёр Стрима: фазы сделок Pocket Option + TikTok-чат."""

    def __init__(
        self,
        brain: Any = None,
        tts: Any = None,
        on_event_log: Callable[[dict], None] | None = None,
        on_feed: Callable[[dict], None] | None = None,
    ) -> None:
        self._brain = brain
        self._tts = tts
        self._on_event_log = on_event_log
        self._on_feed = on_feed

        self._trade_phase: str = "IDLE"  # IDLE | ANALYZING | IN_TRADE | RESULT
        self.context: dict = {}
        self._remaining_sec: int = 0
        self._current_pair: str = "AED/CNY OTC"
        self._last_phase_update: float = time.time()

        self._chat_queue: deque[ChatItem] = deque(maxlen=6)
        self._chat_workers = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="winky-chat")
        self._event_log: deque[dict] = deque(maxlen=8)
        self._last_chat_speak_time: float = 0.0

        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        if self._chat_workers._shutdown:
            self._chat_workers = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="winky-chat")
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="winky-stream-director", daemon=True)
        self._thread.start()
        logger.info("StreamDirector запущен")

    def stop(self) -> None:
        self._stop_event.set()
        with self._lock:
            for item in self._chat_queue:
                item.failed = True
            self._chat_queue.clear()
        self._chat_workers.shutdown(wait=False, cancel_futures=True)

    def set_brain(self, brain: Any) -> None:
        self._brain = brain

    def set_tts(self, tts: Any) -> None:
        self._tts = tts

    def set_feed_callback(self, on_feed: Callable[[dict], None]) -> None:
        self._on_feed = on_feed

    # ---------- Фазы Pocket Option ----------

    def update_trade_phase(self, phase: str, pair: str = "", remaining_sec: int = 0, context: dict | None = None) -> dict:
        """Обновляет текущую фазу торговли из Pocket Option."""
        with self._lock:
            incoming = dict(context or {})
            try:
                incoming['created_at'] = float(incoming.get('created_at', time.time() * 1000))
                remaining_sec = max(0, int(remaining_sec))
            except (TypeError, ValueError, OverflowError):
                return {'ok': False, 'error': 'invalid_phase_context'}
            if str(phase).upper() not in ('IDLE', 'ANALYZING', 'IN_TRADE', 'RESULT', 'COOLDOWN'):
                return {'ok': False, 'error': 'invalid_phase'}
            if incoming['created_at'] < self.context.get('created_at', 0):
                return {'ok': True, 'stale': True}
            self.context = dict(incoming)
            old_phase = self._trade_phase
            self._trade_phase = phase.upper()
            if pair:
                self._current_pair = pair
            self._remaining_sec = max(0, int(remaining_sec))
            self._last_phase_update = time.time()

        if old_phase != self._trade_phase:
            logger.info("StreamDirector: сменя фазы [%s -> %s] (пара: %s, остаток: %ds)", old_phase, self._trade_phase, self._current_pair, self._remaining_sec)
            self._log_event({
                "type": "phase",
                "text": f"Торговая фаза: {self._trade_phase} ({self._current_pair})",
                "time": time.time(),
            })

        is_speaking = False
        if self._tts and hasattr(self._tts, "speaking"):
            is_speaking = bool(self._tts.speaking)

        return {
            "ok": True,
            "phase": self._trade_phase,
            "is_speaking": is_speaking,
            "queue_len": len(self._chat_queue),
        }

    @property
    def trade_phase(self) -> str:
        return self._trade_phase

    @property
    def remaining_sec(self) -> int:
        return self._remaining_sec

    @property
    def is_speaking(self) -> bool:
        if self._tts and hasattr(self._tts, "speaking"):
            return bool(self._tts.speaking)
        return False

    # ---------- Очередь чата и фоновый пре-синтез ----------

    def enqueue_chat_comment(
        self,
        user: str,
        text: str,
        lang: str = "ru",
        emotion: str = "happy",
        reply_text: str = "",
    ) -> None:
        """Добавляет входящий комментарий зрителя в очередь с немедленным фоновым пре-синтезом."""
        from winky.censor import check_phrase
        clean_user = re.sub(r"[^\w -]", "", user, flags=re.UNICODE).strip()[:32] or "Зритель"
        if not check_phrase(clean_user)[0]:
            clean_user = "Зритель" if lang == "ru" else "Viewer"
        clean_text = text.strip()
        if not check_phrase(clean_text)[0]:
            return
        if not clean_text:
            return

        item = ChatItem(
            user=clean_user,
            text=clean_text,
            lang=lang,
            emotion=emotion,
            reply_text=reply_text.strip(),
        )

        with self._lock:
            for queued in list(self._chat_queue):
                if time.time() - queued.created_at > 90 or queued.failed or queued.played:
                    self._chat_queue.remove(queued)
            if len(self._chat_queue) >= 6 or any(q.user == clean_user or q.text.casefold() == clean_text.casefold() for q in self._chat_queue):
                return
            self._chat_queue.append(item)

        self._log_event({
            "type": "comment",
            "user": clean_user,
            "text": clean_text,
            "status": "queued",
            "time": time.time(),
        })

        # Запускаем фоновый пре-синтез (текст ответа + .mp3 файл)
        self._chat_workers.submit(self._pre_synthesize, item)

    def _pre_synthesize(self, item: ChatItem) -> None:
        """В фоне генерирует ответ и синтезирует .mp3 файл до начала воспроизведения."""
        try:
            if item.failed or time.time() - item.created_at > 90:
                item.failed = True
                return
            reply_text = item.reply_text
            if not reply_text:
                if self._brain and hasattr(self._brain, "reply"):
                    try:
                        reply_text = self._brain.reply(item.text, nickname=item.user)
                    except Exception as ex:
                        logger.warning("Ошибка brain.reply: %s", ex)
                if not reply_text:
                    from winky.deepseek import generate_smart_local_reply
                    reply_text = generate_smart_local_reply(item.user, item.text, item.lang)

            # Проверка цензуры
            try:
                from winky.censor import check_phrase
                ok, reason = check_phrase(reply_text)
                if not ok:
                    logger.warning("Ответ чату отфильтрован цензурой (%s): «%s»", reason, reply_text)
                    item.failed = True
                    return
            except Exception as e:
                logger.warning("Ошибка check_phrase: %s", e)

            # One complete short answer; never cut an already generated MP3.
            sentences = re.split(r"(?<=[.!?])\s+", reply_text.strip())
            reply_text = sentences[0] if len(reply_text) > 130 else reply_text
            if len(reply_text) > 160:
                item.failed = True
                return
            item.reply_text = reply_text

            # Извлекаем эмоцию из тега [happy], [blush], [wink]
            emo = item.emotion
            if reply_text.startswith("[") and "]" in reply_text[:15]:
                extracted = reply_text[1:reply_text.index("]")].lower()
                if extracted in ("happy", "blush", "excited", "wink", "thinking", "surprised", "wave"):
                    emo = extracted

            item.emotion = emo

            # Синтезируем аудиофайл через Lumean / кэш
            if self._tts and hasattr(self._tts, "engine"):
                engine = self._tts.engine
                # Очищаем тег для аудио
                clean_for_audio = reply_text
                if clean_for_audio.startswith("[") and "]" in clean_for_audio[:15]:
                    clean_for_audio = clean_for_audio[clean_for_audio.index("]") + 1:].strip()

                if hasattr(engine, "synthesize"):
                    media = engine.synthesize(clean_for_audio, item.lang)
                    if item.failed or time.time() - item.created_at > 90:
                        item.failed = True
                        return
                    item.media_path = media
                    item.ready = True
                    logger.info("Пре-синтез для зрителя %s готов: «%s» (%s)", item.user, reply_text[:35], media.name)
                    return

            item.failed = True
            item.ready = True
        except Exception as exc:
            logger.warning("Ошибка пре-синтеза для %s: %s", item.user, exc)
            item.failed = True
            item.ready = True

    # ---------- Диспетчер режиссуры ----------

    def _run(self) -> None:
        """Основной цикл Режиссёра Стрима."""
        while not self._stop_event.is_set():
            time.sleep(0.25)

            now = time.time()
            with self._lock:
                # Если сигналы от расширения не поступали более 20 сек — считаем режим IDLE
                if now - self._last_phase_update > 20.0 and self._trade_phase != "IDLE":
                    self._trade_phase = "IDLE"
                phase = self._trade_phase
                rem = self._remaining_sec

            can_speak_chat = (phase == "IN_TRADE" and rem >= 4) or (phase == "IDLE")

            if not can_speak_chat:
                continue

            # Проверяем, не говорит ли Winky сейчас
            if self.is_speaking:
                continue

            # Анти-дребезг между репликами чата (минимум 3.8 сек)
            if now - self._last_chat_speak_time < 3.8:
                continue

            # Ищем готовый элемент в очереди
            item_to_play: ChatItem | None = None
            with self._lock:
                for item in list(self._chat_queue):
                    if time.time() - item.created_at > 90 or item.failed or item.played:
                        self._chat_queue.remove(item)
                        continue
                    if item.ready and not item.played and not item.dispatched:
                        item_to_play = item
                        item.dispatched = True
                        break

            if item_to_play:
                from winky.tts import media_duration_seconds
                duration = media_duration_seconds(item_to_play.media_path) if item_to_play.media_path else 9
                if duration > 8:
                    item_to_play.failed = True
                elif phase == "IN_TRADE" and duration + 2 > rem:
                    item_to_play.dispatched = False
                else:
                    self._dispatch_chat_item(item_to_play)
            elif phase == "IN_TRADE" and rem >= 10:
                # Полезные фишки стратегии и вовлечение зрителей (stream_insight) раз в 90–120с, если в чате тихо
                if now - getattr(self, "_last_insight_time", 0.0) >= 95.0:
                    self._last_insight_time = now
                    if self._tts and hasattr(self._tts, "speak_stream_category"):
                        self._tts.speak_stream_category("stream_insight", lang=self.context.get("lang", "ru"), emotion="happy")

    def _dispatch_chat_item(self, item: ChatItem) -> None:
        """Передаёт подготовленную реплику чата в SpeechController."""
        if not self._tts:
            return

        self._last_chat_speak_time = time.time()
        logger.info("🎬 StreamDirector: выдача ответа чату [%s]: «%s»", item.user, item.reply_text[:40])

        self._log_event({
            "type": "chat_reply",
            "user": item.user,
            "text": item.reply_text,
            "status": "speaking",
            "time": time.time(),
        })

        if self._on_feed:
            try:
                self._on_feed({"kind": "winky", "who": "Winky", "text": item.reply_text})
            except Exception:
                pass

        if hasattr(self._tts, "speak_chat_item"):
            if not self._tts.speak_chat_item(item):
                item.dispatched = False
        elif hasattr(self._tts, "speak"):
            self._tts.speak(
                item.reply_text,
                lang=item.lang,
                emotion=item.emotion,
                source=f"tiktok_chat_{item.user}",
            )

    # ---------- Лог событий для пульта управления ----------

    def _log_event(self, event: dict) -> None:
        with self._lock:
            self._event_log.append(event)
        if self._on_event_log:
            try:
                self._on_event_log(event)
            except Exception:
                pass

    def get_recent_events(self) -> list[dict]:
        with self._lock:
            return list(self._event_log)

    def get_status(self) -> dict:
        with self._lock:
            q_len = len(self._chat_queue)
            phase = self._trade_phase
            rem = self._remaining_sec
            pair = self._current_pair

        is_speaking = self.is_speaking
        return {
            "phase": phase,
            "remaining_sec": rem,
            "current_pair": pair,
            "is_speaking": is_speaking,
            "queue_len": q_len,
            "recent_events": self.get_recent_events(),
        }


# Глобальный синглтон режиссера стрима
stream_director = StreamDirector()
