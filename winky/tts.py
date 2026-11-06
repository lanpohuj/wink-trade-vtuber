"""Голос Winky: движки TTS и контроллер очереди речи.

Движки:
  * ``LumeanTTS`` — основной облачный TTS через Lumean Public API (https://lumean.app):
    поддержка ElevenLabs Multilingual V2, Fish Audio, LumVoice и Cartesia.
    Единый выбранный голос звучит во всех репликах как на русском, так и на английском.
  * ``ElevenLabsTTS`` — прямой облачный TTS ElevenLabs (если задан ELEVENLABS_API_KEY).
  * ``EdgeTTS`` — локальный мультиязычный нейросетевой голос Microsoft Ava (бесплатный фоллбэк).

Синтез пишется в ``winky/web/media/`` — оттуда файл играет через afplay и передаётся
в окно аватара (Web Audio) для расчёта RMS и синхронного липсинка.
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import json
import logging
import math
import random
import re
import struct
import subprocess
import threading
import time
import uuid
import wave
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import httpx
import requests

from config import settings
from winky.censor import check_phrase, strip_emoji_control, sanitize_for_tiktok

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VOICE_CACHE_DIR = PROJECT_ROOT / "voice_cache"
VOICE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

MEDIA_DIR = Path(__file__).parent / "web" / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

_manifest_lock = threading.Lock()


def normalize_cache_text(text: str) -> str:
    """Убирает лишние пробелы, управляющие символы, эмодзи и приводит к единому регистру для точного совпадения."""
    cleaned = strip_emoji_control(text or "")
    return re.sub(r"\s+", " ", cleaned.strip().lower())


def _update_manifest(voice_dir: Path, text_hash: str, original_text: str, filename: str, provider: str = "lumean_verified") -> None:
    """Обновляет читаемый manifest.json в подпапке голоса."""
    manifest_path = voice_dir / "manifest.json"
    with _manifest_lock:
        data: dict = {}
        if manifest_path.exists():
            try:
                data = json.loads(manifest_path.read_text(encoding="utf-8"))
            except Exception:
                data = {}
        data[text_hash] = {
            "text": original_text,
            "file": filename,
            "provider": provider,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        try:
            manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            logger.debug("Не удалось записать manifest.json: %s", e)


EMOTIONS = (
    "idle", "happy", "excited", "thinking", "wink", "blush", "surprised", "neutral",
    "win", "wave", "dance", "flirt_kiss", "neko_paws", "hip_groove", "peek_closer"
)

DEFAULT_RU_SERVICE = "fishaudio"
DEFAULT_RU_VOICE_ID = "1db1618b6eaf4571ac7db70e20eb6727"
DEFAULT_RU_VOICE_NAME = "Марин китагава"

DEFAULT_EN_SERVICE = "fishaudio"
DEFAULT_EN_VOICE_ID = "e34c486929524d41b88646b4ac2f382f"
DEFAULT_EN_VOICE_NAME = "Venti"


def detect_lang(text: str) -> str:
    """Язык фразы: кириллица -> ru, иначе en."""
    return "ru" if any("а" <= ch.lower() <= "я" for ch in text) else "en"


def humanize_speech_text(text: str, lang: str = "ru", breathing: bool = True) -> str:
    """Обогащает текст живыми дыхательными микро-паузами и интонационной пунктуацией.

    По официальной документации Lumean API (Voiceover text markup) тег {{pause=0.2}}
    создаёт естественную человеческую микро-передышку, не расходуя лимит символов.
    """
    if not text:
        return ""
    clean = text.strip()
    if not breathing:
        return clean

    # Если уже есть теги пауз, не дублируем
    if "{{pause=" in clean:
        return clean

    is_ru = (lang or "ru").lower() == "ru"
    if is_ru and not any("а" <= ch.lower() <= "я" for ch in clean):
        is_ru = False

    # 1. Живая интонация: если реплика заканчивается на сухую точку, заменяем на '!'
    if clean.endswith(".") and not clean.endswith("..") and not re.search(r"\b\d+\.$", clean):
        clean = clean[:-1].strip() + "!"

    # 2. Дыхательные микро-паузы после вводных междометий и восклицаний
    if is_ru:
        intro_pat = r"^(Ой|Мур|Хей|Слушай|Опа|Ого|Хм|Вау|Кстати|Смотри|Ребятки|Ребят|Чат|Ура|Салют|Приветик|Привет)([,\s!]+)"
        match = re.match(intro_pat, clean, flags=re.IGNORECASE)
        if match:
            word = match.group(1)
            rest = clean[match.end():].lstrip()
            clean = f"{word}, {{{{pause=0.20}}}} {rest}"
    else:
        intro_pat = r"^(Hey guys|Hey|Oh|Listen|Wow|Look|Guys|Chat|Yay|Hello|Hi)([,\s!]+)"
        match = re.match(intro_pat, clean, flags=re.IGNORECASE)
        if match:
            word = match.group(1)
            rest = clean[match.end():].lstrip()
            clean = f"{word}, {{{{pause=0.20}}}} {rest}"

    # 3. Микро-пауза перед выразительным смысловым тире ' — '
    if " — " in clean and clean.count("{{pause=") < 2:
        clean = clean.replace(" — ", " {{pause=0.15}} — ", 1)

    return clean.strip()


PRESET_LIVE_STREAMER_FISH = {
    "model_id": "s2.1-pro",
    "speed": 1.06,
    "latency": "balanced",
    "normalize_text": True,
    "normalize_volume": True,
    "sample_rate": 44100,
    "audio_quality": "high",
    "breathing_pauses": True,
    "temperature": 0.82,
    "top_p": 0.85,
    "repetition_penalty": 1.20,
}

PRESET_LIVE_STREAMER_ELEVEN = {
    "model_id": "eleven_multilingual_v2",
    "advanced_voice_settings": True,
    "stability": 0.38,
    "similarity_boost": 0.82,
    "style": 0.42,
    "use_speaker_boost": True,
    "speed": 1.05,
    "normalize_volume": True,
    "sample_rate": 44100,
    "audio_quality": "high",
    "breathing_pauses": True,
}


def save_voice_to_env(
    lang_slot: str,
    service: str,
    voice_id: str,
    voice_name: str,
    template_id: str = "",
) -> None:
    """Сохраняет параметры активного голоса (RU или EN) Winky в файл .env."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    try:
        content = env_path.read_text(encoding="utf-8")
        slot = "RU" if (lang_slot or "ru").lower() == "ru" else "EN"
        updates = {
            f"LUMEAN_{slot}_SERVICE": service,
            f"LUMEAN_{slot}_VOICE_ID": voice_id,
            f"LUMEAN_{slot}_VOICE_NAME": voice_name,
        }
        if template_id:
            updates[f"LUMEAN_{slot}_TEMPLATE_ID"] = template_id
        if slot == "RU":
            updates["LUMEAN_SERVICE"] = service
            updates["LUMEAN_VOICE_ID"] = voice_id
            updates["LUMEAN_VOICE_NAME"] = voice_name
            if template_id:
                updates["LUMEAN_TEMPLATE_ID"] = template_id
        lines = content.splitlines()
        found_keys: set[str] = set()
        new_lines: list[str] = []
        for line in lines:
            trimmed = line.strip()
            matched = False
            for key, val in updates.items():
                if trimmed.startswith(f"{key}=") or trimmed.startswith(f"#{key}="):
                    new_lines.append(f'{key}="{val}"' if " " in val else f"{key}={val}")
                    found_keys.add(key)
                    matched = True
                    break
            if not matched:
                new_lines.append(line)
        for key, val in updates.items():
            if key not in found_keys:
                new_lines.append(f'{key}="{val}"' if " " in val else f"{key}={val}")
        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        logger.info("Голос %s сохранён в .env: %s / %s (%s)", slot, service, voice_id, voice_name)
    except Exception as exc:
        logger.warning("Не удалось сохранить голос в .env: %s", exc)


class TTSError(RuntimeError):
    """Синтез не удался."""


class DummyTTS:
    """Безопасная заглушка: логирует ошибки и исключает воспроизведение системных/браузерных голосов."""

    name = "Dummy (Silent)"

    def is_cached(self, text: str, lang: str = "ru") -> bool:
        return False

    def get_cache_path(self, text: str, lang: str = "ru") -> Path:
        return MEDIA_DIR / "dummy.mp3"

    def synthesize(self, text: str, lang: str = "ru", bypass_cache: bool = False) -> Path:
        raise TTSError("Облачный ключ TTS не задан — режим без звука")


