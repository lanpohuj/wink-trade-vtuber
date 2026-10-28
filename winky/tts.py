"""Голос Winky: движки TTS и контроллер очереди речи.

Движки:
  * ``SayTTS`` — встроенный macOS ``say`` (бесплатно, локально, разные голоса для RU/EN);
  * ``ElevenLabsTTS`` — облачный, один multilingual-голос на все языки
    (включается ключами ``ELEVENLABS_API_KEY`` + ``ELEVENLABS_VOICE_ID``).

Синтез пишется в ``winky/web/media/`` — оттуда файл играет сам аватар
(Web Audio), поэтому lipsync по амплитуде работает из коробки.
"""

from __future__ import annotations

import json
import logging
import math
import struct
import subprocess
import threading
import time
import wave
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import requests

from config import settings
from winky.censor import check_phrase, strip_emoji_control

logger = logging.getLogger(__name__)

MEDIA_DIR = Path(__file__).parent / "web" / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

EMOTIONS = ("idle", "happy", "excited", "thinking", "wink", "blush", "surprised", "neutral", "win", "wave", "dance")


def detect_lang(text: str) -> str:
    """Язык фразы по алфавиту: кириллица -> ru, иначе en."""
    return "ru" if any("а" <= ch.lower() <= "я" for ch in text) else "en"


class TTSError(RuntimeError):
    """Синтез не удался."""


class SayTTS:
    """Локальный TTS macOS: say -> wav."""

    name = "macOS say"

    def synthesize(self, text: str, lang: str) -> Path:
        voice = settings.WINKY_VOICE_RU if lang == "ru" else settings.WINKY_VOICE_EN
        out = MEDIA_DIR / f"say_{time.monotonic_ns()}.wav"
        try:
            subprocess.run(
                ["say", "-v", voice, "-r", "215", "-o", str(out), "--data-format=LEI16@22050", text],
                check=True,
                capture_output=True,
                timeout=30,
            )
        except (subprocess.SubprocessError, OSError) as exc:
            raise TTSError(f"say не смог озвучить: {exc}") from exc
        return out


FEMALE_VOICE_PRESETS = {
    "marusya": "hLjwV7lYzk15SWLUmhEH",  # Marusya G – Slow Romantic Storytelling (multilingual V2)
    "jessica": "cgSgspJ2msm6clMCkdW9",  # Jessica – Playful, bright, cute
    "laura": "FGY2WhTYpPnrIDTdsKH5",    # Laura – Sassy, upbeat, streamer
    "sarah": "EXAVITQu4vr4xnSDxMaL",    # Sarah – Mature, reassuring
}

DEFAULT_LUMEAN_VOICE_ID = "hLjwV7lYzk15SWLUmhEH"


class EdgeTTS:
    """Бесплатный высококачественный мультиязычный женский голос Microsoft (Ava)."""

    name = "edge-tts (Ava Multilingual)"
    VOICE = "en-US-AvaMultilingualNeural"

    def get_cache_path(self, text: str) -> Path:
        cache_dir = MEDIA_DIR / "cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        import hashlib
        cache_key = hashlib.md5(f"edge_{self.VOICE}_{text.strip()}".encode("utf-8")).hexdigest()
        return cache_dir / f"edge_{cache_key}.mp3"

    def synthesize(self, text: str, lang: str = "ru") -> Path:
        out = self.get_cache_path(text)
        if out.exists() and out.stat().st_size > 500:
            logger.info("edge-tts аудио найдено в локальном кэше: %s", out.name)
            return out

        try:
            import asyncio
            import edge_tts

            async def _run() -> None:
                communicate = edge_tts.Communicate(text, voice=self.VOICE)
                await communicate.save(str(out))

            asyncio.run(_run())
            if not out.exists() or out.stat().st_size == 0:
                raise TTSError("edge-tts создал пустой файл")
            logger.info("edge-tts (Ava) успешно сгенерировал речь: %s (%d байт)", out.name, out.stat().st_size)
            return out
        except Exception as exc:
            raise TTSError(f"edge-tts ошибка синтеза: {exc}") from exc


