"""Хэндлеры Telegram-бота Wink Trade: воронка Winky, проверка статуса, админ-команды."""

from __future__ import annotations

import asyncio
import logging
import random
import re

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import BaseFilter, Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, FSInputFile, InlineKeyboardMarkup, Message

from api.signals import OTC_PAIRS, otc_signal
from bot.keyboards import (
    CHECK_STATUS_CALLBACK,
    ENTER_ID_CALLBACK,
    LANG_EN_CALLBACK,
    LANG_RU_CALLBACK,
    TEASER_STOP_CALLBACK,
    TODAY_STATS_CALLBACK,
    TRY_DEMO_SIGNAL_CALLBACK,
    access_keyboard,
    admin_grant_keyboard,
    deposit_keyboard,
    language_keyboard,
    main_menu_keyboard,
    support_keyboard,
)
from bot.locales import get_text
from bot.voice_greeter import ensure_welcome_voice
from config import settings
from database import async_session_factory
from database import crud
from database.models import User

logger = logging.getLogger(__name__)

router = Router(name="wink-funnel")


class IsAdmin(BaseFilter):
    """Пропускает сообщения только от админов из ADMIN_TG_IDS (.env)."""

    async def __call__(self, message: Message) -> bool:
        return message.from_user is not None and settings.is_admin(message.from_user.id)


def _funnel_state(user: User) -> str:
    """Этап воронки: ``'access'`` | ``'deposit'`` | ``'unregistered'``."""
    if user.has_access or user.deposit_amount > 0:
        return "access"
    if user.is_registered:
        return "deposit"
    return "unregistered"


async def _edit_message(callback: CallbackQuery, text: str, keyboard: InlineKeyboardMarkup) -> None:
    """Редактирует сообщение с кнопками в HTML-разметке."""
    try:
        await callback.message.edit_text(text, reply_markup=keyboard, parse_mode="HTML")
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
    """Строка прогресса воронки: «◼️◼️◻️ Шаг 2 из 3 — Пополнение и Бонус»."""
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


async def _delayed_demo_followup(bot: Bot, tg_id: int, lang: str, delay: int = 65) -> None:
    """Автоматический дожим через 65 секунд после выдачи пробного демо-сигнала."""
    await asyncio.sleep(delay)
    try:
        await bot.send_message(
            tg_id,
            get_text(lang, "demo_followup"),
            reply_markup=deposit_keyboard(tg_id, lang),
            parse_mode="HTML",
        )
    except Exception as exc:
        logger.debug("Не удалось отправить демо-дожим пользователю %s: %s", tg_id, exc)


# =========================================================================
# Воронка Winky
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
            parse_mode="HTML",
        )
        return

    state = _funnel_state(user)
    progress = _progress_line(user.lang, state)
    if state == "access":
        await message.answer(
            get_text(user.lang, "status_access_granted") + "\n\n" + progress,
            reply_markup=access_keyboard(user.lang),
            parse_mode="HTML",
        )
    elif state == "deposit":
        await message.answer(
            get_text(user.lang, "status_registered_no_deposit", trader_id=user.trader_id or "—")
            + "\n\n"
            + progress,
            reply_markup=deposit_keyboard(user.tg_id, user.lang),
            parse_mode="HTML",
        )
    else:
        counters = await _counters_line(user.lang)
        text = get_text(user.lang, "welcome") + "\n\n" + progress
        if counters:
            text += "\n" + counters
        await message.answer(
            text,
            reply_markup=main_menu_keyboard(user.tg_id, user.lang),
            parse_mode="HTML",
        )


