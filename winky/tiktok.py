"""Коннектор TikTok Live: читает чат стрима анонимно, по юзернейму.

Работает в собственном потоке с отдельным asyncio-циклом (библиотека TikTokLive
асинхронная). События пробрасываются в основной код колбэками — потокобезопасно,
т.к. все получатели у нас уже потокозащищены (SpeechController, ChatRouter).
"""

from __future__ import annotations

import asyncio
import logging
import threading

from TikTokLive import TikTokLiveClient
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

logger = logging.getLogger("winky.tiktok")


class TikTokConnector:
    """Подключение к лайву: комментарии, входы зрителей, подарки, статус."""

    def __init__(
        self,
        username: str,
        on_comment,
        on_join,
        on_gift,
        on_status,
        on_follow=None,
        on_like=None,
    ) -> None:
        self._username = username.lstrip("@")
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

    # ---------- жизненный цикл ----------

    @property
    def username(self) -> str:
        return self._username

    @property
    def status(self) -> str:
        return self._status

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
        if loop and client:
            def _disconnect():
                asyncio.ensure_future(client.disconnect())
            try:
                loop.call_soon_threadsafe(_disconnect)
            except RuntimeError:
                pass

    def _set_status(self, status: str) -> None:
        self._status = status
        try:
            self._on_status(status)
        except Exception:  # noqa: BLE001 — статус не должен ронять поток
            logger.exception("on_status упал")

    def _run(self) -> None:
        asyncio.run(self._main())

    async def _main(self) -> None:
        self._loop = asyncio.get_running_loop()
        while not self._stop.is_set():
            client = TikTokLiveClient(unique_id=self._username)
            self._client = client
            self._register(client)
            try:
                self._set_status("connecting")
                await client.start()
                # start() завершается при дисконнекте
                self._set_status("reconnecting")
            except Exception as exc:  # noqa: BLE001 — сеть может падать по-разному
                logger.warning("TikTok-соединение: %s", exc)
                self._set_status("reconnecting")
            if self._stop.is_set():
                break
            await asyncio.sleep(5)  # пауза перед повторным подключением
        self._set_status("off")

    def _register(self, client: TikTokLiveClient) -> None:
        @client.on(ConnectEvent)
        async def _on_connect(_: ConnectEvent) -> None:
            logger.info("TikTok подключён: @%s", self._username)
            self._set_status("connected")

        @client.on(DisconnectEvent)
        async def _on_disconnect(_: DisconnectEvent) -> None:
            self._set_status("reconnecting")

        @client.on(LiveEndEvent)
        async def _on_live_end(_: LiveEndEvent) -> None:
            self._set_status("reconnecting")

        @client.on(CommentEvent)
        async def _on_comment(event: CommentEvent) -> None:
            try:
                nickname = getattr(getattr(event, "user", None), "nickname", "") or "зритель"
                text = str(getattr(event, "comment", "") or "")
                if text:
                    self._on_comment(nickname, text)
            except Exception:  # noqa: BLE001
                logger.exception("ошибка обработки комментария")

        @client.on(JoinEvent)
        async def _on_join(event: JoinEvent) -> None:
            try:
                nickname = getattr(getattr(event, "user", None), "nickname", "") or "зритель"
                self._on_join(nickname)
            except Exception:  # noqa: BLE001
                logger.exception("ошибка обработки входа")

        @client.on(FollowEvent)
        async def _on_follow(event: FollowEvent) -> None:
            try:
                nickname = getattr(getattr(event, "user", None), "nickname", "") or "зритель"
                if self._on_follow:
                    self._on_follow(nickname)
            except Exception:  # noqa: BLE001
                logger.exception("ошибка обработки подписки")

        @client.on(GiftEvent)
        async def _on_gift(event: GiftEvent) -> None:
            try:
                nickname = getattr(getattr(event, "user", None), "nickname", "") or "зритель"
                gift = getattr(getattr(event, "gift", None), "name", "") or "подарок"
                self._on_gift(nickname, gift)
            except Exception:  # noqa: BLE001
                logger.exception("ошибка обработки подарка")

        @client.on(LikeEvent)
        async def _on_like(event: LikeEvent) -> None:
            try:
                nickname = getattr(getattr(event, "user", None), "nickname", "") or "зритель"
                count = getattr(event, "count", 1) or 1
                if self._on_like:
                    self._on_like(nickname, count)
            except Exception:  # noqa: BLE001
                logger.exception("ошибка обработки лайка")
