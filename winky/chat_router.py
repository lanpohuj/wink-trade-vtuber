"""Маршрут сообщений чата: сценарии -> DeepSeek -> цензура -> речь Winky.

Приоритет ответов:
1. Ключевые сценарии из scenarios.yaml (при прямом запросе ссылок/инструкций).
2. DeepSeek — живой интеллект 20-летней харизматичной стримерши с памятью
   по каждому зрителю (vibe, контекст, правило 80/20).
3. Живые фолбэки из сценариев, если LLM недоступен или лимит.

Каждая реплика перед озвучкой проходит строгую цензуру (Anti-Ban TikTok).
"""

from __future__ import annotations

import logging
import random
import re
import threading
from collections import Counter, deque
from dataclasses import dataclass, field
from time import monotonic
from typing import Callable

from config import settings
from winky.censor import check_phrase
from winky.deepseek import LLMBrain
from winky.scenarios import ScenarioBook
from winky.tts import SpeechController, detect_lang

logger = logging.getLogger(__name__)

# Мгновенные голосовые филлеры (0.05с отклик для новых вопросов)
FILLERS_RU = [
    "О, отличный вопрос! Сейчас расскажу!",
    "Хм, дай-ка подумать! Сейчас подскажу!",
    "Секундочку, смотрю!",
]
FILLERS_EN = [
    "Oh, great question! Let me tell you!",
    "Hmm, let me think! Give me a second!",
    "One second, checking that out!",
]

# Универсальные фразы реакций лайва с поддержкой {user} и {gift} (расширенный пул 8-10 вариантов)
JOIN_PHRASES_RU = [
    "[wave] О, {user}, приветик! Рада тебя видеть на стриме!",
    "[happy] Хей, {user}, добро пожаловать! Располагайся, сейчас самое интересное!",
    "[wink] {user}, привет-привет! Залетай к нам, устраивайся поудобнее!",
    "[excited] Ого, {user} в здании! Рада новому гостю, смотри на экран!",
    "[happy] Привет, {user}! Как настроение сегодня? Присоединяйся к чату!",
    "[wave] Салют, {user}! Лови наш позитивный стрим-вайб!",
    "[wink] {user}, приветики! Ты как раз вовремя, сейчас ловим красивое движение!",
    "[happy] Рада видеть, {user}! Залетай в чат, делись мыслями!",
]
JOIN_PHRASES_EN = [
    "[wave] Hey {user}, welcome to the stream! So happy to see you here!",
    "[happy] Welcome {user}! Glad to have you on the live stream, make yourself at home!",
    "[wink] Hi {user}! You just joined at the best moment, watch the screen!",
    "[excited] Wow, {user} is in the house! Welcome in!",
    "[happy] Great to see you {user}! Drop a hello in chat!",
    "[wink] Hey {user}! Tap the screen and enjoy the vibes!",
]

FOLLOW_PHRASES_RU = [
    "[excited] {user}, спасибо за подписочку! Танцую для тебя! Добро пожаловать в нашу банду!",
    "[happy] Ура, {user}, добро пожаловать в семью! Лови мой фирменный танец!",
    "[excited] {user}, вау, спасибо за фоллоу! Ты супер, оставайся с нами!",
    "[wink] {user}, вот это кайф! Плюс один крутой человек в семье, танцую!",
    "[blush] {user}, спасибо огромное за подписку! Мне безумно приятно, танцую для тебя!",
    "[excited] Хей, {user}, добро пожаловать к нам! Танцую победный танец!",
    "[wink] {user}, спасибо за доверие! Лови заряд энергии на стриме!",
    "[happy] {user}, ура-ура! Спасибо за подписку, жги вместе с нами!",
]
FOLLOW_PHRASES_EN = [
    "[excited] Wow {user}, thank you so much for following! Dancing just for you!",
    "[happy] Welcome {user}! Thank you for following, enjoy my dance!",
    "[excited] {user}, you rock! Thank you for the follow, welcome to the family!",
    "[wink] Yay {user}, thanks for the follow! Sending you positive energy!",
    "[blush] {user}, thank you so much! It means the world to me, dancing for you!",
    "[happy] Welcome aboard {user}! Glad to have you with us!",
]

