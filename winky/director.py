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
import random
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
    profile: Any = None
    recent_context: list[dict] = field(default_factory=list)


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
        self._event_log: deque[dict] = deque(maxlen=100)
        self._last_chat_speak_time: float = 0.0
        self._commentary_used: dict[str, float] = {}
        self._observed_speech_end = 0.0
        self._next_commentary_at = time.time() + 4
        self._commentary_attempt_at = 0.0
        self._commentary_session = None
        self._announced_result = None
        self._important_attempt_at = 0.0
        self.cta_enabled = True
        self.stream_lang = 'ru'
        self._last_loss_at = 0.0
        self._cta_lock = threading.Lock()

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
            if incoming.get('auto_stream') is True:
                from winky.commentary import seconds
                if time.time() - seconds(incoming['created_at']) > 3:
                    return {'ok': True, 'stale': True}
            if incoming['created_at'] < self.context.get('created_at', 0):
                return {'ok': True, 'stale': True}
            incoming.update(pair=pair or self._current_pair, remaining_sec=remaining_sec)
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
        profile: Any = None,
        recent_context: list[dict] | None = None,
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
            profile=profile,
            recent_context=list(recent_context or []),
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
                        if item.profile is not None or item.recent_context:
                            reply_text = self._brain.reply(item.text, nickname=item.user,
                                profile=item.profile, recent_context=item.recent_context)
                        else:
                            reply_text = self._brain.reply(item.text, nickname=item.user)
                    except Exception as ex:
                        logger.warning("Ошибка brain.reply: %s", ex)
                if not reply_text:
                    from winky.deepseek import generate_smart_local_reply
                    reply_text = generate_smart_local_reply(item.user, item.text, item.lang)

            from winky.speech_rotation import shared_rotation, fingerprint
            if fingerprint(reply_text) in {fingerprint(t) for t in shared_rotation().recent_texts(20)}:
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
        while not self._stop_event.wait(0.25):
            self.tick()

    def note_commentary_started(self, event: dict) -> None:
        with self._lock:
            self._commentary_used[event['commentary_fact_key']] = time.time()

    def note_voice_started(self, event: dict) -> None:
        self._log_event({'type': 'voice_start', 'category': event.get('category'),
                         'event_id': event.get('event_id'), 'file_id': event.get('file_id'),
                         'text': event.get('text'), 'source': event.get('voice_source'),
                         'pair': event.get('pair'), 'trade_seq': event.get('trade_seq'), 'time': time.time()})
        if event.get('category') in ('TRADE_WIN', 'TRADE_LOSS', 'TRADE_REFUND'):
            self._announced_result = (event.get('session_id'), event.get('trade_seq'))
        if event.get('category') == 'TRADE_LOSS':
            self._last_loss_at = time.time()

    def cta_allowed(self, now):
        from winky.commentary import seconds
        result = self.context.get('last_result') or {}
        loss_at = max(self._last_loss_at, seconds(result.get('closed_at')) if result.get('outcome') == 'LOSS' else 0)
        return (self.cta_enabled and self.trade_phase in ('IDLE', 'ANALYZING', 'IN_TRADE', 'COOLDOWN')
                and now - loss_at >= 60)

    def current_language(self, now=None):
        now = time.time() if now is None else now
        if 0 <= now - self._last_phase_update <= 3:
            return self.context.get('lang', self.stream_lang)
        return self.stream_lang

    def maybe_cta(self, now=None, lang=None):
        """The only automatic CTA scheduler, shared by Pocket and standalone."""
        if not self._cta_lock.acquire(blocking=False):
            return False
        try:
            return self._maybe_cta(now, lang)
        finally:
            self._cta_lock.release()

    def _maybe_cta(self, now=None, lang=None):
        now = time.time() if now is None else now
        if not self._tts or not hasattr(self._tts, 'voice_bank') or not self.cta_allowed(now):
            return False
        rotation = self._tts.voice_bank.rotation
        from winky.speech_rotation import SpeechRotation
        if not isinstance(rotation, SpeechRotation):
            return False
        if not rotation.cta_due(now) or self.is_speaking:
            return False
        state = self._tts.narration_state()
        self._sync_speech_gap(state.get('ended_at', 0))
        if state.get('paused') or state.get('foreground_ready') or state.get('background_pending'):
            return False
        with self._lock:
            if any(i.ready and not i.failed and not i.played for i in self._chat_queue):
                return False
        if now < self._next_commentary_at:
            return False
        language = lang or self.current_language(now)
        event = dict(category='NARRATE_CTA', lang=language, created_at=now,
                     event_id=f'cta:{int(now // 8)}', ttl_sec=8, automatic_cta=True)
        if self.trade_phase == 'IN_TRADE':
            from winky.commentary import context_valid
            if not context_valid(self.context, self._last_phase_update, now):
                return False
            event.update(session_id=self.context.get('session_id'), trade_seq=self.context.get('trade_seq'),
                         pair=self.context.get('pair'), max_duration_sec=max(0, self.remaining_sec - (now - self._last_phase_update) - 2))
        if not self._tts.voice_bank.candidates(event):
            return False
        return bool(self._tts.enqueue_voice_event(event).get('ok'))

    def _sync_speech_gap(self, ended_at):
        with self._lock:
            if ended_at != self._observed_speech_end:
                self._observed_speech_end = ended_at
                self._next_commentary_at = ended_at + random.uniform(4, 7)

    def tick(self, now=None) -> None:
        from winky.commentary import choices, context_valid
        now = time.time() if now is None else now
        with self._lock:
            phase, context = self._trade_phase, dict(self.context)
            age = max(0, now - self._last_phase_update)
            if age > 20:
                self._trade_phase = phase = 'IDLE'
            rem = max(0, self._remaining_sec - age)
            received_at = self._last_phase_update
        if not self._tts:
            return
        state = self._tts.narration_state() if hasattr(self._tts, 'narration_state') else {}
        if state.get('paused'):
            return
        if self._commentary_session != context.get('session_id'):
            self._commentary_session = context.get('session_id')
            self._commentary_used.clear()
            if self._announced_result and self._announced_result[0] != self._commentary_session:
                self._announced_result = None
        result = context.get('last_result') or {}
        if (context_valid(context, received_at, now) and phase != 'IN_TRADE'
                and self._announced_result == (context.get('session_id'), result.get('seq'))
                and now - self._important_attempt_at >= 1):
            self._important_attempt_at = now
            for category, key, scope, extra, cooldown in choices(context, phase, now):
                if category != 'NARRATE_RESULT':
                    continue
                key = f"{context.get('session_id')}:{context.get('lang','ru')}:{key}"
                if key in self._commentary_used or key in state.get('pending_fact_keys', []):
                    continue
                event = {**context, **extra, 'category': category, 'commentary': True,
                         'commentary_scope': scope, 'commentary_fact_key': key,
                         'event_id': f'{key}:{int(now*1000)}', 'created_at': now, 'ttl_sec': 15}
                if self._tts.voice_bank.candidates(event):
                    self._tts.enqueue_voice_event(event)
                    break
        if self.is_speaking:
            return
        ended_at = state.get('ended_at', 0)
        self._sync_speech_gap(ended_at)
        # Ready viewer replies outrank idle commentary even during analysis.
        if phase in ('IDLE', 'ANALYZING', 'COOLDOWN', 'IN_TRADE') and now - self._last_chat_speak_time >= 3.8:
            with self._lock:
                items = []
                for item in list(self._chat_queue):
                    if now - item.created_at > 90 or item.failed or item.played:
                        self._chat_queue.remove(item)
                    elif item.ready and not item.dispatched:
                        items.append(item)
            from winky.tts import media_duration_seconds
            for item in items:
                duration = media_duration_seconds(item.media_path) if item.media_path else 9
                if duration > 8:
                    item.failed = True
                    continue
                if phase == 'IN_TRADE' and duration + 2 > rem:
                    continue
                item.dispatched = True
                self._dispatch_chat_item(item)
                return
        if self.maybe_cta(now):
            return
        if (not context_valid(context, received_at, now) and now - received_at > 3
                and not state.get('foreground_ready') and not state.get('background_pending')
                and now >= self._next_commentary_at and now - self._commentary_attempt_at >= 1):
            from winky.speech_rotation import SpeechRotation
            rotation = getattr(self._tts.voice_bank, 'rotation', None)
            if isinstance(rotation, SpeechRotation):
                self._commentary_attempt_at = now
                options = [(c,) for c in ('NARRATE_ENGAGE', 'NARRATE_LESSON')]
                for (category,) in rotation.topic_order(options, self.stream_lang):
                    event = dict(category=category, lang=self.stream_lang, standalone=True,
                                 created_at=now, ttl_sec=8, event_id=f'standalone:{int(now*1000)}')
                    if self._tts.enqueue_voice_event(event).get('ok'):
                        return
        if (not context_valid(context, received_at, now) or phase == 'RESULT'
                or state.get('foreground_ready') or state.get('background_pending')
                or now < self._next_commentary_at or now - self._commentary_attempt_at < 1):
            return
        self._commentary_attempt_at = now
        available_choices = list(choices(context, phase, now))
        # Facts with one-shot keys stay first; recurrent topics share airtime.
        factual = [c for c in available_choices if c[4] == 0]
        background = [c for c in available_choices if c[4] != 0]
        from winky.speech_rotation import SpeechRotation
        rotation = getattr(self._tts.voice_bank, 'rotation', None)
        if isinstance(rotation, SpeechRotation):
            background = rotation.topic_order(background, context.get('lang', 'ru'))
        for category, key, scope, extra, cooldown in factual + background:
            if category == 'NARRATE_RESULT':
                continue  # Important follow-ups use the result-announcement guard above.
            key = f"{context.get('session_id')}:{context.get('lang','ru')}:{key}"
            previous = self._commentary_used.get(key)
            if previous is not None and (cooldown == 0 or now - previous < cooldown):
                continue
            event = {**context, **extra, 'category': category, 'commentary': True,
                     'commentary_scope': scope, 'commentary_fact_key': key,
                     'event_id': f"{context.get('session_id')}:narrate:{key}:{int(now*1000)}",
                     'created_at': now, 'ttl_sec': 8, 'emotion': 'happy'}
            candidates = self._tts.voice_bank.candidates(event)
            fitting = [r for r in candidates if phase != 'IN_TRADE' or r.get('duration', 99) + 2 <= rem]
            if not fitting:
                continue
            # Duration admission still repeats at actual playback.
            if phase == 'IN_TRADE':
                event['max_duration_sec'] = rem - 2
            if self._tts.enqueue_voice_event(event).get('ok'):
                return

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
            "status": "queued_for_playback",
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
            commentary = {key: self.context.get(key) for key in
                          ('auto_stream', 'lang', 'setup', 'setup_confirmed', 'trade_seq',
                           'data_status', 'entry_observed_at', 'next_stake', 'last_result')}
            commentary['heartbeat_age_sec'] = round(max(0, time.time() - self._last_phase_update), 2)

        is_speaking = self.is_speaking
        return {
            "phase": phase,
            "remaining_sec": rem,
            "current_pair": pair,
            "is_speaking": is_speaking,
            "queue_len": q_len,
            "commentary": commentary,
            "recent_events": self.get_recent_events(),
        }


# Глобальный синглтон режиссера стрима
stream_director = StreamDirector()
