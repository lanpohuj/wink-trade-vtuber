"""ORM-модели SQLAlchemy 2.0: пользователи, очередь сигналов админа, журнал Postback.

Схема соответствует SPEC, раздел 3.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Направления торгового сигнала
DIRECTION_BUY = "BUY"
DIRECTION_SELL = "SELL"
VALID_DIRECTIONS = frozenset({DIRECTION_BUY, DIRECTION_SELL})

# Языки интерфейса
LANG_RU = "ru"
LANG_EN = "en"
VALID_LANGS = frozenset({LANG_RU, LANG_EN})

# Типы событий Postback от Pocket Partners
EVENT_REGISTRATION = "registration"
EVENT_DEPOSIT = "deposit"

# Статусы обработки Postback
STATUS_OK = "ok"
STATUS_USER_NOT_FOUND = "user_not_found"
STATUS_ERROR = "error"

# Источник привлечения пользователя (метка из /start <payload>)
SOURCE_LIVE = "live"


def utcnow() -> datetime:
    """Текущее время UTC (aware) — значение по умолчанию для created_at."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Базовый класс всех моделей проекта."""


class User(Base):
    """Пользователь бота.

    ``tg_id`` используется как ``sub_id`` в персональной реферальной ссылке
    (``utm_source``), поэтому в Postback пользователь ищется именно по нему.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lang: Mapped[str] = mapped_column(
        String(8), nullable=False, default=LANG_RU, server_default=LANG_RU
    )
    trader_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    is_registered: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    deposit_amount: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0, server_default="0.0"
    )
    has_access: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    source: Mapped[str | None] = mapped_column(String(16), nullable=True)
    push_paused: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    teaser_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_teaser_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Воронка и дожим (15м / 45м / демо) ---
    demo_used: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    registered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    followup_15m_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    followup_45m_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )

    # --- Геймификация (баллы за активность, недельный рейтинг) ---
    points_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    points_week: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    points_week_key: Mapped[str | None] = mapped_column(String(10), nullable=True)
    points_daily_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    points_daily_earned: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_active_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now()
    )

    def __repr__(self) -> str:
        return (
            f"User(id={self.id}, tg_id={self.tg_id}, lang={self.lang!r}, "
            f"trader_id={self.trader_id!r}, is_registered={self.is_registered}, "
            f"deposit_amount={self.deposit_amount}, has_access={self.has_access})"
        )


class AdminSignalQueue(Base):
    """Заранее заданный сигнал для режима демонстрации (стрима).

    Заполняется командой ``/setqueue BUY,BUY,SELL,BUY`` от лица админа;
    API сигналов отдаёт записи по порядку и помечает их использованными.
    """

    __tablename__ = "admin_signal_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_tg_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(4), nullable=False)
    accuracy: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    is_used: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now()
    )

    def __repr__(self) -> str:
        return (
            f"AdminSignalQueue(id={self.id}, admin_tg_id={self.admin_tg_id}, "
            f"direction={self.direction!r}, accuracy={self.accuracy}, is_used={self.is_used})"
        )


class SignalHistory(Base):
    """Журнал выданных сигналов — общая «живая» лента платформы в Mini App."""

    __tablename__ = "signal_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    pair: Mapped[str] = mapped_column(String(16), nullable=False)
    direction: Mapped[str] = mapped_column(String(4), nullable=False)
    accuracy: Mapped[int] = mapped_column(Integer, nullable=False)
    duration: Mapped[str] = mapped_column(String(4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now(), index=True
    )

    def __repr__(self) -> str:
        return (
            f"SignalHistory(id={self.id}, tg_id={self.tg_id}, pair={self.pair!r}, "
            f"direction={self.direction!r}, accuracy={self.accuracy}, duration={self.duration!r})"
        )


class PostbackLog(Base):
    """Журнал всех входящих Postback-запросов от партнёрской сети.

    Пишется до применения бизнес-логики, чтобы события не терялись
    даже если пользователь по ``sub_id`` не найден.
    """

    __tablename__ = "postback_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    trader_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    sub_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=STATUS_OK)
    raw_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now()
    )

    def __repr__(self) -> str:
        return (
            f"PostbackLog(id={self.id}, event_type={self.event_type!r}, "
            f"trader_id={self.trader_id!r}, sub_id={self.sub_id!r}, "
            f"amount={self.amount}, status={self.status!r})"
        )
