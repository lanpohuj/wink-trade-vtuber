"""Коннектор TikTok Live: читает чат стрима анонимно по юзернейму или ссылке.

Работает в собственном потоке с отдельным asyncio-циклом и вызовом client.connect()
(библиотека TikTokLive v7 асинхронная). События пробрасываются в основной код
колбэками — потокобезопасно.
"""

from __future__ import annotations

import asyncio
import logging
import re
import threading
from typing import Callable

from TikTokLive import TikTokLiveClient
from TikTokLive.client.errors import (
    AgeRestrictedError,
    SignatureRateLimitError,
    TikTokLiveError,
    UserNotFoundError,
    UserOfflineError,
)
from TikTokLive.client.web.web_settings import WebDefaults
from TikTokLive.events import (
    CommentEvent,
    ConnectEvent,
    DisconnectEvent,
    FollowEvent,
    GiftEvent,
    JoinEvent,
    LikeEvent,
    LiveEndEvent,
)

from config import settings

logger = logging.getLogger("winky.tiktok")


def clean_tiktok_username(raw: str) -> str:
    """Извлекает чистый юзернейм TikTok из строки или полной ссылки.

    Поддерживает:
      * 'https://www.tiktok.com/@streamer_name/live?enter_from_merge=...' -> 'streamer_name'
      * 'https://tiktok.com/@streamer_name' -> 'streamer_name'
      * '@streamer_name' -> 'streamer_name'
      * 'streamer_name' -> 'streamer_name'
    """
    if not raw:
        return ""
    text = str(raw).strip()

    # Поиск @username в ссылке
    match = re.search(r"@([a-zA-Z0-9_.]+)", text)
    if match:
        return match.group(1).lower()

    # Если передан просто путь URL или имя
    text = text.split("?", 1)[0].split("#", 1)[0]
    parts = [p for p in text.split("/") if p]
    if parts:
        last = parts[-1].lstrip("@")
        if last.lower() == "live" and len(parts) >= 2:
            last = parts[-2].lstrip("@")
        cleaned = re.sub(r"[^a-zA-Z0-9_.]", "", last)
        return cleaned.lower()

    return re.sub(r"[^a-zA-Z0-9_.]", "", text.lstrip("@")).lower()


def _extract_viewer_name(event) -> str:
    """Безопасный экстрактор имени зрителя из событий Protobuf v3."""
    user = getattr(event, "user", None) or getattr(event, "from_user", None)
    if not user:
        return "Зритель"
    return (
        getattr(user, "nickname", None)
        or getattr(user, "nick_name", None)
        or getattr(user, "unique_id", None)
        or getattr(user, "username", None)
        or "Зритель"
    )


