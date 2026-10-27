"""Инлайн-клавиатуры бота Wink Trade (SPEC, раздел 4)."""

from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from bot.locales import get_buttons, get_text
from config import settings

# Callback-данные кнопок
LANG_RU_CALLBACK = "lang_ru"
LANG_EN_CALLBACK = "lang_en"
CHECK_STATUS_CALLBACK = "check_status"
TEASER_STOP_CALLBACK = "teaser_stop"


def language_keyboard() -> InlineKeyboardMarkup:
    """Выбор языка при первом входе (/start)."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🇷🇺 Русский", callback_data=LANG_RU_CALLBACK)],
            [InlineKeyboardButton(text="🇬🇧 English", callback_data=LANG_EN_CALLBACK)],
        ]
    )


def main_menu_keyboard(tg_id: int, lang: str) -> InlineKeyboardMarkup:
    """Главное меню: проверка регистрации, персональная ссылка, поддержка."""
    labels = get_buttons(lang)
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=labels["check_registration"], callback_data=CHECK_STATUS_CALLBACK)],
            [InlineKeyboardButton(text=labels["register"], url=settings.partner_url(tg_id, lang))],
            [InlineKeyboardButton(text=labels["support"], url=settings.support_url)],
        ]
    )


def deposit_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Этап депозита: проверка депозита, пополнение счета, поддержка."""
    labels = get_buttons(lang)
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=labels["check_deposit"], callback_data=CHECK_STATUS_CALLBACK)],
            [InlineKeyboardButton(text=labels["top_up"], url=settings.PLATFORM_URL)],
            [InlineKeyboardButton(text=labels["support"], url=settings.support_url)],
        ]
    )


def access_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Кнопка запуска Mini App (WebAppInfo)."""
    labels = get_buttons(lang)
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=labels["open_app"], web_app=WebAppInfo(url=settings.WEBAPP_URL))],
        ]
    )


def support_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Кнопка поддержки (используется в /faq)."""
    labels = get_buttons(lang)
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=labels["support"], url=settings.support_url)]]
    )


def teaser_keyboard(tg_id: int, lang: str) -> InlineKeyboardMarkup:
    """Кнопки ежедневного тизера: открыть доступ и отключить рассылку."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=get_text(lang, "teaser_cta"), url=settings.partner_url(tg_id, lang))],
            [InlineKeyboardButton(text=get_text(lang, "teaser_stop"), callback_data=TEASER_STOP_CALLBACK)],
        ]
    )