class EdgeTTS:
    """Бесплатный высококачественный мультиязычный женский голос Microsoft (Ava)."""

    name = "edge-tts (Ava Multilingual)"
    VOICE = "en-US-AvaMultilingualNeural"

    def get_cache_path(self, text: str) -> Path:
        cache_dir = MEDIA_DIR / "cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_key = hashlib.md5(f"edge_{self.VOICE}_{text.strip()}".encode("utf-8")).hexdigest()
        return cache_dir / f"edge_{cache_key}.mp3"

    def is_cached(self, text: str) -> bool:
        out = self.get_cache_path(text)
        return out.exists() and out.stat().st_size > 500

    def synthesize(self, text: str, lang: str = "ru") -> Path:
        out = self.get_cache_path(text)
        if self.is_cached(text):
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
    """Облачный TTS через Lumean API (https://lumean.app): ElevenLabs / Fish Audio / LumVoice / Cartesia.
    Поддерживает два независимых активных голоса: для русского (RU) и английского (EN).
    """

    name = "Lumean"
    BASE_URL = "https://api.lumean.app/api/public"

    def __init__(self) -> None:
        # Русский слот (RU)
        self._ru_service: str = (settings.LUMEAN_RU_SERVICE or settings.LUMEAN_SERVICE or DEFAULT_RU_SERVICE).strip().lower()
        self._ru_voice_id: str = (settings.LUMEAN_RU_VOICE_ID or settings.LUMEAN_VOICE_ID or DEFAULT_RU_VOICE_ID).strip()
        self._ru_voice_name: str = (settings.LUMEAN_RU_VOICE_NAME or settings.LUMEAN_VOICE_NAME or DEFAULT_RU_VOICE_NAME).strip()

        # Английский слот (EN)
        self._en_service: str = (settings.LUMEAN_EN_SERVICE or DEFAULT_EN_SERVICE).strip().lower()
        self._en_voice_id: str = (settings.LUMEAN_EN_VOICE_ID or DEFAULT_EN_VOICE_ID).strip()
        self._en_voice_name: str = (settings.LUMEAN_EN_VOICE_NAME or DEFAULT_EN_VOICE_NAME).strip()

        self._template_id: str | None = (settings.LUMEAN_TEMPLATE_ID or "").strip() or None

        # КАТЕГОРИЧЕСКИ БЕЗ fallback на EdgeTTS!
        self._fallback = None
        self._cache_dir = MEDIA_DIR / "cache"
        self._cache_dir.mkdir(parents=True, exist_ok=True)

        # Постоянный Keep-Alive клиент без повторных TLS handshakes (таймаут 60с)
        self._client = httpx.Client(timeout=60.0, http2=False)

        # Кэш шаблонов по слотам и голосам на диске (slot:service_key:voice_id)
        self._templates_by_slot: dict[str, str] = self._load_templates_cache()
        if settings.LUMEAN_RU_TEMPLATE_ID:
            self._templates_by_slot[self._slot_key("ru", self._ru_service, self._ru_voice_id)] = settings.LUMEAN_RU_TEMPLATE_ID
        if settings.LUMEAN_EN_TEMPLATE_ID:
            self._templates_by_slot[self._slot_key("en", self._en_service, self._en_voice_id)] = settings.LUMEAN_EN_TEMPLATE_ID

        # Тюнинг живости голоса для RU и EN
        self._ru_tuning: dict = self._load_tuning("ru")
        self._en_tuning: dict = self._load_tuning("en")

    def _slot_key(self, slot: str, service_key: str, voice_id: str) -> str:
        s = "ru" if (slot or "ru").lower() == "ru" else "en"
        srv = (service_key or "").strip().lower()
        vid = (voice_id or "").strip().lower()
        return f"{s}:{srv}:{vid}"

    def _load_templates_cache(self) -> dict[str, str]:
        tpl_file = self._cache_dir / "lumean_slot_templates.json"
        if not tpl_file.exists():
            tpl_file = self._cache_dir / "lumean_templates.json"
        if tpl_file.exists():
            try:
                data = json.loads(tpl_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    return {str(k).lower(): str(v) for k, v in data.items() if v}
            except Exception:
                pass
        return {}

    def _save_templates_cache(self) -> None:
        tpl_file = self._cache_dir / "lumean_slot_templates.json"
        try:
            tpl_file.write_text(json.dumps(self._templates_by_slot, indent=2), encoding="utf-8")
        except Exception:
            pass

    def _load_tuning(self, slot: str) -> dict:
        """Загружает параметры студии живости для слота."""
        tuning_file = self._cache_dir / f"tuning_{slot}.json"
        if tuning_file.exists():
            try:
                data = json.loads(tuning_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    return data
            except Exception:
                pass

        if slot == "ru":
            base = dict(PRESET_LIVE_STREAMER_FISH)
            base.update({
                "service_key": self._ru_service,
                "voice_id": self._ru_voice_id,
                "voice_name": self._ru_voice_name,
                "template_id": settings.LUMEAN_RU_TEMPLATE_ID or "",
            })
            return base
        else:
            base = dict(PRESET_LIVE_STREAMER_ELEVEN if self._en_service == "elevenlabs" else PRESET_LIVE_STREAMER_FISH)
            base.update({
                "service_key": self._en_service,
                "voice_id": self._en_voice_id,
                "voice_name": self._en_voice_name,
                "template_id": settings.LUMEAN_EN_TEMPLATE_ID or "",
            })
            return base

    def _save_tuning(self, slot: str) -> None:
        tuning_file = self._cache_dir / f"tuning_{slot}.json"
        try:
            target = self._ru_tuning if slot == "ru" else self._en_tuning
            tuning_file.write_text(json.dumps(target, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as exc:
            logger.debug("Не удалось сохранить tuning_%s.json: %s", slot, exc)

    def get_tuning(self, slot: str) -> dict:
        return self._ru_tuning if (slot or "ru").lower() == "ru" else self._en_tuning

    @property
    def ru_service(self) -> str:
        return self._ru_service

    @property
    def ru_voice_id(self) -> str:
        return self._ru_voice_id

    @property
    def ru_voice_name(self) -> str:
        return self._ru_voice_name

    @property
    def en_service(self) -> str:
        return self._en_service

    @property
    def en_voice_id(self) -> str:
        return self._en_voice_id

    @property
    def en_voice_name(self) -> str:
        return self._en_voice_name

    # Обратная совместимость для старых вызовов
    @property
    def service_key(self) -> str:
        return self._ru_service

    @property
    def voice_id(self) -> str:
        return self._ru_voice_id

    @property
    def voice_name(self) -> str:
        return self._ru_voice_name

    def set_template_id(self, template_id: str) -> None:
        clean = template_id.strip()
        if clean:
            self._template_id = clean
            slot_key = self._slot_key("ru", self._ru_service, self._ru_voice_id)
            self._templates_by_slot[slot_key] = clean
            self._ru_tuning["template_id"] = clean
            self._save_templates_cache()
            self._save_tuning("ru")
            settings.LUMEAN_TEMPLATE_ID = clean
            settings.LUMEAN_RU_TEMPLATE_ID = clean
            logger.info("Установлен новый Lumean Template ID для RU: %s", clean)

    def set_voice(self, lang_slot: str, service_key: str, voice_id: str, voice_name: str = "") -> None:
        slot = "ru" if (lang_slot or "ru").lower() == "ru" else "en"
        clean_service = (service_key or DEFAULT_RU_SERVICE).strip().lower()
        clean_voice = (voice_id or "").strip()
        clean_name = (voice_name or clean_voice).strip()

        if slot == "ru":
            changed = (clean_service != self._ru_service or clean_voice != self._ru_voice_id)
            self._ru_service = clean_service
            self._ru_voice_id = clean_voice
            self._ru_voice_name = clean_name
            self._ru_tuning["service_key"] = clean_service
            self._ru_tuning["voice_id"] = clean_voice
            self._ru_tuning["voice_name"] = clean_name
            self._save_tuning("ru")
            settings.LUMEAN_RU_SERVICE = clean_service
            settings.LUMEAN_RU_VOICE_ID = clean_voice
            settings.LUMEAN_RU_VOICE_NAME = clean_name
            settings.LUMEAN_SERVICE = clean_service
            settings.LUMEAN_VOICE_ID = clean_voice
            settings.LUMEAN_VOICE_NAME = clean_name
        else:
            changed = (clean_service != self._en_service or clean_voice != self._en_voice_id)
            self._en_service = clean_service
            self._en_voice_id = clean_voice
            self._en_voice_name = clean_name
            self._en_tuning["service_key"] = clean_service
            self._en_tuning["voice_id"] = clean_voice
            self._en_tuning["voice_name"] = clean_name
            self._save_tuning("en")
            settings.LUMEAN_EN_SERVICE = clean_service
            settings.LUMEAN_EN_VOICE_ID = clean_voice
            settings.LUMEAN_EN_VOICE_NAME = clean_name

        slot_key = self._slot_key(slot, clean_service, clean_voice)
        tid = self._templates_by_slot.get(slot_key) or (self._ru_tuning.get("template_id") if slot == "ru" else self._en_tuning.get("template_id"))
        save_voice_to_env(slot, clean_service, clean_voice, clean_name, template_id=tid or "")
        if changed:
            logger.info(
                "Голос Winky [%s] обновлён: провайдер=%s, voice_id=%s, имя=%s",
                slot.upper(), clean_service, clean_voice, clean_name
            )

    def get_settings(self) -> dict:
        active_tid = self._ru_tuning.get("template_id") or self._templates_by_slot.get(self._slot_key("ru", self._ru_service, self._ru_voice_id)) or ""
        return {
            "ru": {
                "service_key": self._ru_service,
                "voice_id": self._ru_voice_id,
                "voice_name": self._ru_voice_name,
                "template_id": self._ru_tuning.get("template_id", ""),
                "tuning": self._ru_tuning,
            },
            "en": {
                "service_key": self._en_service,
                "voice_id": self._en_voice_id,
                "voice_name": self._en_voice_name,
                "template_id": self._en_tuning.get("template_id", ""),
                "tuning": self._en_tuning,
            },
            "ru_service": self._ru_service,
            "ru_voice_id": self._ru_voice_id,
            "ru_voice_name": self._ru_voice_name,
            "ru_tuning": self._ru_tuning,
            "en_service": self._en_service,
            "en_voice_id": self._en_voice_id,
            "en_voice_name": self._en_voice_name,
            "en_tuning": self._en_tuning,
            "service_key": self._ru_service,
            "voice_id": self._ru_voice_id,
            "voice_name": self._ru_voice_name,
            "template_id": active_tid,
        }

    def _resolve_slot(self, text: str, lang: str = "ru") -> tuple[str, str, str]:
        """Определяет, какой слот голоса использовать: кириллица -> RU, иначе -> EN."""
        has_cyrillic = bool(re.search(r"[а-яА-ЯёЁ]", text or ""))
        if (lang and lang.lower() == "ru") or has_cyrillic:
            return "ru", self._ru_service, self._ru_voice_id
        return "en", self._en_service, self._en_voice_id

    def _headers(self) -> dict[str, str]:
        return {
            "X-API-KEY": settings.LUMEAN_API_KEY,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def get_config_options(self, service_key: str) -> dict:
        """Получает точную схему допустимых параметров шаблона для сервиса."""
        headers = self._headers()
        cache_file = self._cache_dir / f"config_options_{service_key}.json"
        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        try:
            resp = self._client.get(f"{self.BASE_URL}/templates/config-options?service={service_key}", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                cache_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                return data
        except Exception as exc:
            logger.debug("Не удалось получить config-options для %s: %s", service_key, exc)
        return {}

    def list_user_templates(self) -> list[dict]:
        """Возвращает список всех шаблонов пользователя с сайта lumean.app/template."""
        headers = self._headers()
        try:
            # Важно: по API Lumean per_page максимум 30, иначе возвращает 422
            resp = self._client.get(
                f"{self.BASE_URL}/templates?per_page=30",
                headers=headers,
                timeout=12.0,
            )
            if resp.status_code == 200:
                payload = resp.json()
                raw_data = payload.get("data")
                items = raw_data if isinstance(raw_data, list) else (raw_data.get("items", []) if isinstance(raw_data, dict) else [])
                result = []
                for item in items:
                    cfg = item.get("config") or {}
                    tts = cfg.get("tts_settings") or {}
                    result.append({
                        "id": str(item.get("id")),
                        "name": str(item.get("name") or "Без названия"),
                        "service_key": str(item.get("service_key") or "fishaudio"),
                        "voice_id": str(tts.get("voice_id") or ""),
                        "model_id": str(tts.get("model_id") or ""),
                        "speed": float(tts.get("voice_settings", {}).get("speed") or 1.0),
                        "created_at": str(item.get("created_at") or ""),
                        "config": cfg,
                    })
                return result
            logger.warning("Ошибка получения шаблонов Lumean (%d): %s", resp.status_code, resp.text)
        except Exception as exc:
            logger.warning("Не удалось загрузить шаблоны Lumean: %s", exc)
        return []

    def apply_template_to_slot(self, lang_slot: str, template_id: str) -> dict:
        """Назначает шаблон с сайта Lumean на слот RU или EN."""
        clean_tid = (template_id or "").strip()
        if not clean_tid:
            return self.get_settings()
        slot = "ru" if (lang_slot or "ru").lower() == "ru" else "en"
        headers = self._headers()

        tpl_data = None
        try:
            resp = self._client.get(f"{self.BASE_URL}/templates/{clean_tid}", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                tpl_data = resp.json().get("data")
        except Exception as exc:
            logger.warning("Не удалось загрузить данные шаблона %s: %s", clean_tid, exc)

        if not tpl_data:
            for t in self.list_user_templates():
                if t["id"] == clean_tid:
                    tpl_data = t
                    break

        if not tpl_data:
            logger.warning("Шаблон %s не найден", clean_tid)
            return self.get_settings()

        service_key = str(tpl_data.get("service_key") or "fishaudio")
        cfg = tpl_data.get("config") or {}
        tts = cfg.get("tts_settings") or {}
        voice_id = str(tts.get("voice_id") or "")
        voice_name = str(tpl_data.get("name") or voice_id)

        self.set_voice(slot, service_key, voice_id, voice_name)

        tuning = self._ru_tuning if slot == "ru" else self._en_tuning
        tuning["template_id"] = clean_tid
        tuning["service_key"] = service_key
        tuning["voice_id"] = voice_id
        tuning["voice_name"] = voice_name
        if tts.get("model_id"):
            tuning["model_id"] = str(tts["model_id"])
        if tts.get("voice_settings", {}).get("speed"):
            tuning["speed"] = float(tts["voice_settings"]["speed"])
        if tts.get("latency"):
            tuning["latency"] = str(tts["latency"])
        if "normalize" in tts:
            tuning["normalize_text"] = bool(tts["normalize"])
        out = cfg.get("output_settings") or {}
        if out.get("sample_rate"):
            tuning["sample_rate"] = int(out["sample_rate"])
        if "loudnorm" in out:
            tuning["normalize_volume"] = bool(out["loudnorm"].get("enabled", False))
        pauses = cfg.get("pause_settings") or {}
        if "enabled" in pauses:
            tuning["breathing_pauses"] = bool(pauses["enabled"])

        self._save_tuning(slot)
        slot_key = self._slot_key(slot, service_key, voice_id)
        self._templates_by_slot[slot_key] = clean_tid
        self._save_templates_cache()

        save_voice_to_env(slot, service_key, voice_id, voice_name, clean_tid)
        logger.info("Шаблон %s (%s) назначен на слот %s", clean_tid, voice_name, slot.upper())
        return self.get_settings()

    def _build_template_config(self, slot: str, service_key: str, voice_id: str, tuning: dict) -> dict:
        """Формирует 100% валидный словарь config по официальной схеме Lumean."""
        if service_key == "fishaudio":
            return {
                "tts_settings": {
                    "voice_id": voice_id,
                    "model_id": tuning.get("model_id") or "s2.1-pro",
                    "format": "mp3",
                    "latency": tuning.get("latency") or "balanced",
                    "normalize": bool(tuning.get("normalize_text", True)),
                    "voice_settings": {
                        "speed": float(tuning.get("speed", 1.06)),
                    },
                },
                "pause_settings": {
                    "enabled": bool(tuning.get("breathing_pauses", True)),
                    "default_duration": 0.25,
                },
                "output_settings": {
                    "audio_format": "mp3",
                    "audio_quality": tuning.get("audio_quality") or "high",
                    "sample_rate": int(tuning.get("sample_rate") or 44100),
                    "loudnorm": {
                        "enabled": bool(tuning.get("normalize_volume", True)),
                    },
                },
            }
        else:
            return {
                "tts_settings": {
                    "model_id": tuning.get("model_id") or "eleven_multilingual_v2",
                    "voice_id": voice_id,
                    "mode": "mode_v1",
                    "advanced_voice_settings": True,
                    "voice_settings": {
                        "stability": float(tuning.get("stability", 0.38)),
                        "similarity_boost": float(tuning.get("similarity_boost", 0.82)),
                        "style": float(tuning.get("style", 0.42)),
                        "use_speaker_boost": bool(tuning.get("use_speaker_boost", True)),
                        "speed": float(tuning.get("speed", 1.05)),
                    },
                },
                "pause_settings": {
                    "enabled": bool(tuning.get("breathing_pauses", True)),
                    "default_duration": 0.25,
                },
                "output_settings": {
                    "audio_format": "mp3",
                    "audio_quality": tuning.get("audio_quality") or "high",
                    "sample_rate": int(tuning.get("sample_rate") or 44100),
                    "loudnorm": {
                        "enabled": bool(tuning.get("normalize_volume", True)),
                    },
                },
            }

    def save_voice_tuning(self, lang_slot: str, tuning_data: dict) -> dict:
        """Сохраняет изменённые параметры тюнинга в шаблон на сервере Lumean (PUT / POST)."""
        slot = "ru" if (lang_slot or "ru").lower() == "ru" else "en"
        current_tuning = self._ru_tuning if slot == "ru" else self._en_tuning
        current_tuning.update(tuning_data)

        service_key = current_tuning.get("service_key") or (self._ru_service if slot == "ru" else self._en_service)
        voice_id = current_tuning.get("voice_id") or (self._ru_voice_id if slot == "ru" else self._en_voice_id)
        voice_name = current_tuning.get("voice_name") or (self._ru_voice_name if slot == "ru" else self._en_voice_name)
        
        slot_key = self._slot_key(slot, service_key, voice_id)
        template_id = current_tuning.get("template_id") or self._templates_by_slot.get(slot_key) or ""

        config = self._build_template_config(slot, service_key, voice_id, current_tuning)
        headers = self._headers()
        template_name = f"Winky Live {slot.upper()} — {voice_name}"

        # 1. Если template_id существует, пробуем обновить через PUT
        updated_tid = None
        if template_id:
            try:
                put_resp = self._client.put(
                    f"{self.BASE_URL}/templates/{template_id}",
                    headers=headers,
                    json={
                        "service_key": service_key,
                        "name": template_name,
                        "config": config,
                    },
                    timeout=10.0,
                )
                if put_resp.status_code == 200:
                    updated_tid = template_id
                    logger.info("Шаблон Lumean %s успешно обновлен через PUT: %s", template_name, template_id)
                elif put_resp.status_code == 422:
                    logger.warning("PUT /templates/%s вернул 422: %s", template_id, put_resp.text)
            except Exception as exc:
                logger.warning("Не удалось обновить шаблон %s через PUT: %s", template_id, exc)

        # 2. Если template_id не было или PUT вернул ошибку, создаём через POST
        if not updated_tid:
            try:
                post_resp = self._client.post(
                    f"{self.BASE_URL}/templates",
                    headers=headers,
                    json={
                        "service_key": service_key,
                        "name": template_name,
                        "config": config,
                    },
                    timeout=10.0,
                )
                if post_resp.status_code in (200, 201):
                    created_data = post_resp.json().get("data", {})
                    updated_tid = str(created_data.get("id"))
                    logger.info("Создан новый шаблон Lumean %s через POST: %s", template_name, updated_tid)
                elif post_resp.status_code == 422:
                    logger.warning("POST /templates вернул 422: %s, пробую минимальный config...", post_resp.text)
                    min_cfg = {
                        "tts_settings": {
                            "voice_id": voice_id,
                            "voice_settings": {"speed": float(current_tuning.get("speed", 1.06))},
                        }
                    }
                    retry_resp = self._client.post(
                        f"{self.BASE_URL}/templates",
                        headers=headers,
                        json={
                            "service_key": service_key,
                            "name": template_name,
                            "config": min_cfg,
                        },
                        timeout=10.0,
                    )
                    if retry_resp.status_code in (200, 201):
                        updated_tid = str(retry_resp.json().get("data", {}).get("id"))
                        logger.info("Создан шаблон Lumean с минимальным config: %s", updated_tid)
            except Exception as exc:
                logger.warning("Не удалось создать шаблон Lumean: %s", exc)

        if updated_tid:
            current_tuning["template_id"] = updated_tid
            self._templates_by_slot[slot_key] = updated_tid
            self._save_templates_cache()
            save_voice_to_env(slot, service_key, voice_id, voice_name, updated_tid)

        self._save_tuning(slot)
        res = self.get_settings()
        res["tuning"] = current_tuning
        return res

    def apply_live_preset(self, lang_slot: str) -> dict:
        """Применяет экспресс-пресет 'Живая стримерша' к слоту RU или EN и сохраняет в Lumean."""
        slot = "ru" if (lang_slot or "ru").lower() == "ru" else "en"
        service_key = self._ru_service if slot == "ru" else self._en_service
        preset = PRESET_LIVE_STREAMER_FISH if service_key == "fishaudio" else PRESET_LIVE_STREAMER_ELEVEN
        return self.save_voice_tuning(slot, dict(preset))

    def clear_voice_cache(self, lang_slot: str = "all") -> int:
        """Очищает кэшированные аудиофайлы для слота, чтобы переозвучить их с новым качеством."""
        slots = ["ru", "en"] if lang_slot == "all" else [lang_slot]
        removed = 0
        for s in slots:
            srv = self._ru_service if s == "ru" else self._en_service
            vid = self._ru_voice_id if s == "ru" else self._en_voice_id
            vdir = self.get_voice_dir(srv, vid)
            if vdir.exists():
                for mp3 in vdir.glob("*.mp3"):
                    try:
                        mp3.unlink()
                        removed += 1
                    except Exception:
                        pass
                manifest = vdir / "manifest.json"
                if manifest.exists():
                    try:
                        manifest.unlink()
                    except Exception:
                        pass
        logger.info("Очищено %d кэш-файлов для слота %s", removed, lang_slot)
        return removed

    def _ensure_template(self, slot: str, service_key: str, voice_id: str, voice_name: str = "") -> str:
        """Гарантирует существование шаблона в Lumean для конкретного слота (RU/EN) и голоса."""
        slot_key = self._slot_key(slot, service_key, voice_id)
        cached_id = self._templates_by_slot.get(slot_key)
        if cached_id:
            return cached_id

        headers = self._headers()
        template_name = f"Winky Live {slot.upper()} — {voice_name or voice_id}"

        # 1. Запрашиваем существующие шаблоны пользователя (максимум per_page=30)
        try:
            resp = self._client.get(
                f"{self.BASE_URL}/templates?per_page=30",
                headers=headers,
                timeout=10.0,
            )
            if resp.status_code == 200:
                payload = resp.json()
                raw_data = payload.get("data")
                items = raw_data if isinstance(raw_data, list) else (raw_data.get("items", []) if isinstance(raw_data, dict) else [])

                matched_template = None
                for item in items:
                    if item.get("service_key") == service_key:
                        cfg_vid = (item.get("config") or {}).get("tts_settings", {}).get("voice_id")
                        name = item.get("name") or ""
                        if cfg_vid == voice_id and (slot.upper() in name or f"Winky Live {slot.upper()}" in name):
                            matched_template = item
                            break
                        if cfg_vid == voice_id and matched_template is None:
                            matched_template = item

                if matched_template:
                    template_id = str(matched_template["id"])
                    self._templates_by_slot[slot_key] = template_id
                    self._save_templates_cache()
                    logger.info("Найден существующий шаблон Lumean для [%s] %s: %s", slot.upper(), template_name, template_id)
                    return template_id

        except Exception as exc:
            logger.debug("Не удалось получить список шаблонов Lumean: %s", exc)

        # 2. Если шаблон для слота не найден — создаём новый
        logger.info("Создаю новый шаблон Winky для [%s] %s (voice_id=%s)...", slot.upper(), service_key, voice_id)
        tuning = self.get_tuning(slot)
        config = self._build_template_config(slot, service_key, voice_id, tuning)

        try:
            create_resp = self._client.post(
                f"{self.BASE_URL}/templates",
                headers=headers,
                json={
                    "service_key": service_key,
                    "name": template_name,
                    "config": config,
                },
                timeout=10.0,
            )
            if create_resp.status_code in (200, 201):
                created = create_resp.json()
                template_id = str(created.get("data", {}).get("id"))
                self._templates_by_slot[slot_key] = template_id
                self._save_templates_cache()
                logger.info("Успешно создан шаблон Lumean %s: %s", template_name, template_id)
                return template_id
            else:
                logger.warning("POST /templates вернул %d: %s, пробую минимальный config...", create_resp.status_code, create_resp.text)
                min_cfg = {
                    "tts_settings": {
                        "voice_id": voice_id,
                        "voice_settings": {"speed": float(tuning.get("speed", 1.06))},
                    }
                }
                retry_resp = self._client.post(
                    f"{self.BASE_URL}/templates",
                    headers=headers,
                    json={
                        "service_key": service_key,
                        "name": template_name,
                        "config": min_cfg,
                    },
                    timeout=10.0,
                )
                retry_resp.raise_for_status()
                template_id = str(retry_resp.json().get("data", {}).get("id"))
                self._templates_by_slot[slot_key] = template_id
                self._save_templates_cache()
                return template_id
        except Exception as exc:
            logger.error("Не удалось создать шаблон Lumean: %s", exc)
            raise TTSError(f"Не удалось подготовить шаблон Lumean для {template_name}: {exc}") from exc

    def get_voice_dir(self, service_key: str, voice_id: str) -> Path:
        voice_dir = VOICE_CACHE_DIR / f"{service_key}_{voice_id[:12]}"
        voice_dir.mkdir(parents=True, exist_ok=True)
        return voice_dir

    def get_cache_path(self, text: str, lang: str = "ru") -> Path:
        clean_text = text.strip()
        slot, service_key, voice_id = self._resolve_slot(clean_text, lang)
        voice_dir = self.get_voice_dir(service_key, voice_id)
        norm_text = normalize_cache_text(clean_text)

        text_hash = hashlib.sha256(
            f"{service_key}:{voice_id}:{norm_text}".encode("utf-8")
        ).hexdigest()[:20]
        return voice_dir / f"{text_hash}.mp3"

    def is_cached(self, text: str, lang: str = "ru") -> bool:
        clean_text = text.strip()
        if not clean_text:
            return False
        cached_file = self.get_cache_path(clean_text, lang)
        return cached_file.exists() and cached_file.stat().st_size > 1024

    def synthesize(self, text: str, lang: str = "ru", bypass_cache: bool = False) -> Path:
        """Синтезирует речь выбранным слотом голоса (RU или EN) через прямой Keep-Alive вызов Lumean API.
        При наличии в voice_cache/ не отправляет запрос в API (0 токенов, мгновенный возврат 0.05с).
        При bypass_cache=True синтезирует свежую версию напрямую с сервера.
        """
        clean_text = text.strip()
        if not clean_text:
            raise TTSError("Пустой текст для озвучки")

        slot, service_key, voice_id = self._resolve_slot(clean_text, lang)
        voice_dir = self.get_voice_dir(service_key, voice_id)
        cached_file = self.get_cache_path(clean_text, lang)
        text_hash = cached_file.stem

        if not bypass_cache and cached_file.exists() and cached_file.stat().st_size > 1024:
            logger.info("Cache HIT in voice_cache/%s: %s («%s»)", voice_dir.name, cached_file.name, clean_text[:30])
            return cached_file

        if not settings.LUMEAN_API_KEY:
            raise TTSError("LUMEAN_API_KEY не задан — синтез отменён (режим без звука)")

        logger.info("Cache MISS (bypass=%s) in voice_cache/%s -> запрос в Lumean API («%s»)...", bypass_cache, voice_dir.name, clean_text[:30])

        last_exc: Exception | None = None
        for attempt in range(1, 3):
            try:
                tuning = self.get_tuning(slot)
                slot_key = self._slot_key(slot, service_key, voice_id)
                template_id = tuning.get("template_id") or self._templates_by_slot.get(slot_key)
                if not template_id:
                    template_id = self._ensure_template(slot, service_key, voice_id, tuning.get("voice_name", ""))

                # Человеческий текст с дыхательными микро-паузами для отправки в синтезатор
                voiced_text = humanize_speech_text(
                    clean_text,
                    lang=lang,
                    breathing=bool(tuning.get("breathing_pauses", True)),
                )

                # Шаг А: Создание заказа с чистым template_id (таймаут 30с)
                order_payload: dict = {
                    "template_id": template_id,
                    "input_text": voiced_text,
                }

                create_resp = self._client.post(
                    f"{self.BASE_URL}/orders",
                    headers=self._headers(),
                    json=order_payload,
                    timeout=30.0,
                )

                # Если шаблон устарел/удалён — запрашиваем свежий и повторяем заказ
                if create_resp.status_code in (400, 404, 422):
                    logger.warning("Шаблон %s недействителен (%d: %s), запрашиваю свежий...", template_id, create_resp.status_code, create_resp.text)
                    self._templates_by_slot.pop(slot_key, None)
                    template_id = self._ensure_template(slot, service_key, voice_id, tuning.get("voice_name", ""))
                    order_payload["template_id"] = template_id
                    create_resp = self._client.post(
                        f"{self.BASE_URL}/orders",
                        headers=self._headers(),
                        json=order_payload,
                        timeout=30.0,
                    )

                create_resp.raise_for_status()
                order_data = create_resp.json().get("data", {})
                order_id = order_data.get("id")
                if not order_id:
                    raise TTSError(f"Lumean не вернул order_id: {create_resp.text}")

                # Шаг Б: Опрос статуса выполнения заказа (до 90с с прогрессивным шагом)
                time.sleep(0.5)
                start_poll = time.monotonic()
                file_path: str | None = None
                poll_count = 0
                while time.monotonic() - start_poll < 90.0:
                    poll_count += 1
                    try:
                        status_resp = self._client.get(
                            f"{self.BASE_URL}/orders/{order_id}",
                            headers=self._headers(),
                            timeout=15.0,
                        )
                        if status_resp.status_code == 200:
                            poll_data = status_resp.json().get("data", {})
                            status = poll_data.get("status")
                            if status in ("completed", "result_delivered", "partially_completed"):
                                files = poll_data.get("result", {}).get("files") or []
                                if files:
                                    file_path = files[0]
                                    break
                            elif status in ("failed", "cancelled", "compensated"):
                                raise TTSError(f"Заказ Lumean завершился со статусом {status}: {poll_data}")
                    except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                        logger.debug("Временная задержка ответа Lumean (%s), продолжаю опрос...", net_err)

                    sleep_sec = 0.5 if poll_count <= 4 else 1.0
                    time.sleep(sleep_sec)

                if not file_path:
                    raise TTSError(f"Lumean таймаут >90с заказа {order_id}")

                # Шаг В: Получение подписанной ссылки на скачивание (таймаут 20с)
                url_resp = self._client.post(
                    f"{self.BASE_URL}/storage/url",
                    headers=self._headers(),
                    json={"path": file_path, "download": True},
                    timeout=20.0,
                )
                url_resp.raise_for_status()
                download_url = url_resp.json().get("data", {}).get("url")
                if not download_url:
                    raise TTSError("Lumean не вернул URL для скачивания файла")

                # Шаг Г: Скачивание аудиофайла прямо в voice_cache/ (таймаут 30с)
                audio_resp = self._client.get(download_url, timeout=30.0)
                audio_resp.raise_for_status()
                audio_data = audio_resp.content
                if len(audio_data) < 4096:
                    raise TTSError(f"Lumean вернул подозрительно маленький файл: {len(audio_data)} байт")
                cached_file.write_bytes(audio_data)
                # Сразу рассчитываем RMS для мгновенного липсинка при проигрывании
                compute_rms_chunks(cached_file)
                _update_manifest(voice_dir, text_hash, clean_text, cached_file.name, provider="lumean_verified")
                logger.info("Lumean TTS успешно синтезировал в voice_cache/%s: %s (%d байт)", voice_dir.name, cached_file.name, len(audio_data))
                return cached_file

            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                logger.warning("Попытка %d синтеза в Lumean завершилась ошибкой: %s", attempt, exc)
                time.sleep(1.0)

        # Категорический отказ от отката на EdgeTTS / системный голос Chrome!
        logger.error("Lumean TTS не смог синтезировать «%s» после 2 попыток: %s", clean_text[:30], last_exc)
        # Резервный поиск любого готового .mp3 файла в voice_cache для текущего слота голоса
        ready_files = [f for f in voice_dir.glob("*.mp3") if f.stat().st_size > 1024]
        if ready_files:
            fallback_audio = random.choice(ready_files)
            logger.warning("Сетевой сбой Lumean: взят готовый файл слота %s из voice_cache: %s", voice_dir.name, fallback_audio.name)
            return fallback_audio
        raise TTSError(f"Lumean synthesis failed after retries: {last_exc}") from last_exc

    def search_voices(
        self,
        catalog: str,
        query: str = "",
        language: str = "",
        gender: str = "",
        page: int = 1,
    ) -> list[dict]:
        """Унифицированный поиск по каталогам Lumean Voice Library."""
        results: list[dict] = []
        headers = self._headers()
        clean_q = query.strip()
        clean_lang = language.strip().lower()
        clean_gender = gender.strip().lower()
        if clean_gender in ("female", "женский", "женские", "f", "жен"):
            clean_gender = "female"
        elif clean_gender in ("male", "мужской", "мужские", "m", "муж"):
            clean_gender = "male"
        else:
            clean_gender = ""

        try:
            if catalog == "fishaudio":
                # Fish Audio каталог + clones
                params: dict = {"page": max(1, page), "per_page": 40}
                if clean_q:
                    if len(clean_q) == 32 and all(c in "0123456789abcdefABCDEF" for c in clean_q):
                        params["voice_id"] = clean_q
                    else:
                        params["search"] = clean_q
                if clean_lang in ("ru", "en", "es"):
                    params["language"] = clean_lang
                if clean_gender in ("female", "male"):
                    params["gender"] = clean_gender

                # Если это первая страница и нет поиска по ID — добавляем готовые клоны пользователя
                if page == 1 and not (len(clean_q) == 32 and all(c in "0123456789abcdefABCDEF" for c in clean_q)):
                    try:
                        clones_resp = self._client.get(
                            f"{self.BASE_URL}/voices/fishaudio/clones",
                            headers=headers,
                            timeout=8.0,
                        )
                        if clones_resp.status_code == 200:
                            c_data = clones_resp.json().get("data", {})
                            c_items = c_data.get("items", []) if isinstance(c_data, dict) else []
                            for c in c_items:
                                if c.get("status") == "ready" or c.get("voice_id"):
                                    vid = c.get("voice_id") or str(c.get("id"))
                                    results.append({
                                        "service_key": "fishaudio",
                                        "voice_id": vid,
                                        "name": f"[Мой клон] {c.get('name', 'Fish Clone')}",
                                        "gender": c.get("gender") or "",
                                        "languages": "RU / EN",
                                        "description": c.get("description") or "Собственный клон Fish Audio",
                                        "preview_url": c.get("preview_url"),
                                    })
                    except Exception as e:
                        logger.debug("Не удалось получить клоны Fish Audio: %s", e)

                resp = self._client.get(f"{self.BASE_URL}/voices/fishaudio", headers=headers, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    items = data.get("items", []) if isinstance(data, dict) else []
                    for item in items:
                        vid = item.get("voice_id")
                        if not vid:
                            continue
                        langs = item.get("languages") or ([item.get("language")] if item.get("language") else [])
                        lang_str = ", ".join(str(l).upper() for l in langs) if langs else "RU / EN"
                        tags = item.get("tags") or []
                        desc = item.get("description") or (", ".join(tags[:4]) if tags else "")
                        results.append({
                            "service_key": "fishaudio",
                            "voice_id": vid,
                            "name": item.get("name") or vid[:8],
                            "gender": item.get("gender") or "",
                            "languages": lang_str,
                            "description": desc,
                            "preview_url": item.get("preview_url"),
                        })

            elif catalog == "elevenlabs":
                # ElevenLabs публичная библиотека
                el_page = max(0, page - 1)  # нумерация страниц с 0!
                params = {"page": el_page, "page_size": 40}
                if clean_q:
                    params["search"] = clean_q
                if clean_gender in ("female", "male"):
                    params["gender"] = clean_gender
                if clean_lang:
                    params["language"] = clean_lang

                resp = self._client.get(f"{self.BASE_URL}/voices/elevenlabs/library", headers=headers, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    voices = data.get("voices", []) if isinstance(data, dict) else []
                    for v in voices:
                        vid = v.get("voice_id")
                        if not vid:
                            continue
                        accent = v.get("accent") or ""
                        v_lang = v.get("language") or "multilingual"
                        desc_parts: list[str] = []
                        if v.get("descriptive"):
                            desc_parts.append(v["descriptive"])
                        if v.get("use_case"):
                            desc_parts.append(v["use_case"])
                        if v.get("description"):
                            desc_parts.append(v["description"][:110].strip())
                        results.append({
                            "service_key": "elevenlabs",
                            "voice_id": vid,
                            "name": v.get("name") or vid[:8],
                            "gender": v.get("gender") or "",
                            "languages": f"{v_lang.upper()} ({accent})" if accent else v_lang.upper(),
                            "description": " · ".join(desc_parts),
                            "preview_url": v.get("preview_url"),
                        })

            elif catalog == "my_library":
                # Личная библиотека на сайте Lumean
                params = {"page": max(1, page), "per_page": 50}
                if clean_q:
                    params["search"] = clean_q
                resp = self._client.get(f"{self.BASE_URL}/voices/library", headers=headers, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    items = data.get("items", []) if isinstance(data, dict) else []
                    for item in items:
                        if item.get("available") is False:
                            continue
                        vid = item.get("voice_id") or str(item.get("id"))
                        s_key = item.get("service_key")
                        if not s_key:
                            if len(vid) == 32 and all(c in "0123456789abcdefABCDEF" for c in vid):
                                s_key = "fishaudio"
                            elif "-" in vid and len(vid) == 36:
                                s_key = "cartesia"
                            else:
                                s_key = "elevenlabs"
                        name = item.get("nickname") or item.get("name") or vid[:8]
                        p_url = item.get("preview_url")
                        if not p_url and isinstance(item.get("preview_urls"), dict):
                            p_dict = item["preview_urls"]
                            p_url = p_dict.get("ru") or p_dict.get("en") or next(iter(p_dict.values()), None)
                        results.append({
                            "service_key": s_key,
                            "voice_id": vid,
                            "name": name,
                            "gender": item.get("gender") or "",
                            "languages": item.get("language") or "Multilingual",
                            "description": item.get("description") or "Избранный голос Lumean",
                            "preview_url": p_url,
                        })

            elif catalog == "lumvoice":
                # Публичный каталог LumVoice
                params = {"page": max(1, page), "per_page": 50}
                if clean_q:
                    params["search"] = clean_q
                resp = self._client.get(f"{self.BASE_URL}/voices/public", headers=headers, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    items = data.get("items", []) if isinstance(data, dict) else []
                    for item in items:
                        vid = str(item.get("id") or item.get("voice_id"))
                        p_url = item.get("preview_url")
                        if not p_url and isinstance(item.get("preview_urls"), dict):
                            p_dict = item["preview_urls"]
                            p_url = p_dict.get("ru") or p_dict.get("en") or next(iter(p_dict.values()), None)
                        results.append({
                            "service_key": "lumvoice",
                            "voice_id": vid,
                            "name": item.get("name") or f"LumVoice {vid}",
                            "gender": item.get("gender") or "",
                            "languages": item.get("language") or "RU / EN",
                            "description": item.get("description") or "LumVoice модель",
                            "preview_url": p_url,
                        })

            elif catalog == "cartesia":
                # Каталог Cartesia
                params = {"page": max(1, page), "per_page": 50}
                if clean_q:
                    params["search"] = clean_q
                resp = self._client.get(f"{self.BASE_URL}/voices/cartesia", headers=headers, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    items = data.get("items", []) if isinstance(data, dict) else []
                    for item in items:
                        vid = item.get("voice_id")
                        if not vid:
                            continue
                        g = item.get("gender") or ""
                        if g == "feminine":
                            g = "female"
                        elif g == "masculine":
                            g = "male"
                        results.append({
                            "service_key": "cartesia",
                            "voice_id": vid,
                            "name": item.get("name") or vid[:8],
                            "gender": g,
                            "languages": str(item.get("language", "en")).upper(),
                            "description": item.get("description") or "Cartesia Sonic модель",
                            "preview_url": item.get("preview_url"),
                        })

        except Exception as exc:
            logger.error("Ошибка поиска голосов в каталоге %s: %s", catalog, exc)

        return results

    def preview_voice_sample(self, service_key: str, voice_id: str) -> str:
        """Генерирует короткий аудиосэмпл для голоса без preview_url и возвращает URL."""
        cache_key = hashlib.sha256(f"sample:{service_key}:{voice_id}".encode("utf-8")).hexdigest()[:16]
        out_file = self._cache_dir / f"sample_{service_key}_{voice_id[:8]}_{cache_key}.mp3"
        if out_file.exists() and out_file.stat().st_size > 1000:
            return f"/media/cache/{out_file.name}"

        orig_service = self._service_key
        orig_voice = self._voice_id
        try:
            self._service_key = service_key
            self._voice_id = voice_id
            sample_phrase = "Привет! Это проверка звучания голоса."
            media = self.synthesize(sample_phrase, "ru")
            if media.exists():
                import shutil
                shutil.copyfile(media, out_file)
                return f"/media/cache/{out_file.name}"
        finally:
            self._service_key = orig_service
            self._voice_id = orig_voice

        return ""


class ElevenLabsTTS:
    """Облачный TTS ElevenLabs: один multilingual-голос для всех языков."""

    name = "ElevenLabs"
    API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

    def __init__(self) -> None:
        pass

    def is_cached(self, text: str, lang: str = "ru") -> bool:
        return False

    def synthesize(self, text: str, lang: str = "ru", bypass_cache: bool = False) -> Path:
        out = MEDIA_DIR / f"eleven_{time.monotonic_ns()}.mp3"
        try:
            response = requests.post(
                f"{self.API_URL}/{settings.ELEVENLABS_VOICE_ID}",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                json={"text": text, "model_id": "eleven_multilingual_v2"},
                timeout=20,
            )
            response.raise_for_status()
            out.write_bytes(response.content)
            return out
        except requests.RequestException as exc:
            logger.error("ElevenLabs недоступен: %s", exc)
            raise TTSError(f"ElevenLabs error: {exc}") from exc


def build_engine() -> LumeanTTS | ElevenLabsTTS | DummyTTS:
    """Выбор движка: Lumean -> ElevenLabs -> Dummy (без голоса Chrome/Ava)."""
    if settings.LUMEAN_API_KEY:
        return LumeanTTS()
    if settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_VOICE_ID:
        return ElevenLabsTTS()
    return DummyTTS()


def compute_rms_chunks(media_path: Path, chunk_ms: int = 50) -> list[float]:
    """Конвертирует аудио через afconvert в 16-bit WAV и рассчитывает RMS чанки по 50 мс с Noise Gate.
    Кэширует результат в .rms2.json для мгновенной отдачи при повторном воспроизведении.
    """
    rms_cache = media_path.with_suffix(media_path.suffix + ".rms2.json")
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
            raw_rms: list[float] = []
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
                raw_rms.append(rms)

        peak = max(raw_rms) if raw_rms else 1.0
        if peak < 1e-6:
            peak = 1.0
        chunks = []
        for r in raw_rms:
            ratio = r / peak
            if ratio < 0.18:
                chunks.append(0.0)
            else:
                val = min(1.0, ((ratio - 0.18) / 0.82) ** 1.2 * 1.15)
                chunks.append(round(val, 3))

        if chunks:
            try:
                with open(rms_cache, "w", encoding="utf-8") as f:
                    json.dump(chunks, f)
            except Exception:
                pass

        return chunks
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
class SpeechItem:
    """Фраза в конвейере озвучки с защитой от рассинхрона (TTL & State Guard)."""

    text: str
    lang: str
    emotion: str = "happy"
    action: str | None = None
    action_duration: float = 3.5
    media_path: Path | None = None
    rms_chunks: list[float] | None = None
    ready_event: threading.Event = field(default_factory=threading.Event)
    failed: bool = False
    source: str = "manual"
    intent_id: str = ""
    created_at: float = field(default_factory=time.time)
    max_age_sec: float = 35.0
    expected_pair: str = ""
    expected_state: str = ""


# Алиас для обратной совместимости
SpeechTask = SpeechItem


@dataclass
class SpeechStatus:
    """Снимок состояния для пульта."""

    state: str = "idle"  # idle | speaking | paused
    engine: str = ""
    volume: float = 1.0
    current_text: str = ""
    last_blocked: str = ""
    queue_len: int = 0
    queue_size: int = 0


class SmartCategoryDeck:
    """Умная колода без повторов для конкретной категории фраз стрима."""

    def __init__(self, category: str, lang: str):
        self.category = category
        self.lang = lang
        self.deck: list[str] = []
        self.last_played: str | None = None
        self._lock = threading.Lock()

    def get_next(self, available_phrases: list[str]) -> str | None:
        if not available_phrases:
            return None
        with self._lock:
            # Оставляем в колоде только те фразы, которые действительно есть в available_phrases
            valid_deck = [p for p in self.deck if p in available_phrases]
            if not valid_deck:
                pool = list(available_phrases)
                random.shuffle(pool)
                # Гарантируем, что первая фраза новой колоды не совпадает с последней сыгранной (если фраз > 1)
                if len(pool) > 1 and pool[0] == self.last_played:
                    swap_idx = random.randint(1, len(pool) - 1)
                    pool[0], pool[swap_idx] = pool[swap_idx], pool[0]
                self.deck = pool
            else:
                self.deck = valid_deck

            selected = self.deck.pop(0)
            self.last_played = selected
            return selected


@dataclass
class SpeechController:
    """Очередь речи: цензура -> асинхронный синтез (конвейер) -> воспроизведение -> lipsync -> следующая."""

    on_speak: Callable[[str, str, float, str], None]  # (media_url, emotion, volume, lang)
    on_rms: Callable[[float], None] = field(default=lambda rms: None)
    on_action: Callable[[str, float], None] = field(default=lambda act, dur: None)
    on_emotion: Callable[[str], None] = field(default=lambda emo: None)
    on_status: Callable[[SpeechStatus], None] = field(default=lambda status: None)
    engine: ElevenLabsTTS | LumeanTTS | EdgeTTS = field(default_factory=build_engine)

    def __post_init__(self) -> None:
        self._playback_queue: deque[SpeechItem] = deque()
        self._prefetched_items: dict[str, SpeechItem] = {}
        self._category_decks: dict[tuple[str, str], SmartCategoryDeck] = {}
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
        self._synth_pool = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="winky-synth")

    # ---------- публичное API (вызывается из js_api и таймеров) ----------

    def update_lumean_settings(self, template_id: str = "", voice_id: str = "", service_key: str = "", voice_name: str = "", lang_slot: str = "ru") -> dict:
        if isinstance(self.engine, LumeanTTS):
            if template_id:
                self.engine.set_template_id(template_id)
            if voice_id or service_key or voice_name:
                self.engine.set_voice(
                    lang_slot=lang_slot,
                    service_key=service_key or self.engine.ru_service,
                    voice_id=voice_id or self.engine.ru_voice_id,
                    voice_name=voice_name or self.engine.ru_voice_name,
                )
            return self.engine.get_settings()
        return {}

    def set_lumean_voice(self, lang_slot: str, service_key: str, voice_id: str, voice_name: str = "") -> dict:
        if isinstance(self.engine, LumeanTTS):
            self.engine.set_voice(lang_slot, service_key, voice_id, voice_name)
            return self.engine.get_settings()
        return {}

    def get_voice_tuning(self, lang_slot: str) -> dict:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.get_tuning(lang_slot)
        return {}

    def list_user_templates(self) -> list[dict]:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.list_user_templates()
        return []

    def apply_template_to_slot(self, lang_slot: str, template_id: str) -> dict:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.apply_template_to_slot(lang_slot, template_id)
        return {}

    def save_voice_tuning(self, lang_slot: str, tuning_data: dict) -> dict:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.save_voice_tuning(lang_slot, tuning_data)
        return {}

    def apply_live_preset(self, lang_slot: str) -> dict:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.apply_live_preset(lang_slot)
        return {}

    def clear_voice_cache(self, lang_slot: str = "all") -> int:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.clear_voice_cache(lang_slot)
        return 0

    def test_tuned_voice(self, lang_slot: str = "ru", tuning_data: dict | None = None, bypass_cache: bool = True) -> bool:
        """Синтезирует короткую выразительную тестовую фразу напрямую через Lumean (без старого кэша)."""
        self.stop_current()
        slot = "ru" if (lang_slot or "ru").lower() == "ru" else "en"
        if tuning_data and isinstance(self.engine, LumeanTTS):
            curr = self.engine.get_tuning(slot)
            changed = any(tuning_data.get(k) != curr.get(k) for k in ("speed", "model_id", "latency", "temperature", "stability", "similarity_boost", "style", "normalize_volume", "breathing_pauses") if k in tuning_data)
            if changed:
                self.engine.save_voice_tuning(slot, tuning_data)

        if slot == "ru":
            phrase = "Ой, приветик! Ну как тебе мой новый живой голосок?"
        else:
            phrase = "Hey guys! How do you like my new lively voice?"

        item = SpeechItem(
            text=phrase,
            lang=slot,
            emotion="happy",
            source="panel_test_live",
        )
        with self._lock:
            self._playback_queue.append(item)

        def _do_synth():
            try:
                media = self.engine.synthesize(item.text, item.lang, bypass_cache=bypass_cache) if hasattr(self.engine, "synthesize") else self.engine.synthesize(item.text, item.lang)
                item.media_path = media
                item.rms_chunks = compute_rms_chunks(media)
                item.ready_event.set()
            except Exception as exc:
                logger.error("Ошибка тестового синтеза: %s", exc)
                item.failed = True
                item.ready_event.set()

        self._synth_pool.submit(_do_synth)
        self._wake.set()
        self._emit_status()
        return True

    def get_lumean_settings(self) -> dict:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.get_settings()
        return {
            "ru": {
                "service_key": getattr(settings, "LUMEAN_RU_SERVICE", "fishaudio"),
                "voice_id": getattr(settings, "LUMEAN_RU_VOICE_ID", DEFAULT_RU_VOICE_ID),
                "voice_name": getattr(settings, "LUMEAN_RU_VOICE_NAME", DEFAULT_RU_VOICE_NAME),
            },
            "en": {
                "service_key": getattr(settings, "LUMEAN_EN_SERVICE", "fishaudio"),
                "voice_id": getattr(settings, "LUMEAN_EN_VOICE_ID", DEFAULT_EN_VOICE_ID),
                "voice_name": getattr(settings, "LUMEAN_EN_VOICE_NAME", DEFAULT_EN_VOICE_NAME),
            },
            "service_key": settings.LUMEAN_SERVICE or DEFAULT_RU_SERVICE,
            "voice_id": settings.LUMEAN_VOICE_ID or DEFAULT_RU_VOICE_ID,
            "voice_name": settings.LUMEAN_VOICE_NAME or DEFAULT_RU_VOICE_NAME,
            "template_id": settings.LUMEAN_TEMPLATE_ID or "",
        }

    def search_voices(
        self,
        catalog: str,
        query: str = "",
        language: str = "",
        gender: str = "",
        page: int = 1,
    ) -> list[dict]:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.search_voices(catalog, query, language, gender, page)
        return []

    def preview_voice_sample(self, service_key: str, voice_id: str) -> str:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.preview_voice_sample(service_key, voice_id)
        return ""

    def is_cached(self, text: str, lang: str = "ru") -> bool:
        """Проверяет, есть ли готовый синтез для фразы в кэше текущего движка."""
        clean = strip_emoji_control(text).strip()
        if not clean:
            return False
        checker = getattr(self.engine, "is_cached", None)
        if not checker:
            return False
        try:
            return bool(checker(clean, lang))
        except TypeError:
            return bool(checker(clean))

    def start(self) -> None:
        if self._worker and self._worker.is_alive():
            return
        self._worker = threading.Thread(target=self._run, name="winky-speech", daemon=True)
        self._worker.start()

    def speak(
        self,
        text: str,
        lang: str | None = None,
        emotion: str = "happy",
        action: str | None = None,
        action_duration: float = 3.5,
        source: str = "manual",
    ) -> bool:
        """Добавляет фразу в конвейер озвучки: асинхронный синтез в фоне + воспроизведение без обрыва реплик."""
        actual_lang = lang or detect_lang(text)
        # TikTok Anti-Ban Sanitizer: заменяем финансовые триггеры перед любой озвучкой
        text = sanitize_for_tiktok(text, actual_lang)
        text = strip_emoji_control(text)
        if not text:
            return False
        ok, reason = check_phrase(text)
        if not ok:
            logger.warning("Фраза заблокирована цензурой: %s", reason)
            self._last_blocked = f"{reason} («{text[:40]}…»)"
            self._emit_status()
            return False

        item = SpeechItem(
            text=text,
            lang=actual_lang,
            emotion=emotion if emotion in EMOTIONS else "happy",
            action=action,
            action_duration=action_duration,
            source=source,
        )

        with self._lock:
            self._playback_queue.append(item)

        # Сразу запускаем фоновый синтез в пуле потоков
        self._synth_pool.submit(self._prepare_audio, item)

        self._wake.set()
        self._emit_status()
        return True

    def _cleanup_prefetched(self) -> None:
        now = time.time()
        with self._lock:
            expired = [iid for iid, itm in self._prefetched_items.items() if (now - itm.created_at) > 120.0]
            for iid in expired:
                self._prefetched_items.pop(iid, None)

    def prefetch(
        self,
        text: str,
        lang: str | None = None,
        intent_id: str = "",
        emotion: str = "happy",
        action: str | None = None,
        action_duration: float = 3.5,
        source: str = "prefetch",
        expected_pair: str = "",
        expected_state: str = "",
        ttl_sec: float = 40.0,
    ) -> str:
        """Запускает упреждающий синтез фразы в фоне без немедленного воспроизведения (Producer)."""
        actual_lang = lang or detect_lang(text)
        text = sanitize_for_tiktok(text, actual_lang)
        text = strip_emoji_control(text)
        if not text:
            return ""
        ok, reason = check_phrase(text)
        if not ok:
            logger.warning("Prefetch фраза отклонена цензурой: %s", reason)
            return ""

        iid = intent_id or str(uuid.uuid4())
        item = SpeechItem(
            text=text,
            lang=actual_lang,
            emotion=emotion if emotion in EMOTIONS else "happy",
            action=action,
            action_duration=action_duration,
            source=source,
            intent_id=iid,
            created_at=time.time(),
            max_age_sec=ttl_sec,
            expected_pair=expected_pair,
            expected_state=expected_state,
        )

        with self._lock:
            self._prefetched_items[iid] = item

        self._synth_pool.submit(self._prepare_audio, item)
        self._cleanup_prefetched()
        logger.info("Запущен prefetch TTS [intent=%s] для «%s» (pair=%s, state=%s, ttl=%.0fs)", iid, text[:30], expected_pair, expected_state, ttl_sec)
        return iid

    def check_prefetch(self, intent_id: str) -> dict:
        """Проверяет готовность предзагруженного аудио."""
        with self._lock:
            item = self._prefetched_items.get(intent_id)

        if not item:
            return {"status": "not_found", "ready": False, "intent_id": intent_id}

        age = time.time() - item.created_at
        if age > item.max_age_sec:
            with self._lock:
                self._prefetched_items.pop(intent_id, None)
            return {"status": "expired", "ready": False, "intent_id": intent_id, "age": age}

        if item.failed:
            return {"status": "failed", "ready": False, "intent_id": intent_id}

        if item.ready_event.is_set() and item.media_path and item.media_path.exists():
            duration = (len(item.rms_chunks) * 0.05) if item.rms_chunks else wav_duration_seconds(item.media_path)
            return {
                "status": "ready",
                "ready": True,
                "intent_id": intent_id,
                "duration": duration,
                "text": item.text,
            }

        return {"status": "generating", "ready": False, "intent_id": intent_id, "age": age}

    def play_prefetched(
        self,
        intent_id: str,
        current_pair: str = "",
        current_state: str = "",
    ) -> bool:
        """Помещает готовый предзагруженный элемент в очередь воспроизведения (Consumer) с проверкой TTL и контекста."""
        with self._lock:
            item = self._prefetched_items.pop(intent_id, None)

        if not item:
            logger.warning("play_prefetched: intent %s не найден", intent_id)
            return False

        age = time.time() - item.created_at
        if age > item.max_age_sec:
            logger.warning("play_prefetched: intent %s устарел (возраст %.1fs > %.1fs)", intent_id, age, item.max_age_sec)
            return False

        if item.expected_pair and current_pair and item.expected_pair.replace(" ", "").upper() != current_pair.replace(" ", "").upper():
            logger.warning("play_prefetched: рассинхрон пары (ожидали %s, на экране %s), отмена фразы", item.expected_pair, current_pair)
            return False

        if item.expected_state and current_state and item.expected_state.upper() != current_state.upper():
            logger.warning("play_prefetched: рассинхрон состояния бота (ожидали %s, сейчас %s), отмена фразы", item.expected_state, current_state)
            return False

        with self._lock:
            self._playback_queue.append(item)

        self._wake.set()
        self._emit_status()
        logger.info("play_prefetched: intent %s отправлен в воспроизведение («%s»)", intent_id, item.text[:30])
        return True

    def _prepare_audio(self, item: SpeechItem) -> None:
        """Фоновый синтез речи для элемента очереди."""
        try:
            # 1. Проверяем локальный кэш
            if hasattr(self.engine, "is_cached") and self.engine.is_cached(item.text, item.lang):
                cached_file = self.engine.get_cache_path(item.text, item.lang)
                if cached_file.exists() and cached_file.stat().st_size > 1024:
                    item.media_path = cached_file
                    item.rms_chunks = compute_rms_chunks(cached_file)
                    item.ready_event.set()
                    return

            # 2. Синтез через движок
            media = self.engine.synthesize(item.text, item.lang)
            item.media_path = media
            item.rms_chunks = compute_rms_chunks(media)
            item.ready_event.set()
        except Exception as exc:
            logger.error("Ошибка подготовки аудио для «%s»: %s", item.text[:30], exc)
            item.failed = True
            item.ready_event.set()

    def finish_current(self) -> None:
        """Аватар доиграл файл (callback из JS)."""
        self._finished.set()

    def clear_queue_and_stop(self) -> None:
        """Очищает очередь и останавливает текущее воспроизведение."""
        with self._lock:
            self._playback_queue.clear()
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

    def stop_current(self) -> None:
        """Мгновенно прерывает текущую речь (алиас для clear_queue_and_stop)."""
        self.clear_queue_and_stop()

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

    def queue_size(self) -> int:
        with self._lock:
            return len(self._playback_queue)

    def status(self) -> SpeechStatus:
        with self._lock:
            q_len = len(self._playback_queue)
        return SpeechStatus(
            state="paused" if self._paused else ("speaking" if self._speaking else "idle"),
            engine=self.engine.name,
            volume=self._volume,
            current_text=self._current_text,
            last_blocked=self._last_blocked,
            queue_len=q_len,
            queue_size=q_len,
        )

    def speak_chat_item(self, chat_item: Any) -> bool:
        """Воспроизводит подготовленный ответ чату (с уже готовым .mp3) без повторного синтеза."""
        media = getattr(chat_item, "media_path", None)
        text = getattr(chat_item, "reply_text", "") or getattr(chat_item, "text", "")
        lang = getattr(chat_item, "lang", "ru")
        emotion = getattr(chat_item, "emotion", "happy")

        clean_text = text
        if clean_text.startswith("[") and "]" in clean_text[:15]:
            clean_text = clean_text[clean_text.index("]") + 1:].strip()

        item = SpeechItem(
            text=clean_text,
            lang=lang,
            emotion=emotion,
            action="wave" if emotion == "wave" else ("blush" if emotion == "blush" else None),
            action_duration=3.2,
            media_path=media,
            rms_chunks=compute_rms_chunks(media) if media and media.exists() else None,
            source=f"chat_reply_{getattr(chat_item, 'user', 'viewer')}",
        )
        if media and media.exists():
            item.ready_event.set()
        else:
            self._synth_pool.submit(self._prepare_audio, item)

        with self._lock:
            self._playback_queue.append(item)

        self._wake.set()
        self._emit_status()
        return True

    def speak_stream_category(
        self,
        category: str,
        lang: str = "ru",
        emotion: str = "happy",
        action: str | None = None,
        priority: bool = False,
    ) -> bool:
        """Мгновенно (за 0.05 сек) воспроизводит готовую фразу категории из STREAM_VOICE_BANK.

        1. Считывает фразы STREAM_VOICE_BANK[lang][category], которые УЖЕ лежат в voice_cache/.
        2. Если есть готовые — мгновенно берет одну и передаёт в очередь воспроизведения (0.05с).
        3. В тихом фоновом потоке (не блокируя речь) догенерирует 1 недостающую фразу этой категории через Lumean.
        4. Если готовых нет — берет любой валидный .mp3 файл слота голоса из voice_cache/ (без EdgeTTS/say!).
        """
        # Жёсткий кулдаун 60 секунд на озвучку смены пары / пропуска рынка (чтобы не спамила при поиске точки входа)
        cat_lower = (category or "").lower()
        if cat_lower in ("flat_skip", "switch_pair"):
            now_ts = time.time()
            last_ts = getattr(self, "_last_pair_skip_ts", 0.0)
            if now_ts - last_ts < 60.0:
                logger.info("⏳ [Cooldown 60s] speak_stream_category [%s] пропущен (прошло %.1f с < 60 с)", category, now_ts - last_ts)
                return False
            self._last_pair_skip_ts = now_ts

        from winky.scenarios import STREAM_VOICE_BANK

        actual_lang = "ru" if (lang or "ru").lower() == "ru" else "en"
        phrases_map = STREAM_VOICE_BANK.get(actual_lang, {})
        phrases = phrases_map.get(category)
        if not phrases:
            for k, v in phrases_map.items():
                if k.lower() == category.lower():
                    phrases = v
                    break

        if not phrases:
            logger.warning("speak_stream_category: категория «%s» не найдена в STREAM_VOICE_BANK[%s]", category, actual_lang)
            return False

        # Фразы воспроизводятся последовательно без обрывов звучащей речи
        # (приоритет обеспечивается планированием StreamDirector)

        # 1. Проверяем, какие фразы уже закэшированы в voice_cache/
        cached_phrases: list[str] = []
        missing_phrases: list[str] = []
        for p in phrases:
            if hasattr(self.engine, "is_cached") and self.engine.is_cached(p, lang=actual_lang):
                cached_phrases.append(p)
            else:
                missing_phrases.append(p)

        # 2. Мгновенная выдача (0.05с) через Умную колоду без повторов
        if cached_phrases:
            deck_key = (actual_lang, category)
            with self._lock:
                if deck_key not in self._category_decks:
                    self._category_decks[deck_key] = SmartCategoryDeck(category, actual_lang)
                deck = self._category_decks[deck_key]

            selected_phrase = deck.get_next(cached_phrases) or random.choice(cached_phrases)
            cached_file = self.engine.get_cache_path(selected_phrase, lang=actual_lang)
            item = SpeechItem(
                text=selected_phrase,
                lang=actual_lang,
                emotion=emotion,
                action=action,
                action_duration=3.5,
                media_path=cached_file,
                rms_chunks=compute_rms_chunks(cached_file),
                source=f"stream_bank_{category}",
            )
            item.ready_event.set()
            with self._lock:
                self._playback_queue.append(item)
            self._wake.set()
            self._emit_status()
            logger.info("⚡ [0.05s Hit Deck] speak_stream_category [%s]: «%s» (%s)", category, selected_phrase[:40], cached_file.name)
        else:
            # Страховочный поиск: сначала проверяем готовую папку ассетов Lumean для данной категории
            cached_file = None
            lumean_cat_dir = PROJECT_ROOT / "assets" / "voices" / "lumean" / category
            if not lumean_cat_dir.is_dir():
                for d in (PROJECT_ROOT / "assets" / "voices" / "lumean").glob("*"):
                    if d.is_dir() and d.name.lower() == category.lower():
                        lumean_cat_dir = d
                        break
            if lumean_cat_dir.is_dir():
                ready_lumean = [f for f in lumean_cat_dir.glob("*.mp3") if f.stat().st_size > 1024]
                if ready_lumean:
                    cached_file = random.choice(ready_lumean)

            if not cached_file:
                logger.warning("speak_stream_category: фразы категории [%s] ещё не закэшированы, ищу резервный .mp3...", category)
                slot, service_key, voice_id = ("ru", DEFAULT_RU_SERVICE, DEFAULT_RU_VOICE_ID) if actual_lang == "ru" else ("en", DEFAULT_EN_SERVICE, DEFAULT_EN_VOICE_ID)
                if hasattr(self.engine, "get_voice_dir"):
                    voice_dir = self.engine.get_voice_dir(service_key, voice_id)
                else:
                    voice_dir = VOICE_CACHE_DIR / f"{service_key}_{voice_id[:12]}"

                ready_files = [f for f in voice_dir.glob("*.mp3") if f.stat().st_size > 1024]
                if ready_files:
                    cached_file = random.choice(ready_files)

            if cached_file:
                item = SpeechItem(
                    text=f"[{category}]",
                    lang=actual_lang,
                    emotion=emotion,
                    action=action,
                    action_duration=3.5,
                    media_path=cached_file,
                    rms_chunks=compute_rms_chunks(cached_file),
                    source=f"stream_bank_{category}",
                )
                item.ready_event.set()
                with self._lock:
                    self._playback_queue.append(item)
                self._wake.set()
                self._emit_status()
                logger.info("⚡ [0.05s Hit Lumean/Fallback] speak_stream_category [%s]: взят готовый %s", category, cached_file.name)
            else:
                # Если папка совсем пустая — отправляем первую фразу в стандартный синтез
                self.speak(phrases[0], lang=actual_lang, emotion=emotion, action=action, source=f"stream_bank_{category}")

        # 3. Тихий фоновый синтез 1 недостающей фразы (не блокируя очередь)
        if missing_phrases and settings.LUMEAN_API_KEY:
            to_synth = missing_phrases[0]
            def _background_warmup():
                try:
                    time.sleep(2.0)
                    if hasattr(self.engine, "synthesize"):
                        self.engine.synthesize(to_synth, lang=actual_lang)
                        logger.info("Фоновый прогрев фразы [%s]: «%s» выполнен", category, to_synth[:30])
                except Exception as e:
                    logger.debug("Ошибка фонового прогрева фразы [%s]: %s", category, e)

            threading.Thread(target=_background_warmup, daemon=True, name=f"warmup-{category}").start()

        return True

    # ---------- воркер воспроизведения ----------

    def _next_item(self) -> SpeechItem | None:
        with self._lock:
            return self._playback_queue.popleft() if self._playback_queue else None

    def _run(self) -> None:
        while True:
            if self._paused:
                self._wake.wait(timeout=0.2)
                self._wake.clear()
                continue
            item = self._next_item()
            if item is None:
                self._wake.wait(timeout=0.2)
                self._wake.clear()
                continue
            self._process_item(item)

    def _process_item(self, item: SpeechItem) -> None:
        # Проверяем начальный возраст фразы (TTL Guard)
        age = time.time() - item.created_at
        if age > item.max_age_sec:
            logger.warning("Фраза устарела до начала ожидания (возраст %.1fс > %.1fс): «%s», отмена", age, item.max_age_sec, item.text[:30])
            self._emit_status_impl()
            return

        # Ждём завершения синтеза аудио (до 45с)
        ready = item.ready_event.wait(timeout=45.0)
        if not ready or item.failed or not item.media_path or not item.media_path.exists():
            logger.warning("Аудио не готово или ошибка синтеза для «%s»", item.text[:30])
            self._emit_status_impl()
            return

        # Повторная проверка возраста фразы после ожидания синтеза
        age_after = time.time() - item.created_at
        if age_after > (item.max_age_sec + 15.0):
            logger.warning("Фраза устарела после синтеза (возраст %.1fс): «%s», отмена", age_after, item.text[:30])
            self._emit_status_impl()
            return

        # Триггерим действие и эмоцию СТРОГО в момент фактического старта воспроизведения фразы
        if item.action:
            try:
                self.on_action(item.action, item.action_duration)
            except Exception as e:
                logger.debug("on_action error: %s", e)
        if item.emotion:
            try:
                self.on_emotion(item.emotion)
            except Exception as e:
                logger.debug("on_emotion error: %s", e)

        self._play_media(item.media_path, item.text, item.emotion, item.lang, item.rms_chunks)

    def _play_media(
        self,
        media: Path,
        text: str,
        emotion: str,
        lang: str,
        precomputed_rms: list[float] | None = None,
    ) -> None:
        try:
            rel = media.relative_to(VOICE_CACHE_DIR).as_posix()
            media_url = f"/voice_cache/{rel}"
        except ValueError:
            try:
                rel_path = media.relative_to(MEDIA_DIR.parent).as_posix()
                media_url = f"/{rel_path}"
            except ValueError:
                media_url = f"/media/{media.name}"

        rms_chunks = precomputed_rms if precomputed_rms is not None else compute_rms_chunks(media, chunk_ms=50)
        duration = len(rms_chunks) * 0.05 if rms_chunks else max(2.5, wav_duration_seconds(media))

        self._speaking = True
        self._current_text = text
        self._emit_status_impl()

        self._finished.clear()
        try:
            self.on_speak(media_url, emotion, self._volume, lang)
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
            start_play = time.monotonic()
            last_idx = -1
            chunk_sec = 0.05
            while afplay_proc.poll() is None:
                if self._paused:
                    break
                elapsed = time.monotonic() - start_play
                idx = int(elapsed / chunk_sec)
                if 0 <= idx < len(rms_chunks) and idx != last_idx:
                    last_idx = idx
                    self.on_rms(rms_chunks[idx])
                elif idx >= len(rms_chunks) and last_idx != -2:
                    last_idx = -2
                    self.on_rms(0.0)
                time.sleep(0.012)

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
            # Не удаляем файлы из voice_cache/ и cache/
            if "voice_cache" not in str(media) and "cache" not in str(media):
                try:
                    media.unlink(missing_ok=True)
                except OSError:
                    pass
            self._emit_status_impl()
            # Естественная микропауза между фразами в очереди
            time.sleep(0.35)

    def _emit_status_impl(self) -> None:
        try:
            self.on_status(self.status())
        except Exception:  # noqa: BLE001 — статус не должен ронять поток
            logger.exception("Не удалось отправить статус в пульт")

    def _emit_status(self) -> None:
        self._emit_status_impl()


def warmup_stream_voice_bank(engine: Any = None, delay_between_sec: float = 2.0) -> dict[str, int]:
    """Проверяет все фразы STREAM_VOICE_BANK и последовательно предсинтезирует недостающие в voice_cache/ строго через Lumean (с паузой 2.0с для защиты от 429)."""
    from winky.scenarios import STREAM_VOICE_BANK

    if engine is None:
        engine = build_engine()

    stats = {"cached": 0, "synthesized": 0, "failed": 0}
    tasks_to_synth: list[tuple[str, str, str]] = []

    for lang, categories in STREAM_VOICE_BANK.items():
        for cat, phrases in categories.items():
            for p in phrases:
                try:
                    if hasattr(engine, "is_cached") and engine.is_cached(p, lang=lang):
                        stats["cached"] += 1
                    else:
                        tasks_to_synth.append((lang, cat, p))
                except Exception as exc:
                    logger.warning("Ошибка проверки кэша [%s/%s]: %s", lang, cat, exc)

    if not tasks_to_synth:
        logger.info("=== Все фразы STREAM_VOICE_BANK уже закэшированы! (HIT: %d) ===", stats["cached"])
        return stats

    logger.info("Кэшировано: %d, требуется синтезировать в Lumean: %d (последовательно с паузой %.1fс)", stats["cached"], len(tasks_to_synth), delay_between_sec)

    for i, (lang, cat, phrase) in enumerate(tasks_to_synth, 1):
        try:
            if hasattr(engine, "synthesize"):
                logger.info("[%d/%d] Прогрев Lumean [%s/%s]: «%s»...", i, len(tasks_to_synth), lang, cat, phrase[:35])
                engine.synthesize(phrase, lang=lang)
                stats["synthesized"] += 1
        except Exception as e:
            logger.warning("[%d/%d] Ошибка синтеза Lumean [%s/%s]: %s", i, len(tasks_to_synth), lang, cat, e)
            stats["failed"] += 1

        # Пауза 2.0 секунды между запросами для защиты от HTTP 429
        if i < len(tasks_to_synth):
            time.sleep(delay_between_sec)

    logger.info("=== Итоги прогрева STREAM_VOICE_BANK: %s ===", stats)
    return stats