class LumeanTTS:
    """Облачный TTS через Lumean API (https://lumean.app): Cartesia / ElevenLabs с оплатой в РФ."""

    name = "Lumean"
    BASE_URL = "https://api.lumean.app/api/public"

    def __init__(self) -> None:
        self._template_id: str | None = settings.LUMEAN_TEMPLATE_ID or None
        self._voice_id: str = settings.LUMEAN_VOICE_ID or DEFAULT_LUMEAN_VOICE_ID
        self._fallback = EdgeTTS()
        self._backoff_until: float = 0.0

    def set_template_id(self, template_id: str) -> None:
        clean = template_id.strip()
        if clean:
            self._template_id = clean
            logger.info("Установлен новый Lumean Template ID: %s", clean)

    def set_voice_id(self, voice_id: str) -> None:
        clean = voice_id.strip()
        # Проверяем, не передан ли ключ пресета (например 'marusya')
        if clean.lower() in FEMALE_VOICE_PRESETS:
            clean = FEMALE_VOICE_PRESETS[clean.lower()]
        if clean and clean != self._voice_id:
            self._voice_id = clean
            self._template_id = None
            logger.info("Установлен новый Lumean Voice ID: %s (шаблон сброшен)", clean)

    def get_settings(self) -> dict[str, str]:
        return {
            "template_id": self._template_id or settings.LUMEAN_TEMPLATE_ID or "",
            "voice_id": self._voice_id or settings.LUMEAN_VOICE_ID or DEFAULT_LUMEAN_VOICE_ID,
        }

    def _headers(self) -> dict[str, str]:
        return {
            "X-API-KEY": settings.LUMEAN_API_KEY,
            "Content-Type": "application/json",
        }

    def _ensure_template(self) -> str:
        """Получает или создаёт шаблон TTS в Lumean."""
        if self._template_id and len(self._template_id) == 36 and "-" in self._template_id:
            return self._template_id

        # 1. Проверяем существующие шаблоны
        voice_target = self._voice_id or DEFAULT_LUMEAN_VOICE_ID
        try:
            resp = requests.get(
                f"{self.BASE_URL}/templates?per_page=30",
                headers=self._headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                payload = resp.json()
                items = payload.get("data", {}).get("items", []) if isinstance(payload.get("data"), dict) else payload.get("data", [])
                for item in items:
                    cfg = item.get("config", {}).get("tts_settings", {})
                    if cfg.get("voice_id") == voice_target:
                        self._template_id = str(item["id"])
                        logger.info("Использую существующий шаблон Lumean для %s: %s (%s)", voice_target, item.get("name"), self._template_id)
                        return self._template_id
        except requests.RequestException as exc:
            logger.debug("Не удалось получить список шаблонов Lumean: %s", exc)

        # 2. Создаём новый шаблон WinkyStreamTTS
        config = {
            "tts_settings": {
                "mode": "mode_v1",
                "model_id": "eleven_multilingual_v2",
                "voice_id": voice_target,
                "advanced_voice_settings": True,
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "use_speaker_boost": True,
                    "speed": 1.0,
                },
            }
        }
        resp = requests.post(
            f"{self.BASE_URL}/templates",
            headers=self._headers(),
            json={
                "service_key": "elevenlabs",
                "name": f"WinkyStreamTTS_{voice_target[:6]}",
                "config": config,
            },
            timeout=8,
        )
        resp.raise_for_status()
        created = resp.json()
        template_id = str(created.get("data", {}).get("id"))
        self._template_id = template_id
        logger.info("Создан шаблон WinkyStreamTTS в Lumean: %s", template_id)
        return template_id

    def synthesize(self, text: str, lang: str) -> Path:
        voice_override = self._voice_id or settings.LUMEAN_VOICE_ID or DEFAULT_LUMEAN_VOICE_ID
        cache_dir = MEDIA_DIR / "cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        import hashlib
        cache_key = hashlib.md5(f"{voice_override}_multilingual_v2_{text.strip()}".encode("utf-8")).hexdigest()
        cached_file = cache_dir / f"lumean_{cache_key}.mp3"
        edge_cached = self._fallback.get_cache_path(text)
        if cached_file.exists() and cached_file.stat().st_size > 1000:
            logger.info("Аудио найдено в локальном кэше (0 мс задержка): %s", cached_file.name)
            return cached_file
        if edge_cached.exists() and edge_cached.stat().st_size > 500:
            logger.info("edge-tts аудио найдено в локальном кэше (0 мс задержка): %s", edge_cached.name)
            return edge_cached

        # Мгновенная проверка Circuit Breaker и наличия API-ключа
        now = time.monotonic()
        if now < self._backoff_until or not settings.LUMEAN_API_KEY:
            if now < self._backoff_until:
                logger.info("Lumean Circuit Breaker активен (бэкофф ещё %.1f с) — мгновенный fallback на edge-tts", self._backoff_until - now)
            return self._fallback.synthesize(text, lang)

        out = cached_file
        try:
            template_id = self._ensure_template()

            # 1. Создание заказа строго по спецификации Lumean API (POST /orders)
            order_payload: dict = {
                "template_id": template_id,
                "input_text": text,
            }

            create_resp = requests.post(
                f"{self.BASE_URL}/orders",
                headers=self._headers(),
                json=order_payload,
                timeout=3,
            )
            create_resp.raise_for_status()
            order_data = create_resp.json().get("data", {})
            order_id = order_data.get("id")
            if not order_id:
                raise TTSError(f"Lumean не вернул order_id: {create_resp.text}")

            # 2. Быстрый опрос статуса выполнения (каждые 0.25 с, макс 2.0 с)
            start_poll = time.monotonic()
            file_path: str | None = None
            while time.monotonic() - start_poll < 2.0:
                time.sleep(0.25)
                status_resp = requests.get(
                    f"{self.BASE_URL}/orders/{order_id}",
                    headers=self._headers(),
                    timeout=2,
                )
                if status_resp.status_code != 200:
                    continue
                poll_data = status_resp.json().get("data", {})
                status = poll_data.get("status")
                if status in ("completed", "result_delivered", "partially_completed"):
                    files = poll_data.get("result", {}).get("files") or []
                    if files:
                        file_path = files[0]
                        break
                elif status in ("failed", "cancelled", "compensated"):
                    raise TTSError(f"Заказ Lumean завершился со статусом {status}")

            if not file_path:
                raise TTSError(f"Lumean таймаут >2.0с заказа {order_id}")

            # 3. Получение ссылки на скачивание
            url_resp = requests.post(
                f"{self.BASE_URL}/storage/url",
                headers=self._headers(),
                json={"path": file_path, "download": True},
                timeout=3,
            )
            url_resp.raise_for_status()
            download_url = url_resp.json().get("data", {}).get("url")
            if not download_url:
                raise TTSError("Lumean не вернул URL для скачивания файла")

            # 4. Скачивание аудиофайла
            audio_resp = requests.get(download_url, timeout=5)
            audio_resp.raise_for_status()
            out.write_bytes(audio_resp.content)
            return out

        except Exception as exc:  # noqa: BLE001
            self._backoff_until = time.monotonic() + 600.0
            logger.warning("Lumean TTS ошибка/таймаут (%s) — активирован Circuit Breaker на 600с, переход на edge-tts (Ava)", exc)
            fb_file = self._fallback.synthesize(text, lang)
            try:
                import shutil
                shutil.copyfile(fb_file, cached_file)
            except Exception:
                pass
            return fb_file


