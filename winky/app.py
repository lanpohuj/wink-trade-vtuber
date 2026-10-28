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
import threading
from pathlib import Path
from time import monotonic

import webview

from config import settings
from winky.chat_router import ChatRouter
from winky.deepseek import LLMBrain
from winky.scenarios import ScenarioBook
from winky.server import start_assets_server
from winky.tiktok import TikTokConnector
from winky.tts import EMOTIONS, SpeechController, compute_rms_chunks

logger = logging.getLogger("winky")

CTA_LANG = "ru"  # язык авто-призывов; в этапе 3 подстроится под язык чата


class WinkyAPI:
    """Мост pywebview: JS пульта и аватара вызывает эти методы."""

    def __init__(self, controller: SpeechController, book: ScenarioBook) -> None:
        self._controller = controller
        self._book = book
        self._avatar_window: webview.Window | None = None
        self._panel_window: webview.Window | None = None
        self._cta_enabled = True
        self._last_cta_at = 0.0
        self._chat_router: ChatRouter | None = None
        self._tiktok: TikTokConnector | None = None
        self._tiktok_status = "off"

    # ---------- окна подключаются после создания ----------

    def attach(self, avatar_window: webview.Window, panel_window: webview.Window) -> None:
        self._avatar_window = avatar_window
        self._panel_window = panel_window

    # ---------- вызовы из JS ----------

    def speak(self, text: str, lang: str | None = None, emotion: str = "happy") -> bool:
        self._controller.stop_current()
        if emotion == "wave":
            self.trigger_wave()
        return self._controller.speak(text, lang, emotion, source="panel")

    def quick_reply(self, reply_id: str) -> bool:
        reply = self._book.quick_reply(reply_id)
        if reply is None:
            # Поддержка алиасов (greeting -> greet_ru, cta -> cta_ru, how_to -> howto_ru)
            aliases = {
                "greeting": "greet_ru",
                "greet": "greet_ru",
                "cta": "cta_ru",
                "call_to_action": "cta_ru",
                "how_to": "howto_ru",
                "howto": "howto_ru",
            }
            if reply_id in aliases:
                reply = self._book.quick_reply(aliases[reply_id])

        if reply is None:
            logger.warning("Неизвестная реплика: %s", reply_id)
            return False
        try:
            self._controller.stop_current()
        except Exception as e:
            logger.debug("stop_current error: %s", e)
        if "greet" in reply.id or reply.emotion == "wave":
            self.trigger_wave()
        return self._controller.speak(reply.text, reply.lang, reply.emotion, source="scenario")

    def set_emotion(self, emotion: str) -> None:
        if emotion == "wave":
            self.trigger_wave()
        if emotion in EMOTIONS:
            self._avatar_js(f"window.winkySetEmotion({json.dumps(emotion)})")

    def trigger_gift(self, gift: str = "") -> None:
        self._avatar_js(f"window.winkyOnGift && window.winkyOnGift({json.dumps(gift)})")

    def trigger_win(self) -> None:
        self._avatar_js("window.winkyOnWin && window.winkyOnWin()")

    def trigger_wave(self) -> None:
        self._avatar_js("window.winkyWave && window.winkyWave()")

    def set_volume(self, volume: float) -> None:
        self._controller.set_volume(volume)
        self._avatar_js(f"window.winkySetVolume({float(volume)})")

    def get_lumean_settings(self) -> dict:
        return self._controller.get_lumean_settings()

    def update_lumean_settings(self, template_id: str, voice_id: str = "") -> dict:
        return self._controller.update_lumean_settings(template_id, voice_id)

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
        message = self._book.cta.random_message(CTA_LANG)
        if not message:
            return False
        self._last_cta_at = monotonic()
        return self._controller.speak(message, CTA_LANG, "happy", source="cta")

    def on_speech_finished(self) -> None:
        self._controller.finish_current()

    def get_state(self) -> dict:
        status = self._controller.status()
        return {
            **dataclasses.asdict(status),
            "quick_replies": [
                {
                    "id": reply.id,
                    "label": reply.label,
                    "lang": reply.lang,
                    "emotion": reply.emotion,
                    "text": reply.text,
                }
                for reply in self._book.quick_replies
            ],
            "cta_interval_minutes": self._book.cta.interval_minutes,
            "cta_enabled": self._cta_enabled,
            "lumean": self._controller.get_lumean_settings(),
            "chat": {
                "tiktok_status": self._tiktok_status if self._tiktok else "off",
                "tiktok_username": self._tiktok.username if self._tiktok else settings.TIKTOK_USERNAME,
                "llm_available": bool(settings.RIVER_API_KEY or settings.DEEPSEEK_API_KEY),
                "counters": self._chat_router.counters() if self._chat_router else {},
            },
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

    def _on_tiktok_status(self, status: str) -> None:
        self._tiktok_status = status
        self._panel_js(
            "window.winkyPanel && window.winkyPanel.onTikTokStatus(" + json.dumps(status) + ")"
        )

    def connect_tiktok(self, username: str) -> bool:
        """Подключает чат лайва по юзернейму (можно менять на лету из пульта)."""
        username = (username or "").strip().lstrip("@")
        if not username or len(username) > 30 or not username.replace(".", "").replace("_", "").isalnum():
            logger.warning("Некорректный юзернейм TikTok: %r", username)
            return False
        if self._tiktok:
            self._tiktok.stop()
        self._tiktok = TikTokConnector(
            username,
            on_comment=self._on_chat_comment,
            on_join=self._on_chat_join,
            on_gift=self._on_chat_gift,
            on_status=self._on_tiktok_status,
        )
        self._tiktok.start()
        logger.info("Подключаю TikTok-чат: @%s", username)
        return True

    def disconnect_tiktok(self) -> None:
        if self._tiktok:
            self._tiktok.stop()
            self._tiktok = None
            self._on_tiktok_status("off")

    def simulate_comment(self, text: str) -> None:
        """Ручной вопрос из пульта — тот же маршрут, что и живой чат."""
        if self._chat_router and text:
            self._controller.stop_current()
            self._chat_router.handle_comment("Зритель", text)
            self.push_status()

    def simulate_join(self, user: str = "Дима 🚀") -> None:
        """Тест входа зрителя из пульта."""
        self._controller.stop_current()
        self.trigger_wave()
        if self._chat_router:
            self._chat_router.handle_join(user or "Дима 🚀", force=True)
            self.push_status()

    def _on_chat_comment(self, user: str, text: str) -> None:
        if self._chat_router:
            self._chat_router.handle_comment(user, text)

    def _on_chat_join(self, user: str) -> None:
        if self._chat_router:
            self._chat_router.handle_join(user)

    def _on_chat_gift(self, user: str, gift: str) -> None:
        if self._chat_router:
            self._chat_router.handle_gift(user, gift)

    def maybe_say_cta(self) -> None:
        if not self._cta_enabled or self._controller.paused or self._controller.speaking:
            return
        interval = self._book.cta.interval_minutes * 60
        if monotonic() - self._last_cta_at < interval:
            return
        self.repeat_cta()

    # ---------- уведомления JS ----------

    def push_status(self) -> None:
        status = dataclasses.asdict(self._controller.status())
        self._panel_js("window.winkyPanel && window.winkyPanel.renderStatus(" + json.dumps(status) + ")")

    def push_quick_replies(self) -> None:
        replies = [
            {"id": r.id, "label": r.label, "lang": r.lang, "emotion": r.emotion, "text": r.text}
            for r in self._book.quick_replies
        ]
        self._panel_js(
            "window.winkyPanel && window.winkyPanel.renderQuickReplies(" + json.dumps(replies) + ")"
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

    def on_status(_status) -> None:
        winky_api.push_status()

    controller = SpeechController(on_speak=on_speak, on_rms=on_rms, on_status=on_status)
    winky_api = WinkyAPI(controller, book)

    # Чат-маршрут: сценарии -> DeepSeek -> цензура -> речь
    brain = LLMBrain()

    def on_chat_feed(event: dict) -> None:
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
    )
    winky_api.attach_chat(chat_router)

    # Фоновый прогрев кэша частых реплик (ElevenLabs Multilingual V2) для мгновенного отклика при клике на кнопки
    def _precache_phrases() -> None:
        logger.info("Фоновый подогрев кэша фраз Winky TTS и расчет RMS чанков...")
        for reply in book.quick_replies:
            try:
                media = controller.engine.synthesize(reply.text, reply.lang)
                compute_rms_chunks(media)
            except Exception as e:
                logger.debug("Предзагрузка фразы %s: %s", reply.id, e)
        logger.info("Кэш фраз Winky и RMS успешно прогрет!")

    threading.Thread(target=_precache_phrases, daemon=True, name="tts_precache").start()

    # Свой сервер ассетов: надёжные MIME/CORS для WebGL-текстур в WKWebView
    assets_host, assets_port = start_assets_server()
    base_url = f"http://{assets_host}:{assets_port}"

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

        def _smoke_speak() -> None:
            logger.info("Smoke: авто-проверка голоса")
            controller.speak("Привет! Проверка голоса, мимики и прозрачности.", lang="ru", emotion="happy")

        threading.Timer(2.5, _smoke_speak).start()
        threading.Timer(seconds, _smoke_close).start()

    webview.start(background)


if __name__ == "__main__":
    main()
