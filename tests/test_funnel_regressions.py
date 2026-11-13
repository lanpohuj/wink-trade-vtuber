"""Security, concurrency and RU/EN acceptance. Run via tools/test_funnel.py."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import time
import unittest
from datetime import timedelta
from unittest.mock import AsyncMock, patch
from urllib.parse import urlencode

from aiogram import Bot, Dispatcher
from aiogram.client.session.base import BaseSession
from aiogram.exceptions import TelegramAPIError, TelegramForbiddenError
from aiogram.types import Message, Update
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select

from api import signals
from bot import handlers, teaser
from bot.notifications import deliver_pending_notifications
from config import settings
from database import async_session_factory, crud, init_db
from database.models import Base, NotificationOutbox, PartnerEvent, SignalHistory, SignalLease, User, utcnow
from main import SecretFilter, create_app


def signed(uid: int, auth_date=None, **extra):
    values = {"user": json.dumps({"id": uid, "first_name": "Audit"}, separators=(",", ":")),
              "auth_date": str(int(time.time()) if auth_date is None else auth_date), **extra}
    if values["auth_date"] == "omit":
        values.pop("auth_date")
    key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    values["hash"] = hmac.new(key, "\n".join(f"{k}={v}" for k, v in sorted(values.items())).encode(), hashlib.sha256).hexdigest()
    return urlencode(values)


class FakeTelegram(BaseSession):
    def __init__(self):
        super().__init__()
        self.calls = []

    async def close(self):
        pass

    async def stream_content(self, *args, **kwargs):
        if False:
            yield b""

    async def make_request(self, bot, method, timeout=None):
        self.calls.append(json.loads(json.dumps(method.model_dump(exclude_none=True), default=str)))
        if method.__api_method__ in ("sendMessage", "sendVoice", "editMessageText"):
            return Message.model_validate({"message_id": 1, "date": int(time.time()),
                "chat": {"id": method.chat_id, "type": "private"}, "text": getattr(method, "text", "")},
                context={"bot": bot})
        return True


class FunnelRegressionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await init_db()
        async with async_session_factory() as session:
            for table in reversed(Base.metadata.sorted_tables):
                await session.execute(delete(table))
            await session.commit()
        settings.POSTBACK_SECRET = "funnel-test-secret"
        settings.INTERNAL_API_TOKEN = "publisher-test-secret"
        settings.ADMIN_TG_IDS = "900000001"
        signals._latest_synced_signal = None
        self.app = create_app()
        self.bot = AsyncMock()
        self.app.state.bot = self.bot
        self.client = AsyncClient(transport=ASGITransport(app=self.app, raise_app_exceptions=False), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def seed(self, uid=910000001, registered=False, trader=None, amount=0):
        async with async_session_factory() as session:
            user = await crud.get_or_create_user(session, uid)
            user.is_registered, user.trader_id = registered, trader
            user.deposit_amount, user.has_access = amount, amount >= 10
            await session.commit()
            return user

    async def user(self, uid=910000001):
        async with async_session_factory() as session:
            return await crud.get_user(session, uid)

    async def receipt(self, uid=910000001, event="dep", amount=10, trader="T1", tx="tx1", **extra):
        data = {"token": settings.POSTBACK_SECRET, "event": event, **extra}
        if uid is not None:
            data["sub_id1"] = str(uid)
        if trader is not None:
            data["trader_id"] = trader
        if amount is not None:
            data["amount"] = str(amount)
        if tx is not None:
            data["tx_id"] = tx
        return await self.client.post("/api/postback", json=data)

    async def signal(self, uid=910000001, **extra):
        return await self.client.post("/api/signal", json={"tg_id": uid, "pair": "AUD/CAD OTC", "duration": "30s", "init_data": signed(uid), **extra})

    async def test_distinct_parallel_deposits_keep_all_sixty_dollars(self):
        await self.seed(registered=True, trader="T1")
        responses = await asyncio.gather(*[self.receipt(amount=5, tx=f"unique{i}") for i in range(12)])
        self.assertEqual([r.status_code for r in responses], [200] * 12)
        user = await self.user()
        self.assertEqual(user.deposit_amount, 60)
        self.assertTrue(user.has_access)

    async def test_parallel_duplicate_once(self):
        await self.seed(registered=True, trader="T1")
        responses = await asyncio.gather(*[self.receipt() for _ in range(12)])
        self.assertEqual((await self.user()).deposit_amount, 10)
        self.assertEqual(sum(r.json()["status"] == "ok" for r in responses), 1)
        async with async_session_factory() as session:
            self.assertEqual(await session.scalar(select(func.count()).select_from(PartnerEvent)), 1)
        self.assertEqual(self.bot.send_message.call_count, 1)

    async def test_journal_failure_rolls_back_money_and_event(self):
        await self.seed(registered=True, trader="T1")
        with patch("database.crud.log_postback", side_effect=RuntimeError("journal unavailable")):
            result = await self.receipt()
        self.assertEqual(result.status_code, 500)
        self.assertEqual((await self.user()).deposit_amount, 0)
        async with async_session_factory() as session:
            self.assertEqual(await session.scalar(select(func.count()).select_from(PartnerEvent)), 0)
        self.assertEqual((await self.receipt()).status_code, 200)
        self.assertEqual((await self.user()).deposit_amount, 10)

    async def test_distinct_dates_same_click_and_amount_are_distinct_payments(self):
        await self.seed(registered=True, trader="T1")
        for date in ["2026-11-13 10:00:00", "2026-11-13 10:01:00"]:
            result = await self.receipt(amount=5, tx=None, click_id="910000001", event_time=date)
            self.assertEqual(result.status_code, 200)
        self.assertEqual((await self.user()).deposit_amount, 10)
        result = await self.receipt(amount=5, tx=None, click_id="910000001", event_time=date)
        self.assertEqual(result.json()["status"], "duplicate_ignored")
        self.assertEqual((await self.user()).deposit_amount, 10)

    async def test_missing_payment_identity_is_logged_without_credit(self):
        await self.seed(registered=True, trader="T1")
        result = await self.receipt(tx=None, click_id="910000001")
        self.assertEqual(result.json()["reason"], "missing_event_identity")
        self.assertFalse((await self.user()).has_access)

    async def test_conflicting_owner_never_credits_other_person(self):
        await self.seed(910000001, True, "T1")
        await self.seed(910000002, True, "T2")
        result = await self.receipt(uid=910000002, trader="T1")
        self.assertEqual(result.json()["status"], "identity_conflict")
        self.assertEqual((await self.user(910000002)).deposit_amount, 0)
        self.assertEqual((await self.user()).deposit_amount, 0)

    async def test_unknown_tg_does_not_fall_back_to_different_trader_owner(self):
        await self.seed(registered=True, trader="T1")
        result = await self.receipt(uid=999999999, trader="T1")
        self.assertEqual(result.json()["status"], "waiting_user")
        self.assertEqual((await self.user()).deposit_amount, 0)

    async def test_unattributed_trader_cannot_be_claimed_by_knowing_id(self):
        await self.receipt(uid=None, event="reg", amount=None, trader="12345678", tx="reg")
        await self.receipt(uid=None, trader="12345678")
        async with async_session_factory() as session:
            user, _, deposit, status = await crud.bind_manual_trader_id(session, 910000001, "12345678")
        self.assertEqual(status, "verification_required")
        self.assertFalse(user.has_access)
        self.assertFalse(deposit)

    async def test_attributed_receipts_before_start_are_reconciled(self):
        await self.receipt(event="reg", tx="reg")
        await self.receipt()
        async with async_session_factory() as session:
            user = await crud.get_or_create_user(session, 910000001, source="live")
        self.assertTrue(user.has_access)
        self.assertEqual(user.deposit_amount, 10)

    async def test_late_registration_opens_previously_received_deposit(self):
        await self.seed()
        await self.receipt(trader=None)
        self.assertFalse((await self.user()).has_access)
        await self.receipt(event="reg", tx="reg")
        self.assertTrue((await self.user()).has_access)

    async def test_threshold_exact_cents_and_ui(self):
        await self.seed(registered=True, trader="T1")
        await self.receipt(amount=9.99)
        user = await self.user()
        self.assertFalse(user.has_access)
        self.assertEqual(handlers._funnel_state(user), "deposit")
        await self.receipt(amount=.01, tx="second")
        self.assertTrue((await self.user()).has_access)
        self.assertEqual(handlers._funnel_state(await self.user()), "access")

    async def test_invalid_amounts_never_credit(self):
        await self.seed(registered=True, trader="T1")
        for amount in [0, -1, "bad", "NaN", "inf", None, "9.999"]:
            with self.subTest(amount=amount):
                self.assertEqual((await self.receipt(amount=amount)).json()["reason"], "invalid_amount")
        self.assertEqual((await self.user()).deposit_amount, 0)

    async def test_outbox_retries_without_recredit(self):
        await self.seed(registered=True, trader="T1")
        self.bot.send_message.side_effect = TelegramAPIError(method="sendMessage", message="timeout")
        self.assertEqual((await self.receipt()).status_code, 200)
        async with async_session_factory() as session:
            item = await session.get(NotificationOutbox, "access:910000001")
            self.assertEqual(item.status, "pending")
            item.next_attempt_at = utcnow() - timedelta(seconds=1)
            await session.commit()
        self.bot.send_message.side_effect = None
        await deliver_pending_notifications(self.bot)
        async with async_session_factory() as session:
            self.assertEqual((await session.get(NotificationOutbox, "access:910000001")).status, "sent")
        self.assertEqual((await self.user()).deposit_amount, 10)
        self.assertEqual(self.bot.send_message.call_count, 2)
        self.assertEqual((await self.receipt()).json()["status"], "duplicate_ignored")
        self.assertEqual(self.bot.send_message.call_count, 2)

    async def test_blocked_outbox_preserves_access_and_stops_pushes(self):
        await self.seed(registered=True, trader="T1")
        self.bot.send_message.side_effect = TelegramForbiddenError(method="sendMessage", message="blocked")
        await self.receipt()
        user = await self.user()
        self.assertTrue(user.has_access)
        self.assertTrue(user.push_paused)

    async def test_parallel_free_requests_cannot_exceed_three(self):
        await self.seed()
        responses = await asyncio.gather(*[self.signal() for _ in range(12)])
        self.assertEqual(sum(r.status_code == 200 for r in responses), 3)
        self.assertEqual(sum(r.status_code == 403 for r in responses), 9)
        async with async_session_factory() as session:
            self.assertEqual(await session.scalar(select(func.count()).select_from(SignalHistory)), 3)
            self.assertEqual(await session.scalar(select(func.count()).select_from(SignalLease)), 0)

    async def test_generation_failure_releases_free_reservation(self):
        await self.seed()
        with patch("api.signals._user_signal", side_effect=RuntimeError("offline")):
            self.assertEqual((await self.signal()).status_code, 500)
        self.assertEqual([(await self.signal()).status_code for _ in range(4)], [200, 200, 200, 403])

    async def test_stale_future_missing_and_tampered_telegram_data(self):
        for date in [1, int(time.time()) + 86400, "omit"]:
            with self.subTest(date=date):
                result = await self.signal(init_data=signed(910000001, date))
                self.assertEqual(result.status_code, 401)
        result = await self.signal(init_data=signed(910000001).replace("hash=", "hash=bad"))
        self.assertEqual(result.status_code, 401)

    async def test_profile_auth_and_read_does_not_award_other_user(self):
        await self.seed()
        self.assertEqual((await self.client.get("/api/me?tg_id=99999999")).status_code, 401)
        result = await self.client.get("/api/me?tg_id=99999999", headers={"X-Telegram-Init-Data": signed(910000001)})
        self.assertEqual(result.status_code, 200)
        self.assertEqual((await self.user()).points_total, 0)
        self.assertIsNone(await self.user(99999999))
        self.assertIn("sub_id1=910000001", result.json()["register_url"])

    async def test_openapi_schema_resolves_all_response_types(self):
        result = await self.client.get("/openapi.json")
        self.assertEqual(result.status_code, 200)
        self.assertIn("/api/postback", result.json()["paths"])

    async def test_visit_bonus_requires_auth_and_is_atomic(self):
        await self.seed()
        self.assertEqual((await self.client.post("/api/activity")).status_code, 401)
        responses = await asyncio.gather(*[self.client.post("/api/activity", headers={
            "X-Telegram-Init-Data": signed(910000001),
        }) for _ in range(8)])
        self.assertTrue(all(r.status_code == 200 for r in responses))
        self.assertEqual((await self.user()).points_total, 6)

    async def test_anonymous_writes_rejected_and_publisher_is_separate_secret(self):
        payload = {"pair": "AUD/CAD OTC", "direction": "BUY", "accuracy": 90, "duration": "30s"}
        for path, data in [("/api/signal/sync", payload), ("/api/live_stats", {"wins": 5})]:
            with self.subTest(path=path):
                self.assertEqual((await self.client.post(path, json=data)).status_code, 401)
                self.assertEqual((await self.client.post(path, json=data, headers={"X-Internal-Token": settings.POSTBACK_SECRET})).status_code, 401)
                self.assertEqual((await self.client.post(path, json=data, headers={"X-Internal-Token": settings.INTERNAL_API_TOKEN})).status_code, 200)
                self.assertEqual((await self.client.post(path, json=data, headers={"X-Telegram-Init-Data": signed(910000001)})).status_code, 403)

    async def test_history_identity_and_paid_sync_gate(self):
        await self.seed()
        self.assertEqual((await self.client.get("/api/history")).status_code, 401)
        self.assertEqual((await self.client.get("/api/signal/sync")).status_code, 401)
        self.assertEqual((await self.client.get("/api/signal/sync", headers={"X-Telegram-Init-Data": signed(910000001)})).status_code, 403)
        await self.signal()
        await self.seed(910000002)
        response = await self.client.get("/api/history", headers={"X-Telegram-Init-Data": signed(910000002)})
        self.assertEqual(response.json()["signals"], [])

    async def test_live_stats_survive_new_application_instance(self):
        headers = {"X-Internal-Token": settings.INTERNAL_API_TOKEN}
        await self.client.post("/api/live_stats", headers=headers, json={"wins": 7, "losses": 3})
        async with AsyncClient(transport=ASGITransport(app=create_app()), base_url="http://test") as second:
            result = await second.get("/api/live_stats")
        self.assertEqual((result.json()["wins"], result.json()["losses"]), (7, 3))

    async def test_failed_daily_teaser_not_counted_and_partial_deposit_reminded(self):
        user = await self.seed(registered=True, amount=5)
        async with async_session_factory() as session:
            user = await crud.get_user(session, user.tg_id)
            user.registered_at = utcnow() - timedelta(hours=1)
            await session.commit()
            targets = await crud.get_45m_followup_targets(session)
            self.assertEqual([u.tg_id for u in targets], [user.tg_id])
        self.bot.send_message.side_effect = TelegramAPIError(method="sendMessage", message="timeout")
        await teaser.run_daily_teasers(self.bot)
        self.assertEqual((await self.user()).teaser_count, 0)

    async def test_log_filter_redacts_url_objects(self):
        import httpx
        record = logging.LogRecord("httpx", 20, "", 1, "Request %s", (httpx.URL("https://example.test/?token=PRIVATE&event=reg"),), None)
        SecretFilter().filter(record)
        self.assertNotIn("PRIVATE", record.getMessage())

    async def test_conflicting_attribution_fields_are_rejected(self):
        await self.seed(registered=True, trader="T1")
        response = await self.receipt(tg_id="910000002")
        self.assertEqual(response.status_code, 400)
        self.assertEqual((await self.user()).deposit_amount, 0)

    async def test_expired_reservation_can_be_reused_after_crash(self):
        await self.seed()
        async with async_session_factory() as session:
            session.add(SignalLease(key="expired", tg_id=910000001, expires_at=utcnow()-timedelta(seconds=1)))
            await session.commit()
        self.assertEqual([(await self.signal()).status_code for _ in range(4)], [200, 200, 200, 403])

    async def test_old_schema_upgrade_preserves_existing_data(self):
        import tempfile
        from pathlib import Path
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from database import _apply_light_migrations
        with tempfile.TemporaryDirectory() as folder:
            test_engine = create_async_engine(f"sqlite+aiosqlite:///{Path(folder)/'old.db'}")
            try:
                async with test_engine.begin() as conn:
                    await conn.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, tg_id BIGINT, username VARCHAR(64), lang VARCHAR(8), trader_id VARCHAR(64), is_registered BOOLEAN, deposit_amount FLOAT, has_access BOOLEAN, created_at DATETIME)"))
                    await conn.execute(text("INSERT INTO users VALUES (1, 123, 'existing', 'ru', 'VIP-123', 1, 0, 1, '2026-11-01')"))
                    await conn.execute(text("CREATE TABLE postback_logs (id INTEGER PRIMARY KEY, event_type VARCHAR(32), trader_id VARCHAR(64), sub_id VARCHAR(64), amount FLOAT, status VARCHAR(32), raw_data TEXT, created_at DATETIME)"))
                    await conn.run_sync(Base.metadata.create_all)
                    await conn.run_sync(_apply_light_migrations)
                    row = (await conn.execute(text("SELECT username, has_access, deposit_amount FROM users"))).one()
                    self.assertEqual(tuple(row), ("existing", 1, 0))
                    for table in ("partner_events", "notification_outbox", "signal_leases", "live_stats"):
                        self.assertEqual(await conn.scalar(text(f"SELECT COUNT(*) FROM {table}")), 0)
            finally:
                await test_engine.dispose()

    async def test_ru_en_dispatcher_funnel_language_switch_keeps_access(self):
        # Router instances cannot be attached to two dispatchers.
        from aiogram import Router
        dispatcher = Dispatcher()
        for attr in ("message", "callback_query"):
            original = getattr(handlers.router, attr)
            target = getattr(dispatcher, attr)
            target.handlers.extend(original.handlers)
        fake = FakeTelegram()
        bot = Bot(settings.BOT_TOKEN, session=fake)
        update_id = 0
        async def feed(uid, text=None, data=None):
            nonlocal update_id
            update_id += 1
            person = {"id": uid, "is_bot": False, "first_name": "Test"}
            message = {"message_id": 1, "date": int(time.time()), "chat": {"id": uid, "type": "private"}, "from": person, "text": text or "menu"}
            if text and text.startswith("/"):
                message["entities"] = [{"type": "bot_command", "offset": 0, "length": len(text.split()[0])}]
            value = {"update_id": update_id, "message": message} if not data else {"update_id": update_id, "callback_query": {"id": str(update_id), "from": person, "chat_instance": "test", "data": data, "message": message}}
            await dispatcher.feed_update(bot, Update.model_validate(value))
        try:
            for uid, lang in [(910000001, "ru"), (910000002, "en")]:
                await feed(uid, "/start live")
                await feed(uid, data="lang_" + lang)
                self.assertEqual((await self.user(uid)).source, "live")
                self.assertEqual((await self.user(uid)).lang, lang)
                await self.receipt(uid, event="reg", trader=str(uid), tx="reg" + lang)
                await self.receipt(uid, amount=9.99, trader=str(uid), tx="small" + lang)
                await feed(uid, data="check_status")
                last = next(x["text"] for x in reversed(fake.calls) if x.get("text"))
                self.assertIn("2", last)
                await self.receipt(uid, amount=.01, trader=str(uid), tx="rest" + lang)
                await feed(uid, data="lang_" + ("en" if lang == "ru" else "ru"))
                last = next(x["text"] for x in reversed(fake.calls) if x.get("text"))
                self.assertIn("3", last)
                self.assertTrue((await self.user(uid)).has_access)
        finally:
            await bot.session.close()
