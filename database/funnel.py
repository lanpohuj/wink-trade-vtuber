"""Transactional partner receipts: ownership, exact cents, deduplication and outbox."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import write_transaction
from database.models import (
    EVENT_DEPOSIT, EVENT_REGISTRATION, NotificationOutbox, PartnerEvent, User, utcnow,
)


def amount_cents(value) -> int | None:
    try:
        number = Decimal(str(value))
        if not number.is_finite() or not 0 < number <= Decimal("1000000000"):
            return None
        cents = number * 100
        return int(cents) if cents == cents.to_integral_value() else None
    except (InvalidOperation, TypeError, ValueError):
        return None


@dataclass
class Receipt:
    status: str
    user: User | None = None
    duplicate: bool = False


async def enqueue(session: AsyncSession, user: User, kind: str) -> None:
    key = f"{kind}:{user.tg_id}"
    if await session.get(NotificationOutbox, key) is None:
        session.add(NotificationOutbox(key=key, tg_id=user.tg_id, kind=kind))


async def recompute_access(session: AsyncSession, user: User, *, was_registered: bool) -> None:
    was_access = bool(user.has_access)
    # Manual grants are deliberate exceptions and are not revoked by a later receipt.
    user.has_access = was_access or settings.is_admin(user.tg_id) or (
        user.is_registered and Decimal(str(user.deposit_amount)) >= Decimal(str(settings.MIN_DEPOSIT))
    )
    if user.has_access and not was_access:
        await enqueue(session, user, "access")
    elif user.is_registered and not was_registered and not user.has_access:
        await enqueue(session, user, "registration")


async def _apply_locked(session: AsyncSession, event: PartnerEvent) -> User | None:
    user = await session.scalar(select(User).where(User.tg_id == event.tg_id))
    if user is None:
        event.status = "waiting_user" if event.tg_id else "missing_attribution"
        return None
    if event.trader_id:
        owner = await session.scalar(select(User).where(
            User.trader_id == event.trader_id, User.tg_id != user.tg_id,
        ))
        if owner is not None or (user.trader_id and user.trader_id != event.trader_id):
            event.status = "identity_conflict"
            return user
    was_registered = bool(user.is_registered)
    if event.event_type == EVENT_REGISTRATION or event.trader_id:
        user.is_registered = True
        user.registered_at = user.registered_at or utcnow()
        if event.trader_id:
            user.trader_id = event.trader_id
    if event.event_type == EVENT_DEPOSIT:
        old_cents = int((Decimal(str(user.deposit_amount or 0)) * 100).to_integral_value())
        user.deposit_amount = (old_cents + event.amount_cents) / 100
    await recompute_access(session, user, was_registered=was_registered)
    event.status = "ok" if event.event_type == EVENT_REGISTRATION or user.has_access else (
        "below_min_deposit" if user.is_registered else "awaiting_registration"
    )
    return user


async def apply_partner_event(
    session: AsyncSession, *, key: str, event_type: str, tg_id: int | None,
    trader_id: str | None, cents: int, raw_data: dict,
) -> Receipt:
    from database import crud

    async with write_transaction(session):
        old = await session.get(PartnerEvent, key)
        if old is not None:
            if (tg_id and old.tg_id and tg_id != old.tg_id) or (
                trader_id and old.trader_id and trader_id != old.trader_id
            ) or old.amount_cents != cents:
                return Receipt("identity_conflict")
            user = await session.scalar(select(User).where(User.tg_id == old.tg_id)) if old.tg_id else None
            return Receipt("duplicate_ignored", user, True)
        # Respect successful receipts made before the transactional ledger existed.
        legacy = await crud.find_processed_postback(session, key)
        if legacy is not None:
            return Receipt("duplicate_ignored", duplicate=True)
        if tg_id is None and trader_id:
            # A trader already attributed by an authenticated partner receipt is safe.
            owner = await crud.get_user_by_trader_id(session, trader_id)
            if owner is not None and owner.is_registered:
                tg_id = owner.tg_id
        event = PartnerEvent(
            key=key, event_type=event_type, tg_id=tg_id, trader_id=trader_id,
            amount_cents=cents, status="pending",
        )
        session.add(event)
        user = await _apply_locked(session, event)
        await crud.log_postback(
            session, event_type, trader_id=trader_id, sub_id=str(tg_id) if tg_id else None,
            amount=cents / 100, status=event.status, dedup_key=key, raw_data=raw_data, commit=False,
        )
        return Receipt(event.status, user)


async def reconcile_waiting_events(session: AsyncSession, user: User) -> None:
    """A genuine attributed receipt may precede /start; never claim unattributed IDs."""
    async with write_transaction(session):
        await session.refresh(user)
        events = (await session.scalars(select(PartnerEvent).where(
            PartnerEvent.tg_id == user.tg_id, PartnerEvent.status == "waiting_user",
        ).order_by(PartnerEvent.created_at, PartnerEvent.key))).all()
        for event in events:
            await _apply_locked(session, event)
