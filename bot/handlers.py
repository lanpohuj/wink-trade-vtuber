"""Хэндлеры Telegram-бота Wink Trade: воронка, проверка статуса, админ-команды."""

from __future__ import annotations

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import BaseFilter, Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from bot.keyboards import (
    CHECK_STATUS_CALLBACK,
    LANG_EN_CALLBACK,
    LANG_RU_CALLBACK,
    TEASER_STOP_CALLBACK,
    access_keyboard,
    deposit_keyboard,
    language_keyboard,
    main_menu_keyboard,
    support_keyboard,
)
from bot.locales import get_text
from config import settings
from database import async_session_factory
from database import crud
from database.models import User

router = Router(name="wink-funnel")


class IsAdmin(BaseFilter):
    """Пропускает сообщения только от админов из ADMIN_TG_IDS (.env)."""

    async def __call__(self, message: Message) -> bool:
        return message.from_user is not None and settings.is_admin(message.from_user.id)


def _funnel_state(user: User) -> str:
    """Этап воронки: ``'access'`` | ``'deposit'`` | ``'unregistered'``.

    Ручная выдача доступа (/grant) сильнее статуса регистрации, поэтому
    проверяется первой.
    """
    if user.has_access or user.deposit_amount > 0:
        return "access"
    if user.is_registered:
        return "deposit"
    return "unregistered"


async def _edit_message(callback: CallbackQuery, text: str, keyboard: InlineKeyboardMarkup) -> None:
    """Редактирует сообщение с кнопками.

    «message is not modified» возникает при повторном нажатии кнопки в том же
    состоянии — это не ошибка, Telegram отвечает 400 на идентичное редактирование.
    """
    try:
        await callback.message.edit_text(text, reply_markup=keyboard)
    except TelegramBadRequest as exc:
        if "message is not modified" not in exc.message:
            raise


async def _get_user(tg_id: int, username: str | None, source: str | None = None) -> User:
    """Возвращает пользователя из БД, создавая его при первом контакте."""
    async with async_session_factory() as session:
        return await crud.get_or_create_user(session, tg_id, username, source)


_STEP_BY_STATE = {"unregistered": 1, "deposit": 2, "access": 3}
_STEP_NAME_KEYS = {1: "step_registration", 2: "step_deposit", 3: "step_access"}


def _progress_line(lang: str, state: str) -> str:
    """Строка прогресса воронки: «◼️◼️◻️ Шаг 2 из 3 — Депозит»."""
    step = _STEP_BY_STATE[state]
    bar = "◼️" * step + "◻️" * (3 - step)
    return get_text(lang, "progress_line", step=step, name=get_text(lang, _STEP_NAME_KEYS[step]), bar=bar)


async def _counters_line(lang: str) -> str:
    """Соцдоказательство из БД: «сегодня N» (всегда) + «всего M» (от порога)."""
    async with async_session_factory() as session:
        today = await crud.get_today_signal_users(session)
        total = await crud.get_total_users(session)
    parts = []
    if today > 0:
        parts.append(get_text(lang, "counter_today", n=today))
    if total >= settings.TOTAL_COUNTER_THRESHOLD:
        parts.append(get_text(lang, "counter_total", n=total))
    return "\n".join(parts)


def _normalize_source(raw: str | None) -> str | None:
    """Метка источника из deep-link payload: /start live -> 'live'."""
    if not raw:
        return None
    value = raw.strip().lower()
    return value if value.isalnum() and len(value) <= 16 else None


async def _admin_lang(message: Message) -> str:
    """Язык администратора — для локализации ответов админ-команд."""
    if message.from_user is None:
        return settings.DEFAULT_LANG
    user = await _get_user(message.from_user.id, message.from_user.username)
    return user.lang


# =========================================================================
# Воронка
# =========================================================================


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    """Первый вход — выбор языка; повторный — меню текущего этапа воронки."""
    if message.from_user is None:
        return
    source = _normalize_source(command.args)
    async with async_session_factory() as session:
        existing = await crud.get_user(session, message.from_user.id)
        user = await crud.get_or_create_user(
            session, message.from_user.id, message.from_user.username, source
        )
    if existing is None:
        await message.answer(
            get_text(settings.DEFAULT_LANG, "choose_language"),
            reply_markup=language_keyboard(),
        )
        return

    state = _funnel_state(user)
    progress = _progress_line(user.lang, state)
    if state == "access":
        await message.answer(
            get_text(user.lang, "status_access_granted") + "\n\n" + progress,
            reply_markup=access_keyboard(user.lang),
        )
    elif state == "deposit":
        await message.answer(
            get_text(user.lang, "status_registered_no_deposit", trader_id=user.trader_id or "—")
            + "\n\n"
            + progress,
            reply_markup=deposit_keyboard(user.lang),
        )
    else:
        counters = await _counters_line(user.lang)
        text = get_text(user.lang, "welcome") + "\n\n" + progress
        if counters:
            text += "\n" + counters
        await message.answer(text, reply_markup=main_menu_keyboard(user.tg_id, user.lang))


