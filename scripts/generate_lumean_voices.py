#!/usr/bin/env python3
"""Скрипт генерации полного банка голосов Winky AI через Lumean API (58 фраз по 12 категориям).

Скачивает аудиофайлы в assets/voices/lumean/<CATEGORY>/<id>.mp3 и формирует manifest.json.
Поддерживает докачку (пропускает уже скачанные валидные файлы >5 КБ).
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import httpx

# Добавляем корень проекта в sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(message)s")
logger = logging.getLogger("generate_voices")

ASSETS_DIR = PROJECT_ROOT / "assets" / "voices" / "lumean"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_PATH = ASSETS_DIR / "manifest.json"

BASE_URL = "https://api.lumean.app/api/public"
API_KEY = settings.LUMEAN_API_KEY
TEMPLATE_ID = settings.LUMEAN_RU_TEMPLATE_ID or settings.LUMEAN_TEMPLATE_ID or "01a18b18-b68b-73dd-b13c-b155337800ec"

VOICE_PHRASES: dict[str, list[tuple[str, str]]] = {
    "START_STREAM_READY": [
        ("start_01", "Всем привет на стриме! Винки на связи, включаем турбо-режим и начинаем искать идеальные точки входа!"),
        ("start_02", "Так, терминал готов, индикаторы заряжены! Давайте посмотрим, где сейчас можно забрать уверенный профит."),
        ("start_03", "Начинаем новый торговый цикл! Сейчас внимательно просканирую рынок и найду для нас лучший сигнал."),
        ("start_04", "Окей, я готова к анализу графика! Запускаю сканер уровней, объемов и тренда."),
    ],
    "ANALYZING_CHART": [
        ("analyze_01", "Секундочку, анализирую график... Смотрю на RSI, скользящие средние и реакцию цены у ключевых уровней."),
        ("analyze_02", "Так, давайте разберем текущую картину... Проверяю силу тренда, импульсы свечей и зоны перекупленности."),
        ("analyze_03", "Сканирую текущую валютную пару. Мне нужно убедиться, что здесь есть чистый сетап с высокой вероятностью отработки."),
        ("analyze_04", "Внимательно смотрю на свечи и индикаторы... Ищу точку, где покупатели или продавцы начинают выдыхаться."),
        ("analyze_05", "Провожу технический анализ графика: сверяю EMA, динамику RSI и ближайшие уровни поддержки и сопротивления."),
        ("analyze_06", "Хм, интересное движение на графике... Сейчас нейросеть просчитает точность сигнала на этой паре."),
    ],
    "WEAK_SIGNAL_SWITCH_PAIR": [
        ("switch_01", "Не-а, на этой паре сейчас слишком слабый сигнал и рваное движение. Рисковать не будем, переключаю на другую валютную пару!"),
        ("switch_02", "Здесь рынок сейчас капризный и точка входа размытая. Давайте сменим валютную пару и найдем куда более четкий график!"),
        ("switch_03", "Индикаторы на этой паре дают противоречивую картину. Переключаю актив, нам нужны только надежные сетапы с высоким процентом!"),
        ("switch_04", "Так, тут сейчас флэт и слабая волатильность, ловить нечего. Меняю валютную пару, посмотрим другой актив!"),
        ("switch_05", "На этом графике вероятность ниже нашей планки. Без сожалений переключаемся на следующую валютную пару!"),
        ("switch_06", "Ой, ну тут совсем скучная картина по индикаторам. Давайте переключим пару и поищем красивое трендовое движение!"),
    ],
    "PAIR_SWITCHED_NEW_SCAN": [
        ("switched_01", "Отлично, переключились на новую пару с высокой доходностью! Сейчас быстро проанализирую этот график."),
        ("switched_02", "Вот, совсем другое дело! Новая валютная пара открыта, запускаю сканирование уровней и RSI."),
        ("switched_03", "Перешли на свежий актив! Давайте посмотрим, какую картину нам рисуют свечи на этом графике."),
        ("switched_04", "Пара успешно изменена! Начинаю анализ индикаторов на новом графике."),
    ],
    "PREPARE_ENTRY": [
        ("prep_01", "Ого, вижу отличную формацию! Готовлю точку входа, сейчас зайдем на самом выгодном импульсе!"),
        ("prep_02", "Есть контакт! Сигнал подтвержден по всем индикаторам, приготовьтесь — сейчас будем открывать сделку!"),
        ("prep_03", "Красота! Уровень держит, RSI дает четкий разворотный сигнал. Выставляю параметры и захожу в сделку!"),
        ("prep_04", "Нашла сильный сетап с высокой точностью! Буквально пара секунд — фиксируем точку входа!"),
    ],
    "OPEN_TRADE_CALL": [
        ("call_01", "Захожу ВВЕРХ на повышение! Цена уперлась в сильный нижний уровень, продавцы выдохлись — ждем уверенный отскок наверх!"),
        ("call_02", "Открываю сделку КУПИТЬ, идем ВВЕРХ! Индикатор RSI в зоне перепроданности, а покупатели уже перехватывают инициативу!"),
        ("call_03", "Берем сделку на ПОВЫШЕНИЕ на тридцать секунд! Отличная поддержка снизу и разворотный паттерн по тренду!"),
        ("call_04", "Нажимаю ВВЕРХ! Здесь читается чистый бычий импульс от локального минимума, сделка в работе!"),
        ("call_05", "Сделка открыта на покупку — ВВЕРХ! Все факторы за рост, теперь сопровождаем движение!"),
        ("call_06", "Влетаем ВВЕРХ! Отличный вход на откате к уровню поддержки, ждем зеленую свечу!"),
    ],
    "OPEN_TRADE_PUT": [
        ("put_01", "Захожу ВНИЗ на понижение! Цена уперлась в мощный потолок сопротивления, покупатели выдохлись — ждем откат вниз!"),
        ("put_02", "Открываю сделку ПРОДАТЬ, идем ВНИЗ! По RSI сильная перекупленность, самое время забрать движение на коррекции!"),
        ("put_03", "Берем сделку на ПОНИЖЕНИЕ на тридцать секунд! Отличный медвежий сигнал от верхнего уровня!"),
        ("put_04", "Нажимаю ВНИЗ! Вижу затухание роста у сильной зоны сопротивления, сделка открыта!"),
        ("put_05", "Сделка в работе, прогноз — ВНИЗ! Продавцы активно давят цену от максимума, следим за графиком!"),
        ("put_06", "Заходим на продажу — ВНИЗ! Идеальная точка входа на развороте от вершины!"),
    ],
    "IN_TRADE_WAITING": [
        ("wait_01", "Половина времени сделки позади! Внимательно следим за каждым тиком, точка входа держится отлично!"),
        ("wait_02", "Осталось около пятнадцати секунд до закрытия. Дышим ровно и смотрим, как отрабатывает наш прогноз!"),
        ("wait_03", "Сделка в самом разгаре! График показывает хорошую реакцию, ждем финальной фиксации таймера!"),
        ("wait_04", "Сопровождаем сделку, до экспирации совсем немного времени! Держим кулачки!"),
        ("wait_05", "Смотрим на закрытие свечи, остаются считанные секунды до результата!"),
    ],
    "TRADE_WIN": [
        ("win_01", "Да-а! Плюс в копилку! Точка входа отработала просто идеально, забираем чистый профит по сигналу Винки!"),
        ("win_02", "Ес! Уверенный плюс! Как по учебнику — уровень отработал на все сто процентов, поздравляю всех с профитом!"),
        ("win_03", "Красота-а! Очередная победа в нашу статистику! Люблю, когда технический анализ дает такой четкий результат!"),
        ("win_04", "Шикарное закрытие в плюс! Профит уже на балансе, наша серия побед продолжается!"),
        ("win_05", "Изи плюс в копилочку! Сделка зашла уверенно, нейросеть прочитала это движение как открытую книгу!"),
        ("win_06", "Ура, забираем профит! Отличная сделка, баланс растет — работаем дальше в том же духе!"),
    ],
    "TRADE_LOSS": [
        ("loss_01", "Эх, на последней секунде рынок дал резкий микро-импульс против нас, закрылись в минус. Ничего страшного, это рынок — сейчас спокойно перекроем!"),
        ("loss_02", "Так, эта сделка ушла в минус, OTC-график решил покапризничать. Сохраняем холодную голову и дисциплину, ищем следующий верный вход!"),
        ("loss_03", "Обидный прокол уровня под самое закрытие таймера. Без паники! У нас отличный общий винрейт, сейчас найдем сильный сетап и отработаем!"),
        ("loss_04", "В этот раз минус — рынок устроил ложный вынос. Делаем выводы, не тильтуем и готовимся к следующей точной сделке!"),
        ("loss_05", "Сделка закрылась в минус. В трейдинге главное — дистанция и контроль рисков, так что спокойно переходим к поиску новой точки входа!"),
    ],
    "TRADE_REFUND": [
        ("refund_01", "Ого, закрылись ровно в точку входа — возврат! Деньги полностью вернулись на баланс, ни цента не потеряли!"),
        ("refund_02", "Нулевое закрытие, сделка рассчитана возвратом. Баланс на месте, сейчас перезайдем на более сильном движении!"),
    ],
    "PAUSE_BETWEEN_TRADES": [
        ("pause_01", "Делаем короткую паузу между сделками, дадим графику сформировать новые свечи и спокойно подготовим следующий вход."),
        ("pause_02", "Небольшая передышка по тайм-менеджменту! В трейдинге важно не спешить и входить только по лучшим сигналам."),
        ("pause_03", "Фиксируем результат и берем пару секунд паузы перед новым сканированием рынка."),
        ("pause_04", "Короткая пауза между сделками — обновляю данные по волатильности и готовлю сканер к новому циклу!"),
    ],
}


def get_audio_duration_afinfo(path: Path) -> float:
    """Извлекает точную длительность MP3 через macOS afinfo."""
    try:
        proc = subprocess.run(
            ["/usr/bin/afinfo", "-b", str(path)],
            capture_output=True,
            text=True,
            timeout=5.0,
        )
        if proc.returncode == 0:
            match = re.search(r"([\d\.]+)\s+sec", proc.stdout)
            if match:
                return round(float(match.group(1)), 2)
    except Exception as exc:
        logger.debug("afinfo error: %s", exc)
    # Фоллбэк по размеру (примерно 128 kbps = 16 KB/sec)
    return round(max(1.5, path.stat().st_size / 16000), 2)


def synthesize_phrase(client: httpx.Client, category: str, phrase_id: str, text: str) -> dict | None:
    cat_dir = ASSETS_DIR / category
    cat_dir.mkdir(parents=True, exist_ok=True)
    out_file = cat_dir / f"{phrase_id}.mp3"

    # Если файл уже существует и > 5 КБ — пропускаем
    if out_file.exists() and out_file.stat().st_size > 5000:
        dur = get_audio_duration_afinfo(out_file)
        logger.info("[SKIP] %s/%s уже существует (%.2fс, %d байт)", category, phrase_id, dur, out_file.stat().st_size)
        return {
            "id": phrase_id,
            "category": category,
            "text": text,
            "file": f"{category}/{phrase_id}.mp3",
            "duration": dur,
            "size": out_file.stat().st_size,
        }

    logger.info("[SYNTH] Отправка заказа в Lumean: %s/%s («%s»)...", category, phrase_id, text[:30])

    headers = {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    last_exc = None
    for attempt in range(1, 3):
        try:
            # 1. Создание заказа
            order_resp = client.post(
                f"{BASE_URL}/orders",
                headers=headers,
                json={"template_id": TEMPLATE_ID, "input_text": text},
                timeout=30.0,
            )
            order_resp.raise_for_status()
            order_id = order_resp.json().get("data", {}).get("id")
            if not order_id:
                raise RuntimeError(f"Ответ Lumean без order_id: {order_resp.text}")

            # 2. Опрос статуса выполнения
            start_poll = time.monotonic()
            file_path = None
            while time.monotonic() - start_poll < 90.0:
                time.sleep(1.0)
                status_resp = client.get(
                    f"{BASE_URL}/orders/{order_id}",
                    headers=headers,
                    timeout=15.0,
                )
                if status_resp.status_code == 200:
                    data = status_resp.json().get("data", {})
                    st = data.get("status")
                    if st in ("completed", "result_delivered", "partially_completed"):
                        files = data.get("result", {}).get("files") or []
                        if files:
                            file_path = files[0]
                            break
                    elif st in ("failed", "cancelled", "compensated"):
                        raise RuntimeError(f"Статус заказа: {st}")

            if not file_path:
                raise TimeoutError(f"Таймаут ожидания заказа {order_id} (>90с)")

            # 3. Получение URL
            url_resp = client.post(
                f"{BASE_URL}/storage/url",
                headers=headers,
                json={"path": file_path, "download": True},
                timeout=20.0,
            )
            url_resp.raise_for_status()
            download_url = url_resp.json().get("data", {}).get("url")
            if not download_url:
                raise RuntimeError("URL для скачивания пуст")

            # 4. Скачивание аудио
            audio_resp = client.get(download_url, timeout=30.0)
            audio_resp.raise_for_status()

            if len(audio_resp.content) < 5000:
                raise ValueError(f"Размер файла слишком мал: {len(audio_resp.content)} байт")

            out_file.write_bytes(audio_resp.content)
            dur = get_audio_duration_afinfo(out_file)
            logger.info("✅ [DONE] %s/%s сгенерирован: %.2fс (%d байт)", category, phrase_id, dur, len(audio_resp.content))

            return {
                "id": phrase_id,
                "category": category,
                "text": text,
                "file": f"{category}/{phrase_id}.mp3",
                "duration": dur,
                "size": len(audio_resp.content),
            }

        except Exception as exc:
            last_exc = exc
            logger.warning("Ошибка синтеза %s/%s (попытка %d): %s", category, phrase_id, attempt, exc)
            time.sleep(2.0)

    logger.error("❌ [FAILED] Не удалось сгенерировать %s/%s: %s", category, phrase_id, last_exc)
    return None


def main():
    if not API_KEY:
        logger.error("LUMEAN_API_KEY не задан в .env!")
        sys.exit(1)

    logger.info("=== Генерация банка фраз Winky AI (Lumean API) ===")
    logger.info("Template ID: %s", TEMPLATE_ID)
    logger.info("Выходная папка: %s", ASSETS_DIR)

    # Список задач
    tasks = []
    for cat, items in VOICE_PHRASES.items():
        for pid, txt in items:
            tasks.append((cat, pid, txt))

    total = len(tasks)
    logger.info("Всего фраз к генерации: %d", total)

    manifest_data: dict[str, Any] = {
        "version": "2.0",
        "voice": settings.LUMEAN_RU_VOICE_NAME or "Марин китагава",
        "template_id": TEMPLATE_ID,
        "total_phrases": total,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "categories": {},
    }

    # Инициализируем категории
    for cat in VOICE_PHRASES:
        manifest_data["categories"][cat] = []

    success_count = 0
    client = httpx.Client(timeout=60.0, http2=False)

    # Запускаем в пуле потоков с ограничением в 3 одновременных заказа
    with concurrent.futures.ThreadPoolExecutor(max_workers=3, thread_name_prefix="lumean-gen") as pool:
        future_map = {
            pool.submit(synthesize_phrase, client, cat, pid, txt): (cat, pid, txt)
            for cat, pid, txt in tasks
        }

        for future in concurrent.futures.as_completed(future_map):
            cat, pid, txt = future_map[future]
            try:
                res = future.result()
                if res:
                    manifest_data["categories"][cat].append(res)
                    success_count += 1
            except Exception as e:
                logger.error("Исключение в потоке %s/%s: %s", cat, pid, e)

    # Сортируем записи в манифесте по id
    for cat in manifest_data["categories"]:
        manifest_data["categories"][cat].sort(key=lambda x: x["id"])

    # Сохраняем manifest.json
    MANIFEST_PATH.write_text(json.dumps(manifest_data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("=== Завершено: %d / %d сгенерировано. Манифест: %s ===", success_count, total, MANIFEST_PATH)


if __name__ == "__main__":
    main()