GIFT_PHRASES_RU = [
    "[excited] Ого, {user}, огромное спасибо за {gift}! Ты просто супер! Лови мой танец!",
    "[blush] Вау, {user}, какой подарок! {gift} — это супер мило! Танцую для тебя!",
    "[excited] {user}, спасибо за {gift}! Ты делаешь этот стрим ярче! Танцую!",
    "[happy] Ого-го, {user}, вот это щедрость! Обожаю {gift}, спасибо огромное!",
    "[blush] {user}, ты меня балуешь! Спасибо огромное за {gift}, посылаю сердечко!",
    "[excited] {user}, вау, {gift}! Это просто огонь, спасибо тебе за поддержку!",
    "[wink] {user}, лучший подарок на стриме! {gift} прямо в сердечко, танцую!",
    "[happy] Спасибо, {user}! {gift} — это прямо кайф, заряжаешь стрим на все сто!",
]
GIFT_PHRASES_EN = [
    "[excited] Wow {user}, huge thanks for the {gift}!! You are amazing!",
    "[blush] Thank you so much {user} for the {gift}! Dancing just for you!",
    "[excited] Thanks {user} for the {gift}! You make this stream so much brighter!",
    "[happy] {user}, you're incredible! Thank you so much for {gift}!",
    "[wink] Best gift of the day from {user}! Thank you for the {gift}!",
    "[blush] Aww {user}, {gift} is so sweet! Sending you lots of love!",
]

LIKE_PHRASES_RU = [
    "[happy] {user}, спасибо огромное за лайки! Лови сердечко!",
    "[excited] Ого, сколько лайков от {user}! Спасибо большое, ты лучший!",
    "[wink] {user}, спасибо за активность и тапы! Это очень сильно помогает стриму!",
    "[excited] {user}, твои пальчики творят чудеса! Спасибо за тапы по экрану!",
    "[happy] {user}, сердечко тебе за лайки! Продвигаем наш эфир в топ!",
    "[wink] {user}, спасибо за тапы! Вижу твою поддержку, ты огонь!",
    "[excited] Ого, {user} разогрел экран тапами! Спасибо огромное за активность!",
    "[blush] {user}, спасибо за лайки, мне безумно приятно видеть такую отдачу!",
]
LIKE_PHRASES_EN = [
    "[happy] {user}, thank you so much for the likes! Sending love!",
    "[excited] Wow {user}, thanks for tapping the screen! You're awesome!",
    "[wink] {user}, appreciate all the likes and support so much!",
    "[happy] Huge thanks to {user} for the taps! Let's get this stream to the top!",
    "[blush] {user}, thank you for the hearts! You're wonderful!",
]

# Запрещенные шаблоны в никах (мат, казино, спам, боты, ссылки)
_BAD_NAME_PATTERNS = (
    r"https?://", r"t\.me", r"\.com", r"\.ru", r"\.org", r"\.net", r"bot\b",
    r"казино", r"casino", r"1win", r"vavada", r"crypto", r"крипт",
    r"хуй", r"пизд", r"еба", r"ебл", r"бля", r"сука", r"мудак", r"гандон",
    r"fuck", r"bitch", r"dick", r"pussy", r"asshole", r"whore",
)

