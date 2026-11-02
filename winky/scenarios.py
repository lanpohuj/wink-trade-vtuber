"""Сценарии Winky: что, когда и на каком языке говорить.

Реплики лежат в ``winky/scenarios.yaml`` — файл можно править на ходу,
он автоматически перезагружается при изменении (проверка каждые 2 секунды).
Все реплики проходят цензуру при загрузке: заблокированные не попадают в пульт.
"""

from __future__ import annotations

import logging
import random
import threading
from dataclasses import dataclass
from pathlib import Path
from time import time

import yaml

from winky.censor import check_phrase

logger = logging.getLogger(__name__)

SCENARIOS_FILE = Path(__file__).parent / "scenarios.yaml"
RELOAD_CHECK_INTERVAL = 2.0


@dataclass(frozen=True)
class QuickReply:
    """Двуязычный сценарий быстрой реплики с вариантами на RU и EN."""

    id: str
    label: str
    icon: str
    emotion: str  # idle | happy | excited | thinking | wink | wave | win | blush и т.д.
    texts_ru: tuple[str, ...]
    texts_en: tuple[str, ...]

    def random_text(self, lang: str = "ru") -> str:
        pool = self.texts_ru if (lang or "ru").lower() == "ru" else self.texts_en
        return random.choice(pool) if pool else (self.texts_ru[0] if self.texts_ru else "")

    # Обратная совместимость для старых вызовов
    @property
    def text(self) -> str:
        return self.texts_ru[0] if self.texts_ru else ""

    @property
    def lang(self) -> str:
        return "ru"


@dataclass(frozen=True)
class CtaConfig:
    """Ротация интерактива стрима: 4 вопроса/разогрева чата на 1 напоминание про ассистента."""

    interval_minutes: int
    messages_ru: tuple[str, ...]
    messages_en: tuple[str, ...]
    warmup_ru: tuple[str, ...] = ()
    warmup_en: tuple[str, ...] = ()

    def random_message(self, lang: str) -> str:
        pool = self.messages_ru if (lang or "ru").lower() == "ru" else self.messages_en
        return random.choice(pool) if pool else ""

    def random_warmup(self, lang: str) -> str:
        pool = self.warmup_ru if (lang or "ru").lower() == "ru" else self.warmup_en
        return random.choice(pool) if pool else self.random_message(lang)


@dataclass(frozen=True)
class KeywordReply:
    """Ответ по ключевым словам из чата — приоритетнее LLM."""

    id: str
    keywords: tuple[str, ...]
    emotion: str
    text_ru: str
    text_en: str

    def text(self, lang: str) -> str:
        return self.text_ru if lang == "ru" else self.text_en


@dataclass(frozen=True)
class ChatPhrases:
    """Приветствия, благодарности за подарки, подписки, лайки и фолбэки."""

    greetings_ru: tuple[str, ...] = ()
    greetings_en: tuple[str, ...] = ()
    gift_thanks_ru: tuple[str, ...] = ()
    gift_thanks_en: tuple[str, ...] = ()
    follows_ru: tuple[str, ...] = ()
    follows_en: tuple[str, ...] = ()
    likes_ru: tuple[str, ...] = ()
    likes_en: tuple[str, ...] = ()
    fallbacks_ru: tuple[str, ...] = ()
    fallbacks_en: tuple[str, ...] = ()

    def greeting(self, lang: str) -> str:
        pool = self.greetings_ru if lang == "ru" else self.greetings_en
        return random.choice(pool) if pool else ""

    def gift_thank(self, lang: str) -> str:
        pool = self.gift_thanks_ru if lang == "ru" else self.gift_thanks_en
        return random.choice(pool) if pool else ""

    def follow(self, lang: str) -> str:
        pool = self.follows_ru if lang == "ru" else self.follows_en
        return random.choice(pool) if pool else ""

    def like(self, lang: str) -> str:
        pool = self.likes_ru if lang == "ru" else self.likes_en
        return random.choice(pool) if pool else ""

    def fallback(self, lang: str) -> str:
        pool = self.fallbacks_ru if lang == "ru" else self.fallbacks_en
        return random.choice(pool) if pool else ""


def _load_raw(path: Path) -> dict:
    with path.open(encoding="utf-8") as file:
        return yaml.safe_load(file) or {}