@router.callback_query(F.data.in_({LANG_RU_CALLBACK, LANG_EN_CALLBACK}))
async def choose_language(callback: CallbackQuery) -> None:
    """Сохраняет выбранный язык и показывает приветствие с главным меню."""
    lang = "ru" if callback.data == LANG_RU_CALLBACK else "en"
    async with async_session_factory() as session:
        user = await crud.set_language(session, callback.from_user.id, lang)
    if user is None:
        user = await _get_user(callback.from_user.id, callback.from_user.username)
    counters = await _counters_line(lang)
    text = get_text(lang, "welcome") + "\n\n" + _progress_line(lang, "unregistered")
    if counters:
        text += "\n" + counters
    await _edit_message(callback, text, main_menu_keyboard(user.tg_id, lang))
    await callback.answer()


@router.callback_query(F.data == CHECK_STATUS_CALLBACK)
async def check_status(callback: CallbackQuery) -> None:
    """Проверка регистрации/депозита — три состояния воронки (SPEC, раздел 4)."""
    user = await _get_user(callback.from_user.id, callback.from_user.username)
    state = _funnel_state(user)
    progress = _progress_line(user.lang, state)
    if state == "access":
        text = get_text(user.lang, "status_access_granted") + "\n\n" + progress
        keyboard = access_keyboard(user.lang)
    elif state == "deposit":
        text = (
            get_text(user.lang, "status_registered_no_deposit", trader_id=user.trader_id or "—")
            + "\n\n"
            + progress
        )
        keyboard = deposit_keyboard(user.lang)
    else:
        text = get_text(user.lang, "status_not_registered") + "\n\n" + progress
        keyboard = main_menu_keyboard(user.tg_id, user.lang)
    await _edit_message(callback, text, keyboard)
    await callback.answer()


@router.message(Command("faq"))
async def cmd_faq(message: Message) -> None:
    """FAQ на языке пользователя."""
    if message.from_user is None:
        return
    user = await _get_user(message.from_user.id, message.from_user.username)
    await message.answer(get_text(user.lang, "faq"), reply_markup=support_keyboard(user.lang))


@router.callback_query(F.data == TEASER_STOP_CALLBACK)
async def teaser_stop(callback: CallbackQuery) -> None:
    """Отписка от ежедневного тизера — навсегда."""
    user = await _get_user(callback.from_user.id, callback.from_user.username)
    async with async_session_factory() as session:
        await crud.pause_pushes(session, user.tg_id)
    try:
        # Тизер мог прийти давно — редактирование старого сообщения может не пройти
        await _edit_message(callback, get_text(user.lang, "teaser_off"), InlineKeyboardMarkup(inline_keyboard=[]))
    except TelegramBadRequest:
        pass
    await callback.answer()


# =========================================================================
# Админ-команды (только для ADMIN_TG_IDS)
# =========================================================================


@router.message(IsAdmin(), Command("grant"))
async def cmd_grant(message: Message, command: CommandObject) -> None:
    """/grant <tg_id> — принудительно открыть доступ к сигналам."""
    lang = await _admin_lang(message)
    args = (command.args or "").strip()
    if not args:
        await message.answer(get_text(lang, "grant_usage"))
        return
    if not args.isdigit():
        await message.answer(get_text(lang, "grant_invalid", tg_id=args))
        return
    target_tg_id = int(args)
    async with async_session_factory() as session:
        target = await crud.grant_access(session, target_tg_id)
    if target is None:
        await message.answer(get_text(lang, "grant_not_found", tg_id=target_tg_id))
    else:
        await message.answer(get_text(lang, "grant_success", tg_id=target_tg_id))


@router.message(IsAdmin(), Command("setqueue"))
async def cmd_setqueue(message: Message, command: CommandObject) -> None:
    """/setqueue BUY,BUY,SELL,BUY — очередь сигналов для стрима."""
    lang = await _admin_lang(message)
    args = (command.args or "").strip()
    if not args:
        await message.answer(get_text(lang, "setqueue_usage"))
        return
    directions = [part for part in args.replace(" ", "").split(",") if part]
    async with async_session_factory() as session:
        try:
            queue = await crud.set_admin_signal_queue(session, message.from_user.id, directions)
        except ValueError as exc:
            await message.answer(get_text(lang, "setqueue_invalid", error=str(exc)))
            return
    await message.answer(
        get_text(
            lang,
            "setqueue_success",
            queue=" → ".join(row.direction for row in queue),
            count=len(queue),
        )
    )


@router.message(IsAdmin(), Command("award"))
async def cmd_award(message: Message, command: CommandObject) -> None:
    """/award <tg_id> <баллы> — бонусные баллы недельного турнира (награды топам)."""
    lang = await _admin_lang(message)
    args = (command.args or "").split()
    if len(args) != 2 or not args[0].isdigit() or not args[1].lstrip("-").isdigit():
        await message.answer(get_text(lang, "award_usage"))
        return
    target_tg_id, points = int(args[0]), int(args[1])
    if points == 0 or abs(points) > 1000:
        await message.answer(get_text(lang, "award_invalid"))
        return
    async with async_session_factory() as session:
        target = await crud.award_bonus_points(session, target_tg_id, points)
    if target is None:
        await message.answer(get_text(lang, "award_not_found", tg_id=target_tg_id))
    else:
        await message.answer(get_text(lang, "award_success", points=points, tg_id=target_tg_id))


@router.message(IsAdmin(), Command("stats"))
async def cmd_stats(message: Message) -> None:
    """/stats — статистика бота."""
    lang = await _admin_lang(message)
    async with async_session_factory() as session:
        stats = await crud.get_stats(session)
    await message.answer(get_text(lang, "stats", **stats))
