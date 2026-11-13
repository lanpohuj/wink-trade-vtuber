"""Database-backed free-signal reservations; network analysis never holds a DB lock."""
from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import delete, func, select

from config import settings
from database import async_session_factory, crud, write_transaction
from database.models import SignalHistory, SignalLease, User, utcnow


async def reserve_signal(tg_id: int) -> tuple[User, bool, str | None]:
    async with async_session_factory() as session:
        await crud.get_or_create_user(session, tg_id)
        await session.commit()
        async with write_transaction(session):
            user = await session.scalar(select(User).where(User.tg_id == tg_id).execution_options(populate_existing=True))
            vip = settings.is_admin(tg_id) or bool(user.has_access)
            if vip:
                return user, True, None
            await session.execute(delete(SignalLease).where(SignalLease.expires_at <= utcnow()))
            used = await session.scalar(select(func.count()).select_from(SignalHistory).where(SignalHistory.tg_id == tg_id))
            pending = await session.scalar(select(func.count()).select_from(SignalLease).where(SignalLease.tg_id == tg_id))
            if used + pending >= 3:
                raise HTTPException(403, "FREE_LIMIT_EXCEEDED")
            key = uuid4().hex
            session.add(SignalLease(key=key, tg_id=tg_id, expires_at=utcnow() + timedelta(seconds=60)))
            return user, False, key


async def release_signal(key: str | None) -> None:
    if key is None:
        return
    async with async_session_factory() as session:
        async with write_transaction(session):
            await session.execute(delete(SignalLease).where(SignalLease.key == key))


async def commit_signal(*, tg_id: int, lease: str | None, pair: str, direction: str,
                        accuracy: int, duration: str) -> int:
    async with async_session_factory() as session:
        async with write_transaction(session):
            if lease:
                reservation = await session.get(SignalLease, lease)
                if reservation is None or reservation.expires_at.replace(tzinfo=utcnow().tzinfo) <= utcnow():
                    raise HTTPException(503, "SIGNAL_REQUEST_EXPIRED: Please retry")
                await session.delete(reservation)
            await crud.save_signal(session, tg_id=tg_id, pair=pair, direction=direction,
                                   accuracy=accuracy, duration=duration, commit=False)
            await crud.register_activity(session, tg_id, commit=False)
            await crud.award_signal_points(session, tg_id, commit=False)
            used = await session.scalar(select(func.count()).select_from(SignalHistory).where(SignalHistory.tg_id == tg_id))
            return max(0, 3 - used)
