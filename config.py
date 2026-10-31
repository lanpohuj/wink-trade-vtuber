"""Конфигурация проекта Wink Trade.

Значения читаются из переменных окружения или файла ``.env``
(см. ``.env.example``) через ``pydantic-settings``.
"""

from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Все настройки приложения в одном месте."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Telegram ---
    BOT_TOKEN: str = Field(
        default="",
        description="Токен бота от @BotFather (на сервере обязателен для запуска бота)",
    )
    WEBAPP_URL: str = Field(
        default="https://example.com/",
        description="Публичный HTTPS-URL, по которому FastAPI раздаёт Mini App",
    )
    SUPPORT_USERNAME: str = Field(
        default="winktrade_support",
        description="Username службы поддержки без '@'",
    )

    # --- Партнёрская программа Pocket Partners ---
    PARTNER_BASE_URL: str = Field(
        default="",
        description="Базовая ссылка лендинга (fallback, если RU/EN не заданы)",
    )
    RU_PARTNER_BASE_URL: str = Field(
        default="",
        description="Партнёрская ссылка для русскоязычных пользователей",
    )
    EN_PARTNER_BASE_URL: str = Field(
        default="",
        description="Партнёрская ссылка для англоязычных пользователей",
    )
    CAMPAIGN_ID: str = Field(default="wink", description="ID кампании (utm_campaign)")
    ONELINK_URL: str = Field(
        default="https://poaffiliate.onelink.me/t5P7/5m3y6xfj",
        description="Прямая OneLink-ссылка на веб-регистрацию (без перехода в бота)",
    )
    RU_DEPOSIT_URL: str = Field(
        default="https://po-ru4.click/cabinet/deposit",
        description="Рабочее зеркало кассы Pocket Option для РФ/СНГ",
    )
    EN_DEPOSIT_URL: str = Field(
        default="https://pocketoption.com/cabinet/deposit",
        description="Ссылка на кассу Pocket Option для мира",
    )
    PLATFORM_URL: str = Field(
        default="https://pocketoption.com/",
        description="Ссылка на платформу/кассу Pocket Option для кнопки «Пополнить счет»",
    )

    # --- Промокод и бонусы ---
    PROMO_CODE: str = Field(
        default="50START",
        description="Промокод Pocket Partners (+50% к депозиту от $50)",
    )
    PROMO_BONUS_PERCENT: int = Field(
        default=50,
        description="Процент бонуса по промокоду",
    )
    PROMO_MIN_DEPOSIT_USD: int = Field(
        default=50,
        description="Минимальный депозит для активации бонуса +50% ($50)",
    )

    # --- Postback API ---
    POSTBACK_SECRET: str = Field(
        default="",
        description="Секрет постбека (параметр token или заголовок X-Postback-Token); "
        "пустое значение — постбеки не принимаются",
    )

    # --- Админы / стримеры ---
    ADMIN_TG_IDS: str = Field(
        default="",
        description="Telegram ID админов через запятую, например: 111111111,222222222",
    )

    # --- База данных ---
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./wink_trade.db",
        description="DSN базы данных; по умолчанию — локальный SQLite",
    )
    DATABASE_ECHO: bool = Field(default=False, description="Логировать SQL-запросы")

    # --- Бизнес-логика ---
    DEFAULT_LANG: str = Field(default="ru", description="Язык новых пользователей: ru | en")
    MIN_DEPOSIT_USD: float = Field(
        default=10.0,
        description="Сумма депозита, о которой сообщается пользователю (USD)",
    )
    SIGNAL_ACCURACY_MIN: int = Field(default=81, description="Минимальная точность сигнала, %")
    SIGNAL_ACCURACY_MAX: int = Field(default=93, description="Максимальная точность сигнала, %")
    TOTAL_COUNTER_THRESHOLD: int = Field(
        default=100,
        description="Показывать «всего N трейдеров» только начиная с этого числа",
    )

    # --- Ежедневный тизер ---
    TEASER_HOUR: int = Field(default=19, description="Час отправки тизера (локальное время)")
    TEASER_MAX_COUNT: int = Field(default=7, description="Максимум тизеров одному пользователю")

    # --- VTuber-агент Winky ---
    LUMEAN_API_KEY: str = Field(
        default="",
        description="API-ключ Lumean (X-API-KEY): качественная озвучка Fish Audio/ElevenLabs/Cartesia с оплатой в РФ",
    )
    # Русский голос (RU)
    LUMEAN_RU_SERVICE: str = Field(
        default="fishaudio",
        description="Сервис Lumean для русской озвучки: fishaudio | elevenlabs | lumvoice | cartesia",
    )
    LUMEAN_RU_VOICE_ID: str = Field(
        default="1db1618b6eaf4571ac7db70e20eb6727",
        description="ID голоса Lumean для русского языка: по умолчанию Марин китагава (Fish Audio)",
    )
    LUMEAN_RU_VOICE_NAME: str = Field(
        default="Марин китагава",
        description="Отображаемое имя русского голоса",
    )
    # Английский голос (EN)
    LUMEAN_EN_SERVICE: str = Field(
        default="fishaudio",
        description="Сервис Lumean для английской озвучки: fishaudio | elevenlabs | lumvoice | cartesia",
    )
    LUMEAN_EN_VOICE_ID: str = Field(
        default="e34c486929524d41b88646b4ac2f382f",
        description="ID голоса Lumean для английского языка: по умолчанию Venti (Fish Audio)",
    )
    LUMEAN_EN_VOICE_NAME: str = Field(
        default="Venti",
        description="Отображаемое имя английского голоса",
    )
    # Обратная совместимость для общего голоса
    LUMEAN_SERVICE: str = Field(
        default="fishaudio",
        description="Сервис Lumean для озвучки (fallback)",
    )
    LUMEAN_VOICE_ID: str = Field(
        default="1db1618b6eaf4571ac7db70e20eb6727",
        description="ID голоса в Lumean (fallback)",
    )
    LUMEAN_VOICE_NAME: str = Field(
        default="Марин китагава",
        description="Отображаемое имя голоса (fallback)",
    )
    LUMEAN_RU_TEMPLATE_ID: str = Field(
        default="",
        description="ID шаблона TTS в Lumean для русского слота",
    )
    LUMEAN_EN_TEMPLATE_ID: str = Field(
        default="",
        description="ID шаблона TTS в Lumean для английского слота",
    )
    LUMEAN_TEMPLATE_ID: str = Field(
        default="",
        description="ID шаблона TTS в Lumean (создаётся и обновляется автоматически)",
    )
    LUMEAN_BREATHING_PAUSES: bool = Field(
        default=True,
        description="Включить естественные дыхательные микро-паузы ({{pause=0.2}})",
    )
    LUMEAN_SPEED: float = Field(
        default=1.06,
        description="Скорость речи Winky по умолчанию",
    )
    ELEVENLABS_API_KEY: str = Field(
        default="",
        description="Ключ ElevenLabs: если задан (плюс голос) — Winky говорит одним multilingual-голосом",
    )
    ELEVENLABS_VOICE_ID: str = Field(default="", description="ID голоса ElevenLabs")
    WINKY_BANNED_TOPICS: str = Field(
        default="",
        description="Запрещённые темы реплик через запятую (помимо встроенных стоп-слов)",
    )

    # --- TikTok-чат и DeepSeek / River AI (этап 3) ---
    TIKTOK_USERNAME: str = Field(
        default="",
        description="Юзернейм TikTok-стримера (без @); пусто — коннектор выключен",
    )
    TIKTOK_SIGN_API_KEY: str = Field(
        default="",
        description="API-ключ сервиса подписей EulerStream (опционально, для повышенных лимитов TikTokLive)",
    )
    RIVER_API_KEY: str = Field(
        default="",
        description="API-ключ River AI (console.river.ai) для модели DeepSeek-V4.1-Flash",
    )
    DEEPSEEK_API_KEY: str = Field(
        default="",
        description="Ключ DeepSeek (sk-...); пусто — Winky отвечает сценарными фолбэками",
    )
    DEEPSEEK_BASE_URL: str = Field(
        default="",
        description="Base URL для OpenAI-совместимого API (по умолчанию api.river.ai или api.deepseek.com)",
    )
    DEEPSEEK_MODEL: str = Field(
        default="deepseek-ai/DeepSeek-V4.1-Flash",
        description="Модель DeepSeek (в River AI: deepseek-ai/DeepSeek-V4.1-Flash)",
    )
    WINKY_LLM_MIN_INTERVAL: float = Field(
        default=8.0,
        description="Минимум секунд между LLM-ответами (лимит частоты)",
    )
    WINKY_GREET_MIN_INTERVAL: float = Field(
        default=90.0,
        description="Минимум секунд между приветствиями новых зрителей (анти-спам)",
    )

    # --- HTTP-сервер ---
    API_HOST: str = Field(default="0.0.0.0", description="Адрес, на котором поднимается FastAPI")
    API_PORT: int = Field(default=8000, description="Порт, на котором поднимается FastAPI")

    @field_validator("DEFAULT_LANG")
    @classmethod
    def _normalize_lang(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in ("ru", "en"):
            raise ValueError("DEFAULT_LANG должен быть 'ru' или 'en'")
        return value

    @property
    def admin_tg_ids(self) -> list[int]:
        """Список Telegram ID админов из строки ADMIN_TG_IDS."""
        return [int(part) for part in self.ADMIN_TG_IDS.replace(" ", "").split(",") if part]

    def is_admin(self, tg_id: int) -> bool:
        """Проверяет, входит ли пользователь в список админов/стримеров."""
        return tg_id in self.admin_tg_ids

    def partner_base(self, lang: str = "ru") -> str:
        """Базовая партнёрская ссылка прямой веб-регистрации (без чужого ТГ-бота)."""
        base = self.EN_PARTNER_BASE_URL if lang == "en" else self.RU_PARTNER_BASE_URL
        if not base:
            base = self.PARTNER_BASE_URL

        # Если ссылка ведёт в чужого ТГ-бота (/bot/...) или пуста — переключаем на прямой OneLink
        if not base or "/bot/" in base:
            if self.ONELINK_URL:
                return self.ONELINK_URL
            if base and "/bot/" in base:
                base = base.split("/bot/")[0]
        return base or self.ONELINK_URL

    def partner_url(self, tg_id: int, lang: str = "ru") -> str:
        """Персональная ссылка регистрации.

        Передает sub_id1, click_id и af_sub1 для 100% фиксации конверсий
        на OneLink и доменных зеркалах Pocket Partners.
        """
        base = self.partner_base(lang)
        if not base:
            return ""
        separator = "&" if "?" in base else "?"
        return f"{base}{separator}sub_id1={tg_id}&click_id={tg_id}&af_sub1={tg_id}"

    def deposit_url(self, tg_id: int, lang: str = "ru") -> str:
        """Рабочая ссылка на кассу с промокодом 50START и трекинг-метками."""
        if lang == "ru":
            base = self.RU_DEPOSIT_URL or "https://po-ru4.click/cabinet/deposit"
        else:
            base = self.EN_DEPOSIT_URL or "https://pocketoption.com/cabinet/deposit"
        separator = "&" if "?" in base else "?"
        return f"{base}{separator}promo={self.PROMO_CODE}&sub_id1={tg_id}&click_id={tg_id}"

    @property
    def support_url(self) -> str:
        """Ссылка на поддержку: https://t.me/{SUPPORT_USERNAME}."""
        return f"https://t.me/{self.SUPPORT_USERNAME.lstrip('@')}"


settings = Settings()