class TikTokConnector:
    """Подключение к TikTok Live: комментарии, входы зрителей, подарки, подписки, лайки и статус."""

    def __init__(
        self,
        username: str,
        on_comment: Callable[[str, str], None],
        on_join: Callable[[str], None],
        on_gift: Callable[[str, str], None],
        on_status: Callable[[str, str], None],
        on_follow: Callable[[str], None] | None = None,
        on_like: Callable[[str, int], None] | None = None,
    ) -> None:
        self._username = clean_tiktok_username(username)
        self._on_comment = on_comment
        self._on_join = on_join
        self._on_gift = on_gift
        self._on_status = on_status
        self._on_follow = on_follow
        self._on_like = on_like
        self._client: TikTokLiveClient | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._status = "off"
        self._status_detail = "выключен"

    # ---------- жизненный цикл ----------

    @property
    def username(self) -> str:
        return self._username

    @property
    def status(self) -> str:
        return self._status

    @property
    def status_detail(self) -> str:
        return self._status_detail

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="winky-tiktok", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        loop = self._loop
        client = self._client
        if loop and client and loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(client.disconnect(), loop)
            except Exception:
                pass
        self._emit_status("off", "выключен")

    def _emit_status(self, status: str, detail: str = "") -> None:
        self._status = status
        self._status_detail = detail
        try:
            self._on_status(status, detail)
        except Exception:  # noqa: BLE001 — статус не должен ронять поток
            logger.exception("on_status упал")

    def _run(self) -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self._loop = loop
        try:
            loop.run_until_complete(self._run_async())
        finally:
            try:
                loop.close()
            except Exception:
                pass

    async def _run_async(self) -> None:
        while not self._stop.is_set():
            if not self._username:
                self._emit_status("off", "Юзернейм не задан")
                break

            # Применяем ключ сервиса подписи EulerStream, если он задан
            if getattr(settings, "TIKTOK_SIGN_API_KEY", ""):
                WebDefaults.tiktok_sign_api_key = settings.TIKTOK_SIGN_API_KEY

            client = TikTokLiveClient(unique_id=f"@{self._username}")
            self._client = client
            self._register(client)

            self._emit_status("connecting", f"Проверяю эфир @{self._username}...")

            # 1. Проверяем, ведёт ли стример трансляцию прямо сейчас
            try:
                is_live = await client.is_live()
            except UserNotFoundError:
                logger.warning("TikTokLive: пользователь @%s не найден", self._username)
                self._emit_status("error", f"Пользователь @{self._username} не найден в TikTok")
                for _ in range(10):
                    if self._stop.is_set():
                        break
                    await asyncio.sleep(1)
                continue
            except Exception as check_err:
                logger.warning("is_live() warning for @%s: %s", self._username, check_err)
                is_live = True  # Пробуем прямое подключение при сетевом сбое скрейпинга

            if not is_live:
                logger.info("TikTok: @%s сейчас не в эфире", self._username)
                self._emit_status("offline", f"@{self._username} сейчас НЕ в эфире (Offline)")
                for _ in range(15):
                    if self._stop.is_set():
                        break
                    await asyncio.sleep(1)
                continue

            # 2. Подключаемся к комнате стрима
            try:
                self._emit_status("connecting", f"Подключаюсь к комнате @{self._username}...")
                await client.connect()
            except UserOfflineError:
                logger.info("@%s ушел в офлайн (UserOfflineError)", self._username)
                self._emit_status("offline", f"@{self._username} сейчас НЕ в эфире (Offline)")
            except UserNotFoundError:
                logger.warning("@%s не найден (UserNotFoundError)", self._username)
                self._emit_status("error", f"Пользователь @{self._username} не найден")
            except SignatureRateLimitError:
                logger.warning("Лимит подписей EulerStream")
                self._emit_status("error", "Лимит подписей EulerStream (попробуйте позже)")
            except AgeRestrictedError:
                logger.warning("Стрим @%s с возрастным ограничением 18+", self._username)
                self._emit_status("error", f"Стрим @{self._username} с ограничением 18+")
            except Exception as exc:
                if self._stop.is_set():
                    break
                logger.warning("TikTok ошибка подключения к @%s: %s", self._username, exc)
                self._emit_status("error", f"Ошибка подключения: {exc}")

            if self._stop.is_set():
                break

            # Пауза перед попыткой повторного подключения
            for _ in range(5):
                if self._stop.is_set():
                    break
                await asyncio.sleep(1)

        self._emit_status("off", "выключен")

    def _register(self, client: TikTokLiveClient) -> None:
        @client.on(ConnectEvent)
        async def _on_connect(_: ConnectEvent) -> None:
            room_id = getattr(client, "room_id", "") or ""
            logger.info("TikTok подключён: @%s (комната: %s)", self._username, room_id)
            detail = f"В ЭФИРЕ: @{self._username}" + (f" (комната {room_id})" if room_id else "")
            self._emit_status("connected", detail)

        @client.on(DisconnectEvent)
        async def _on_disconnect(_: DisconnectEvent) -> None:
            if not self._stop.is_set():
                logger.info("TikTok отсоединился от @%s, переподключение...", self._username)
                self._emit_status("connecting", f"Переподключение к @{self._username}...")

        @client.on(LiveEndEvent)
        async def _on_live_end(_: LiveEndEvent) -> None:
            logger.info("TikTok эфир @%s завершён", self._username)
            self._emit_status("offline", f"Эфир @{self._username} завершён")

        @client.on(CommentEvent)
        async def _on_comment(event: CommentEvent) -> None:
            try:
                name = _extract_viewer_name(event)
                text = str(getattr(event, "comment", "") or "").strip()
                if text:
                    self._on_comment(name, text)
            except Exception:
                logger.exception("ошибка обработки комментария TikTok")

        @client.on(JoinEvent)
        async def _on_join(event: JoinEvent) -> None:
            try:
                name = _extract_viewer_name(event)
                self._on_join(name)
            except Exception:
                logger.exception("ошибка обработки входа TikTok")

        @client.on(FollowEvent)
        async def _on_follow(event: FollowEvent) -> None:
            try:
                name = _extract_viewer_name(event)
                if self._on_follow:
                    self._on_follow(name)
            except Exception:
                logger.exception("ошибка обработки подписки TikTok")

        @client.on(GiftEvent)
        async def _on_gift(event: GiftEvent) -> None:
            try:
                # Игнорируем промежуточные тапы серийного подарка, реагируем только на финал серии:
                if getattr(event, "streaking", False):
                    return
                name = _extract_viewer_name(event)
                gift_obj = getattr(event, "gift", None)
                gift_name = getattr(gift_obj, "name", None) or getattr(gift_obj, "gift_name", None) or "Подарок"
                repeat_count = getattr(event, "repeat_count", 1) or 1
                full_gift = f"{gift_name} x{repeat_count}" if repeat_count > 1 else str(gift_name)
                self._on_gift(name, full_gift)
            except Exception:
                logger.exception("ошибка обработки подарка TikTok")

        @client.on(LikeEvent)
        async def _on_like(event: LikeEvent) -> None:
            try:
                name = _extract_viewer_name(event)
                count = getattr(event, "count", 1) or 1
                if self._on_like:
                    self._on_like(name, count)
            except Exception:
                logger.exception("ошибка обработки лайка TikTok")