# Словарь частых слов и имён для красивой транслитерации латинских ников
_TRANSLIT_WORD_MAP = {
    "lazy": "Лэйзи",
    "alex": "Алекс",
    "alexander": "Александр",
    "dima": "Дима",
    "dmitry": "Дмитрий",
    "dmitriy": "Дмитрий",
    "kate": "Кейт",
    "katya": "Катя",
    "alina": "Алина",
    "misha": "Миша",
    "mike": "Майк",
    "pro": "Про",
    "pricep": "Прицеп",
    "pritzep": "Прицеп",
    "trader": "Трейдер",
    "trade": "Трейд",
    "king": "Кинг",
    "queen": "Квин",
    "boy": "Бой",
    "girl": "Гёрл",
    "fox": "Фокс",
    "cat": "Кэт",
    "wolf": "Вульф",
    "bear": "Медведь",
    "crazy": "Крейзи",
    "sweet": "Свит",
    "black": "Блэк",
    "white": "Вайт",
    "dark": "Дарк",
    "light": "Лайт",
    "super": "Супер",
    "mega": "Мега",
    "boss": "Босс",
    "mr": "Мистер",
    "mister": "Мистер",
    "ms": "Мисс",
    "miss": "Мисс",
    "neo": "Нео",
    "vip": "Вип",
    "bro": "Бро",
    "friend": "Друг",
    "rizhikova": "Рыжикова",
    "ryzhikova": "Рыжикова",
    "rizhik": "Рыжик",
    "ryzhik": "Рыжик",
    "volk": "Волк",
    "zver": "Зверь",
    "ivan": "Иван",
    "anna": "Анна",
    "sergey": "Сергей",
    "max": "Макс",
    "artem": "Артём",
    "vlad": "Влад",
    "nikita": "Никита",
    "denis": "Денис",
    "igor": "Игорь",
    "olga": "Ольга",
    "elena": "Елена",
    "masha": "Маша",
}


@dataclass
class ViewerProfile:
    """Память о конкретном зрителе стрима."""

    nickname: str
    clean_name: str
    vibe: str = "regular"  # flirty | gambler | skeptic | curious | regular
    history: deque[dict[str, str]] = field(default_factory=lambda: deque(maxlen=4))
    message_count: int = 0
    mentioned_bio: bool = False
    last_comment_at: float = 0.0
    last_seen: float = 0.0


def analyze_vibe(text: str, prev_vibe: str = "regular") -> str:
    """Классифицирует настроение и намерения зрителя по тексту реплики."""
    lower = text.lower()

    # 1. flirty (флирт, комплименты, подкаты)
    if any(k in lower for k in (
        "красотк", "мил", "любл", "замуж", "девушк", "сексуальн", "красив",
        "милаш", "вайб", "симпотич", "cute", "love", "marry", "gorgeous",
        "hot", "kiss", "поцелуй", "обними", "краш", "милашка", "прелесть"
    )):
        return "flirty"

    # 2. gambler (жажда наживы, сигналы, выигрыши)
    if any(k in lower for k in (
        "поднял", "бабло", "сигнал", "куда жать", "плюс", "минус", "выигрыш",
        "депозит", "ставка", "вверх или вниз", "профит", "win", "profit",
        "signal", "bet", "money", "бабки", "иксы", "кэш", "куш"
    )):
        return "gambler"

    # 3. skeptic (недоверие, обвинения, поиск подвоха)
    if any(k in lower for k in (
        "скам", "развод", "лохотрон", "фейк", "пруф", "вывод", "наеб",
        "обман", "врешь", "не верю", "scam", "fake", "proof", "fraud",
        "подстава", "накрутк", "слив"
    )):
        return "skeptic"

    # 4. curious (интерес к сути, как это устроено)
    if any(k in lower for k in (
        "что за", "как это", "как работает", "что за бот", "как зайти",
        "как начать", "где взять", "ссылк", "how it works", "what is",
        "how to", "расскажи подробнее", "что на экране"
    )):
        return "curious"

    return prev_vibe if prev_vibe != "regular" else "regular"


def translit_nick_to_ru(text: str) -> str:
    """Фонетическая транслитерация латинских ников для естественного произношения в RU TTS."""
    if not text:
        return ""
    if re.search(r"[а-яА-ЯёЁ]", text):
        return text  # Если уже есть кириллица, оставляем

    # Разбиваем на слова по пробелам и знакам
    words = text.split()
    result_words = []

    for word in words:
        clean_w = word.strip().lower()
        if not clean_w:
            continue
        if clean_w in _TRANSLIT_WORD_MAP:
            result_words.append(_TRANSLIT_WORD_MAP[clean_w])
            continue

        w = clean_w
        # Двух/трёхбуквенные фонетические сочетания
        replacements = [
            ("shch", "щ"), ("sch", "щ"),
            ("sh", "ш"), ("ch", "ч"), ("zh", "ж"),
            ("ya", "я"), ("ja", "я"),
            ("yu", "ю"), ("ju", "ю"),
            ("yo", "ё"), ("jo", "ё"),
            ("ye", "е"), ("je", "е"),
            ("kh", "х"),
            ("ts", "ц"), ("tz", "ц"),
            ("th", "т"), ("ph", "ф"),
            ("ck", "к"),
            ("oo", "у"), ("ee", "и"),
            ("qu", "кв"),
        ]
        for src, dst in replacements:
            w = w.replace(src, dst)

        # Посимвольная транслитерация
        char_map = {
            "a": "а", "b": "б", "c": "к", "d": "д", "e": "е", "f": "ф",
            "g": "г", "h": "х", "i": "и", "j": "дж", "k": "к", "l": "л",
            "m": "м", "n": "н", "o": "о", "p": "п", "q": "к", "r": "р",
            "s": "с", "t": "т", "u": "у", "v": "в", "w": "в", "x": "кс",
            "y": "и", "z": "з",
        }
        res_chars = []
        for ch in w:
            res_chars.append(char_map.get(ch, ch))
        ru_word = "".join(res_chars)
        result_words.append(ru_word.capitalize() if ru_word else word)

    return " ".join(result_words) if result_words else text


