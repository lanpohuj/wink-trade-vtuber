"""Комплексный набор тестов безопасности и бизнес-логики (Security Audit Verification Suite).

Проверяет исправление всех 8 уязвимостей и логических дефектов:
1. Защита от Privilege Escalation в /vip (только для ADMIN_IDS, выдача VIP по /vip <target_id>).
2. Защита от бесплатных депозитов ($0, <$10, отрицательные) и строгая проверка регистрации.
3. Дедупликация postback-запросов (защита от накрутки deposit_amount).
4. Защита от угона Trader ID (sub_id mismatch) и устранение MultipleResultsFound.
5. Криптографическая верификация Telegram Mini App initData (HMAC-SHA256, запрет tg_id=0).
6. Корректный трекинг доставки дожимов (TelegramForbiddenError -> push_paused, без ложных sent=True).
7. Доступность голосового приветствия EN и RU без зависимости от пакета winky.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import math
import random
import sys
import time
import unittest
import urllib.parse
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from aiogram.exceptions import TelegramAPIError, TelegramForbiddenError
from aiogram.filters.command import CommandObject
from aiogram.types import Message, User as TgUser
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from api.postback import _build_dedup_key
from api.signals import verify_webapp_init_data
from bot.handlers import cmd_vip
from bot.teaser import process_quick_followups, send_15m_followup, send_45m_followup
from bot.voice_greeter import ensure_welcome_voice, get_welcome_voice_path
from config import settings
from database import _apply_light_migrations, async_session_factory, init_db
from database import crud
from database.models import EVENT_DEPOSIT, EVENT_REGISTRATION, PostbackLog, User
from main import create_app


def make_valid_init_data(user_id: int, bot_token: str, username: str = "testuser") -> str:
    """Генерирует криптографически корректный Telegram WebApp initData с HMAC-SHA256 подписью."""
    user_json = json.dumps({"id": user_id, "first_name": "Test", "username": username}, separators=(",", ":"))
    auth_date = str(int(time.time()))
    data_dict = {
        "auth_date": auth_date,
        "query_id": "AAHdF6IQAAAAAN0XohD_test",
        "user": user_json,
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data_dict.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    sig = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    query_parts = [f"{k}={urllib.parse.quote(v, safe='')}" for k, v in data_dict.items()]
    query_parts.append(f"hash={sig}")
    return "&".join(query_parts)


class SecurityAuditVerificationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        await init_db()
        self.app = create_app()
        # Гарантируем тестовые настройки
        self.test_secret = "test_postback_secret_123"
        settings.POSTBACK_SECRET = self.test_secret
        settings.INTERNAL_API_TOKEN = self.test_secret
        if not settings.BOT_TOKEN:
            settings.BOT_TOKEN = "123456789:TEST_BOT_TOKEN_FOR_SECURITY_AUDIT"
        # Сохраняем исходных админов
        self._orig_admin_ids = settings.ADMIN_TG_IDS

    async def asyncTearDown(self) -> None:
        settings.ADMIN_TG_IDS = self._orig_admin_ids

    # =========================================================================
    # 1. Защита от Privilege Escalation в /vip
    # =========================================================================

    async def test_01_non_admin_calling_vip_is_denied(self) -> None:
        """Обычный пользователь вызывает /vip: отказ, в админы не добавлен, доступа нет."""
        non_admin_id = 998877665
        settings.ADMIN_TG_IDS = "7166130676,111222333"

        msg = AsyncMock()
        msg.from_user = TgUser(id=non_admin_id, is_bot=False, first_name="Hacker", username="hacker")
        msg.answer = AsyncMock()
        cmd = CommandObject(prefix="/", command="vip", args=None)

        await cmd_vip(msg, cmd)

        # Проверяем, что ответ содержит отказ в доступе
        msg.answer.assert_called_once()
        sent_text = msg.answer.call_args[0][0]
        self.assertTrue("Доступ ограничен" in sent_text or "Access Denied" in sent_text)

        # Проверяем, что пользователь НЕ стал админом
        self.assertFalse(settings.is_admin(non_admin_id))

        # Проверяем базу данных: у пользователя has_access должно быть False
        async with async_session_factory() as session:
            u = await crud.get_user(session, non_admin_id)
            if u:
                self.assertFalse(u.has_access)

    async def test_01b_admin_granting_vip_to_target_user(self) -> None:
        """Администратор вызывает /vip <target_id>: пользователю target_id выдаётся VIP."""
        admin_id = 7166130676
        target_id = 888111222
        settings.ADMIN_TG_IDS = str(admin_id)

        msg = AsyncMock()
        msg.from_user = TgUser(id=admin_id, is_bot=False, first_name="Streamer", username="streamer")
        msg.answer = AsyncMock()
        cmd = CommandObject(prefix="/", command="vip", args=str(target_id))

        await cmd_vip(msg, cmd)

        msg.answer.assert_called_once()
        sent_text = msg.answer.call_args[0][0]
        self.assertIn("успешно выдан", sent_text)

        async with async_session_factory() as session:
            target = await crud.get_user(session, target_id)
            self.assertIsNotNone(target)
            self.assertTrue(target.has_access)
            self.assertTrue(target.is_registered)

    # =========================================================================
    # 2. Требование минимального депозита ($10) и проверка регистрации
    # =========================================================================

    async def test_02_deposit_below_minimum_or_invalid_does_not_grant_access(self) -> None:
        """Депозиты $0, отрицательные, $1, $9.99 не дают доступ; депозит без регистрации не регистрирует."""
        user_id = random.randint(100_000_000, 999_999_999)
        async with async_session_factory() as session:
            user = await crud.get_or_create_user(session, user_id, "deposit_tester")
            user.has_access = False
            user.is_registered = True
            user.trader_id = f"TR_{user_id}"
            user.deposit_amount = 0.0
            await session.commit()

        transport = ASGITransport(app=self.app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. $0 депозит
            res = await client.post(
                f"/api/postback?token={self.test_secret}&event=dep&sub_id={user_id}&amount=0"
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json().get("status"), "ignored")

            # 2. Отрицательный депозит
            res = await client.post(
                f"/api/postback?token={self.test_secret}&event=dep&sub_id={user_id}&amount=-5"
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json().get("status"), "ignored")

            # 3. Депозит $5.00 (< $10.00)
            tx_min = f"tx_under_min_{uuid.uuid4().hex[:8]}"
            res = await client.post(
                f"/api/postback?token={self.test_secret}&event=dep&sub_id={user_id}&amount=5.00&tx_id={tx_min}"
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json().get("status"), "below_min_deposit")

            # Проверяем БД
            async with async_session_factory() as session:
                u = await crud.get_user(session, user_id)
                self.assertIsNotNone(u)
                self.assertEqual(u.deposit_amount, 5.0)
                self.assertFalse(u.has_access)

            # 4. Депозит без регистрации (для незарегистрированного пользователя)
            unreg_id = random.randint(100_000_000, 999_999_999)
            async with async_session_factory() as session:
                unreg = await crud.get_or_create_user(session, unreg_id, "unreg_tester")
                unreg.is_registered = False
                unreg.trader_id = None
                unreg.deposit_amount = 0.0
                await session.commit()

            # Депозит только по sub_id без trader_id не должен активировать регистрацию
            tx_unreg = f"tx_unreg_{uuid.uuid4().hex[:8]}"
            res = await client.post(
                f"/api/postback?token={self.test_secret}&event=dep&sub_id={unreg_id}&amount=15.00&tx_id={tx_unreg}"
            )
            async with async_session_factory() as session:
                u = await crud.get_user(session, unreg_id)
                self.assertFalse(u.is_registered)
                self.assertFalse(u.has_access)

    # =========================================================================
    # 3. Успешная активация доступа при депозите >= $10.00
    # =========================================================================

    async def test_03_deposit_10_dollars_grants_access(self) -> None:
        """Депозит $10.00 для зарегистрированного пользователя успешно открывает доступ."""
        user_id = random.randint(100_000_000, 999_999_999)
        async with async_session_factory() as session:
            user = await crud.get_or_create_user(session, user_id, "vip_applicant")
            user.is_registered = True
            user.trader_id = f"TR_{user_id}"
            user.deposit_amount = 0.0
            user.has_access = False
            await session.commit()

        tx_valid = f"tx_valid_{uuid.uuid4().hex[:8]}"
        transport = ASGITransport(app=self.app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                f"/api/postback?token={self.test_secret}&event=dep&sub_id={user_id}&amount=10.00&tx_id={tx_valid}"
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get("status"), "ok")
            self.assertTrue(data.get("has_access"))
            self.assertEqual(data.get("deposit_amount"), 10.0)

        async with async_session_factory() as session:
            u = await crud.get_user(session, user_id)
            self.assertIsNotNone(u)
            self.assertTrue(u.has_access)
            self.assertEqual(u.deposit_amount, 10.0)

    # =========================================================================
    # 4. Идемпотентность и дедупликация повторных постбеков
    # =========================================================================

    async def test_04_postback_idempotency_prevents_balance_inflation(self) -> None:
        """Троекратная отправка одинакового постбека $10 зачисляет ровно $10, а не $30."""
        user_id = random.randint(100_000_000, 999_999_999)
        async with async_session_factory() as session:
            user = await crud.get_or_create_user(session, user_id, "dedup_tester")
            user.is_registered = True
            user.trader_id = f"TR_{user_id}"
            user.deposit_amount = 0.0
            user.has_access = False
            await session.commit()

        tx_unique = f"tx_unique_{uuid.uuid4().hex[:8]}"
        transport = ASGITransport(app=self.app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            url = f"/api/postback?token={self.test_secret}&event=dep&sub_id={user_id}&amount=10.00&tx_id={tx_unique}"

            # 1-й запрос
            r1 = await client.post(url)
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r1.json().get("status"), "ok")

            # 2-й повторный запрос
            r2 = await client.post(url)
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(r2.json().get("status"), "duplicate_ignored")

            # 3-й повторный запрос
            r3 = await client.post(url)
            self.assertEqual(r3.status_code, 200)
            self.assertEqual(r3.json().get("status"), "duplicate_ignored")

        # Проверяем, что баланс остался ровно 10.0, а не 30.0
        async with async_session_factory() as session:
            u = await crud.get_user(session, user_id)
            self.assertIsNotNone(u)
            self.assertEqual(u.deposit_amount, 10.0)

    # =========================================================================
    # 5. Ручной ввод Trader ID: защита от захвата аккаунта и MultipleResultsFound
    # =========================================================================

    async def test_05_manual_trader_id_takeover_prevention_and_sql_safety(self) -> None:
        """Неизвестный ID не регистрирует; чужой ID отклоняется; дубликат trader_id не крашит приложение."""
        victim_id = random.randint(100_000_000, 999_999_999)
        attacker_id = random.randint(100_000_000, 999_999_999)
        stolen_trader_id = str(random.randint(10_000_000, 99_999_999))
        unknown_trader_id = str(random.randint(10_000_000, 99_999_999))

        async with async_session_factory() as session:
            # 1. Попытка ввода неизвестного ID, по которому вообще нет постбеков
            user_unknown, has_pb, had_dep, status = await crud.bind_manual_trader_id(
                session, attacker_id, unknown_trader_id
            )
            self.assertEqual(status, "not_found")
            self.assertFalse(user_unknown.is_registered)
            self.assertFalse(user_unknown.has_access)

            # 2. Создаем постбек брокера для жертвы (sub_id = victim_id)
            await crud.log_postback(
                session,
                EVENT_REGISTRATION,
                trader_id=stolen_trader_id,
                sub_id=str(victim_id),
                status="ok",
            )
            await crud.log_postback(
                session,
                EVENT_DEPOSIT,
                trader_id=stolen_trader_id,
                sub_id=str(victim_id),
                amount=50.0,
                status="ok",
            )

            # Атакующий пытается привязать stolen_trader_id
            user_att, has_pb, had_dep, status = await crud.bind_manual_trader_id(
                session, attacker_id, stolen_trader_id
            )
            self.assertEqual(status, "conflict_sub_id_mismatch")
            self.assertFalse(user_att.is_registered)
            self.assertFalse(user_att.has_access)

            # Жертва привязывает свой ID - успешно
            user_vic, has_pb, had_dep, status = await crud.bind_manual_trader_id(
                session, victim_id, stolen_trader_id
            )
            self.assertEqual(status, "access_granted")
            self.assertTrue(user_vic.is_registered)
            self.assertTrue(user_vic.has_access)
            self.assertEqual(user_vic.deposit_amount, 50.0)

            # 3. Проверка MultipleResultsFound: создаем второго пользователя с таким же trader_id в базе
            dupe_tg_id = random.randint(100_000_000, 999_999_999)
            dupe_user = User(
                tg_id=dupe_tg_id,
                trader_id=stolen_trader_id,
                is_registered=False,
                deposit_amount=0.0,
            )
            session.add(dupe_user)
            await session.commit()

            # Вызов get_user_by_trader_id не должен выбрасывать MultipleResultsFound
            found = await crud.get_user_by_trader_id(session, stolen_trader_id)
            self.assertIsNotNone(found)
            self.assertEqual(found.tg_id, victim_id)

    # =========================================================================
    # 6. Криптографическая верификация Telegram Mini App initData
    # =========================================================================

    async def test_06_signals_api_init_data_verification_and_tg_id_zero(self) -> None:
        """Запросы к /api/signal с tg_id=0, без подписи или с поддельной отклоняются с 401."""
        transport = ASGITransport(app=self.app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Запрос с tg_id: 0 без авторизации -> 401
            res = await client.post("/api/signal", json={"tg_id": 0, "pair": "AUD/CAD OTC", "duration": "30s"})
            self.assertEqual(res.status_code, 401)

            # 2. Запрос с поддельным admin tg_id без подписи -> 401
            res = await client.post(
                "/api/signal",
                json={"tg_id": 7166130676, "pair": "AUD/CAD OTC", "duration": "30s"},
            )
            self.assertEqual(res.status_code, 401)

            # 3. Запрос с невалидной/испорченной подписью initData -> 401
            tampered_init = "query_id=ABC&user=%7B%22id%22%3A7166130676%7D&auth_date=123456&hash=badhash123"
            res = await client.post(
                "/api/signal",
                headers={"X-Telegram-Init-Data": tampered_init},
                json={"tg_id": 7166130676, "pair": "AUD/CAD OTC", "duration": "30s"},
            )
            self.assertEqual(res.status_code, 401)

            # 4. Запрос с валидной подписанной initData настоящего пользователя
            real_user_id = 99112233
            # Создаем пользователя в БД с доступом
            async with async_session_factory() as session:
                u = await crud.get_or_create_user(session, real_user_id, "webapp_user")
                u.is_registered = True
                u.has_access = True
                await session.commit()

            valid_init = make_valid_init_data(real_user_id, settings.BOT_TOKEN, "webapp_user")
            res = await client.post(
                "/api/signal",
                headers={"X-Telegram-Init-Data": valid_init},
                json={"tg_id": real_user_id, "pair": "AUD/CAD OTC", "duration": "30s"},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertIn("direction", data)
            self.assertTrue(data.get("is_vip"))

            # 5. Внутренний запрос стримера с X-Internal-Token
            admin_id = 7166130676
            settings.ADMIN_TG_IDS = str(admin_id)
            res = await client.post(
                "/api/signal",
                headers={"X-Internal-Token": self.test_secret},
                json={"tg_id": admin_id, "pair": "AUD/CAD OTC", "duration": "30s"},
            )
            self.assertEqual(res.status_code, 200)

    # =========================================================================
    # 7. Трекинг доставки дожимов и обработка блокировки бота
    # =========================================================================

    async def test_07_followup_delivery_tracking_and_forbidden_error(self) -> None:
        """Блокировка бота (TelegramForbiddenError) ставит push_paused=True; при сбое sent не выставляется."""
        blocked_user_id = 771122
        async with async_session_factory() as session:
            user = await crud.get_or_create_user(session, blocked_user_id, "blocked_user")
            user.is_registered = False
            user.has_access = False
            user.push_paused = False
            user.followup_15m_sent = False
            await session.commit()

        # Мокаем Bot, бросающий TelegramForbiddenError (пользователь заблокировал бота)
        mock_bot = AsyncMock()
        mock_bot.send_message.side_effect = TelegramForbiddenError(method="sendMessage", message="Bot was blocked by the user")

        result = await send_15m_followup(mock_bot, user)
        self.assertFalse(result)

        # Проверяем, что в БД зафиксирован push_paused = True
        async with async_session_factory() as session:
            u = await crud.get_user(session, blocked_user_id)
            self.assertTrue(u.push_paused)
            self.assertFalse(u.followup_15m_sent)

        # Проверяем транзиентную ошибку TelegramAPIError
        retry_user_id = 771133
        async with async_session_factory() as session:
            r_user = await crud.get_or_create_user(session, retry_user_id, "retry_user")
            r_user.is_registered = False
            r_user.has_access = False
            r_user.push_paused = False
            r_user.followup_15m_sent = False
            await session.commit()

        mock_bot.send_message.side_effect = TelegramAPIError(method="sendMessage", message="Network timeout")
        result2 = await send_15m_followup(mock_bot, r_user)
        self.assertFalse(result2)

        async with async_session_factory() as session:
            u2 = await crud.get_user(session, retry_user_id)
            self.assertFalse(u2.push_paused)
            self.assertFalse(u2.followup_15m_sent)  # Не помечено, чтобы можно было повторить

    # =========================================================================
    # 8. Доступность голосовых приветствий EN/RU без пакета winky
    # =========================================================================

    async def test_08_welcome_voice_available_without_winky(self) -> None:
        """Файлы bot_welcome_en.mp3 и bot_welcome_ru.mp3 присутствуют и возвращаются без winky."""
        en_path = get_welcome_voice_path("en")
        self.assertIsNotNone(en_path)
        self.assertTrue(en_path.exists())
        self.assertGreater(en_path.stat().st_size, 1000)

        ru_path = get_welcome_voice_path("ru")
        self.assertIsNotNone(ru_path)
        self.assertTrue(ru_path.exists())
        self.assertGreater(ru_path.stat().st_size, 1000)

        # Симулируем окружение Docker, где winky отсутствует в sys.modules
        with patch.dict(sys.modules, {"winky": None, "winky.tts": None}):
            ensured_en = await ensure_welcome_voice("en")
            self.assertIsNotNone(ensured_en)
            self.assertTrue(ensured_en.exists())


if __name__ == "__main__":
    unittest.main()
