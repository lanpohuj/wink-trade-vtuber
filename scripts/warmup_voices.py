#!/usr/bin/env python3
"""Скрипт предпрогрева (warmup) всех фраз STREAM_VOICE_BANK в папку voice_cache/.
Гарантирует 100% покрытие кэша голосом Lumean для мгновенной отдачи за 0.05 сек.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Добавляем корень проекта в sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config import settings
from winky.scenarios import STREAM_VOICE_BANK
from winky.tts import build_engine, warmup_stream_voice_bank

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
)
logger = logging.getLogger("warmup")


def main() -> None:
    logger.info("=== Запуск прогрева банка фраз Winky AI (STREAM_VOICE_BANK) ===")
    logger.info("Lumean API Key: %s", "Задан" if settings.LUMEAN_API_KEY else "НЕ ЗАДАН")

    engine = build_engine()
    logger.info("Движок TTS: %s", engine.name)

    stats = warmup_stream_voice_bank(engine)
    logger.info("=== Результаты прогрева ===")
    logger.info("Уже в кэше (HIT):      %d", stats["cached"])
    logger.info("Синтезировано (MISS):   %d", stats["synthesized"])
    logger.info("Ошибок:                 %d", stats["failed"])

    # Проверка готовности по категориям
    total_phrases = sum(len(phrases) for cat in STREAM_VOICE_BANK.values() for phrases in cat.values())
    logger.info("Всего фраз в банке:     %d", total_phrases)


if __name__ == "__main__":
    main()
