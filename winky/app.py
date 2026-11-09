"""Winky — точка входа VTuber-агента: два окна pywebview + мост + фоновые задачи.

Запуск: ``python -m winky.app``

* Окно аватара: прозрачное, без рамки, всегда поверх остальных — двигается
  мышью за любое место (easy_drag), ставится поверх вкладки Pocket Option.
* Окно пульта: обычное окно управления, живёт ВНЕ зоны захвата OBS.

Хоткеи: глобальные Cmd+Ctrl+P (пауза) и Cmd+Ctrl+C (повтор CTA) — включаются,
если macOS дала разрешение на «Универсальный доступ» (иначе работают хоткеи
пульта: Space / R при фокусе на пульте).
"""

from __future__ import annotations

import dataclasses
import json
import logging
import os
import random
import sys
import threading
import time
from pathlib import Path
from time import monotonic

import webview

from config import settings
from winky.chat_router import (
    ChatRouter,
    JOIN_PHRASES_RU,
    JOIN_PHRASES_EN,
    FOLLOW_PHRASES_RU,
    FOLLOW_PHRASES_EN,
    GIFT_PHRASES_RU,
    GIFT_PHRASES_EN,
    LIKE_PHRASES_RU,
    LIKE_PHRASES_EN,
)
from winky.deepseek import LLMBrain
from winky.scenarios import ScenarioBook
from winky.server import register_winky_callback, start_assets_server
from winky.tiktok import TikTokConnector
from winky.tts import EMOTIONS, SpeechController, SpeechItem, compute_rms_chunks

logger = logging.getLogger("winky")

PROJECT_ROOT = Path(__file__).resolve().parent.parent

CTA_LANG = "ru"  # язык авто-призывов; в этапе 3 подстроится под язык чата