def _parse_quick_replies(raw: list) -> list[QuickReply]:
    replies = []
    for item in raw or []:
        reply_id = str(item.get("id", ""))
        label = str(item.get("label", reply_id))
        icon = str(item.get("icon", "💬"))
        emotion = str(item.get("emotion", "happy"))

        raw_ru = item.get("texts_ru")
        if not raw_ru:
            if "text" in item and item.get("lang", "ru") == "ru":
                raw_ru = [item["text"]]
            elif "texts" in item:
                raw_ru = item["texts"]

        raw_en = item.get("texts_en")
        if not raw_en and "text" in item and item.get("lang", "ru") == "en":
            raw_en = [item["text"]]

        def filter_texts(texts) -> tuple[str, ...]:
            res = []
            for t in texts or []:
                ok, reason = check_phrase(str(t))
                if ok:
                    res.append(str(t))
                else:
                    logger.warning("Реплика %s заблокирована цензурой (%s): %s", reply_id, reason, str(t)[:40])
            return tuple(res)

        clean_ru = filter_texts(raw_ru)
        clean_en = filter_texts(raw_en)

        if not reply_id or (not clean_ru and not clean_en):
            continue

        replies.append(
            QuickReply(
                id=reply_id,
                label=label,
                icon=icon,
                emotion=emotion,
                texts_ru=clean_ru,
                texts_en=clean_en,
            )
        )
    return replies


def _parse_cta(raw: dict) -> CtaConfig:
    def filter_texts(items) -> tuple[str, ...]:
        res = []
        for t in items or []:
            ok, reason = check_phrase(str(t))
            if ok:
                res.append(str(t))
            else:
                logger.warning("Реплика CTA заблокирована цензурой (%s): %s", reason, str(t)[:40])
        return tuple(res)

    return CtaConfig(
        interval_minutes=int(raw.get("interval_minutes", 3)),
        messages_ru=filter_texts(raw.get("messages_ru")),
        messages_en=filter_texts(raw.get("messages_en")),
        warmup_ru=filter_texts(raw.get("warmup_ru")),
        warmup_en=filter_texts(raw.get("warmup_en")),
    )


def _parse_keyword_replies(raw: list) -> list[KeywordReply]:
    replies = []
    for item in raw or []:
        reply = KeywordReply(
            id=str(item.get("id", "")),
            keywords=tuple(str(k).lower() for k in (item.get("keywords") or [])),
            emotion=str(item.get("emotion", "happy")),
            text_ru=str(item.get("text_ru", "")),
            text_en=str(item.get("text_en", "")),
        )
        if not reply.id or not reply.keywords or not (reply.text_ru or reply.text_en):
            continue
        for text in (reply.text_ru, reply.text_en):
            ok, reason = check_phrase(text)
            if not ok:
                logger.warning("Ключевая реплика %s заблокирована цензурой (%s)", reply.id, reason)
                break
        else:
            replies.append(reply)
    return replies


def _parse_chat_phrases(raw: dict) -> ChatPhrases:
    def censored(items) -> tuple[str, ...]:
        kept = []
        for text in items or []:
            ok, reason = check_phrase(str(text))
            if ok:
                kept.append(str(text))
            else:
                logger.warning("Фраза чата заблокирована цензурой (%s): %s", reason, text[:40])
        return tuple(kept)

    return ChatPhrases(
        greetings_ru=censored((raw.get("greetings") or {}).get("ru")),
        greetings_en=censored((raw.get("greetings") or {}).get("en")),
        gift_thanks_ru=censored((raw.get("gift_thanks") or {}).get("ru")),
        gift_thanks_en=censored((raw.get("gift_thanks") or {}).get("en")),
        follows_ru=censored((raw.get("follows") or {}).get("ru")),
        follows_en=censored((raw.get("follows") or {}).get("en")),
        likes_ru=censored((raw.get("likes") or {}).get("ru")),
        likes_en=censored((raw.get("likes") or {}).get("en")),
        fallbacks_ru=censored((raw.get("fallbacks") or {}).get("ru")),
        fallbacks_en=censored((raw.get("fallbacks") or {}).get("en")),
    )


