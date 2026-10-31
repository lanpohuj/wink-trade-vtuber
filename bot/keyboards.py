"""Инлайн-клавиатуры бота Wink Trade (воронка Winky со стрима)."""

from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from bot.locales import get_buttons, get_text
from config import settings

# Callback-данные кнопок
LANG_RU_CALLBACK = "lang_ru"
LANG_EN_CALLBACK = "lang_en"
CHECK_STATUS_CALLBACK = "check_status"
TEASER_STOP_CALLBACK = "teaser_stop"
ENTER_ID_CALLBACK = "enter_id_prompt"
TODAY_STATS_CALLBACK = "today_stats"
TRY_DEMO_SIGNAL_CALLBACK = "try_demo_signal"


def language_keyboard() -> InlineKeyboardMarkup:
    """Выбор языка при первом входе (/start)."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🇷🇺 Русский", callback_data=LANG_RU_CALLBACK)],
            [InlineKeyboardButton(text="🇬🇧 English", callback_data=LANG_EN_CALLBACK)],
        ]
    )


def main_menu_keyboard(tg_id: int, lang: str) -> InlineKeyboardMarkup:
    """Главное меню (Шаг 1): запуск демо, регистрация, проверка, ручной ввод ID, статистика, поддержка."""
    labels = get_buttons(lang)
    demo_text = "📱 Открыть WINKY AI (Демо 3 сигнала)" if lang == "ru" else "📱 Open WINKY AI (3 Free Signals)"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=demo_text, web_app=WebAppInfo(url=settings.webapp_url_for(tg_id, lang)))],
            [InlineKeyboardButton(text=labels["register"], url=settings.partner_url(tg_id, lang))],
            [InlineKeyboardButton(text=labels["check_registration"], callback_data=CHECK_STATUS_CALLBACK)],
            [InlineKeyboardButton(text=labels["enter_id"], callback_data=ENTER_ID_CALLBACK)],
            [InlineKeyboardButton(text=labels["today_stats"], callback_data=TODAY_STATS_CALLBACK)],
            [InlineKeyboardButton(text=labels["support"], url=settings.support_url)],
        ]
    )


def deposit_keyboard(tg_id: int, lang: str) -> InlineKeyboardMarkup:
    """Этап депозита (Шаг 2): пополнение (+50% промокод), запуск терминала, пробный сигнал, проверка, помощь."""
    labels = get_buttons(lang)
    app_text = "📱 Открыть терминал WINKY AI" if lang == "ru" else "📱 Open WINKY AI Terminal"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=labels["top_up"], url=settings.deposit_url(tg_id, lang))],
            [InlineKeyboardButton(text=app_text, web_app=WebAppInfo(url=settings.webapp_url_for(tg_id, lang)))],
            [InlineKeyboardButton(text=labels["try_demo_signal"], callback_data=TRY_DEMO_SIGNAL_CALLBACK)],
            [InlineKeyboardButton(text=labels["check_deposit"], callback_data=CHECK_STATUS_CALLBACK)],
            [InlineKeyboardButton(text=labels.get("deposit_help", labels["support"]), url=settings.support_url)],
        ]
    )


def access_keyboard(lang: str, tg_id: int = 0) -> InlineKeyboardMarkup:
    """Кнопка запуска VIP-терминала WINKY AI (WebAppInfo)."""
    labels = get_buttons(lang)
    vip_text = "⚡ Открыть VIP-терминал WINKY AI" if lang == "ru" else "⚡ Open VIP Terminal WINKY AI"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=labels.get("open_app", vip_text), web_app=WebAppInfo(url=settings.webapp_url_for(tg_id, lang)))],
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


def admin_grant_keyboard(target_tg_id: int) -> InlineKeyboardMarkup:
    """Инлайн-кнопка для тихих админ-уведомлений при ручной привязке ID."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"💎 Открыть VIP доступ {target_tg_id}", callback_data=f"admin_grant_{target_tg_id}")],
        ]
    )
