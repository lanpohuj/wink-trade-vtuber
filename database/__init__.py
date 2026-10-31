"""Инициализация базы данных Wink Trade: движок, фабрика сессий, создание таблиц."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import Connection, inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import settings
from database import models
from database.models import AdminSignalQueue, Base, PostbackLog, User

__all__ = [
    "engine",
    "async_session_factory",
    "init_db",
    "get_session",
    "Base",
    "User",
    "AdminSignalQueue",
    "PostbackLog",
]

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DATABASE_ECHO)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _apply_light_migrations(sync_conn: Connection) -> None:
    """Добавляет колонки, появившиеся после первого релиза, к существующей таблице users.

    Свежая база получает всё через create_all; здесь — только ALTER для старых баз (SQLite).
    """
    existing = {column["name"] for column in inspect(sync_conn).get_columns("users")}
    migrations = (
        ("source", "ALTER TABLE users ADD COLUMN source VARCHAR(16)"),
        ("push_paused", "ALTER TABLE users ADD COLUMN push_paused BOOLEAN NOT NULL DEFAULT 0"),
        ("teaser_count", "ALTER TABLE users ADD COLUMN teaser_count INTEGER NOT NULL DEFAULT 0"),
        ("last_teaser_at", "ALTER TABLE users ADD COLUMN last_teaser_at DATETIME"),
        ("points_total", "ALTER TABLE users ADD COLUMN points_total INTEGER NOT NULL DEFAULT 0"),
        ("points_week", "ALTER TABLE users ADD COLUMN points_week INTEGER NOT NULL DEFAULT 0"),
        ("points_week_key", "ALTER TABLE users ADD COLUMN points_week_key VARCHAR(10)"),
        ("points_daily_date", "ALTER TABLE users ADD COLUMN points_daily_date VARCHAR(10)"),
        ("points_daily_earned", "ALTER TABLE users ADD COLUMN points_daily_earned INTEGER NOT NULL DEFAULT 0"),
        ("streak_days", "ALTER TABLE users ADD COLUMN streak_days INTEGER NOT NULL DEFAULT 0"),
        ("last_active_date", "ALTER TABLE users ADD COLUMN last_active_date VARCHAR(10)"),
        ("demo_used", "ALTER TABLE users ADD COLUMN demo_used BOOLEAN NOT NULL DEFAULT 0"),
        ("registered_at", "ALTER TABLE users ADD COLUMN registered_at DATETIME"),
        ("followup_15m_sent", "ALTER TABLE users ADD COLUMN followup_15m_sent BOOLEAN NOT NULL DEFAULT 0"),
        ("followup_45m_sent", "ALTER TABLE users ADD COLUMN followup_45m_sent BOOLEAN NOT NULL DEFAULT 0"),
    )
    for name, statement in migrations:
        if name not in existing:
            sync_conn.execute(text(statement))


async def init_db() -> None:
    """Создаёт таблицы и докатывает лёгкие миграции. Вызывается один раз при старте."""
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
        await conn.run_sync(_apply_light_migrations)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Асинхронный генератор сессий — зависимость для эндпоинтов FastAPI.

    В хэндлерах aiogram используйте напрямую::

        async with async_session_factory() as session:
            user = await crud.get_user(session, tg_id)
    """
    async with async_session_factory() as session:
        yield session