class ScenarioBook:
    """Загруженные сценарии с автоперезагрузкой при изменении файла."""

    def __init__(self, path: Path = SCENARIOS_FILE) -> None:
        self._path = path
        self._lock = threading.Lock()
        self._quick_replies: list[QuickReply] = []
        self._keyword_replies: list[KeywordReply] = []
        self._chat_phrases = ChatPhrases()
        self._cta = CtaConfig(interval_minutes=4, messages_ru=(), messages_en=())
        self._loaded_at = 0.0
        self._file_mtime = 0.0
        self.reload(force=True)

    def reload(self, force: bool = False) -> bool:
        """Перечитывает YAML, если файл изменился. Возвращает True при перезагрузке."""
        if not self._path.exists():
            logger.warning("Файл сценариев не найден: %s", self._path)
            return False
        mtime = self._path.stat().st_mtime
        if not force and mtime == self._file_mtime:
            return False

        try:
            raw = _load_raw(self._path)
        except yaml.YAMLError:
            logger.exception("Синтаксическая ошибка в %s — держу прошлую версию", self._path)
            return False

        with self._lock:
            self._quick_replies = _parse_quick_replies(raw.get("quick_replies"))
            self._keyword_replies = _parse_keyword_replies(raw.get("keyword_replies"))
            self._chat_phrases = _parse_chat_phrases({
                "greetings": raw.get("greetings"),
                "gift_thanks": raw.get("gift_thanks"),
                "follows": raw.get("follows"),
                "likes": raw.get("likes"),
                "fallbacks": raw.get("fallbacks"),
            })
            self._cta = _parse_cta(raw.get("cta") or {})
            self._file_mtime = mtime
            self._loaded_at = time()
        logger.info(
            "Сценарии загружены: %d реплик, %d ключевых, CTA каждые %d мин",
            len(self._quick_replies), len(self._keyword_replies), self._cta.interval_minutes,
        )
        return True

    def maybe_reload(self) -> None:
        """Вызывается из фонового цикла: перезагружает файл при изменении."""
        try:
            self.reload(force=False)
        except OSError:
            logger.exception("Не удалось перечитать сценарии")

    @property
    def quick_replies(self) -> list[QuickReply]:
        with self._lock:
            return list(self._quick_replies)

    @property
    def keyword_replies(self) -> list[KeywordReply]:
        with self._lock:
            return list(self._keyword_replies)

    @property
    def keywords(self) -> list[KeywordReply]:
        return self.keyword_replies

    def quick_reply(self, reply_id: str) -> QuickReply | None:
        with self._lock:
            for reply in self._quick_replies:
                if reply.id == reply_id:
                    return reply
        return None

    def match_keyword(self, text: str) -> KeywordReply | None:
        """Ищет первый ключевой ответ, чьё слово встречается в сообщении."""
        haystack = text.lower()
        with self._lock:
            for reply in self._keyword_replies:
                if any(keyword in haystack for keyword in reply.keywords):
                    return reply
        return None

    @property
    def chat_phrases(self) -> ChatPhrases:
        with self._lock:
            return self._chat_phrases

    @property
    def cta(self) -> CtaConfig:
        with self._lock:
            return self._cta


# ============================================================================
# STREAM_VOICE_BANK: 100% фиксированные фразы без переменных и склеек пар
# Хэш SHA-256 каждой фразы постоянен -> мгновенная отдача из voice_cache/ (0.05с)
# 12 категорий под все рыночные ситуации стратегии (87 фраз RU + 87 фраз EN)
# ============================================================================