@router.callback_query(F.data.in_({LANG_RU_CALLBACK, LANG_EN_CALLBACK}))
async def choose_language(callback: CallbackQuery) -> None:
    """Сохраняет выбранный язык, отправляет голосовое от Winky и открывает Шаг 1."""
    lang = "ru" if callback.data == LANG_RU_CALLBACK else "en"
    async with async_session_factory() as session:
        user = await crud.set_language(session, callback.from_user.id, lang)
    if user is None:
        user = await _get_user(callback.from_user.id, callback.from_user.username)

    # 1. Отправляем голосовое приветствие от Winky при наличии файла в кэше
    voice_file = await ensure_welcome_voice(lang)
    if voice_file and callback.message and callback.bot:
        try:
            await callback.bot.send_voice(
                chat_id=callback.from_user.id,
                voice=FSInputFile(str(voice_file)),
                caption="🎙 Winky:" if lang == "ru" else "🎙 Winky Voice:",
            )
        except Exception as exc:
            logger.debug("Не удалось отправить голосовое приветствие: %s", exc)

    # 2. Текстовое меню Шага 1
    counters = await _counters_line(lang)
    text = get_text(lang, "welcome") + "\n\n" + _progress_line(lang, "unregistered")
    if counters:
        text += "\n" + counters

    await _edit_message(callback, text, main_menu_keyboard(user.tg_id, lang))
    await callback.answer()


@router.callback_query(F.data == CHECK_STATUS_CALLBACK)
async def check_status(callback: CallbackQuery) -> None:
    """Проверка регистрации/депозита — три состояния воронки."""
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
        keyboard = deposit_keyboard(user.tg_id, user.lang)
    else:
        text = get_text(user.lang, "status_not_registered") + "\n\n" + progress
        keyboard = main_menu_keyboard(user.tg_id, user.lang)
    await _edit_message(callback, text, keyboard)
    await callback.answer()


@router.callback_query(F.data == ENTER_ID_CALLBACK)
async def enter_id_prompt(callback: CallbackQuery) -> None:
    """Инструкция, где взять Trader ID в Pocket Option."""
    user = await _get_user(callback.from_user.id, callback.from_user.username)
    await callback.message.answer(get_text(user.lang, "enter_id_prompt"), parse_mode="HTML")
    await callback.answer()


@router.message(F.text.regexp(r"^\s*(?:(?:id|№|#)[:\s#-]*|[#№]\s*)?(\d{6,12})\s*$", flags=re.I))
async def handle_manual_trader_id(message: Message) -> None:
    """Обработка ручного ввода Trader ID (цифрами от 6 до 12 знаков)."""
    if message.from_user is None or not message.text:
        return

    match = re.search(r"(\d{6,12})", message.text)
    if not match:
        return
    trader_id = match.group(1)

    async with async_session_factory() as session:
        user, has_postback, had_deposit = await crud.bind_manual_trader_id(
            session, message.from_user.id, trader_id
        )

    if had_deposit:
        progress = _progress_line(user.lang, "access")
        text = (
            get_text(user.lang, "id_bound_success", trader_id=trader_id)
            + "\n\n"
            + get_text(user.lang, "status_access_granted")
            + "\n\n"
            + progress
        )
        keyboard = access_keyboard(user.lang)
    else:
        progress = _progress_line(user.lang, "deposit")
        text = (
            get_text(user.lang, "id_bound_success", trader_id=trader_id)
            + "\n\n"
            + get_text(user.lang, "status_registered_no_deposit", trader_id=trader_id)
            + "\n\n"
            + progress
        )
        keyboard = deposit_keyboard(user.tg_id, user.lang)

    await message.answer(text, reply_markup=keyboard, parse_mode="HTML")

    # Тихое уведомление админам, если постбэк от партнёрки ещё не пришёл
    if not had_deposit and message.bot:
        for admin_id in settings.admin_tg_ids:
            try:
                await message.bot.send_message(
                    admin_id,
                    f"🔔 <b>Лид #{user.tg_id}</b> (@{user.username or '—'}) привязал ID <code>{trader_id}</code> вручную!\n"
                    f"Постбэк в БД: {'✅ найден' if has_postback else '⏳ в пути'}",
                    reply_markup=admin_grant_keyboard(user.tg_id),
                    parse_mode="HTML",
                )
            except Exception:
                pass


