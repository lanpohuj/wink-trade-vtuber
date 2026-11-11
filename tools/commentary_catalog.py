"""Editorial source for 80 contextual recordings per language."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def catalog():
    rows = []

    def add(category, pairs, conditions=None, delivery="bright and conversational"):
        for ru, en in pairs:
            variant = (
                sum(r["category"] == category and r["lang"] == "ru" for r in rows) + 1
            )
            for lang, text in [("ru", ru), ("en", en)]:
                rows.append(
                    dict(
                        id=f"comment_{lang}_{category.lower()}_{variant:02}",
                        category=category,
                        lang=lang,
                        text=text,
                        tts_text=f"[{delivery}] {text}",
                        conditions=conditions or {},
                        voice_id="1db1618b6eaf4571ac7db70e20eb6727"
                        if lang == "ru"
                        else "e34c486929524d41b88646b4ac2f382f",
                        text_version=1,
                        text_sha256=hashlib.sha256(text.encode()).hexdigest(),
                    )
                )

    add(
        "NARRATE_SCAN",
        [
            (
                "Сравниваю графики. Мне нужен понятный сценарий, а не просто движение.",
                "Comparing charts. I want a clear setup, not just movement.",
            ),
            (
                "Смотрю, кто сейчас ведёт цену. С направлением спешить не будем.",
                "Watching who is driving price. No rush to pick a direction.",
            ),
            (
                "Проверяю подтверждения. Красивая свеча ещё не вся история.",
                "Checking confirmation. One pretty candle is not the whole story.",
            ),
            (
                "Сейчас разбираю структуру. Главное — не перепутать импульс с откатом.",
                "Reading the structure. An impulse and a pullback are different things.",
            ),
            (
                "Подгружаются данные графика. Пока ничего не додумываю.",
                "Chart data is loading. I will not fill the gaps with guesses.",
            ),
            (
                "Сверяю интервалы. Хочу видеть картину целиком.",
                "Checking timeframes. I want to see the bigger picture.",
            ),
            (
                "Ищу подтверждение входа. Интересный момент ещё должен сложиться.",
                "Looking for entry confirmation. An interesting move still needs a setup.",
            ),
            (
                "Разбираем спокойно. Движение есть не всегда значит пора входить.",
                "Taking a careful look. Movement does not always mean an entry.",
            ),
        ],
    )
    add(
        "NARRATE_PAIR",
        [
            (
                "Следующий график. Посмотрим, будет ли здесь понятнее.",
                "Next chart. Let us see if this one is clearer.",
            ),
            (
                "Новая пара — новая проверка. Старые выводы сюда не переносим.",
                "New pair, fresh checks. The last chart tells us nothing here.",
            ),
            (
                "Сравниваю ещё один вариант. Выбор не сводится к первой попавшейся паре.",
                "Comparing another option. We do not have to take the first pair.",
            ),
            (
                "Продолжаю поиск. Мне интересен сценарий, а не количество переключений.",
                "Still looking. The setup matters more than how many charts we scan.",
            ),
            (
                "Посмотрим другой график. Иногда лучший ход — поискать дальше.",
                "Let us try another chart. Sometimes the right move is to keep looking.",
            ),
            (
                "Здесь начинаю проверку заново: направление, структура и подтверждение.",
                "Starting fresh here: direction, structure, and confirmation.",
            ),
        ],
    )
    families = {
        "TREND_PULLBACK": [
            (
                "после отката движение возобновилось",
                "the move resumed after a pullback",
            ),
            (
                "откат завершился, движение получило подтверждение",
                "the pullback ended with confirmation",
            ),
        ],
        "BREAKOUT_RETEST": [
            (
                "пробитый уровень удержался после возврата",
                "the broken level held on the retest",
            ),
            (
                "после пробоя прошёл подтверждённый ретест",
                "a confirmed retest followed the breakout",
            ),
        ],
        "RANGE_REJECTION": [
            (
                "цена отреагировала на границу диапазона",
                "price reacted at the edge of the range",
            ),
            (
                "от границы диапазона получено подтверждение",
                "the range boundary gave confirmation",
            ),
        ],
        "LOCAL_REVERSAL": [
            (
                "реакция на уровень изменила локальную структуру",
                "the level reaction changed local structure",
            ),
            (
                "локальный разворот получил подтверждение",
                "the local reversal gained confirmation",
            ),
        ],
    }
    for family, variants in families.items():
        for direction, category in [
            ("BUY", "OPEN_TRADE_CALL"),
            ("SELL", "OPEN_TRADE_PUT"),
        ]:
            for ru, en in variants:
                add(
                    category,
                    [
                        (
                            f"Открыла {'вверх' if direction == 'BUY' else 'вниз'}: {ru}.",
                            f"Opened {'up' if direction == 'BUY' else 'down'}: {en}.",
                        )
                    ],
                    {
                        "setup": family,
                        "direction": direction,
                        "setup_confirmed": True,
                        "open_observed": True,
                    },
                    "confident and lively",
                )
    expiries = {
        "15s": [
            (
                "Выбрала пятнадцать секунд: здесь важен короткий подтверждённый импульс.",
                "Fifteen seconds here: the confirmed short impulse matters.",
            ),
            (
                "Это короткое окно на пятнадцать секунд, не прогноз большого тренда.",
                "This is a fifteen-second window, not a call on the whole trend.",
            ),
        ],
        "30s": [
            (
                "Здесь окно в тридцать секунд. Смотрим продолжение подтверждённого движения.",
                "A thirty-second window here. Watching the confirmed move continue.",
            ),
            (
                "Тридцать секунд выбраны под этот сетап, а не по привычке.",
                "Thirty seconds fits this setup; it is not a default choice.",
            ),
        ],
        "1m": [
            (
                "Выбрала минуту. Этому сценарию нужно более длинное окно.",
                "I chose one minute. This setup needs a longer window.",
            ),
            (
                "Это минутная сделка. Не оцениваем её по одному короткому тику.",
                "This is a one-minute trade. One quick tick does not tell its story.",
            ),
        ],
        "2m": [
            (
                "Здесь две минуты: ориентир — структура старшего интервала.",
                "Two minutes here: the higher timeframe structure is the context.",
            ),
            (
                "Выбрано двухминутное окно, поэтому следим за структурой движения.",
                "We chose a two-minute window, so we follow the structure of the move.",
            ),
        ],
    }
    for expiry, pairs in expiries.items():
        add("NARRATE_EXPIRY", pairs, {"expiry": expiry})
    add(
        "NARRATE_TRADE",
        [
            (
                "Сделка ещё идёт. Итог за нас определит закрытие, не эмоции.",
                "The trade is still running. The close decides the result, not emotions.",
            ),
            (
                "Следим за движением. Пока сделка открыта, результат не объявляю.",
                "Watching the move. No result announcement while the trade is open.",
            ),
            (
                "Сейчас просто наблюдаем. Новую сделку поверх этой не открываем.",
                "Just observing now. We are not stacking another trade on top.",
            ),
            (
                "Движение может меняться. Результат проверим после закрытия.",
                "The move can change. We check the result after the close.",
            ),
            (
                "Сделка на экране, я слежу за её завершением.",
                "The trade is on screen. I am following it through to the close.",
            ),
            (
                "Спокойно досматриваем. Один рывок ещё не определяет исход.",
                "Watching it through calmly. One quick move is not the final result.",
            ),
            (
                "До закрытия не делаем выводов. Здесь важно терпение.",
                "No conclusions before the close. Patience matters here.",
            ),
            (
                "Продолжаем наблюдать. Счётчик изменится только после проверки результата.",
                "Still watching. The counter changes only after the result is checked.",
            ),
        ],
    )
    results = {
        "LOSS_GENERIC": [
            (
                "Минус зафиксирован. Этот результат не прячем, продолжаем по правилам.",
                "That loss is recorded. We do not hide it; we follow the rules.",
            ),
            (
                "Сделка не зашла. Спокойно разбираем следующий шаг.",
                "That trade did not work out. Let us take the next step calmly.",
            ),
        ],
        "LOSS_110": [
            (
                "Следующая ставка — сто десять. Перекрытие по плану, без обещаний результата.",
                "Next stake is one hundred ten. A planned recovery step, not a promised win.",
            ),
            (
                "Включён первый шаг перекрытия: ставка сто десять.",
                "The first recovery step is set: a stake of one hundred ten.",
            ),
        ],
        "LOSS_242": [
            (
                "Следующая ставка — двести сорок два. Это второй шаг перекрытия.",
                "Next stake is two hundred forty-two. This is the second recovery step.",
            ),
            (
                "Перекрытие перешло на второй шаг: двести сорок два.",
                "Recovery is on its second step: two hundred forty-two.",
            ),
        ],
        "LOSS_RESET": [
            (
                "Лимит перекрытий достигнут. Возвращаем базовые пятьдесят.",
                "The recovery limit is reached. Returning to the base stake of fifty.",
            ),
            (
                "Цикл перекрытий завершён. Дальше снова базовая ставка пятьдесят.",
                "The recovery cycle is complete. The base stake is fifty again.",
            ),
        ],
        "NEAR_LOSS": [
            (
                "Было близко к плюсу, но срезало на закрытии. По факту — минус.",
                "It was close to positive, but slipped at the close. The result is a loss.",
            ),
            (
                "На последних секундах движение изменилось. Закрытие чуть ниже порога плюса.",
                "The move changed in the final seconds. It closed just short of positive.",
            ),
        ],
    }
    for kind, pairs in results.items():
        add(
            "NARRATE_RESULT",
            pairs,
            {"result_kind": kind},
            "lighthearted and reassuring",
        )
    add(
        "NARRATE_VOLATILITY",
        [
            (
                "Движения стали резче обычного. Здесь особенно важно не спешить.",
                "The moves are sharper than usual. This is a time to be patient.",
            ),
            (
                "Размах свечей сейчас вырос. Не путаем активность с хорошим входом.",
                "Candle ranges have grown. More action does not mean a better entry.",
            ),
            (
                "График сейчас заметно штормит. Проверяем подтверждения внимательнее.",
                "The chart is getting choppy. We are checking confirmation carefully.",
            ),
            (
                "Свечи размахнулись сильнее обычного. Смотрю на структуру, не на азарт.",
                "Candles are stretching more than usual. Structure matters more than excitement.",
            ),
        ],
        {"high_volatility": True},
        "focused",
    )
    add(
        "NARRATE_LESSON",
        [
            (
                "Тренд задаёт контекст, а точку входа подтверждаем отдельно.",
                "The trend gives context; the entry needs its own confirmation.",
            ),
            (
                "Сильная свеча не повод догонять цену. У движения бывает предел.",
                "A strong candle is not a reason to chase price. A move can run out.",
            ),
            (
                "После пробоя важен возврат к уровню. Сам пробой ещё не весь сетап.",
                "After a breakout, the retest matters. The break alone is not the setup.",
            ),
            (
                "Смотрю на реакцию цены у уровня. Линия сама по себе ничего не решает.",
                "A level matters because of the reaction, not because of a pretty line.",
            ),
            (
                "Короткая экспирация требует своего подтверждения, длинная — своего.",
                "Short and long expiries need their own kinds of confirmation.",
            ),
            (
                "Откат и разворот — разные истории. Сначала смотрим структуру.",
                "A pullback and a reversal are different stories. Structure comes first.",
            ),
            (
                "Не каждый график обязан дать сделку. Пропуск тоже часть стратегии.",
                "Not every chart owes us a trade. Skipping is part of the strategy.",
            ),
            (
                "Старший интервал помогает не потерять контекст короткого движения.",
                "The higher timeframe keeps a short move in context.",
            ),
            (
                "Перекрытие меняет размер ставки. Следующая сделка тоже может дать минус.",
                "Recovery changes the stake size. The next trade can still lose.",
            ),
            (
                "Результат одной сделки не доказывает качество всей стратегии.",
                "One trade result does not prove the quality of a whole strategy.",
            ),
            (
                "У хорошего входа есть объяснение до результата, не только после.",
                "A good entry has a reason before the result, not just afterward.",
            ),
            (
                "Возле встречного уровня цене может не хватить места для движения.",
                "Near an opposing level, price may not have enough room to move.",
            ),
        ],
        delivery="curious and conversational",
    )
    add(
        "NARRATE_ENGAGE",
        [
            (
                "Чатик, вы обычно смотрите сначала на тренд или на уровни?",
                "Chat, do you usually look at the trend first, or the levels?",
            ),
            (
                "Кто любит разбирать графики спокойно? Кажется, мы с вами сработаемся.",
                "Who enjoys a calm chart breakdown? I think we will get along.",
            ),
            (
                "Если что-то в разборе непонятно, пишите. Объясню простыми словами.",
                "If anything in the breakdown is unclear, ask. I will keep it simple.",
            ),
            (
                "Здесь интересно не только закрытие, но и почему вообще появился вход.",
                "The close is interesting, but so is why the entry appeared at all.",
            ),
            (
                "Чатик, бывало у вас: одна свеча — и график уже выглядит иначе?",
                "Ever noticed how one candle can change your first impression of a chart?",
            ),
            (
                "Мне нравится разбирать ход решения вместе с вами, а не просто показывать кнопку.",
                "I like sharing the reasoning with you, not just showing a button.",
            ),
            (
                "Какая часть разбора вам интереснее: структура или момент входа?",
                "Which part interests you more: the structure, or the entry timing?",
            ),
            (
                "Продолжаем смотреть вместе. Вопросы по стратегии можно задавать в чат.",
                "Let us keep watching together. Questions about the strategy are welcome.",
            ),
        ],
        delivery="friendly and playful",
    )
    for row in rows:
        if row["category"] == "NARRATE_SCAN" and row["id"].endswith("_05"):
            row["conditions"] = {"data_status": "NO_DATA"}
    for row in rows:
        if row["id"] in (
            "comment_ru_narrate_engage_05",
            "comment_ru_narrate_lesson_04",
        ):
            row["requires_listening"] = True
    assert len(rows) == 160 and len({r["id"] for r in rows}) == 160
    return rows


if __name__ == "__main__":
    path = ROOT / "docs/voice-audit/commentary-160.json"
    path.write_text(
        json.dumps({"version": 1, "records": catalog()}, ensure_ascii=False, indent=2)
        + "\n"
    )