STREAM_VOICE_BANK: dict[str, dict[str, tuple[str, ...]]] = {
    "ru": {
        "buy_bounce": (
            "Смотрите на график: цена плотно упёрлась в нижний уровень и дальше вниз её не пускают. Уверенно заходим вверх на тридцать секунд!",
            "Видите, как активно выкупают свечу снизу? Покупатели перехватили инициативу, смело открываю сделку вверх!",
            "Цена сильно провалилась и продавцы выдохлись — сейчас пружина выстрелит обратно. Заходим вверх на отскоке!",
            "Отличная точка у нижней границы: продавцы пытались продавить уровень, но оставили длинную тень снизу. Заходим уверенно вверх!",
            "Здесь у нас железобетонная зона спроса, от которой цена уже не раз отлетала наверх. Открываю сделку вверх на тридцать секунд!",
            "Смотрите, падение полностью остановилось, свечи начали зеленеть прямо на поддержке. Заходим вверх, берём чистый разворот!",
            "Рынок слишком резко просел вниз, сейчас пойдёт быстрый технический возврат к справедливой цене. Смело заходим вверх!",
            "Нижний уровень устоял, объёмы покупателей резко пошли в гору. Открываю сделку вверх на тридцать секунд!",
        ),
        "buy_trend": (
            "Отличный бычий импульс! Идёт уверенный восходящий тренд, свечи пробивают уровень наверх. Заходим вверх по движению!",
            "Покупатели сейчас давят со всей силы, пробили локальный потолок — не стоим против паровоза, заходим уверенно вверх!",
            "Чистое движение наверх после короткой передышки. Открываю сделку вверх по основному тренду!",
            "Смотрите, как уверенно закрылась пробойная зелёная свеча! Верхний барьер взят, дорога наверх открыта — заходим вверх!",
            "Идёт мощная волна роста, каждая новая ступенька выше предыдущей. Работаем строго по тренду — открываю сделку вверх!",
            "Здесь ни в коем случае нельзя продавать против такого роста! Идём вместе с крупными покупателями, заходим уверенно вверх!",
            "Тренд набрал отличную скорость, продавцов на графике вообще не видно. Смело заходим вверх на продолжение импульса!",
            "Красивый выход из накопления наверх! Импульс только начинается, открываю сделку вверх на тридцать секунд!",
        ),
        "buy_pullback": (
            "Идеальный момент: основной тренд идёт вверх, цена сделала небольшую скидку на откате и снова готова расти. Заходим вверх!",
            "Смотрите, короткая коррекция вниз закончилась прямо на наклонной поддержке. Покупаем на откате по тренду — сделка вверх!",
            "Трендовое движение взяло секундную паузу, продавцы выдохлись на мелкой свече. Заходим уверенно вверх по главной волне!",
            "Классический вход от зеркального уровня: бывший потолок теперь работает как пол. Открываю сделку вверх!",
            "Откат полностью выкуплен, тренд продолжает давить наверх. Смело заходим вверх на тридцать секунд!",
            "Именно таких откатов мы и ждём в сильном тренде, чтобы зайти по самой выгодной цене. Открываю сделку вверх!",
        ),
        "sell_bounce": (
            "Смотрите, цена ударилась прямо в потолок и покупатели потеряли силу. Заходим уверенно вниз на тридцать секунд на развороте!",
            "Рынок сильно перегрелся после резкого рывка наверх — сейчас пойдёт закономерный откат. Открываю сделку вниз!",
            "Сверху давит мощный уровень сопротивления, свечи начинают разворачиваться. Смело заходим вниз!",
            "Видите длинные тени сверху? Покупателей встретили плотной стеной продаж, выше цену не пускают. Заходим уверенно вниз!",
            "Цена подошла к сильному верхнему барьеру, от которого всегда идёт сброс объёмов. Открываю сделку вниз на тридцать секунд!",
            "Рост полностью выдохся у самой вершины, появилась уверенная разворотная свеча. Заходим вниз на отскоке от потолка!",
            "Слишком высоко загнали цену без фундамента, сейчас рынок будет остывать. Смело открываю сделку вниз!",
            "На верхнем уровне включились крупные продавцы и перехватили инициативу. Заходим уверенно вниз на тридцать секунд!",
        ),
        "sell_trend": (
            "Смотрите, какой мощный пробой уровня вниз! Продавцы полностью контролируют рынок — заходим строго вниз по тренду!",
            "Нижний уровень пробит импульсной свечой, идёт сильное нисходящее движение. Ловить отскок тут нельзя, открываю сделку вниз!",
            "Чистый медвежий тренд, свечи уверенно идут вниз без откатов. Заходим вниз вместе с основным движением рынка!",
            "Поддержка не выдержала и рухнула под давлением продавцов! Работаем строго по пробою — заходим уверенно вниз!",
            "Видите этот каскад красных свечей? Покупатели просто отступили, поэтому не встаём против рынка и смело заходим вниз!",
            "Мощнейший импульс на понижение, цена прошила уровень как по маслу. Открываю сделку вниз по тренду на тридцать секунд!",
            "В такой ситуации главное правило трейдера — идти за сильным движением. Давление сверху колоссальное, заходим вниз!",
            "Очередная ступенька пробита вниз, тренд только ускоряется. Смело открываю сделку вниз вместе с рынком!",
        ),
        "sell_pullback": (
            "Общий тренд смотрит строго вниз, покупатели попытались чуть поднять цену, но сразу упёрлись в уровень. Заходим вниз!",
            "Короткая передышка на падении закончилась, продавцы снова давят график к низам. Открываю сделку вниз по тренду!",
            "Идеальный вход по нисходящему тренду после небольшого отката наверх. Смело заходим вниз на тридцать секунд!",
            "Пробитый ранее уровень теперь держит цену сверху как бетонный потолок. Заходим уверенно вниз на продолжение падения!",
            "Слабая попытка роста полностью захлебнулась, медвежий тренд берёт своё. Открываю сделку вниз!",
            "Вот почему мы ждём отката в падающем рынке — теперь у нас отличная точка, чтобы зайти вниз вместе с трендом!",
        ),
        "trade_win": (
            "Идеально! Точка входа отработала как по нотам, забираем уверенный плюс в копилочку!",
            "Красота! Сделка закрывается в чистый плюс, всё чётко по нашей стратегии. Смотрим график дальше!",
            "Есть уверенный плюс! Вот почему так важно идти вместе с движением рынка. Кто хочет торговать со мной — забирайте бота в профиле!",
            "Как по учебнику! Спокойный вход, понятная логика — и очередная плюсовая сделка на балансе!",
            "Обожаю, когда график так чётко отрабатывает уровни! Забираем чистый профит и ищем следующую точку!",
            "Плюс в кармане! Никакого гадания, только чистый технический анализ и дисциплина!",
            "Отличная сделка, закрылись с хорошим запасом! Кстати, все эти сигналы доступны в моём телеграм-боте по ссылке в шапке профиля!",
            "Ещё один жирный плюс в сегодняшнюю серию! График читается просто великолепно, продолжаем в том же духе!",
            "Точно в цель! Сделка закрылась в плюс, баланс приятно растёт. Сейчас посмотрим, что нам готовит следующая свеча!",
            "Супер! Рынок двинулся ровно туда, куда мы и рассчитывали. Забираем профит и двигаемся дальше!",
        ),
        "trade_win_recovery": (
            "Вот почему мы используем коэффициент два и два на перекрытии! Полностью перекрыли прошлый минус, забрали чистый профит сверху и возвращаемся к базовой ставке пятьдесят долларов!",
            "Идеальная отработка перекрытия с коэффициентом два и два! Забрали двойной плюс и сбрасываем ставку обратно на пятьдесят долларов!",
            "Есть плюс по перекрытию! Полностью вернули прошлое движение и заработали сверху. Сбрасываю сумму сделки обратно к базовой пятьдесят долларов!",
            "Красота! Перекрытие зашло уверенно и с запасом. Вот зачем нужен чёткий мани-менеджмент!",
            "Отлично, перекрытие закрылось в жирный плюс! Баланс снова на новом максимуме, возвращаемся к стандартной ставке пятьдесят долларов!",
            "Всё как по часам: перекрыли прошлую сделку и вышли в уверенный профит! Двигаемся дальше со спокойной головой!",
        ),
        "trade_loss_step1": (
            "Чуть-чуть зацепило на закрытии, ничего страшного! Включаю перекрытие с коэффициентом два и два — сейчас не просто вернём минус, но и выйдем в чистый плюс!",
            "Немного не хватило времени до импульса, бывает! Спокойно беру перекрытие два и два, чтобы перекрыть этот минус с запасом!",
            "Рынок дал лишнюю тень перед самым закрытием. Вообще не переживаем, для этого у нас есть перекрытие сто десять долларов — забираем плюс!",
            "Рабочий момент: цена задержалась на уровне чуть дольше обычного. Спокойно включаю первое перекрытие и заходим за профитом!",
            "Чуть-чуть не дотянула свеча на закрытии. Главное в трейдинге — хладнокровие, ставим перекрытие сто десять долларов и красиво перекрываемся!",
            "Мелкий рыночный шум на последних секундах — обычная история. Уровень остаётся сильным, поэтому уверенно захожу на перекрытие!",
            "Ничего страшного, одна сделка из серии ушла в минус. Сейчас спокойно умножаем на два и два по мани-менеджменту и забираем плюс!",
        ),
        "sniper_wait": (
            "Направление отличное, но на макушке свечи мы не лезем — ждём секундный откат, чтобы зайти по самой выгодной цене!",
            "Сейчас поймаем идеальный импульс на откате, чтобы забрать сделку с максимальным запасом!",
            "График готов к выстрелу, выжидаем самую выгодную котировку на микро-откате и заходим!",
            "Не торопимся: умный трейдер всегда выжидает микро-откат, чтобы взять лучшую точку входа!",
        ),
        "trade_loss_switch": (
            "Так, эта пара начала капризничать и дёргаться не по технике. Не будем тратить на неё время — переключаюсь на другую пару с чистым графиком!",
            "Тут начался резкий шум на графике, ничего страшного! Сейчас выберу более спокойную валютную пару и отработаем перекрытие там!",
            "Видите, как свечи начали хаотично пилить уровень? Умный трейдер с таким графиком не спорит — меняю пару на чистый тренд!",
            "Эта валютная пара сегодня ведёт себя слишком дёргано. Переключаю терминал на более понятный актив и спокойно закроем плюс на нём!",
            "Не будем упираться в один график, когда там пошла болтанка. Сейчас открою свежую пару с высокой выплатой и красиво перекроемся!",
            "Ага, тут маркетмейкер начал разбрасывать тени в обе стороны. Уходим с этой пары на чистый технический тренд!",
        ),
        "switch_pair": (
            "Давайте посмотрим другую валютную пару, выберем самый чистый и понятный график для следующего входа!",
            "Смотрите, тут сейчас узкий боковик и свечи стоят на месте — в такой забор мы не заходим. Переключаю на более активную пару!",
            "На этом активе движение пока затихло, рисковать зря не будем. Сейчас найду пару, где идёт красивый живой тренд!",
            "Хороший трейдер умеет ждать и выбирать лучший график. Тут пока скучно, поэтому переходим на следующую валютную пару!",
            "Здесь мы своё движение уже забрали, теперь график ушёл в передышку. Переключаюсь на новую пару с отличной волатильностью!",
            "Видите, какие мелкие свечи без направления? Такие участки рынка нужно просто пропускать — меняю валютную пару!",
            "Посмотрим, что происходит на соседних валютных парах, выберем самую надёжную точку входа!",
        ),
        "flat_skip": (
            "Давайте посмотрим другую валютную пару, выберем самый чистый и понятный график для следующего входа!",
            "Смотрите, тут сейчас узкий боковик и свечи стоят на месте — в такой забор мы не заходим. Переключаю на более активную пару!",
            "На этом активе движение пока затихло, рисковать зря не будем. Сейчас найду пару, где идёт красивый живой тренд!",
            "Хороший трейдер умеет ждать и выбирать лучший график. Тут пока скучно, поэтому переходим на следующую валютную пару!",
            "Здесь мы своё движение уже забрали, теперь график ушёл в передышку. Переключаюсь на новую пару с отличной волатильностью!",
            "Видите, какие мелкие свечи без направления? Такие участки рынка нужно просто пропускать — меняю валютную пару!",
            "Посмотрим, что происходит на соседних валютных парах, выберем самую надёжную точку входа!",
        ),
        "ask_chat": (
            "Ребятки, напишите в чат, какую валютную пару разобрать следующей? Сейчас вместе посмотрим график и найдём сильную точку входа!",
            "Друзья, кто сейчас торгует вместе со мной — пишите в чат любую валютную пару, переключусь на неё и разберём по полочкам!",
            "Какую пару открываем дальше — Евро Доллар, Фунт или Австралиец? Кидайте ваши варианты прямо в чат!",
            "Ребятки, не стесняйтесь, пишите в чат название валютной пары, которую хотите проверить! А сам бот с сигналами ждёт вас по ссылке в профиле!",
            "Ну что, куда идём за следующим плюсом? Пишите в чат свои любимые валютные пары, сейчас устроим им полный техразбор!",
            "Кто только подключился к стриму — мы торгуем в прямом эфире по моей стратегии! Пишите в чат валютную пару, посмотрим её следующей!",
            "Давайте выберем следующую пару вместе! Пишите в чат, какой график открыть, и зайдём в сделку прямо сейчас!",
        ),
    },
    "en": {
        "buy_bounce": (
            "Look at the chart: price firmly hit the lower support level and sellers can't push it down. Confidently entering UP for thirty seconds!",
            "See how aggressively buyers are rejecting the lows? Bulls took over momentum, opening an UP trade right now!",
            "Price oversold and sellers are exhausted — get ready for a sharp bounce back. Entering UP on the rebound!",
            "Great spot right at the support floor: sellers pushed hard but left a long lower wick. Entering UP with confidence!",
            "We have a rock solid demand zone here, price has rebounded sharply multiple times. Taking UP for thirty seconds!",
            "Notice how the drop completely halted, candles turning green right on support. Entering UP for a clean reversal!",
            "Market dropped too fast, a rapid technical pullback to fair value is due. Entering UP boldly!",
            "Support floor held firm, buyer volume spiking up. Opening an UP trade for thirty seconds!",
        ),
        "buy_trend": (
            "Strong bullish momentum! Solid uptrend in play, candles breaking through resistance. Entering UP with the flow!",
            "Buyers pushing with full force, breaking the ceiling — never stand against the train, taking UP with confidence!",
            "Clean upward continuation after a quick pause. Opening an UP trade following the primary trend!",
            "Look how convincingly the green breakout candle closed! Ceiling broken, path up is clear — entering UP!",
            "Massive wave of buying, every step higher than the last. Trading strictly with the trend — entering UP!",
            "Never short against such strong buying pressure! Riding the wave with institutional buyers, taking UP!",
            "The trend picked up serious speed, zero sellers on the tape. Taking UP on momentum continuation!",
            "Clean breakout from consolidation! The impulse is just getting started, taking UP for thirty seconds!",
        ),
        "buy_pullback": (
            "Perfect entry: main trend is UP, price gave us a small discount on the pullback and is ready to climb. Taking UP!",
            "Short pullback completed right on ascending support. Buying the dip with the trend — trade UP!",
            "Uptrend took a quick pause, sellers exhausted on tiny candles. Entering UP on the main wave!",
            "Classic flip from support: previous resistance now acting as support floor. Taking UP!",
            "Dip fully absorbed, buyers pushing back to highs. Entering UP for thirty seconds!",
            "This is the exact pullback we wait for in a strong trend to secure the best entry price. Trade UP!",
        ),
        "sell_bounce": (
            "Price rejected right off the ceiling and buyers ran out of steam. Entering DOWN for thirty seconds on the reversal!",
            "Market heavily overbought after that spike up — natural pullback incoming. Opening a DOWN trade!",
            "Heavy resistance pressing from above, candles turning red. Taking DOWN with high conviction!",
            "Notice the long upper wicks? Buyers met a wall of selling pressure, capping the top. Taking DOWN!",
            "Price tested the primary resistance ceiling where supply always steps in. Opening DOWN for thirty seconds!",
            "Rally completely exhausted at the highs, clean reversal candle formed. Entering DOWN off the ceiling!",
            "Price pushed too high without volume, market is about to cool off. Opening DOWN boldly!",
            "Heavy sellers stepped in at resistance and flipped the order book. Entering DOWN for thirty seconds!",
        ),
        "sell_trend": (
            "Massive breakout below key support! Bears fully control the action — entering DOWN with the trend!",
            "Support crushed by an impulse candle, strong downward drop. Don't catch falling knives, opening DOWN!",
            "Pure bearish momentum, candles dropping without pullback. Riding the trend DOWN!",
            "Floor gave way under relentless selling! Following the breakout — taking DOWN with confidence!",
            "See this waterfall of red candles? Buyers stepped aside, so never fight the flow — taking DOWN!",
            "Intense downward impulse, price slicing through levels with ease. Opening DOWN for thirty seconds!",
            "Golden rule of trading: follow the dominant momentum. Heavy selling pressure, taking DOWN!",
            "Another support shelf taken out, trend is accelerating. Entering DOWN with the market!",
        ),
        "sell_pullback": (
            "Overall trend points DOWN, buyers tried a minor bounce but instantly hit a brick wall. Taking DOWN!",
            "Short relief rally over, sellers pushing the chart back to fresh lows. Opening DOWN with the trend!",
            "Ideal entry following the downtrend after a minor pullback higher. Entering DOWN for thirty seconds!",
            "Broken support now holding firm as a solid ceiling from above. Taking DOWN on continuation!",
            "Weak attempt to bounce completely collapsed, bears taking full charge. Taking DOWN!",
            "That's why we wait for pullbacks in a downtrend — prime entry to join the momentum DOWN!",
        ),
        "trade_win": (
            "Boom! Clean entry execution, securing another solid win into the bag!",
            "Beautiful! Trade closes in pure profit, following our strategy to the letter. Onto the next setup!",
            "Another solid win secured! That's why following market structure pays off. Link to my bot is in the bio!",
            "Textbook execution! Calm entry, clear logic — another green trade added to our balance!",
            "Love seeing the chart respect our levels so cleanly! Locking in pure profit and scanning for the next entry!",
            "Profit locked! No guesswork, strictly technical discipline and rule-based execution!",
            "Fantastic trade, closed with plenty of room! By the way, all these signals are available in my Telegram bot in bio!",
            "Another great win in today's stream series! The chart reads like an open book, let's keep rolling!",
            "Bullseye! Trade closed in profit, balance climbing nicely. Let's see what the next candle brings!",
            "Awesome! Market moved exactly as anticipated. Securing the profit and moving forward!",
        ),
        "trade_win_recovery": (
            "That's how proper recovery works with a 2.2 multiplier! Recouped the dip, locked in clean extra profit, and resetting to base stake fifty dollars!",
            "Flawless recovery execution! Multiplied by two point two without emotion and captured double profit!",
            "Green on the recovery trade! Completely erased the pullback and banked gains on top. Resetting stake to base fifty dollars!",
            "Clean recovery trade secured with room to spare. That's why strict risk management is king!",
            "Outstanding, recovery trade closed in solid profit! Balance hitting new highs, returning to standard stake fifty dollars!",
            "Like clockwork: recovered the last trade with two point two multiplier and finished in green profit! Staying focused!",
        ),
        "trade_loss_step1": (
            "Slight wick touched our level at the very last second, totally fine! Applying two point two recovery multiplier to recoup and lock in green profit!",
            "Just ran out of time before the impulse kicked in, happens! Calmly taking step one recovery with one hundred and ten dollars!",
            "Market threw an extra wick right at the close. Zero panic, executing recovery step one with two point two sizing!",
            "Normal trading rhythm: price lingered at the level slightly longer. Triggering one hundred and ten dollar recovery for the win!",
            "Candle just barely fell short at the close. Trading requires discipline — sizing up with two point two to recover cleanly!",
            "Minor market noise on the closing seconds is everyday business. Level remains rock solid, entering recovery!",
            "All good, one trade in the sequence took a dip. Calmly applying two point two multiplier per money management to secure the win!",
        ),
        "sniper_wait": (
            "Great direction, but we never chase the very top of a candle — waiting for a micro-dip to get the best entry price!",
            "Patience is key: catching the pullback right now to enter with maximum margin of safety!",
            "Chart is primed for the move, hunting for the tightest entry on the micro-reversal!",
            "Never rush: a smart trader always waits for the micro-reversal to secure the ideal entry price!",
        ),
        "trade_loss_switch": (
            "Alright, this pair is getting choppy and acting erratic. Won't waste time here — switching to a cleaner chart!",
            "Market noise picked up on this asset, no worries! Picking a calmer currency pair to recover cleanly!",
            "See how candles are chopping around the level? A smart trader doesn't argue with noise — switching to clean trend!",
            "This currency pair is behaving erratically today. Moving our terminal to a clearer asset to lock in the profit!",
            "No point forcing trades into chop. Opening a fresh high-payout pair to execute our recovery smoothly!",
            "Market makers throwing wicks in both directions here. Leaving this pair behind for a clear technical trend!",
        ),
        "switch_pair": (
            "Let's scan another currency pair and find the cleanest setup for our next entry!",
            "Looking for the highest quality momentum. Switching to a fresh pair with top payout!",
            "Notice how this asset entered a tight consolidation box? We don't trade inside a fence — moving to an active pair!",
            "Momentum slowed down on this chart, no need to force risk. Finding an asset with clear directional movement!",
            "A disciplined trader waits for prime setups. Switching to the next pair on our watchlist!",
            "We captured our gains on this move, now price is resting. Moving to a fresh pair with great volatility!",
            "Scanning neighboring currency pairs to pinpoint the highest probability entry!",
        ),
        "flat_skip": (
            "Let's scan another currency pair and find the cleanest setup for our next entry!",
            "Looking for the highest quality momentum. Switching to a fresh pair with top payout!",
            "Notice how this asset entered a tight consolidation box? We don't trade inside a fence — moving to an active pair!",
            "Momentum slowed down on this chart, no need to force risk. Finding an asset with clear directional movement!",
            "A disciplined trader waits for prime setups. Switching to the next pair on our watchlist!",
            "We captured our gains on this move, now price is resting. Moving to a fresh pair with great volatility!",
            "Scanning neighboring currency pairs to pinpoint the highest probability entry!",
        ),
        "ask_chat": (
            "Drop your favorite currency pairs in the comments! Let's analyze the charts together and find a great setup!",
            "Chat, what asset should we look at next? Tell me in comments and let's hunt for an entry!",
            "Friends trading along with me — drop any currency pair in the chat, I'll switch over and break it down!",
            "What should we analyze next — Euro Dollar, Pound, or Aussie? Send your votes in the chat right now!",
            "Don't hesitate, drop the pair you want to test! And the full signal bot is waiting for you in the bio!",
            "Where are we hunting for our next green trade? Drop your top pairs in chat, time for technical analysis!",
            "Let's pick the next asset together! Tell me in chat which chart to open, and let's enter live!",
        ),
    },
}
