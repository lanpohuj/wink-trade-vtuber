"""Голосовые приветствия от Winky в Telegram-боте (Lumean TTS + voice_cache)."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)

BOT_ASSETS_DIR = Path(__file__).resolve().parent / "assets"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
VOICE_CACHE_DIR = PROJECT_ROOT / "voice_cache"
VOICE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

WELCOME_TEXTS = {
    "ru": (
        "Приветик! Это Винки! Я так рада, что ты перешёл ко мне со стрима! "
        "Жми кнопку регистрации ниже, это займёт всего тридцать секунд, "
        "и погнали забирать плюсовые сделки вместе!"
    ),
    "en": (
        "Hey there! It's Winky from the stream! I'm so happy you joined my club! "
        "Tap the register button below, it only takes thirty seconds, "
        "and let's start catching winning trades together!"
    ),
}


def get_welcome_voice_path(lang: str = "ru") -> Path | None:
    """Возвращает путь к готовому голосовому файлу приветствия:

    1. Сначала проверяет bot/assets/bot_welcome_{lang}.mp3 (для Docker-образа на проде).
    2. Затем assets/voices/bot_welcome_{lang}.mp3.
    3. Затем voice_cache/bot_welcome_{lang}.mp3.
    """
    norm_lang = "ru" if (lang or "ru").lower() == "ru" else "en"
    
    asset_file = BOT_ASSETS_DIR / f"bot_welcome_{norm_lang}.mp3"
    if asset_file.exists() and asset_file.stat().st_size > 1000:
        return asset_file

    root_asset = PROJECT_ROOT / "assets" / "voices" / f"bot_welcome_{norm_lang}.mp3"
    if root_asset.exists() and root_asset.stat().st_size > 1000:
        return root_asset

    target_file = VOICE_CACHE_DIR / f"bot_welcome_{norm_lang}.mp3"
    if target_file.exists() and target_file.stat().st_size > 1000:
        return target_file
    return None


async def ensure_welcome_voice(lang: str = "ru") -> Path | None:
    """Гарантирует наличие голосового приветствия:

    1. Если файл уже в bot/assets/ или voice_cache — возвращает его сразу (0мс).
    2. Если нет, но задан LUMEAN_API_KEY — синтезирует 1 раз через LumeanTTS или HTTP и сохраняет.
    3. При отсутствии ключа или ошибке сети — возвращает None без сбоев.
    """
    cached = get_welcome_voice_path(lang)
    if cached is not None:
        return cached

    if not settings.LUMEAN_API_KEY:
        return None

    norm_lang = "ru" if (lang or "ru").lower() == "ru" else "en"
    target_file = VOICE_CACHE_DIR / f"bot_welcome_{norm_lang}.mp3"
    text = WELCOME_TEXTS[norm_lang]

    try:
        import asyncio

        try:
            from winky.tts import LumeanTTS
        except (ImportError, ModuleNotFoundError):
            LumeanTTS = None

        if LumeanTTS is not None:
            tts = LumeanTTS()
            # Синтез через Lumean API (в отдельном потоке, чтобы не блокировать event loop)
            loop = asyncio.get_running_loop()
            generated_file = await loop.run_in_executor(None, lambda: tts.synthesize(text, lang=norm_lang))
            if generated_file and generated_file.exists() and generated_file.stat().st_size > 1000:
                shutil.copyfile(generated_file, target_file)
                logger.info("Голосовое приветствие Winky сохранено в кэш: %s", target_file.name)
                return target_file
        else:
            import httpx

            voice_id = settings.LUMEAN_EN_VOICE_ID if norm_lang == "en" else settings.LUMEAN_RU_VOICE_ID
            service = settings.LUMEAN_EN_SERVICE if norm_lang == "en" else settings.LUMEAN_RU_SERVICE
            headers = {"X-API-KEY": settings.LUMEAN_API_KEY}
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.lumean.app/api/public/tts",
                    headers=headers,
                    json={"text": text, "service": service, "voice_id": voice_id},
                )
                if resp.status_code == 200 and len(resp.content) > 1000:
                    target_file.write_bytes(resp.content)
                    return target_file
    except Exception as exc:
        logger.warning("Не удалось синтезировать голосовое приветствие [%s]: %s", norm_lang, exc)

    return None