@router.callback_query(F.data.startswith("admin_grant_"))
async def admin_grant_callback(callback: CallbackQuery) -> None:
    """Мгновенное открытие доступа по инлайн-кнопке из админ-пуша."""
    if not settings.is_admin(callback.from_user.id):
        await callback.answer("❌ Только для администраторов", show_alert=True)
        return

    raw_id = callback.data.split("_")[-1]
    if not raw_id.isdigit():
        return
    target_tg_id = int(raw_id)

    async with async_session_factory() as session:
        target_user = await crud.grant_access(session, target_tg_id)

    if target_user and callback.bot:
        try:
            await callback.message.edit_text(
                f"✅ <b>VIP-доступ открыт</b> для пользователя <code>{target_tg_id}</code> "
                f"администратором @{callback.from_user.username}!",
                parse_mode="HTML",
            )
            await callback.bot.send_message(
                target_tg_id,
                get_text(target_user.lang, "status_access_granted"),
                reply_markup=access_keyboard(target_user.lang),
                parse_mode="HTML",
            )
        except Exception:
            pass
    await callback.answer("✅ Доступ открыт!")


@router.callback_query(F.data == TRY_DEMO_SIGNAL_CALLBACK)
async def on_try_demo_signal(callback: CallbackQuery) -> None:
    """Выдача бесплатного пробного демо-сигнала на 1 минуту с дожимом через 65 сек."""
    user = await _get_user(callback.from_user.id, callback.from_user.username)
    async with async_session_factory() as session:
        available = await crud.mark_demo_used(session, user.tg_id)

    if not available:
        await callback.message.answer(
            get_text(user.lang, "demo_already_used"),
            reply_markup=deposit_keyboard(user.tg_id, user.lang),
            parse_mode="HTML",
        )
        await callback.answer()
        return

    pair = random.choice(OTC_PAIRS)
    direction, accuracy = otc_signal(pair)
    if user.lang == "ru":
        dir_text = "⬆️ ВВЕРХ (CALL)" if direction == "BUY" else "⬇️ ВНИЗ (PUT)"
    else:
        dir_text = "⬆️ UP (CALL)" if direction == "BUY" else "⬇️ DOWN (PUT)"

    card_text = get_text(
        user.lang,
        "demo_signal_card",
        pair=pair,
        dir_text=dir_text,
        accuracy=accuracy,
    )
    await callback.message.answer(card_text, parse_mode="HTML")
    await callback.answer()

    # Запускаем авто-дожим через 65 секунд
    if callback.bot:
        asyncio.create_task(_delayed_demo_followup(callback.bot, user.tg_id, user.lang, delay=65))


@router.callback_query(F.data == TODAY_STATS_CALLBACK)
async def on_today_stats(callback: CallbackQuery) -> None:
    """Статистика торговых сигналов за сегодня (Social Proof)."""
    user = await _get_user(callback.from_user.id, callback.from_user.username)
    async with async_session_factory() as session:
        today = await crud.get_today_signal_users(session)
    display_count = max(today, 128)
    text = get_text(user.lang, "today_stats", today_traders=display_count)
    keyboard = (
        deposit_keyboard(user.tg_id, user.lang)
        if user.is_registered
        else main_menu_keyboard(user.tg_id, user.lang)
    )
    await callback.message.answer(text, reply_markup=keyboard, parse_mode="HTML")
    await callback.answer()


@router.message(Command("faq"))
async def cmd_faq(message: Message) -> None:
    """FAQ на языке пользователя."""
    if message.from_user is None:
        return
    user = await _get_user(message.from_user.id, message.from_user.username)
    await message.answer(
        get_text(user.lang, "faq"),
        reply_markup=support_keyboard(user.lang),
        parse_mode="HTML",
    )


@router.callback_query(F.data == TEASER_STOP_CALLBACK)
async def teaser_stop(callback: CallbackQuery) -> None:
    """Отписка от ежедневного тизера — навсегда."""
    user = await _get_user(callback.from_user.id, callback.from_user.username)
    async with async_session_factory() as session:
        await crud.pause_pushes(session, user.tg_id)
    try:
        await _edit_message(
            callback,
            get_text(user.lang, "teaser_off"),
            InlineKeyboardMarkup(inline_keyboard=[]),
        )
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
        # Оповещаем пользователя
        try:
            await message.bot.send_message(
                target_tg_id,
                get_text(target.lang, "status_access_granted"),
                reply_markup=access_keyboard(target.lang),
                parse_mode="HTML",
            )
        except Exception:
            pass


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