class WinkyAPI:
    """Мост pywebview: JS пульта и аватара вызывает эти методы."""

    def __init__(self, controller: SpeechController, book: ScenarioBook) -> None:
        self._controller = controller
        self._book = book
        self._avatar_window: webview.Window | None = None
        self._panel_window: webview.Window | None = None
        self._voice_signals_enabled = True
        self._assets_host = "127.0.0.1"
        self._assets_port = 8790
        self._cta_enabled = True
        self._last_cta_at = 0.0
        self._chat_router: ChatRouter | None = None
        self._tiktok: TikTokConnector | None = None
        self._tiktok_status = "off"
        self._chat_history: list[dict] = []
        self._stream_interaction_count = 0

    def set_assets_endpoint(self, host: str, port: int) -> None:
        self._assets_host = host
        self._assets_port = port

    def open_signal_terminal(self) -> bool:
        """Информирует, что Winky HUD встроен прямо в DOM страницы Pocket Option."""
        logger.info("Winky HUD работает внутри страницы Pocket Option (In-DOM). Запускаем Pocket Option...")
        return self.launch_pocket_sniper()

    def open_counter_widget(self) -> bool:
        """Информирует, что табло Live Score работает внутри страницы Pocket Option."""
        logger.info("Табло Live Score работает внутри страницы Pocket Option (In-DOM). Запускаем Pocket Option...")
        return self.launch_pocket_sniper()

    def open_preview_webapp(self) -> bool:
        """Открывает предпросмотр Mini App в браузере."""
        import webbrowser
        url = f"http://{self._assets_host}:{self._assets_port}/webapp/?streamer=1&lang=ru"
        webbrowser.open(url)
        return True

    def toggle_voice_signals(self, enabled: bool) -> bool:
        self._voice_signals_enabled = bool(enabled)
        logger.info("Озвучка торговых сигналов голосом Winky: %s", "ВКЛ" if self._voice_signals_enabled else "ВЫКЛ")
        return self._voice_signals_enabled

    def get_voice_signals_enabled(self) -> bool:
        return self._voice_signals_enabled

    def on_signal_scan(self) -> None:
        """Реакция аватара Winky на начало сканирования: присматривается к графику."""
        self.trigger_action("peek_closer", 2.0)
        self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('thinking')")

    def launch_pocket_sniper(self) -> dict:
        """Открывает торговый кабинет Pocket Option в основном Google Chrome."""
        target_url = "https://po.financial/ru/cabinet/demo-quick-high-low/"
        try:
            import subprocess
            subprocess.Popen(["open", "-a", "Google Chrome", target_url])
            logger.info("Открыт кабинет Pocket Option в основном Google Chrome: %s", target_url)
            return {"ok": True, "message": "Кабинет Pocket Option открыт в Google Chrome!"}
        except Exception as e:
            logger.warning("Не удалось открыть через open -a Google Chrome: %s", e)
            import webbrowser
            webbrowser.open(target_url)
            return {"ok": True, "message": "Кабинет открыт в браузере"}

    def reveal_extension_in_finder(self) -> bool:
        """Показывает папку расширения в macOS Finder для загрузки в chrome://extensions."""
        ext_dir = str((Path(__file__).resolve().parent.parent / "pocket_extension").resolve())
        try:
            import subprocess
            subprocess.Popen(["open", ext_dir])
            logger.info("Открыта папка расширения в Finder: %s", ext_dir)
            return True
        except Exception as e:
            logger.warning("Не удалось открыть папку расширения в Finder: %s", e)
            return False

    def speak_signal(self, payload: Any = None) -> bool:
        """Озвучка сигнала исключительно через LumeanTTS (женский голос) без Mac say."""
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}

        pair = payload.get("pair", "EUR/USD OTC")
        direction = payload.get("direction", "BUY")
        duration = payload.get("duration", "30s")
        model = payload.get("model", "Claude Fable")
        lang = payload.get("lang", "ru")
        custom_phrase = payload.get("phrase") or (
            payload.get("voice_phrase_ru") if lang == "ru" else payload.get("voice_phrase_en")
        )

        self.on_signal_result(
            direction=direction,
            pair=pair,
            duration=duration,
            model=model,
            lang=lang,
            phrase=custom_phrase,
        )
        return True

    def on_signal_result(
        self,
        direction: str,
        pair: str = "",
        duration: str = "",
        model: str = "",
        lang: str = "ru",
        phrase: str | None = None,
    ) -> None:
        """Реакция аватара Winky на результат сигнала: радость + озвучка живым женским голосом."""
        self.trigger_action("cheer", 3.0)
        self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('excited')")

        if not self._voice_signals_enabled:
            return

        if phrase and phrase.strip():
            self._controller.speak(phrase.strip(), lang=lang, emotion="excited", source="signal_announcement")
            return

        raw_dir = str(direction or "").upper().strip()
        is_buy = raw_dir in ("BUY", "CALL", "UP", "ВЫШЕ", "ВВЕРХ", "LONG")
        clean_dur = duration or "30s"
        clean_model = model.split(" ")[0] if model else "Claude"

        if lang == "en":
            if is_buy:
                phrases = [
                    f"Great entry on {pair}! Support floor holding strong, taking BUY for {clean_dur}!",
                    f"Bullish bounce confirmed on {pair}! Entering UP for {clean_dur}, buyers taking over!",
                ]
            else:
                phrases = [
                    f"Resistance hit on {pair}! Selling pressure confirmed, taking SELL for {clean_dur}!",
                    f"Clean downward rejection on {pair}! Entering DOWN for {clean_dur} with the sellers!",
                ]
        else:
            clean_pair_ru = pair.replace(" OTC", " на ОТС").replace("/", " ")
            if is_buy:
                phrases = [
                    f"По {clean_pair_ru} отличная точка входа! Продавцы выдохлись у уровня поддержки, заходим ВВЕРХ на {clean_dur}!",
                    f"Вижу уверенный отскок от поддержки по {clean_pair_ru}! Берём сделку ВВЕРХ на {clean_dur} по основному тренду!",
                ]
            else:
                phrases = [
                    f"На графике {clean_pair_ru} цена упёрлась в потолок сопротивления! Заходим ВНИЗ на {clean_dur} на уверенном откате!",
                    f"Рост остановился по {clean_pair_ru}! Открываем сделку ВНИЗ на {clean_dur} вместе с крупными продавцами!",
                ]

        chosen_phrase = random.choice(phrases)
        self._controller.speak(chosen_phrase, lang=lang, emotion="excited", source="signal_announcement")

    def handle_trading_event(self, payload: Any = None) -> bool:
        """Обрабатывает автономные события сделок со стрима: победа, перекрытие, флэт, вопрос в чат."""
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}

        event_type = payload.get("event") or payload.get("type") or "win"
        lang = payload.get("lang") or "ru"
        pair = payload.get("pair") or "EUR/USD OTC"
        clean_pair_ru = pair.replace(" OTC", " на ОТС").replace("/", " ")

        if event_type == "win":
            self.trigger_action("cheer", 3.5)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('win')")
            phrases_ru = [
                "[win] Есть плюс в копилочку! Отличная сделка, график отработал как по учебнику!",
                "[excited] Плюсик зафиксирован! Красивое движение, поздравляю всех, кто заходил со мной!",
                "[happy] Да! Очередная победа! Забираем чистый профит со стрима!",
            ]
            phrases_en = [
                "[win] Boom, that's a win! Clean execution, moving right into profit!",
                "[excited] Another win secured! Love this momentum, congrats everyone!",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="win", source="trade_event")

        elif event_type == "loss_step1":
            self.trigger_action("think", 2.5)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('thinking')")
            phrases_ru = [
                "[wink] Ой, на последней секунде чуть зацепило тенью, вообще ничего страшного! Тренд тут сильный, захожу на перекрытие с удвоением в ту же пару и забираем своё с плюсом!",
                "[thinking] Чуть-чуть не хватило времени до закрытия импульса. Захожу на первое колено перекрытия в эту же пару!",
            ]
            phrases_en = [
                "[wink] Slight wick touched our level, no worries at all! Trend is solid, entering step 1 recovery on this pair!",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="wink", source="trade_event")

        elif event_type == "loss_step2":
            self.trigger_action("peek_closer", 3.0)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('thinking')")
            phrases_ru = [
                "[thinking] Так, эта пара начала капризничать и пилить уровень, не будем с ней спорить! Переключаюсь на более чистый график и спокойно закрываем перекрытие там!",
                "[wink] График ушёл в микро-боковик. Переключаю пару на свежий тренд, забираем вторую ступень без нервов!",
            ]
            phrases_en = [
                "[thinking] Alright, this pair is getting choppy! Switching to a cleaner chart for step 2 recovery!",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="thinking", source="trade_event")

        elif event_type == "flat_skip":
            self.trigger_action("think", 2.0)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('thinking')")
            phrases_ru = [
                f"[thinking] Смотрите, ребятки, на {clean_pair_ru} сейчас узкий боковик и слабый объём — по моей стратегии в такой шум не лезем! Переключаюсь на другую пару с чистым трендом!",
                f"[wink] На {clean_pair_ru} пила и флэт, уверенность ниже 82%. Пропускаем шум и ищем чёткий импульс!",
            ]
            phrases_en = [
                f"[thinking] Guys, {pair} is flatlining right now with weak volume. Skipping this noise to find a clear trend!",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="thinking", source="trade_event")

        elif event_type == "ask_chat":
            self.trigger_action("wave", 2.5)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('happy')")
            phrases_ru = [
                "[happy] Ребятки, какую валютную пару идём разбирать следующей? Пишите прямо сейчас в чат — выберем и зайдём вместе!",
                "[wave] Чат, жду ваши любимые валютные пары! Напишите в комментарии, на какой график переключаемся!",
            ]
            phrases_en = [
                "[happy] Chat, which currency pair should we analyze next? Drop your picks in the comments!",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="happy", source="trade_event")

        elif event_type == "start_analysis":
            self.trigger_action("think", 2.0)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('thinking')")
            phrases_ru = [
                f"[thinking] Анализирую график {clean_pair_ru}, считываю микроструктуру и объёмы...",
                f"[wink] Сканирую стакан и свечной паттерн по {clean_pair_ru}, секундочку...",
                f"[thinking] Оцениваю импульс на {clean_pair_ru}, ищу идеальную точку входа...",
            ]
            phrases_en = [
                f"[thinking] Analyzing {pair} chart, checking volatility and market depth...",
                f"[wink] Scanning order flow and momentum on {pair}, one moment...",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="thinking", source="trade_event")

        elif event_type == "switch_pair":
            self.trigger_action("peek_closer", 2.5)
            self._avatar_js("window.winkySetEmotion && window.winkySetEmotion('thinking')")
            target_clean = pair.replace(" OTC", " на ОТС").replace("/", " ")
            user_text = f" по просьбе {payload.get('user')}" if payload.get("user") else ""
            phrases_ru = [
                f"[wink] Переключаю график на {target_clean}{user_text}, сейчас заценим импульс!",
                f"[thinking] Открываю пару {target_clean}, ищу чистый трендовый вход!",
            ]
            phrases_en = [
                f"[wink] Switching chart to {pair}, let's find a clean setup!",
            ]
            phrase = random.choice(phrases_ru if lang == "ru" else phrases_en)
            self._controller.speak(phrase, lang=lang, emotion="thinking", source="trade_event")

        return True

    def prefetch_tts(self, payload: Any = None) -> dict:
        """API для предзагрузки реплики сигнала (Producer)."""
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}

        text = payload.get("text", "")
        lang = payload.get("lang", "ru")
        intent_id = payload.get("intent_id", "")
        emotion = payload.get("emotion", "happy")
        action = payload.get("action")
        expected_pair = payload.get("expected_pair", "")
        expected_state = payload.get("expected_state", "")
        ttl_sec = float(payload.get("ttl_sec", 40.0))

        # Если текста нет напрямую, но передан сигнал (direction, pair, duration)
        raw_dir = str(payload.get("direction") or payload.get("action") or "").upper().strip()
        if not text and raw_dir:
            is_buy = raw_dir in ("BUY", "CALL", "UP", "ВЫШЕ", "ВВЕРХ", "LONG")
            pair = payload.get("pair", "EUR/USD OTC")
            duration = payload.get("duration", "30s")
            clean_dur = duration or "30s"
            if lang == "en":
                if is_buy:
                    text = f"Bullish bounce confirmed on {pair}! Entering UP for {clean_dur}, buyers taking over!"
                else:
                    text = f"Resistance hit on {pair}! Selling pressure confirmed, taking SELL for {clean_dur}!"
            else:
                clean_pair_ru = pair.replace(" OTC", " на ОТС").replace("/", " ")
                if is_buy:
                    text = f"Вижу уверенный отскок от поддержки по {clean_pair_ru}! Берём сделку ВВЕРХ на {clean_dur} по основному тренду!"
                else:
                    text = f"На графике {clean_pair_ru} цена упёрлась в потолок сопротивления! Заходим ВНИЗ на {clean_dur} на уверенном откате!"
            emotion = "excited"
            action = "cheer"

        iid = self._controller.prefetch(
            text=text,
            lang=lang,
            intent_id=intent_id,
            emotion=emotion,
            action=action,
            expected_pair=expected_pair,
            expected_state=expected_state,
            ttl_sec=ttl_sec,
        )
        return {"ok": bool(iid), "intent_id": iid}

    def check_tts(self, intent_id: str) -> dict:
        """API проверки готовности аудио предзагрузки."""
        return self._controller.check_prefetch(intent_id)

    def play_tts(self, payload: Any = None) -> dict:
        """API воспроизведения готового аудио предзагрузки (Consumer) синхронно со сделкой."""
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}

        intent_id = payload.get("intent_id", "")
        current_pair = payload.get("current_pair", "")
        current_state = payload.get("current_state", "")
        ok = self._controller.play_prefetched(intent_id, current_pair=current_pair, current_state=current_state)
        return {"ok": ok}

    def play_voice(self, payload: Any = None) -> dict:
        """API воспроизведения предзаписанной реплики из банка Lumean с 0 мс задержкой."""
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}

        return self._controller.enqueue_voice_event(payload)

    def speak_stream_category(self, payload: Any = None) -> dict:
        """Compatibility alias: all recorded speech has one owner and queue."""
        return self.play_voice(payload)

    # ---------- окна подключаются после создания ----------

    def attach(self, avatar_window: webview.Window, panel_window: webview.Window) -> None:
        self._avatar_window = avatar_window
        self._panel_window = panel_window

    def record_chat_event(self, event: dict) -> None:
        self._chat_history.append(event)
        if len(self._chat_history) > 30:
            self._chat_history = self._chat_history[-30:]

    # ---------- вызовы из JS ----------

    def speak(self, text: str, lang: str | None = None, emotion: str = "happy") -> bool:
        act = "wave" if emotion == "wave" else None
        return self._controller.speak(text, lang, emotion, action=act, source="panel")

    def quick_reply(self, reply_id: str, lang: str = "ru") -> bool:
        reply = self._book.quick_reply(reply_id)
        if reply is None:
            # Поддержка алиасов
            aliases = {
                "greeting": "greeting",
                "greet_ru": "greeting",
                "greet_en": "greeting",
                "cta_ru": "cta_bio",
                "cta_en": "cta_bio",
                "cta": "cta_bio",
                "call_to_action": "cta_bio",
                "how_to": "how_to_use",
                "howto": "how_to_use",
                "howto_ru": "how_to_use",
                "howto_en": "how_to_use",
                "questions_ru": "ask_in_chat",
                "questions_en": "ask_in_chat",
                "stream_promo_ru": "about_stream",
            }
            if reply_id in aliases:
                reply = self._book.quick_reply(aliases[reply_id])

        if reply is None:
            logger.warning("Неизвестная реплика: %s", reply_id)
            return False

        action: str | None = None
        action_duration = 3.5
        if "greet" in reply.id or reply.emotion == "wave":
            action = "wave"
            action_duration = 3.0
        elif reply.emotion in ("win", "excited"):
            action = "cheer"
            action_duration = 3.5
        elif reply.emotion == "dance":
            action = "dance"
            action_duration = 4.5
        elif reply.emotion in ("flirt_kiss", "neko_paws", "hip_groove", "peek_closer", "shy"):
            action = reply.emotion
            action_duration = 3.2

        # Выбираем фразу: если есть кэшированные варианты, берём из них для мгновенного отклика 0.05с
        pool = reply.texts_ru if (lang or "ru").lower() == "ru" else reply.texts_en
        cached_pool = [t for t in pool if hasattr(self._controller, "is_cached") and self._controller.is_cached(t, lang=lang)]
        chosen_text = random.choice(cached_pool) if cached_pool else reply.random_text(lang)
        return self._controller.speak(
            chosen_text,
            lang=lang,
            emotion=reply.emotion,
            action=action,
            action_duration=action_duration,
            source="scenario",
        )

    def set_emotion(self, emotion: str) -> None:
        if emotion == "wave":
            self.trigger_wave()
        elif emotion == "dance":
            self.trigger_action("dance", 4.5)
        elif emotion == "win":
            self.trigger_action("cheer", 3.5)
        elif emotion == "shy":
            self.trigger_action("shy", 3.2)
        elif emotion == "flirt_kiss":
            self.trigger_action("flirt_kiss", 3.0)
        elif emotion == "neko_paws":
            self.trigger_action("neko_paws", 3.2)
        elif emotion == "hip_groove":
            self.trigger_action("hip_groove", 3.2)
        elif emotion == "peek_closer":
            self.trigger_action("peek_closer", 2.8)
        if emotion in EMOTIONS:
            self._avatar_js(f"window.winkySetEmotion && window.winkySetEmotion({json.dumps(emotion)})")

    def trigger_action(self, action: str, duration: float = 4.0) -> None:
        self._avatar_js(f"window.winkyTriggerAction && window.winkyTriggerAction({json.dumps(action)}, {float(duration)})")

    def trigger_gift(self, gift: str = "") -> None:
        self.trigger_action("dance", 4.5)

    def trigger_win(self) -> None:
        self.trigger_action("cheer", 3.5)

    def trigger_wave(self) -> None:
        self._avatar_js("window.winkyWave && window.winkyWave()")

    def set_volume(self, volume: float) -> None:
        self._controller.set_volume(volume)
        self._avatar_js(f"window.winkySetVolume && window.winkySetVolume({float(volume)})")

    def get_lumean_settings(self) -> dict:
        return self._controller.get_lumean_settings()

    def get_voice_tuning(self, lang_slot: str = "ru") -> dict:
        return self._controller.get_voice_tuning(lang_slot)

    def list_user_templates(self) -> list[dict]:
        return self._controller.list_user_templates()

    def apply_template_to_slot(self, lang_slot: str, template_id: str) -> dict:
        res = self._controller.apply_template_to_slot(lang_slot, template_id)
        self.push_status()
        return res

    def save_voice_tuning(self, lang_slot: str, tuning_data: dict) -> dict:
        res = self._controller.save_voice_tuning(lang_slot, tuning_data)
        self.push_status()
        return res

    def apply_live_preset(self, lang_slot: str) -> dict:
        res = self._controller.apply_live_preset(lang_slot)
        self.push_status()
        return res

    def test_tuned_voice(self, lang_slot: str = "ru", tuning_data: dict | None = None) -> bool:
        return self._controller.test_tuned_voice(lang_slot, tuning_data=tuning_data, bypass_cache=True)

    def clear_and_rewarm_cache(self, lang_slot: str = "all") -> bool:
        self._controller.clear_voice_cache(lang_slot)
        self.warmup_full_catalog()
        return True

    def update_lumean_settings(self, template_id: str = "", voice_id: str = "", service_key: str = "", voice_name: str = "") -> dict:
        res = self._controller.update_lumean_settings(template_id, voice_id, service_key, voice_name)
        self.push_status()
        return res

    def set_voice(self, lang_slot_or_service: str, service_key_or_vid: str = "", voice_id: str = "", voice_name: str = "") -> dict:
        if lang_slot_or_service in ("ru", "en"):
            lang_slot = lang_slot_or_service
            service_key = service_key_or_vid
            vid = voice_id
            vname = voice_name
        else:
            lang_slot = "ru"
            service_key = lang_slot_or_service
            vid = service_key_or_vid
            vname = voice_id
        res = self._controller.set_lumean_voice(lang_slot, service_key, vid, vname)
        self.push_status()
        return res

    def search_voices(self, catalog: str, query: str = "", language: str = "", gender: str = "", page: int = 1) -> list[dict]:
        return self._controller.search_voices(catalog, query, language, gender, page)

    def test_voice(self, lang: str = "ru", tuning_data: dict | None = None) -> bool:
        slot = "ru" if (lang or "ru").lower() == "ru" else "en"
        if tuning_data and hasattr(self._controller, "save_voice_tuning"):
            self._controller.save_voice_tuning(slot, tuning_data)
        self._controller.stop_current()
        if slot == "ru":
            phrase = "Привет! Это проверка моего нового голоса на русском языке!"
        else:
            phrase = "Hey guys! Checking out my new voice in English!"
        return self._controller.speak(phrase, lang=slot, emotion="happy", source="panel_test")

    def preview_voice_sample(self, service_key: str, voice_id: str) -> str:
        return self._controller.preview_voice_sample(service_key, voice_id)

    def warmup_voice_cache(self, lang_slot: str = "all", full: bool = False) -> None:
        """Фоновый прогрев ключевых фраз стрима для мгновенного отклика 0.05с.

        Если full=False (старт/смена голоса): греет только 3 ключевых фразы для слота (без 429).
        Если full=True (кнопка в пульте): греет весь каталог реплик и вариантов.
        """
        def _run() -> None:
            core_ru = [
                ("Привет! Это проверка моего нового голоса на русском языке!", "ru"),
                ("О, друг, приветик! Рада тебя видеть!", "ru"),
                ("Привет-привет! Я Винки — неоновая помощница Wink! Рада всех видеть на стриме, сегодня тестируем крутые инструменты!", "ru"),
                ("Есть плюс в копилочку! Отличная сделка, график отработал как по учебнику!", "ru"),
                ("Плюсик зафиксирован! Красивое движение, поздравляю всех, кто заходил со мной!", "ru"),
                ("Ой, на последней секунде чуть зацепило тенью, вообще ничего страшного! Тренд тут сильный, захожу на перекрытие с удвоением в ту же пару и забираем своё с плюсом!", "ru"),
                ("Так, эта пара начала капризничать и пилить уровень, не будем с ней спорить! Переключаюсь на более чистый график и спокойно закрываем перекрытие там!", "ru"),
                ("Ребятки, какую валютную пару идём разбирать следующей? Пишите прямо сейчас в чат — выберем и зайдём вместе!", "ru"),
            ]
            core_en = [
                ("Hey guys! Checking out my new voice in English!", "en"),
                ("Hey friend, welcome to the stream! So happy to see you here!", "en"),
                ("Hey everyone! I'm Winky, your stream co-host! Welcome to the stream, we're testing awesome tools today!", "en"),
                ("Boom, that's a win! Clean execution, moving right into profit!", "en"),
                ("Another win secured! Love this momentum, congrats everyone!", "en"),
                ("Slight wick touched our level, no worries at all! Trend is solid, entering step 1 recovery on this pair!", "en"),
                ("Chat, which currency pair should we analyze next? Drop your picks in the comments!", "en"),
            ]

            if not full:
                phrases: list[tuple[str, str]] = []
                if lang_slot in ("ru", "all"):
                    phrases.extend(core_ru)
                if lang_slot in ("en", "all"):
                    phrases.extend(core_en)
            else:
                phrases = list(core_ru) + list(core_en)
                for p in JOIN_PHRASES_RU:
                    phrases.append((p.replace("{user}", "друг"), "ru"))
                for p in JOIN_PHRASES_EN:
                    phrases.append((p.replace("{user}", "friend"), "en"))
                for p in FOLLOW_PHRASES_RU:
                    phrases.append((p.replace("{user}", "друг"), "ru"))
                for p in FOLLOW_PHRASES_EN:
                    phrases.append((p.replace("{user}", "friend"), "en"))
                for p in GIFT_PHRASES_RU:
                    phrases.append((p.replace("{user}", "друг").replace("{gift}", "подарок"), "ru"))
                for p in GIFT_PHRASES_EN:
                    phrases.append((p.replace("{user}", "friend").replace("{gift}", "gift"), "en"))
                for p in LIKE_PHRASES_RU:
                    phrases.append((p.replace("{user}", "друг"), "ru"))
                for p in LIKE_PHRASES_EN:
                    phrases.append((p.replace("{user}", "friend"), "en"))
                for reply in self._book.quick_replies:
                    for t in reply.texts_ru:
                        phrases.append((t, "ru"))
                    for t in reply.texts_en:
                        phrases.append((t, "en"))
                for kw in self._book.keywords:
                    if kw.text_ru:
                        phrases.append((kw.text_ru, "ru"))
                    if kw.text_en:
                        phrases.append((kw.text_en, "en"))

            seen: set[tuple[str, str]] = set()
            unique_phrases: list[tuple[str, str]] = []
            for text, lang in phrases:
                clean = text.strip()
                if clean and (clean, lang) not in seen:
                    seen.add((clean, lang))
                    unique_phrases.append((clean, lang))

            total = len(unique_phrases)
            cached_count = sum(1 for text, lang in unique_phrases if self._controller.is_cached(text, lang=lang))
            done = cached_count

            def _notify(d: int, t: int, msg: str) -> None:
                self._panel_js(
                    f"window.winkyPanel && window.winkyPanel.onWarmupProgress && "
                    f"window.winkyPanel.onWarmupProgress({d}, {t}, {json.dumps(msg, ensure_ascii=False)})"
                )

            if cached_count >= total:
                _notify(total, total, f"✅ Голоса готовы ({total}/{total} в кэше)")
                logger.info("Все %d фраз стрима уже в локальном кэше", total)
                return

            label = "каталога" if full else "базы"
            _notify(done, total, f"⚡ Прогрев {label}: {done} / {total}...")

            for text, lang in unique_phrases:
                while self._controller.speaking or self._controller.queue_size() > 0:
                    time.sleep(1.0)
                if self._controller.is_cached(text, lang=lang):
                    continue
                try:
                    self._controller.engine.synthesize(text, lang=lang)
                    done += 1
                    _notify(done, total, f"⚡ Прогрев {label}: {done} / {total}...")
                    time.sleep(0.2)
                except Exception as exc:
                    logger.debug("Ошибка прогрева фразы «%s»: %s", text[:30], exc)

            _notify(total, total, f"✅ Голоса готовы ({total}/{total} в кэше)")
            logger.info("Прогрев завершён: %d / %d в кэше", done, total)

        threading.Thread(target=_run, daemon=True, name="voice_warmup").start()

    def warmup_full_catalog(self) -> None:
        """Полный прогрев всех фраз и вариантов реплик (по кнопке из пульта)."""
        self.warmup_voice_cache(lang_slot="all", full=True)

    def precache_phrases(self) -> None:
        # Prepared banks are audited offline. Startup never buys a second,
        # unrelated library or regenerates recordings without review.
        logger.info("Recorded voice bank loaded; automatic paid warmup disabled")

    def set_avatar_scale(self, scale: float) -> None:
        self._avatar_js(f"window.winkySetScale && window.winkySetScale({float(scale)})")

    def set_avatar_offset_y(self, offset: float) -> None:
        self._avatar_js(f"window.winkySetOffsetY && window.winkySetOffsetY({float(offset)})")

    def set_avatar_model(self, model_type: str) -> None:
        self._avatar_js(f"window.winkySetModel && window.winkySetModel({json.dumps(model_type)})")

    def toggle_pause(self) -> bool:
        return self._controller.toggle_pause()

    def toggle_cta(self, enabled: bool) -> None:
        self._cta_enabled = bool(enabled)

    def repeat_cta(self) -> bool:
        lang = self._chat_router.default_stream_lang if self._chat_router else "ru"
        message = self._book.cta.random_message(lang)
        if not message:
            return False
        self._last_cta_at = monotonic()
        return self._controller.speak(message, lang, "happy", source="cta")

    def set_stream_lang(self, lang: str) -> str:
        """Переключает язык стрима по умолчанию (ru / en)."""
        target = "en" if (lang or "").lower() == "en" else "ru"
        if self._chat_router:
            self._chat_router.set_stream_lang(target)
        self.push_status()
        return target

    def on_speech_finished(self) -> None:
        self._controller.finish_current()

    def clear_queue(self) -> None:
        """Очищает очередь речи и останавливает текущее воспроизведение."""
        self._controller.clear_queue_and_stop()
        self.push_status()

    def stop_speech(self) -> None:
        self.clear_queue()

    def get_state(self) -> dict:
        status = self._controller.status()
        return {
            **dataclasses.asdict(status),
            "queue_size": self._controller.queue_size(),
            "quick_replies": [
                {
                    "id": reply.id,
                    "label": reply.label,
                    "icon": reply.icon,
                    "emotion": reply.emotion,
                    "texts_ru": list(reply.texts_ru),
                    "texts_en": list(reply.texts_en),
                    "text": reply.random_text("ru"),
                }
                for reply in self._book.quick_replies
            ],
            "cta_interval_minutes": self._book.cta.interval_minutes,
            "cta_enabled": self._cta_enabled,
            "stream_lang": self._chat_router.default_stream_lang if self._chat_router else "ru",
            "lumean": self._controller.get_lumean_settings(),
            "chat": {
                "tiktok_status": self._tiktok_status if self._tiktok else "off",
                "tiktok_detail": getattr(self, "_tiktok_detail", "") if self._tiktok else "выключен",
                "tiktok_username": self._tiktok.username if self._tiktok else settings.TIKTOK_USERNAME,
                "llm_available": bool(settings.RIVER_API_KEY or settings.DEEPSEEK_API_KEY),
                "counters": self._chat_router.counters() if self._chat_router else {},
            },
            "chat_history": list(self._chat_history),
        }

    # ---------- CTA-ротация (вызывается из фонового цикла) ----------

    def report_assets(self, payload: str) -> None:
        """Диагностика из окна аватара: что реально загрузилось в WKWebView."""
        logger.info("Отчёт ассетов аватара: %s", payload)

    def apply_native_transparency(self) -> None:
        """Настоящая прозрачность окна аватара на современном macOS.

        pywebview использует устаревший ключ ``drawsTransparentBackground``,
        который новые версии WebKit игнорируют — окно рисует тёмный фон.
        Современный путь: ``drawsBackground = NO`` + прозрачный underPageBackgroundColor.
        Вызывается со страницы по событию pywebviewready (поток AppKit).
        """
        try:
            import AppKit
            from Foundation import NSColor

            ns_window = self._avatar_window.native
            wkwebview = ns_window.contentView()
            wkwebview.setValue_forKey_(False, "drawsBackground")
            wkwebview.setValue_forKey_(NSColor.clearColor(), "underPageBackgroundColor")
            ns_window.setOpaque_(False)
            ns_window.setBackgroundColor_(NSColor.clearColor())
            ns_window.setHasShadow_(False)
            ns_window.setLevel_(AppKit.NSFloatingWindowLevel)
            # NSWindowCollectionBehaviorCanJoinAllSpaces (1 << 0) | NSWindowCollectionBehaviorFullScreenAuxiliary (1 << 8)
            ns_window.setCollectionBehavior_((1 << 0) | (1 << 8))
            ns_window.setMovableByWindowBackground_(True)
            logger.info("Нативная прозрачность WKWebView и плавающий уровень применены")
        except Exception:  # noqa: BLE001
            logger.exception("Не удалось применить нативную прозрачность")

    def report_screenshot(self, data_url: str) -> None:
        """Снимок рендера аватара — сохраняем для визуальной проверки."""
        try:
            import base64

            raw = data_url.split(",", 1)[1] if "," in data_url else ""
            Path("/tmp/winky_render.png").write_bytes(base64.b64decode(raw))
            logger.info("Скриншот рендера сохранён: /tmp/winky_render.png (%d байт)", len(raw) // 2)
        except Exception:  # noqa: BLE001
            logger.exception("Не удалось сохранить скриншот рендера")

    # ---------- TikTok-чат и DeepSeek (этап 3) ----------

    def attach_chat(self, router: ChatRouter) -> None:
        self._chat_router = router

    def _on_tiktok_status(self, status: str, detail_message: str = "") -> None:
        self._tiktok_status = status
        self._tiktok_detail = detail_message
        self._panel_js(
            "window.winkyPanel && window.winkyPanel.onTikTokStatus("
            + json.dumps(status) + ", "
            + json.dumps(detail_message, ensure_ascii=False) + ")"
        )

    def connect_tiktok(self, username: str) -> bool:
        """Подключает чат лайва по юзернейму или ссылке стрима."""
        from winky.tiktok import clean_tiktok_username
        clean_user = clean_tiktok_username(username)
        if not clean_user:
            logger.warning("Некорректный юзернейм или ссылка TikTok: %r", username)
            self._on_tiktok_status("error", "Некорректный юзернейм или ссылка")
            return False
        if self._tiktok:
            self._tiktok.stop()
        self._tiktok = TikTokConnector(
            clean_user,
            on_comment=self._on_chat_comment,
            on_join=self._on_chat_join,
            on_gift=self._on_chat_gift,
            on_status=self._on_tiktok_status,
            on_follow=self._on_chat_follow,
            on_like=self._on_chat_like,
        )
        self._tiktok.start()
        logger.info("Подключаю TikTok-чат: @%s", clean_user)
        return True

    def disconnect_tiktok(self) -> None:
        if self._tiktok:
            self._tiktok.stop()
            self._tiktok = None
        self._on_tiktok_status("off", "выключен")

    def simulate_comment(self, text: str) -> None:
        """Ручной вопрос из пульта — тот же конвейер, что и живой чат."""
        if self._chat_router and text:
            self._chat_router.handle_comment("Зритель", text)
            self.push_status()

    def simulate_custom_comment(self, user: str, text: str) -> bool:
        """Симуляция комментария от конкретного никнейма зрителя из пульта."""
        if self._chat_router and text:
            clean_u = (user or "").strip() or "Зритель"
            self._chat_router.handle_comment(clean_u, text.strip())
            self.push_status()
            return True
        return False

    def get_stream_director_status(self) -> dict:
        """Возвращает статус режиссера стрима для пульта управления."""
        try:
            from winky.director import stream_director
            return stream_director.get_status()
        except Exception:
            return {"phase": "IDLE", "is_speaking": False, "queue_len": 0, "recent_events": []}

    def simulate_join(self, user: str = "Дима 🚀", lang: str = "auto") -> None:
        """Тест входа зрителя из пульта."""
        if self._chat_router:
            self._chat_router.handle_join(user or "Дима 🚀", force=True, lang=lang)
            self.push_status()

    def simulate_follow(self, user: str = "Алина ✨", lang: str = "auto") -> None:
        """Тест подписки зрителя из пульта (танец + озвучка)."""
        if self._chat_router:
            self._chat_router.handle_follow(user or "Алина ✨", force=True, lang=lang)
            self.push_status()

    def simulate_gift(self, user: str = "Миша 🚀", gift: str = "Роза", lang: str = "auto") -> None:
        """Тест подарка зрителя из пульта (танец + благодарность)."""
        if self._chat_router:
            self._chat_router.handle_gift(user or "Миша 🚀", gift or "Роза", lang=lang)
            self.push_status()

    def simulate_like(self, user: str = "Катя ✨", count: int = 5, lang: str = "auto") -> None:
        """Тест лайков зрителя из пульта (жест cheer + благодарность)."""
        if self._chat_router:
            self._chat_router.handle_like(user or "Катя ✨", count=count, force=True, lang=lang)
            self.push_status()

    def _on_chat_comment(self, user: str, text: str) -> None:
        if self._chat_router:
            self._chat_router.handle_comment(user, text)

    def _on_chat_join(self, user: str) -> None:
        if self._chat_router:
            self._chat_router.handle_join(user)

    def _on_chat_follow(self, user: str) -> None:
        if self._chat_router:
            self._chat_router.handle_follow(user)

    def _on_chat_gift(self, user: str, gift: str) -> None:
        if self._chat_router:
            self._chat_router.handle_gift(user, gift)

    def _on_chat_like(self, user: str, count: int = 1) -> None:
        if self._chat_router:
            self._chat_router.handle_like(user, count=count)

    def maybe_say_cta(self) -> None:
        if not self._cta_enabled or self._controller.paused or self._controller.speaking:
            return
        if self._controller.queue_size() > 0:
            return
        interval = self._book.cta.interval_minutes * 60
        if monotonic() - self._last_cta_at < interval:
            return

        lang = self._chat_router.default_stream_lang if self._chat_router else "ru"
        self._stream_interaction_count += 1

        # Соотношение 4:1 — 4 раза интерактив/разогрев молчащего чата, 1 раз — напоминание про ассистента
        if self._stream_interaction_count % 5 == 0:
            message = self._book.cta.random_message(lang)
            emotion = "happy"
        else:
            message = self._book.cta.random_warmup(lang)
            emotion = "wink"

        if not message:
            return

        self._last_cta_at = monotonic()
        self._controller.speak(message, lang=lang, emotion=emotion, source="stream_warmup")

    # ---------- уведомления JS ----------

    def push_status(self) -> None:
        status = self.get_state()
        self._panel_js("window.winkyPanel && window.winkyPanel.renderStatus(" + json.dumps(status, ensure_ascii=False) + ")")

    def push_quick_replies(self) -> None:
        replies = [
            {
                "id": r.id,
                "label": r.label,
                "icon": r.icon,
                "emotion": r.emotion,
                "texts_ru": list(r.texts_ru),
                "texts_en": list(r.texts_en),
                "text": r.random_text("ru"),
            }
            for r in self._book.quick_replies
        ]
        self._panel_js(
            "window.winkyPanel && window.winkyPanel.renderQuickReplies(" + json.dumps(replies, ensure_ascii=False) + ")"
            " && window.winkyPanel.onScenariosReloaded()"
        )

    def _avatar_js(self, code: str) -> None:
        if self._avatar_window:
            try:
                self._avatar_window.evaluate_js(code)
            except Exception:  # noqa: BLE001 — окно могло закрыться
                logger.exception("evaluate_js в окне аватара не удался")

    def _panel_js(self, code: str) -> None:
        if self._panel_window:
            try:
                self._panel_window.evaluate_js(code)
            except Exception:  # noqa: BLE001
                logger.exception("evaluate_js в окне пульта не удался")


def _start_hotkeys(api: WinkyAPI) -> None:
    """Глобальные хоткеи через pynput (macOS требует «Универсальный доступ»)."""
    try:
        from pynput import keyboard
    except ImportError:
        logger.info("pynput не установлен — работают только хоткеи пульта (Space / R)")
        return

    try:
        listener = keyboard.GlobalHotKeys({
            "<cmd>+<ctrl>+p": lambda: api.toggle_pause(),
            "<cmd>+<ctrl>+c": lambda: api.repeat_cta(),
        })
        listener.daemon = True  # не держим процесс живым после закрытия окон
        listener.start()
        logger.info("Глобальные хоткеи: Cmd+Ctrl+P — пауза, Cmd+Ctrl+C — повтор CTA")
    except Exception as exc:  # noqa: BLE001 — нет разрешения «Универсальный доступ»
        logger.warning(
            "Глобальные хоткеи недоступны (%s). Разрешите приложение в "
            "Настройки → Конфиденциальность и безопасность → Универсальный доступ, "
            "либо используйте хоткеи пульта: Space / R.",
            exc,
        )


def main() -> None:
    if "--terminal" in sys.argv:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        )
        assets_host, assets_port = start_assets_server()
        url = f"http://{assets_host}:{assets_port}/webapp/?streamer=1&lang=ru"
        logger.info("Запуск автономного оверлей-терминала: %s", url)
        webview.create_window(
            "Winky AI — Quantum Terminal",
            url=url,
            width=430,
            height=780,
            on_top=True,
            resizable=True,
        )
        webview.start()
        return

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )

    book = ScenarioBook()

    # Замыкания разрешают winky_api в момент вызова — к тому времени он уже создан
    def on_speak(url: str, emotion: str, volume: float, lang: str) -> None:
        winky_api._avatar_js(
            f"window.winkySpeak && window.winkySpeak({json.dumps(url)}, {json.dumps(emotion)}, {float(volume)})"
        )

    def on_rms(rms: float) -> None:
        winky_api._avatar_js(
            f"window.setAvatarSpeechVolume && window.setAvatarSpeechVolume({float(rms):.3f})"
        )

    def on_action(action: str, duration: float) -> None:
        winky_api.trigger_action(action, duration)

    def on_emotion(emotion: str) -> None:
        winky_api.set_emotion(emotion)

    def on_status(_status) -> None:
        winky_api.push_status()

    controller = SpeechController(
        on_speak=on_speak,
        on_rms=on_rms,
        on_action=on_action,
        on_emotion=on_emotion,
        on_status=on_status,
    )
    winky_api = WinkyAPI(controller, book)

    # Чат-маршрут: сценарии -> DeepSeek -> цензура -> речь
    brain = LLMBrain()

    def on_chat_feed(event: dict) -> None:
        winky_api.record_chat_event(event)
        winky_api._panel_js(
            "window.winkyPanel && window.winkyPanel.onChatEvent(" + json.dumps(event, ensure_ascii=False) + ")"
        )

    chat_router = ChatRouter(
        book,
        brain,
        controller,
        on_feed=on_chat_feed,
        on_gift=winky_api.trigger_gift,
        on_wave=winky_api.trigger_wave,
        on_action=winky_api.trigger_action,
    )
    winky_api.attach_chat(chat_router)

    # Режиссёр Стрима: фазы торговли Pocket Option + плавная очередь реплик TikTok
    from winky.director import stream_director
    stream_director.set_brain(brain)
    stream_director.set_tts(controller)
    stream_director.set_feed_callback(on_chat_feed)
    stream_director.start()

    # Фоновый прогрев кэша быстрых реплик для мгновенного отклика при клике на кнопки
    winky_api.precache_phrases()

    # Свой сервер ассетов: надёжные MIME/CORS для WebGL-текстур в WKWebView и Mini App
    assets_host, assets_port = start_assets_server()
    base_url = f"http://{assets_host}:{assets_port}"
    winky_api.set_assets_endpoint(assets_host, assets_port)
    register_winky_callback("scan", winky_api.on_signal_scan)
    register_winky_callback(
        "signal",
        lambda direction="BUY", pair="", duration="", model="": winky_api.on_signal_result(direction, pair, duration, model),
    )
    register_winky_callback("speak_signal", winky_api.speak_signal)
    register_winky_callback("launch_chrome", winky_api.launch_pocket_sniper)
    register_winky_callback("event", winky_api.handle_trading_event)
    register_winky_callback("prefetch_tts", winky_api.prefetch_tts)
    register_winky_callback("check_tts", winky_api.check_tts)
    register_winky_callback("play_tts", winky_api.play_tts)
    register_winky_callback("play_voice", winky_api.play_voice)
    register_winky_callback("speak_stream_category", winky_api.speak_stream_category)

    # Определение геометрии экрана macOS (прижимаем окно стримера к правому нижнему углу)
    screen = webview.screens[0] if webview.screens else None
    screen_w = screen.width if screen else 1728
    screen_h = screen.height if screen else 1117

    avatar_w = 600
    avatar_h = 720
    avatar_x = max(0, screen_w - avatar_w - 10)
    avatar_y = max(0, screen_h - avatar_h)

    avatar_window = webview.create_window(
        "Winky",
        url=f"{base_url}/avatar.html?v={int(monotonic() * 1000)}",
        js_api=winky_api,
        width=avatar_w,
        height=avatar_h,
        x=avatar_x,
        y=avatar_y,
        frameless=True,
        transparent=True,
        on_top=True,
        easy_drag=True,
    )
    panel_window = webview.create_window(
        "Winky — пульт",
        url=f"{base_url}/panel.html?v={int(monotonic() * 1000)}",
        js_api=winky_api,
        width=480,
        height=720,
        x=max(20, avatar_x - 500),
        y=max(40, avatar_y - 40),
        minimized=False,
    )
    winky_api.attach(avatar_window, panel_window)

    def background(*_args) -> None:
        # pywebview запускает func не-демоном, поэтому вечный цикл —
        # в собственном daemon-потоке, иначе процесс не завершится
        threading.Thread(
            target=_background_loop, args=(winky_api, controller, book),
            name="winky-loop", daemon=True,
        ).start()

    def _background_loop(api_bridge: WinkyAPI, speech: SpeechController, scripts: ScenarioBook) -> None:
        speech.start()
        threading.Thread(
            target=_start_hotkeys, args=(api_bridge,), name="winky-hotkeys", daemon=True
        ).start()
        # TikTok-чат из конфига (можно подключить/сменить из пульта на лету)
        if settings.TIKTOK_USERNAME:
            api_bridge.connect_tiktok(settings.TIKTOK_USERNAME)

        last_push = 0.0
        while True:
            threading.Event().wait(2.0)
            scripts.maybe_reload()
            api_bridge.maybe_say_cta()
            if monotonic() - last_push > 10:
                api_bridge.push_status()
                last_push = monotonic()

    # Smoke-режим для автопроверки: окна закроются сами через N секунд
    if os.environ.get("WINKY_SMOKE"):
        seconds = float(os.environ.get("WINKY_SMOKE", "6"))

        def _smoke_close() -> None:
            logger.info("Smoke-режим: сохраняю снимок и закрываю окна")
            try:
                data = avatar_window.evaluate_js(
                    "(function() { const c = window.canvas || document.querySelector('canvas'); "
                    "if (!c) return null; return window.winkyScreenshot ? window.winkyScreenshot() : ''; })()"
                )
                if data and "," in data:
                    import base64

                    raw = data.split(",", 1)[1]
                    Path("/tmp/winky_render.png").write_bytes(base64.b64decode(raw))
                    logger.info("Скриншот сохранён перед закрытием: /tmp/winky_render.png (%d байт)", len(raw) // 2)
            except Exception:
                logger.exception("Не удалось сохранить скриншот перед закрытием")
            avatar_window.destroy()
            panel_window.destroy()
            threading.Timer(0.8, lambda: os._exit(0)).start()

        def _smoke_speak() -> None:
            logger.info("Smoke: авто-проверка голоса")
            controller.speak("Привет! Проверка голоса, мимики и прозрачности.", lang="ru", emotion="happy")

        threading.Timer(2.5, _smoke_speak).start()
        threading.Timer(seconds, _smoke_close).start()

    try:
        webview.start(background)
    finally:
        stream_director.stop()
        controller.clear_queue_and_stop()
        controller._synth_pool.shutdown(wait=False, cancel_futures=True)
        client = getattr(controller.engine, '_client', None)
        if client:
            client.close()


if __name__ == "__main__":
    main()