def detect_reply_lang(text: str) -> str:
    """Определяет язык для ответа: 'ru' если есть кириллица, иначе 'en'."""
    return "ru" if re.search(r"[а-яА-ЯёЁ]", text or "") else "en"


def clean_nickname(raw_user: str, default_lang: str = "ru") -> tuple[str, str]:
    """Превращает сырой никнейм зрителя TikTok (например 'alex_2004', 'дима_777', 'RizhikOva')
    в красивое произносимое имя ('Алекс', 'Дима', 'Рыжикова').
    Возвращает (clean_name, lang).
    """
    if not raw_user:
        target_lang = "en" if default_lang == "en" else "ru"
        return ("friend" if target_lang == "en" else "друг"), target_lang

    raw = raw_user.strip()
    fallback_lang = "en" if default_lang == "en" else "ru"
    fallback_name = "friend" if fallback_lang == "en" else "друг"

    # 1. Проверка через общую цензуру check_phrase
    ok, _ = check_phrase(raw)
    if not ok:
        return fallback_name, fallback_lang

    lower_raw = raw.lower()

    # 2. Проверка на мат, ссылки и спам
    for pat in _BAD_NAME_PATTERNS:
        if re.search(pat, lower_raw, re.IGNORECASE):
            return fallback_name, fallback_lang

    # 3. Проверка на шаблон мусора типа user12384712, user_123, id1238912, или чисто цифры
    if re.match(r"^(user|id)[_]?\d+$", lower_raw) or re.match(r"^\d+$", lower_raw) or len(lower_raw) <= 1:
        return fallback_name, fallback_lang

    # 4. Удаляем хвостовые цифры: alex_2004 -> alex_, дима_777 -> дима_
    clean = re.sub(r"\d+$", "", raw).strip()

    # Заменяем точки, подчеркивания и дефисы на пробелы
    clean = re.sub(r"[_.]+", " ", clean)

    # Очищаем от спецсимволов/эмодзи, оставляем буквы, цифры и пробелы
    clean = re.sub(r"[^\w\sа-яА-ЯёЁa-zA-Z-]", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    if not clean or len(clean) <= 1:
        return fallback_name, fallback_lang

    # 5. Если стрим на русском, а ник латинский — делаем качественную транслитерацию
    target_l = default_lang if default_lang in ("ru", "en") else "ru"
    if target_l == "ru" and not re.search(r"[а-яА-ЯёЁ]", clean):
        clean = translit_nick_to_ru(clean)
    else:
        # Капитализируем каждое слово
        clean = " ".join(word.capitalize() for word in clean.split())

    # 6. Повторная проверка очищенного имени через check_phrase
    ok_clean, _ = check_phrase(clean)
    if not ok_clean:
        return fallback_name, fallback_lang

    return clean, target_l


sanitize_nickname = clean_nickname


class ChatRouter:
    """Обрабатывает события чата и превращает их в речь Winky."""

    def __init__(
        self,
        book: ScenarioBook,
        brain: LLMBrain,
        controller: SpeechController,
        on_feed: Callable[[dict], None],
        on_gift: Callable[[str], None] | None = None,
        on_wave: Callable[[], None] | None = None,
        on_action: Callable[[str, float], None] | None = None,
    ) -> None:
        self._book = book
        self._brain = brain
        self._controller = controller
        self._on_feed = on_feed
        self._on_gift = on_gift
        self._on_wave = on_wave
        self._on_action = on_action
        self._last_greet_at = 0.0
        self._last_like_at = 0.0
        self._last_follow_at = 0.0
        self._counters = Counter()
        self._lock = threading.Lock()

        # Язык стрима по умолчанию (ru / en)
        self.default_stream_lang = "ru"

        # Память по зрителям и лента последних сообщений
        self._viewers: dict[str, ViewerProfile] = {}
        self._recent_chat: deque[dict[str, str]] = deque(maxlen=6)

    def set_stream_lang(self, lang: str) -> None:
        """Переключает язык стрима по умолчанию."""
        if lang in ("ru", "en"):
            self.default_stream_lang = lang
            logger.info("Язык стрима переключен на: %s", lang)

    def get_or_create_profile(self, raw_user: str, clean_name: str) -> ViewerProfile:
        """Получает или создаёт профиль зрителя с сохранением истории."""
        key = (raw_user or clean_name).strip().lower()
        if key not in self._viewers:
            self._viewers[key] = ViewerProfile(nickname=raw_user, clean_name=clean_name)
        return self._viewers[key]

    # ---------- счётчики ----------

    def counters(self) -> dict[str, int]:
        with self._lock:
            return dict(self._counters)

    def _bump(self, key: str) -> None:
        with self._lock:
            self._counters[key] += 1

    # ---------- публичные обработчики событий ----------

    def handle_comment(self, user: str, text: str) -> None:
        """Комментарий зрителя: анализ vibe -> keyword -> DeepSeek с памятью -> фолбэк."""
        text = text.strip()
        if not text:
            return
        self._bump("comments")

        clean_user, _ = clean_nickname(user, default_lang=self.default_stream_lang)
        feed_user = "Зритель" if user in ("Ручной вопрос", "") else clean_user
        self._feed("user", feed_user, text)
        lang = detect_reply_lang(text)

        # 1. Профиль и память зрителя
        profile = self.get_or_create_profile(user, clean_user)
        profile.message_count += 1
        profile.vibe = analyze_vibe(text, profile.vibe)
        now = monotonic()

        # Персональный анти-спам зрителя (не чаще раза в 2.5 секунды от одного пользователя)
        if now - profile.last_comment_at < 2.5:
            logger.debug("Пропуск частого комментария от зрителя %s", clean_user)
            return
        profile.last_comment_at = now
        profile.last_seen = now

        # Обновляем общую ленту комнаты
        self._recent_chat.append({"who": clean_user, "text": text})

        lower_text = text.lower()
        is_compliment = profile.vibe == "flirty" or any(word in lower_text for word in ("красотк", "лучш", "мил", "любл", "топ", "няшк", "красив", "cute", "love", "best", "милашк", "прелесть"))
        is_greeting = any(word in lower_text for word in ("привет", "хей", "ку", "здарова", "добрый", "hi", "hello", "hey", "салют"))
        is_win = profile.vibe == "gambler" and any(word in lower_text for word in ("плюс", "профит", "зашло", "выиграл", "ура", "win", "profit", "побед"))

        if is_compliment:
            detected_emo = "blush"
            if self._on_action:
                try:
                    self._on_action("shy", 3.2)
                except Exception:
                    logger.exception("on_action shy упал")
        elif is_greeting:
            detected_emo = "wave"
            if self._on_wave:
                try:
                    self._on_wave()
                except Exception:
                    logger.exception("on_wave упал")
        elif is_win:
            detected_emo = "excited"
            if self._on_action:
                try:
                    self._on_action("cheer", 3.5)
                except Exception:
                    logger.exception("on_action cheer упал")
        else:
            detected_emo = None
            if self._on_action:
                try:
                    self._on_action("thinking", 0.8)
                except Exception:
                    pass

        # Защита от перегрузки очереди речи
        if self._controller.queue_size() >= 4:
            logger.info("Пропуск голосового ответа на «%s»: очередь перегружена (%d)", text[:30], self._controller.queue_size())
            return

        # 2. Ключевые сценарии — приоритет при прямых вопросах
        keyword = self._book.match_keyword(text)
        if keyword is not None:
            emo = detected_emo or keyword.emotion
            kw_text = keyword.text(lang)
            if self._say(kw_text, lang, emo, clean_user):
                self._bump("keyword_hits")
                profile.history.append({"user": text, "winky": kw_text})
                if any(w in kw_text.lower() for w in ("шапк", "профил", "ссылк", "био", "bio", "link")):
                    profile.mentioned_bio = True
                return

        # 3. Фоновая генерация через DeepSeek с памятью зрителя и контекстом
        def _llm_worker() -> None:
            reply = self._brain.reply(
                text,
                nickname=clean_user,
                profile=profile,
                recent_context=list(self._recent_chat),
            )
            if reply:
                # Фиксируем упоминание шапки профиля
                if any(w in reply.lower() for w in ("шапк", "профил", "ссылк", "био", "bio", "link")):
                    profile.mentioned_bio = True
                profile.history.append({"user": text, "winky": reply})

                emo = detected_emo or self._emotion_for(reply)
                if self._say(reply, lang, emo, clean_user):
                    self._bump("llm_replies")
                    return
                self._bump("llm_censored")
            elif self._brain.available:
                self._bump("llm_limited")

            # Фолбэк, если LLM недоступен или лимит
            emo = detected_emo or "wink"
            fb_text = self._book.chat_phrases.fallback(lang)
            if self._say(fb_text, lang, emo, clean_user):
                profile.history.append({"user": text, "winky": fb_text})
                self._bump("fallbacks")

        threading.Thread(target=_llm_worker, daemon=True, name="chat_llm_worker").start()

    def handle_join(self, user: str, force: bool = False, lang: str = "auto") -> None:
        """Новый зритель: язык стрима по умолчанию, красивое имя, кулдаун 20с."""
        target_lang = self.default_stream_lang if lang == "auto" else lang
        clean_name, _ = clean_nickname(user, default_lang=target_lang)
        self._bump("joins_greeted")
        feed_msg = "👋 зашёл(ла) в эфир" if target_lang == "ru" else "👋 joined the live"
        self._feed("user", clean_name, feed_msg)

        now = monotonic()
        if not force:
            if now - self._last_greet_at < 20.0:
                return
            if self._controller.speaking or self._controller.queue_size() > 0:
                return

        self._last_greet_at = now
        scenario_phrase = self._book.chat_phrases.greeting(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(JOIN_PHRASES_RU if target_lang == "ru" else JOIN_PHRASES_EN)
        self._say(text, target_lang, "wave", clean_name, action="wave", action_duration=3.0)

    def handle_follow(self, user: str, force: bool = False, lang: str = "auto") -> None:
        """Подписка зрителя: танец dance с кулдауном 4с."""
        target_lang = self.default_stream_lang if lang == "auto" else lang
        clean_name, _ = clean_nickname(user, default_lang=target_lang)
        self._bump("follows")
        feed_msg = "❤️ подписался(лась) на эфир" if target_lang == "ru" else "❤️ followed!"
        self._feed("user", clean_name, feed_msg)

        now = monotonic()
        if not force and now - self._last_follow_at < 4.0:
            return

        self._last_follow_at = now
        scenario_phrase = self._book.chat_phrases.follow(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(FOLLOW_PHRASES_RU if target_lang == "ru" else FOLLOW_PHRASES_EN)
        self._say(text, target_lang, "excited", clean_name, action="dance", action_duration=4.5)

    def handle_gift(self, user: str, gift: str = "Роза", lang: str = "auto") -> None:
        """Подарок: персональная благодарность за конкретный подарок + танец dance."""
        target_lang = self.default_stream_lang if lang == "auto" else lang
        clean_name, _ = clean_nickname(user, default_lang=target_lang)
        clean_gift = (gift or "").strip() or ("Роза" if target_lang == "ru" else "Rose")
        self._bump("gifts")
        self._feed("user", clean_name, f"🎁 {clean_gift}")

        scenario_phrase = self._book.chat_phrases.gift_thank(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(GIFT_PHRASES_RU if target_lang == "ru" else GIFT_PHRASES_EN)
        self._say(text, target_lang, "excited", clean_name, gift=clean_gift, action="dance", action_duration=4.5)

    def handle_like(self, user: str, count: int = 1, force: bool = False, lang: str = "auto") -> None:
        """Лайки: благодарность с кулдауном 20с при свободной очереди."""
        target_lang = self.default_stream_lang if lang == "auto" else lang
        clean_name, _ = clean_nickname(user, default_lang=target_lang)
        self._bump("likes")
        feed_msg = f"❤️ поставил(а) {count} лайков" if target_lang == "ru" else f"❤️ sent {count} likes"
        self._feed("user", clean_name, feed_msg)

        now = monotonic()
        if not force:
            if now - self._last_like_at < 20.0:
                return
            if self._controller.speaking or self._controller.queue_size() > 0:
                return

        self._last_like_at = now
        scenario_phrase = self._book.chat_phrases.like(target_lang)
        text = scenario_phrase if scenario_phrase else random.choice(LIKE_PHRASES_RU if target_lang == "ru" else LIKE_PHRASES_EN)
        self._say(text, target_lang, "excited", clean_name, count=count, action="cheer", action_duration=3.0)

    # ---------- внутреннее ----------

    def _emotion_for(self, text: str) -> str:
        """Подбор эмоции под тон ответа LLM."""
        tag_match = re.match(r"^\[([a-zA-Z_]+)\]", text)
        if tag_match:
            detected = tag_match.group(1).lower()
            if detected in ("happy", "blush", "excited", "wink", "surprised", "thinking", "neutral", "flirt_kiss", "shy"):
                return detected
        joyful = any(marker in text.lower() for marker in ("!", "круто", "супер", "wow", "great", "кайф", "огонь"))
        question = "?" in text
        if joyful:
            return "excited"
        if question:
            return "thinking"
        return "happy"

    def _say(
        self,
        text: str,
        lang: str,
        emotion: str,
        user: str,
        gift: str = "",
        count: int = 1,
        action: str | None = None,
        action_duration: float = 3.5,
    ) -> bool:
        """Подстановка плейсхолдеров, парсинг тегов эмоций [blush], цензура и конвейер речи."""
        if not text:
            return False
        tag_match = re.match(r"^\[([a-zA-Z_]+)\]\s*", text)
        if tag_match:
            detected = tag_match.group(1).lower()
            if detected in ("happy", "blush", "excited", "wink", "surprised", "thinking", "neutral", "flirt_kiss", "shy"):
                emotion = detected
            text = text[tag_match.end():]

        # Замена плейсхолдеров. Исключаем технические имена
        clean_user = (user or "").strip()
        if not clean_user or clean_user.lower() in ("ручной вопрос", "зритель", "гость", "user", "viewer", "guest", "друг", "friend"):
            clean_user = "друг" if lang == "ru" else "friend"

        clean_gift = (gift or "").strip() or ("подарок" if lang == "ru" else "gift")

        text = text.replace("{user}", clean_user).replace("{gift}", clean_gift).replace("{count}", str(count))
        ok, reason = check_phrase(text)
        if not ok:
            logger.warning("Ответ Winky заблокирован цензурой: %s", reason)
            self._feed("blocked", "цензура", reason)
            return False

        # Связываем эмоцию с жестом, если жест явно не задан
        if action is None:
            if emotion in ("blush", "shy"):
                action = "shy"
                action_duration = 3.2
            elif emotion == "flirt_kiss":
                action = "flirt_kiss"
                action_duration = 3.0
            elif emotion == "wave":
                action = "wave"
                action_duration = 3.0
            elif emotion == "excited":
                action = "cheer"
                action_duration = 3.5

        self._feed("winky", "Winky", text)
        return self._controller.speak(
            text,
            lang=lang,
            emotion=emotion,
            action=action,
            action_duration=action_duration,
            source="chat",
        )

    def _feed(self, kind: str, who: str, text: str) -> None:
        try:
            self._on_feed({"kind": kind, "who": who, "text": text})
        except Exception:  # noqa: BLE001 — лента не должна ронять маршрут
            logger.exception("on_feed упал")
