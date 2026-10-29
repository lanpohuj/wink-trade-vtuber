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
import re
import struct
import subprocess
import threading
import time
import wave
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import httpx
import requests

from config import settings
from winky.censor import check_phrase, strip_emoji_control

logger = logging.getLogger(__name__)

MEDIA_DIR = Path(__file__).parent / "web" / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

EMOTIONS = (
    "idle", "happy", "excited", "thinking", "wink", "blush", "surprised", "neutral",
    "win", "wave", "dance", "flirt_kiss", "neko_paws", "hip_groove", "peek_closer"
)

DEFAULT_LUMEAN_SERVICE = "elevenlabs"
DEFAULT_LUMEAN_VOICE_ID = "hLjwV7lYzk15SWLUmhEH"
DEFAULT_LUMEAN_VOICE_NAME = "Marusya G"


def detect_lang(text: str) -> str:
    """Язык фразы по алфавиту: кириллица -> ru, иначе en."""
    return "ru" if any("а" <= ch.lower() <= "я" for ch in text) else "en"


def save_voice_to_env(service: str, voice_id: str, voice_name: str) -> None:
    """Сохраняет параметры активного голоса Winky в файл .env."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    try:
        content = env_path.read_text(encoding="utf-8")
        updates = {
            "LUMEAN_SERVICE": service,
            "LUMEAN_VOICE_ID": voice_id,
            "LUMEAN_VOICE_NAME": voice_name,
        }
        lines = content.splitlines()
        found_keys: set[str] = set()
        new_lines: list[str] = []
        for line in lines:
            trimmed = line.strip()
            matched = False
            for key, val in updates.items():
                if trimmed.startswith(f"{key}=") or trimmed.startswith(f"#{key}="):
                    new_lines.append(f"{key}={val}")
                    found_keys.add(key)
                    matched = True
                    break
            if not matched:
                new_lines.append(line)
        for key, val in updates.items():
            if key not in found_keys:
                new_lines.append(f"{key}={val}")
        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        logger.info("Голос сохранён в .env: %s / %s (%s)", service, voice_id, voice_name)
    except Exception as exc:
        logger.warning("Не удалось сохранить голос в .env: %s", exc)


class TTSError(RuntimeError):
    """Синтез не удался."""


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
    """Облачный TTS через Lumean API (https://lumean.app): ElevenLabs / Fish Audio / LumVoice / Cartesia."""

    name = "Lumean"
    BASE_URL = "https://api.lumean.app/api/public"

    def __init__(self) -> None:
        self._service_key: str = (settings.LUMEAN_SERVICE or DEFAULT_LUMEAN_SERVICE).strip().lower()
        self._voice_id: str = (settings.LUMEAN_VOICE_ID or DEFAULT_LUMEAN_VOICE_ID).strip()
        self._voice_name: str = (settings.LUMEAN_VOICE_NAME or DEFAULT_LUMEAN_VOICE_NAME).strip()
        self._template_id: str | None = (settings.LUMEAN_TEMPLATE_ID or "").strip() or None

        self._fallback = EdgeTTS()
        self._cache_dir = MEDIA_DIR / "cache"
        self._cache_dir.mkdir(parents=True, exist_ok=True)

        # Постоянный Keep-Alive клиент без повторных TLS handshakes
        self._client = httpx.Client(timeout=30.0, http2=False)

        # Кэш шаблонов по сервисам на диске
        self._templates_by_service: dict[str, str] = self._load_templates_cache()
        if self._template_id:
            self._templates_by_service[self._service_key] = self._template_id
            self._save_templates_cache()

    def _load_templates_cache(self) -> dict[str, str]:
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
        tpl_file = self._cache_dir / "lumean_templates.json"
        try:
            tpl_file.write_text(json.dumps(self._templates_by_service, indent=2), encoding="utf-8")
        except Exception:
            pass

    @property
    def service_key(self) -> str:
        return self._service_key

    @property
    def voice_id(self) -> str:
        return self._voice_id

    @property
    def voice_name(self) -> str:
        return self._voice_name

    def set_template_id(self, template_id: str) -> None:
        clean = template_id.strip()
        if clean:
            self._template_id = clean
            self._templates_by_service[self._service_key] = clean
            self._save_templates_cache()
            settings.LUMEAN_TEMPLATE_ID = clean
            logger.info("Установлен новый Lumean Template ID: %s", clean)

    def set_voice(self, service_key: str, voice_id: str, voice_name: str = "") -> None:
        clean_service = (service_key or self._service_key or DEFAULT_LUMEAN_SERVICE).strip().lower()
        clean_voice = (voice_id or self._voice_id).strip()
        clean_name = (voice_name or clean_voice).strip()

        changed = (clean_service != self._service_key or clean_voice != self._voice_id)
        self._service_key = clean_service
        self._voice_id = clean_voice
        self._voice_name = clean_name

        settings.LUMEAN_SERVICE = clean_service
        settings.LUMEAN_VOICE_ID = clean_voice
        settings.LUMEAN_VOICE_NAME = clean_name

        save_voice_to_env(clean_service, clean_voice, clean_name)
        if changed:
            logger.info(
                "Голос Winky обновлён: провайдер=%s, voice_id=%s, имя=%s",
                clean_service, clean_voice, clean_name
            )

    def get_settings(self) -> dict[str, str]:
        active_tid = self._templates_by_service.get(self._service_key) or self._template_id or ""
        return {
            "service_key": self._service_key,
            "voice_id": self._voice_id,
            "voice_name": self._voice_name,
            "template_id": active_tid,
        }

    def _headers(self) -> dict[str, str]:
        return {
            "X-API-KEY": settings.LUMEAN_API_KEY,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _ensure_template(self, service_key: str, voice_id: str) -> str:
        """Получает существующий или создаёт новый шаблон TTS в Lumean для нужного провайдера."""
        headers = self._headers()

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
                if isinstance(raw_data, list):
                    items = raw_data
                elif isinstance(raw_data, dict):
                    items = raw_data.get("items", [])
                else:
                    items = []

                # Ищем шаблон для данного service_key (предпочитаем начинающийся с Winky)
                matched_template = None
                for item in items:
                    if item.get("service_key") == service_key:
                        name = item.get("name") or ""
                        if name.startswith("Winky"):
                            matched_template = item
                            break
                        if matched_template is None:
                            matched_template = item

                if matched_template:
                    template_id = str(matched_template["id"])
                    self._templates_by_service[service_key] = template_id
                    self._save_templates_cache()
                    logger.info("Найден шаблон Lumean для %s: %s", service_key, template_id)
                    return template_id

        except Exception as exc:
            logger.debug("Не удалось получить список шаблонов Lumean: %s", exc)

        # 2. Если шаблон для service_key не найден — создаём новый
        logger.info("Создаю новый шаблон Winky для сервиса %s (voice_id=%s)...", service_key, voice_id)
        if service_key == "elevenlabs":
            config = {
                "tts_settings": {
                    "mode": "mode_v1",
                    "model_id": "eleven_multilingual_v2",
                    "voice_id": voice_id,
                    "advanced_voice_settings": True,
                    "voice_settings": {
                        "stability": 0.45,
                        "similarity_boost": 0.80,
                        "use_speaker_boost": True,
                        "speed": 1.0,
                    },
                }
            }
        else:
            # Для fishaudio, cartesia, lumvoice: опрашиваем config-options
            model_id = "s2.1-pro" if service_key == "fishaudio" else ("sonic-3" if service_key == "cartesia" else "")
            try:
                opt_resp = self._client.get(
                    f"{self.BASE_URL}/templates/config-options?service={service_key}",
                    headers=headers,
                    timeout=8.0,
                )
                if opt_resp.status_code == 200:
                    opts = opt_resp.json().get("data", {}).get("tts_settings", {})
                    if "model_id" in opts and isinstance(opts["model_id"], dict):
                        model_id = opts["model_id"].get("default") or model_id
            except Exception:
                pass

            config = {
                "tts_settings": {
                    "voice_id": voice_id,
                }
            }
            if model_id:
                config["tts_settings"]["model_id"] = model_id
            if service_key == "fishaudio":
                config["tts_settings"]["format"] = "mp3"

        create_resp = self._client.post(
            f"{self.BASE_URL}/templates",
            headers=headers,
            json={
                "service_key": service_key,
                "name": f"Winky {service_key}",
                "config": config,
            },
            timeout=10.0,
        )
        create_resp.raise_for_status()
        created = create_resp.json()
        template_id = str(created.get("data", {}).get("id"))
        self._templates_by_service[service_key] = template_id
        self._save_templates_cache()
        logger.info("Успешно создан шаблон Lumean %s для %s: %s", f"Winky {service_key}", service_key, template_id)
        return template_id

    def get_cache_path(self, text: str) -> Path:
        clean_text = text.strip()
        cache_key = hashlib.sha256(
            f"lumean:{self._service_key}:{self._voice_id}:{clean_text}".encode("utf-8")
        ).hexdigest()[:20]
        return self._cache_dir / f"lumean_{self._service_key}_{self._voice_id[:8]}_{cache_key}.mp3"

    def is_cached(self, text: str) -> bool:
        clean_text = text.strip()
        if not clean_text:
            return False
        cached_file = self.get_cache_path(clean_text)
        return cached_file.exists() and cached_file.stat().st_size > 1000

    def synthesize(self, text: str, lang: str = "ru") -> Path:
        """Синтезирует речь выбранным голосом через прямой Keep-Alive вызов Lumean API."""
        clean_text = text.strip()
        if not clean_text:
            raise TTSError("Пустой текст для озвучки")

        cached_file = self.get_cache_path(clean_text)
        if self.is_cached(clean_text):
            logger.info("Lumean аудио найдено в локальном кэше: %s", cached_file.name)
            return cached_file

        # Если нет ключа API Lumean — используем EdgeTTS
        if not settings.LUMEAN_API_KEY:
            logger.info("LUMEAN_API_KEY не задан — использую edge-tts (Ava Multilingual)")
            return self._fallback.synthesize(clean_text, lang)

        try:
            # 1. Мгновенно берём template_id из кэша (0 мс пре-ордер задержка!)
            template_id = self._templates_by_service.get(self._service_key)
            if not template_id:
                template_id = self._ensure_template(self._service_key, self._voice_id)

            # Шаг А: Создание заказа с динамическим config_override voice_id
            order_payload: dict = {
                "template_id": template_id,
                "input_text": clean_text,
                "config_override": {
                    "tts_settings": {
                        "voice_id": self._voice_id
                    }
                }
            }

            create_resp = self._client.post(
                f"{self.BASE_URL}/orders",
                headers=self._headers(),
                json=order_payload,
                timeout=12.0,
            )

            # Если шаблон устарел/удалён — запрашиваем свежий и повторяем заказ
            if create_resp.status_code in (400, 404, 422):
                logger.warning("Шаблон %s недействителен, запрашиваю свежий...", template_id)
                self._templates_by_service.pop(self._service_key, None)
                template_id = self._ensure_template(self._service_key, self._voice_id)
                order_payload["template_id"] = template_id
                create_resp = self._client.post(
                    f"{self.BASE_URL}/orders",
                    headers=self._headers(),
                    json=order_payload,
                    timeout=12.0,
                )

            create_resp.raise_for_status()
            order_data = create_resp.json().get("data", {})
            order_id = order_data.get("id")
            if not order_id:
                raise TTSError(f"Lumean не вернул order_id: {create_resp.text}")

            # Шаг Б: Быстрый опрос статуса выполнения заказа (0.30с старт, 0.20с шаг)
            time.sleep(0.30)
            start_poll = time.monotonic()
            file_path: str | None = None
            while time.monotonic() - start_poll < 60.0:
                status_resp = self._client.get(
                    f"{self.BASE_URL}/orders/{order_id}",
                    headers=self._headers(),
                    timeout=5.0,
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
                time.sleep(0.20)

            if not file_path:
                raise TTSError(f"Lumean таймаут >60с заказа {order_id}")

            # Шаг В: Получение подписанной ссылки на скачивание
            url_resp = self._client.post(
                f"{self.BASE_URL}/storage/url",
                headers=self._headers(),
                json={"path": file_path, "download": True},
                timeout=10.0,
            )
            url_resp.raise_for_status()
            download_url = url_resp.json().get("data", {}).get("url")
            if not download_url:
                raise TTSError("Lumean не вернул URL для скачивания файла")

            # Шаг Г: Скачивание аудиофайла по постоянному Keep-Alive соединению
            audio_resp = self._client.get(download_url, timeout=15.0)
            audio_resp.raise_for_status()
            cached_file.write_bytes(audio_resp.content)
            # Сразу рассчитываем RMS для мгновенного липсинка при проигрывании
            compute_rms_chunks(cached_file)
            logger.info("Lumean TTS успешно сгенерировал речь: %s (%d байт)", cached_file.name, len(audio_resp.content))
            return cached_file

        except Exception as exc:  # noqa: BLE001
            # Только для этой фразы фоллбэк на edge-tts (БЕЗ бэкоффа)
            logger.warning(
                "Lumean TTS ошибка синтеза (%s) — фоллбэк на edge-tts (Ava) только для этой фразы",
                exc
            )
            return self._fallback.synthesize(clean_text, lang)

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
        self._fallback = EdgeTTS()

    def is_cached(self, text: str) -> bool:
        return False

    def synthesize(self, text: str, lang: str = "ru") -> Path:
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


def build_engine() -> LumeanTTS | ElevenLabsTTS | EdgeTTS:
    """Выбор движка: Lumean -> ElevenLabs -> edge-tts (мультиязычная Ava)."""
    if settings.LUMEAN_API_KEY:
        return LumeanTTS()
    if settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_VOICE_ID:
        return ElevenLabsTTS()
    return EdgeTTS()


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
    engine: ElevenLabsTTS | LumeanTTS | EdgeTTS = field(default_factory=build_engine)

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

    def update_lumean_settings(self, template_id: str = "", voice_id: str = "", service_key: str = "", voice_name: str = "") -> dict[str, str]:
        if isinstance(self.engine, LumeanTTS):
            if template_id:
                self.engine.set_template_id(template_id)
            if voice_id or service_key or voice_name:
                self.engine.set_voice(
                    service_key=service_key or self.engine.service_key,
                    voice_id=voice_id or self.engine.voice_id,
                    voice_name=voice_name or self.engine.voice_name,
                )
            return self.engine.get_settings()
        return {}

    def set_lumean_voice(self, service_key: str, voice_id: str, voice_name: str = "") -> dict[str, str]:
        if isinstance(self.engine, LumeanTTS):
            self.engine.set_voice(service_key, voice_id, voice_name)
            return self.engine.get_settings()
        return {}

    def get_lumean_settings(self) -> dict[str, str]:
        if isinstance(self.engine, LumeanTTS):
            return self.engine.get_settings()
        return {
            "service_key": settings.LUMEAN_SERVICE or DEFAULT_LUMEAN_SERVICE,
            "voice_id": settings.LUMEAN_VOICE_ID or DEFAULT_LUMEAN_VOICE_ID,
            "voice_name": settings.LUMEAN_VOICE_NAME or DEFAULT_LUMEAN_VOICE_NAME,
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

    def is_cached(self, text: str) -> bool:
        """Проверяет, есть ли готовый синтез для фразы в кэше текущего движка."""
        clean = strip_emoji_control(text).strip()
        if not clean:
            return False
        checker = getattr(self.engine, "is_cached", None)
        return bool(checker(clean)) if checker else False

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

    def _emit_status() -> None:
        pass

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
        clean_text = task.text.strip()
        sentences = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", clean_text) if s.strip()]

        # Sentence Pipelining: если фраза длинная и ещё не в кэше, начинаем говорить сразу по готовности 1-го предложения
        if len(clean_text) > 65 and len(sentences) >= 2 and not self.is_cached(clean_text):
            first_part = sentences[0]
            rest_part = " ".join(sentences[1:])
            logger.info("Sentence Pipelining: разделение на 2 потока («%s» и «%s»)", first_part[:30], rest_part[:30])
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    f_first = executor.submit(self.engine.synthesize, first_part, task.lang)
                    f_rest = executor.submit(self.engine.synthesize, rest_part, task.lang)
                    media_first = f_first.result(timeout=50.0)
                    self._play_media(media_first, first_part, task.emotion, task.lang)
                    media_rest = f_rest.result(timeout=50.0)
                    self._play_media(media_rest, rest_part, task.emotion, task.lang)
                    return
            except Exception as exc:
                logger.warning("Sentence Pipelining ошибка (%s), выполняю обычный синтез", exc)

        try:
            media = self.engine.synthesize(task.text, task.lang)
            self._play_media(media, task.text, task.emotion, task.lang)
        except TTSError as exc:
            logger.error("Синтез не удался: %s", exc)
            self._speaking = False
            self._current_text = ""
            self._finished.set()
            self._emit_status_impl()

    def _play_media(self, media: Path, text: str, emotion: str, lang: str) -> None:
        try:
            rel_path = media.relative_to(MEDIA_DIR.parent).as_posix()
            media_url = f"/{rel_path}"
        except ValueError:
            media_url = f"/media/{media.name}"

        rms_chunks = compute_rms_chunks(media, chunk_ms=50)
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
            if "cache" not in str(media):
                try:
                    media.unlink(missing_ok=True)
                except OSError:
                    pass
            self._emit_status_impl()

    def _emit_status_impl(self) -> None:
        try:
            self.on_status(self.status())
        except Exception:  # noqa: BLE001 — статус не должен ронять поток
            logger.exception("Не удалось отправить статус в пульт")

    def _emit_status(self) -> None:
        self._emit_status_impl()