class ElevenLabsTTS:
    """Облачный TTS ElevenLabs: один multilingual-голос для всех языков."""

    name = "ElevenLabs"
    API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

    def __init__(self) -> None:
        self._fallback = EdgeTTS()

    def synthesize(self, text: str, lang: str) -> Path:
        out = MEDIA_DIR / f"eleven_{time.monotonic_ns()}.mp3"
        try:
            response = requests.post(
                f"{self.API_URL}/{settings.ELEVENLABS_VOICE_ID}",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                json={"text": text, "model_id": "eleven_multilingual_v2"},
                timeout=10,
            )
            response.raise_for_status()
            out.write_bytes(response.content)
            return out
        except requests.RequestException as exc:
            logger.warning("ElevenLabs недоступен (%s) — переключаюсь на edge-tts", exc)
            return self._fallback.synthesize(text, lang)


def build_engine() -> LumeanTTS | ElevenLabsTTS | EdgeTTS | SayTTS:
    """Выбор движка: Lumean -> ElevenLabs -> edge-tts (мультиязычная Ava)."""
    if settings.LUMEAN_API_KEY:
        return LumeanTTS()
    if settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_VOICE_ID:
        return ElevenLabsTTS()
    return EdgeTTS()


def compute_rms_chunks(media_path: Path, chunk_ms: int = 50) -> list[float]:
    """Конвертирует аудио через afconvert в 16-bit WAV и рассчитывает RMS чанки по 50 мс.
    Кэширует результат в .rms.json для мгновенной отдачи при повторном воспроизведении.
    """
    rms_cache = media_path.with_name(media_path.name + ".rms.json")
    if rms_cache.exists():
        try:
            with open(rms_cache, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and data:
                    return data
        except Exception:
            pass

    tmp_wav = Path(f"/tmp/winky_speech_{time.monotonic_ns()}.wav")
    try:
        subprocess.run(
            ["/usr/bin/afconvert", "-f", "WAVE", "-d", "LEI16", str(media_path), str(tmp_wav)],
            check=True,
            capture_output=True,
            timeout=5,
        )
        with wave.open(str(tmp_wav), "rb") as w:
            framerate = w.getframerate()
            chunk_size = int(framerate * (chunk_ms / 1000.0))
            rms_list: list[float] = []
            while True:
                frames = w.readframes(chunk_size)
                if not frames:
                    break
                count = len(frames) // 2
                if count == 0:
                    continue
                samples = struct.unpack(f"<{count}h", frames)
                sum_sq = sum(s * s for s in samples)
                rms = math.sqrt(sum_sq / len(samples)) / 32768.0
                rms_list.append(round(min(1.0, max(0.0, rms * 2.5)), 4))

        if rms_list:
            try:
                with open(rms_cache, "w", encoding="utf-8") as f:
                    json.dump(rms_list, f)
            except Exception:
                pass

        return rms_list
    except Exception as exc:
        logger.debug("Не удалось рассчитать RMS чанки через afconvert: %s", exc)
        return []
    finally:
        try:
            tmp_wav.unlink(missing_ok=True)
        except OSError:
            pass


def wav_duration_seconds(path: Path) -> float:
    """Длительность wav-файла (для страховочного таймаута ожидания конца речи)."""
    try:
        with wave.open(str(path), "rb") as audio:
            return audio.getnframes() / float(audio.getframerate() or 22050)
    except Exception:
        return 3.0


@dataclass
class SpeechTask:
    """Фраза в очереди на озвучку."""

    text: str
    lang: str
    emotion: str = "happy"
    source: str = "manual"


@dataclass
class SpeechStatus:
    """Снимок состояния для пульта."""

    state: str = "idle"  # idle | speaking | paused
    engine: str = ""
    volume: float = 1.0
    current_text: str = ""
    last_blocked: str = ""
    queue_len: int = 0


@dataclass
class SpeechController:
    """Очередь речи: цензура -> синтез -> воспроизведение -> lipsync -> следующая."""

    on_speak: Callable[[str, str, float, str], None]  # (media_url, emotion, volume, lang)
    on_rms: Callable[[float], None] = field(default=lambda rms: None)
    on_status: Callable[[SpeechStatus], None] = field(default=lambda status: None)
    engine: SayTTS | ElevenLabsTTS | LumeanTTS | EdgeTTS = field(default_factory=build_engine)

    def __post_init__(self) -> None:
        self._queue: deque[SpeechTask] = deque()
        self._lock = threading.Lock()
        self._finished = threading.Event()
        self._wake = threading.Event()
        self._paused = False
        self._volume = 1.0
        self._speaking = False
        self._current_text = ""
        self._last_blocked = ""
        self._worker: threading.Thread | None = None
        self._afplay_proc: subprocess.Popen | None = None

    # ---------- публичное API (вызывается из js_api и таймеров) ----------

    def update_lumean_settings(self, template_id: str, voice_id: str = "") -> dict[str, str]:
        if isinstance(self.engine, LumeanTTS):
            if template_id:
                self.engine.set_template_id(template_id)
            if voice_id is not None:
                self.engine.set_voice_id(voice_id)
            return self.engine.get_settings()
        return {}

    def get_lumean_settings(self) -> dict[str, str]:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.get_settings()
        return {
            "template_id": settings.LUMEAN_TEMPLATE_ID or "",
            "voice_id": settings.LUMEAN_VOICE_ID or "",
        }

    def start(self) -> None:
        if self._worker and self._worker.is_alive():
            return
        self._worker = threading.Thread(target=self._run, name="winky-speech", daemon=True)
        self._worker.start()

    def speak(self, text: str, lang: str | None = None, emotion: str = "happy",
              source: str = "manual") -> bool:
        """Добавляет фразу в очередь. False — заблокирована цензурой."""
        text = strip_emoji_control(text)
        if not text:
            return False
        ok, reason = check_phrase(text)
        if not ok:
            logger.warning("Фраза заблокирована цензурой: %s", reason)
            self._last_blocked = f"{reason} («{text[:40]}…»)"
            self._emit_status()
            return False
        task = SpeechTask(text=text, lang=lang or detect_lang(text),
                          emotion=emotion if emotion in EMOTIONS else "happy", source=source)
        with self._lock:
            self._queue.append(task)
        self._wake.set()
        self._emit_status()
        return True

    def finish_current(self) -> None:
        """Аватар доиграл файл (callback из JS)."""
        self._finished.set()

    def stop_current(self) -> None:
        """Мгновенно прерывает текущую речь и очищает очередь (для мгновенного отклика на клик)."""
        with self._lock:
            self._queue.clear()
        proc = self._afplay_proc
        if proc and proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass
        self._finished.set()
        self._speaking = False
        self._current_text = ""
        try:
            self.on_rms(0.0)
        except Exception:
            pass
        self._emit_status()

    def set_volume(self, volume: float) -> None:
        self._volume = min(1.0, max(0.0, float(volume)))
        self._emit_status()

    def toggle_pause(self) -> bool:
        self._paused = not self._paused
        self._emit_status()
        return self._paused

    @property
    def paused(self) -> bool:
        return self._paused

    @property
    def speaking(self) -> bool:
        return self._speaking

    @property
    def volume(self) -> float:
        return self._volume

    def status(self) -> SpeechStatus:
        with self._lock:
            queue_len = len(self._queue)
        return SpeechStatus(
            state="paused" if self._paused else ("speaking" if self._speaking else "idle"),
            engine=self.engine.name,
            volume=self._volume,
            current_text=self._current_text,
            last_blocked=self._last_blocked,
            queue_len=queue_len,
        )

    # ---------- воркер ----------

    def _emit_status(self) -> None:
        try:
            self.on_status(self.status())
        except Exception:  # noqa: BLE001 — статус не должен ронять поток
            logger.exception("Не удалось отправить статус в пульт")

    def _next_task(self) -> SpeechTask | None:
        with self._lock:
            return self._queue.popleft() if self._queue else None

    def _run(self) -> None:
        while True:
            if self._paused:
                self._wake.wait(timeout=0.2)
                self._wake.clear()
                continue
            task = self._next_task()
            if task is None:
                self._wake.wait(timeout=0.2)
                self._wake.clear()
                continue
            self._process(task)

    def _process(self, task: SpeechTask) -> None:
        self._speaking = True
        self._current_text = task.text
        self._emit_status()
        self._finished.clear()

        try:
            media = self.engine.synthesize(task.text, task.lang)
        except TTSError as exc:
            logger.error("Синтез не удался: %s", exc)
            self._speaking = False
            self._current_text = ""
            self._finished.set()
            self._emit_status()
            return

        try:
            rel_path = media.relative_to(MEDIA_DIR.parent).as_posix()
            media_url = f"/{rel_path}"
        except ValueError:
            media_url = f"/media/{media.name}"

        rms_chunks = compute_rms_chunks(media, chunk_ms=50)
        duration = len(rms_chunks) * 0.05 if rms_chunks else max(2.5, wav_duration_seconds(media))

        self._speaking = True
        self._current_text = task.text
        self._emit_status()

        self._finished.clear()
        try:
            self.on_speak(media_url, task.emotion, self._volume, task.lang)
        except Exception:  # noqa: BLE001 — окно могло закрыться
            logger.exception("Не удалось отправить фразу в окно аватара")

        # Воспроизведение на macOS через afplay с потоковой передачей RMS-громкости для Lip-Sync
        try:
            afplay_proc = subprocess.Popen(
                ["/usr/bin/afplay", "-v", str(max(0.05, self._volume)), str(media)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self._afplay_proc = afplay_proc
            for rms in rms_chunks:
                if self._paused or afplay_proc.poll() is not None:
                    break
                self.on_rms(rms)
                time.sleep(0.05)

            try:
                afplay_proc.wait(timeout=max(2.0, duration + 2.0))
            except subprocess.TimeoutExpired:
                afplay_proc.kill()
        except Exception as exc:
            logger.error("Ошибка воспроизведения afplay: %s", exc)
        finally:
            self._afplay_proc = None
            self.on_rms(0.0)
            self._finished.set()
            self._speaking = False
            self._current_text = ""
            if "cache" not in str(media):
                try:
                    media.unlink(missing_ok=True)
                except OSError:
                    pass
            self._emit_status()
