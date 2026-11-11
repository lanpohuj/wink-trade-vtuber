"""Individually written RU/EN streamer lines; no combinatorial filler."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOICES = {
    "ru": "1db1618b6eaf4571ac7db70e20eb6727",
    "en": "e34c486929524d41b88646b4ac2f382f",
}


def catalog():
    rows = []

    def add(category, lines, conditions=None, deliveries=None):
        deliveries = deliveries or [
            "curious, conversational",
            "conversational, smiling",
            "warm, lightly playful",
        ]
        for index, line in enumerate(lines.strip().splitlines()):
            ru, en = [part.strip() for part in line.split(" | ", 1)]
            variant = 1 + sum(
                r["category"] == category and r["lang"] == "ru" for r in rows
            )
            for lang, text in [("ru", ru), ("en", en)]:
                cue = deliveries[index % len(deliveries)]
                rows.append(
                    dict(
                        id=f"streamer2_{lang}_{category.lower()}_{variant:02}",
                        lang=lang,
                        category=category,
                        text=text,
                        tts_text=f"[{cue}] {text}",
                        conditions=dict(conditions or {}),
                        voice_id=VOICES[lang],
                        text_version=1,
                        text_sha256=hashlib.sha256(text.encode()).hexdigest(),
                        delivery=cue,
                    )
                )

    add(
        "NARRATE_SCAN",
        """
Та-ак, что тут у нас? Сейчас сверю пару интервалов — хочу понять, где движение, а где просто суета. | Okay, what have we got here? Let me check the other timeframe. I want the bigger picture before I get involved.
Секунду, я ещё смотрю. Входить только потому, что свеча красивая, — ну такое, если честно. | Hang on, I'm still looking. A pretty candle alone isn't really enough to talk me into an entry.
Мне нравится сначала собрать картинку целиком. А уже потом решать, куда и на сколько заходить. | I like getting the whole picture first. Then I can work out the direction and how long to give it.
Так, без спешки. Сейчас разложу этот график по полочкам, а вы пока устраивайтесь поудобнее. | Right, no rush. Let me work through this chart while you get comfortable.
Чат, я на графике. Ищу момент, который можно нормально объяснить, а не просто ткнуть кнопку. | I'm on the chart, chat. Looking for an entry I can actually explain, rather than just clicking something.
Ну что, посмотрим, есть ли здесь что-то интересное. Уговаривать график я сегодня не планирую. | Let's see if there's anything interesting here. I'm not planning to sweet-talk a chart into a setup.
Сначала направление, потом точка входа. Да, я люблю порядок, хотя по мне иногда и не скажешь. | Direction first, entry second. I do like a bit of order, even if I don't always look like it.
Я сейчас сравниваю варианты. Хочется найти тот, где не приходится придумывать половину объяснения. | I'm comparing the options. I'd rather find one where I don't have to invent half the explanation.
Смотрю чуть шире, чем одна свечка. Одна свечка тоже умеет красиво отвлекать, между прочим. | Looking beyond one candle here. A single candle can be a surprisingly good distraction.
Так, дайте мне ещё секундочку. Проверю, совпадает ли короткое движение с общей картиной. | Give me another second. I'm checking whether the short move fits the bigger picture.
Сейчас не гадаю по цветам. Мне надо понять, как цена сюда пришла и что делает дальше. | I'm not guessing from the colours. I want to know how price got here and what it's doing now.
Я лучше ещё раз сверю график. Открыть сделку быстро — не проблема, выбрать момент уже интереснее. | I'd rather check again. Clicking quickly is easy; choosing the moment is the interesting part.
Чатик, я не пропала, я копаюсь в графике. Хочу, чтобы следующий вход был с понятной идеей. | Still here, chat, just digging into the chart. I want a clear idea behind the next entry.
Ищу не самую громкую свечу, а понятную ситуацию. Громких тут и без меня хватает. | Looking for a clear situation, not the loudest candle. There's already plenty of noise without me.
Вот сейчас как раз та часть, которую обычно хочется промотать. А я проверю её внимательно. | This is the bit people usually want to skip. I'm giving it a proper look.
Так, сначала сверим интервалы. Я не хочу делать большой вывод из маленького кусочка графика. | Let's compare the timeframes first. I don't want a big conclusion from a tiny slice of the chart.
Мне нужен момент, где условия складываются вместе. По одной красивой детали решение не собираю. | I want the conditions to come together. One nice-looking detail doesn't make the whole decision.
Сейчас смотрю и направление, и расстояние до уровня. Просто угадать сторону мне мало. | Checking direction and the room around the level. Picking a side is only part of it.
С графиком как с перепиской: вырвать одно сообщение из контекста — и уже совсем другая история. | Charts are a bit like messages. Take one out of context and suddenly it's a different story.
Так, проверим этот вариант спокойно. Мне хочется видеть продолжение идеи, а не самой её дописывать. | Let's give this one a calm look. I want the chart to support the idea, not finish the story for it.
Вход пока не объявляю. Я ещё сравниваю, какой сценарий вообще подходит к этой картинке. | No entry call yet. I'm still checking which setup actually fits this picture.
Смотрю, что здесь можно прочитать без натяжки. Если надо долго себя убеждать, это уже повод задуматься. | Looking for a reading that doesn't need stretching. If I have to talk myself into it, that's worth noticing.
Дайте мне собрать пазл. Я знаю, кнопка большая и красивая, но это не аргумент для входа. | Let me put the pieces together. I know the button looks inviting, but that's not an entry reason.
Я сейчас проверяю несколько вещей сразу. Красивую историю про график можно сочинить любую, мне нужны условия. | I'm checking a few things together. Anyone can tell a nice chart story; I want the conditions behind it.
Без суеты, я тут. Сверяю короткий участок с тем, что происходит на старшем интервале. | No panic, I'm here. Comparing the short stretch with what's happening on the higher timeframe.
Так, где здесь идея для входа? Сейчас проверю, есть ли она вообще, прежде чем выбирать время. | Right, where's the entry idea here? I'll check that before choosing the expiry.
Чат, вот этот момент люблю: сначала ничего не очевидно, а потом начинаешь раскладывать детали. | I like this part, chat. Nothing looks obvious at first, then you start unpacking the details.
Я пока в поиске. Лучше честно сказать, что проверяю, чем торжественно объявить первое, что увидела. | Still looking. I'd rather say I'm checking than dramatically announce the first thing I see.
Сейчас посмотрю, что подтверждается на разных интервалах. Так понятнее, куда может пойти график. | Let's see what lines up across the timeframes. That gives me a clearer idea of where price might go.
У меня тут маленькое расследование. Проверю график, а красивую речь оставлю на потом. | Tiny chart investigation going on here. Let me check the evidence before making the speech.
""",
    )
    add(
        "NARRATE_SCAN",
        """
Секундочку, график ещё подгружается. Сначала дождусь данных, а потом уже буду умничать. | One second, the chart's still loading. I'll wait for the data before acting clever.
Тут пока догружается история. По пустому экрану анализ не устроишь, даже с очень уверенным голосом. | The history's still coming in. A confident voice won't make an empty chart useful.
Жду данные по этой паре. Да, это самая негламурная часть, но без неё никуда. | Waiting for this pair's data. Not the glamorous bit, I know, but we do need it.
Так, данные ещё собираются. Я пока ничего не объявляю, чтобы потом не переобуваться на ходу. | The data's still arriving. I'll hold the call rather than backtrack a second later.
Сейчас появится история, и посмотрим нормально. Пока что я держу паузу, а не рисую выводы из воздуха. | Once the history arrives, I can take a proper look. Until then, no conclusions out of thin air.
Дайте графику загрузиться. Я бы тоже хотела всё мгновенно, но сначала нужна сама картинка. | Let's let the chart load. I'd love everything instantly too, but first I need the actual picture.
""",
        {"data_status": "NO_DATA"},
    )
    add(
        "NARRATE_PAIR",
        """
Так, переехали на другую пару. Сейчас посмотрим, что интересного у нас здесь. | Right, new pair. Let's see what this one's got for us.
Меняю декорации! Новый график, так что прошлые выводы оставляем на прошлой паре. | Change of scenery! New chart, so the last pair's conclusions stay with the last pair.
Вот и следующий кандидат. Посмотрим спокойно, без любви с первого взгляда к одной свече. | Here's the next candidate. Let's not fall in love with the first candle we see.
Поехали дальше, чат. У этой пары своя история, сейчас быстро с ней познакомлюсь. | Moving on, chat. This pair has its own story; let me get acquainted.
Новая пара на экране. Я сначала разберусь, а восторгаться буду по факту. | New pair on screen. I'll figure it out first and save the excitement for a reason.
Так, заглянем сюда. Иногда сменить график полезнее, чем спорить с предыдущим. | Let's have a look here. Changing charts can be more useful than arguing with the last one.
Переключились. Сейчас главное — не притащить сюда ожидания от старого графика. | Switched over. The important bit is not dragging my expectations from the old chart along.
Ещё один вариант, смотрим. Я сегодня за нормальный выбор, а не за верность первой попавшейся паре. | Another option, let's look. I'm choosing a setup, not pledging loyalty to the first pair.
Чат, новый график подъехал. Сейчас сверю направление и посмотрю, есть ли за что зацепиться. | Fresh chart just landed, chat. I'll check direction and see if there's an idea worth following.
Переходим сюда. Только не будем сразу решать, что здесь лучше: сначала проверка. | Over here next. Let's not decide it's better before I've actually checked it.
Так, эту пару ещё не разобрали. Дайте мне момент, посмотрю её без предвзятости. | We haven't worked through this pair yet. Give me a moment for a fresh look.
Смена кадра! Сейчас я опять чуть-чуть зануда: интервалы, структура, потом уже решение. | New scene! Time for my slightly fussy bit again: timeframes, structure, then the decision.
Посмотрим ещё один график. Мне нравится иметь выбор, а не делать вид, что других вариантов нет. | Let's check another chart. I like having options rather than pretending there's only one.
Вот здесь начну с чистого листа. Предыдущая пара не выдаёт рекомендаций за эту. | Starting fresh here. The previous pair doesn't get to make this one's decisions.
Так, новый актив. Сначала знакомство с графиком, потом уже какие-то серьёзные отношения. | New asset. Let's get to know the chart before making any serious commitments.
Поехали смотреть дальше. Устраивать драму из-за одного пропущенного графика точно не будем. | On to the next one. One skipped chart doesn't need a whole drama.
""",
    )
    add(
        "NARRATE_LESSON",
        """
Знаете, что легко перепутать? Сильное движение и хороший момент для входа. Это всё-таки разные вещи. | You know what's easy to mix up? A strong move and a good entry moment. They're different things.
Я не выбираю время сделки по настроению. Сначала смотрю ситуацию, потом решаю, какое окно ей подходит. | I don't choose the expiry by mood. I read the setup first and then choose the window.
Мне важно, что цена делает у уровня. Просто нарисовать красивую линию — это ещё полдела. | What matters is how price behaves at a level. Drawing a pretty line is only the beginning.
Если короткий вход не складывается, я проверяю длинный отдельно. Минуту не назначают в наказание пятнадцати секундам. | If the short entry doesn't fit, I check the longer one separately. A minute isn't a punishment for fifteen seconds.
Самая коварная мысль — что надо обязательно успеть. График не знает, что мы тут торопимся. | The sneaky thought is that you have to catch it. The chart has no idea we're feeling impatient.
Я люблю, когда могу объяснить вход простыми словами. Если самой непонятно, красивый термин не спасёт. | I like being able to explain an entry simply. A fancy term won't rescue an idea I can't explain.
Одна зелёная свеча — ещё не весь тренд. Звучит скучно, зато очень легко забывается в моменте. | One green candle isn't the whole trend. Sounds obvious, but it's easy to forget in the moment.
Сначала смотрю старший интервал, потом детали. Как сначала карту открыть, а уже потом искать нужный поворот. | Bigger timeframe first, details second. Like opening the map before looking for your turn.
Мне нравится проверять идею, а не защищать её любой ценой. Даже если я уже красиво её объяснила. | I'd rather test an idea than defend it at any cost. Even after I've made it sound lovely.
Уровень для меня — место, где смотрю реакцию. Не магическая стенка, которая обязана удержать цену. | A level is somewhere to watch the reaction. Not a magic wall that has to hold price.
Откат и разворот иногда выглядят похоже. Поэтому одной свечой я эти вопросы не закрываю. | Pullbacks and reversals can look alike. That's why one candle doesn't settle it for me.
Я смотрю несколько интервалов, потому что крупный план без общего иногда очень обманчив. | I check several timeframes because a close-up without the wide shot can be misleading.
После пробоя интересен возврат к уровню. Мне важнее, как его удерживают, чем сам эффектный рывок. | After a breakout, the return to the level matters. I care more about the hold than the dramatic jump.
Когда график не даёт понятной точки, пропуск — тоже решение. Да, без фанфар и красивого таймера. | If the chart gives no clear entry, skipping is a decision too. Just without the fanfare and countdown.
Длинная сделка не становится спокойнее просто от своего названия. Ей тоже нужен подходящий сценарий. | A longer trade isn't calmer just because of its name. It needs a suitable setup too.
Мне важно расстояние до ближайшего уровня. Направление может нравиться, а места для движения быть мало. | The distance to the next level matters. I can like a direction and still have too little room.
График может поменяться, пока я объясняю идею. Поэтому перед входом ещё раз сверяю, что она жива. | A chart can change while I'm explaining it. So I check the idea again just before entry.
Не пытаюсь быть права в каждой свече. Я смотрю условия, а не спорю с экраном. | I'm not trying to be right about every candle. I'm checking conditions, not arguing with a screen.
Мне мало красивого названия сетапа. Хочу видеть на графике то, о чём говорю, а не впечатлять терминами. | A nice setup name isn't enough for me. I want the chart to show what I'm describing, not just sound impressive.
В диапазоне смотрю реакцию у края. Покупать просто потому, что цена низко, для меня слишком короткое объяснение. | In a range, I watch the edge reaction. Just saying price is low isn't enough of an explanation.
Если движение уже убежало, это не повод мчаться за ним. Я лучше проверю следующий понятный момент. | If the move has already run off, I don't need to chase it. I'll check for the next clear moment.
Мне не нужен каждый график. Мне нужен тот, на котором условия совпали именно сейчас. | I don't need every chart. I need one where the conditions line up right now.
Разные интервалы могут спорить. Это нормально; я не буду выбирать только тот, который говорит приятное. | Timeframes can disagree. That's normal; I won't just pick the one saying what I want to hear.
Прогноз и итог — разные вещи. Пока сделка идёт, я не записываю победу авансом. | A forecast and a result are different things. I don't book a win while the trade is still running.
Для разворота мне мало, что цена устала расти. Хочу увидеть, что локальная структура действительно меняется. | A tired-looking rise isn't enough for a reversal. I want to see local structure actually change.
После минуса я не меняю объяснение задним числом. Лучше понять, что было, чем красиво себя оправдать. | After a loss, I don't rewrite the reason for entry. I'd rather understand it than make excuses.
Мне нравится простой вопрос: что отменит эту идею? Он иногда полезнее десяти аргументов за неё. | I like a simple question: what would cancel this idea? Sometimes that's worth more than ten arguments for it.
Я не ускоряю вход ради красивой картинки в эфире. Лучше объясню, чего сейчас жду. | I won't rush an entry for a better-looking stream. I'd rather explain what I'm waiting for.
Когда данных мало, я так и говорю. Голос поувереннее не добавит недостающие свечи. | When data is missing, I say so. A more confident voice won't add the candles we don't have.
Даже хороший сценарий может закрыться не в нашу сторону. Поэтому реакция на итог тоже часть плана. | Even a good-looking setup can close against us. Handling the result is part of the plan too.
Я сравниваю варианты, а не коллекционирую нажатия. В этом и есть смысл сначала посмотреть несколько пар. | I'm comparing options, not collecting clicks. That's the point of looking across a few pairs.
Маленькая деталь, но важная: направление сделки и её время я проверяю вместе, а не по отдельности. | A small but useful detail: I check direction and expiry together, not as separate guesses.
""",
        deliveries=[
            "friendly, conversational",
            "thoughtful, relaxed",
            "lightly playful",
        ],
    )
    add(
        "NARRATE_ENGAGE",
        """
Кто только зашёл — привет! Мы тут разбираем графики по ходу дела, можно спокойно спрашивать, что непонятно. | If you've just joined, hey! We're reading charts as we go, so feel free to ask about anything unclear.
Чат, вам удобнее, когда я объясняю сам вход или сначала показываю общую картину? Любопытно. | Chat, do you prefer the entry explanation or the big picture first? I'm curious.
Если потеряли мысль, спросите. Я лучше объясню по-человечески, чем оставлю вас один на один с терминами. | If I lose you, ask. I'd rather explain it simply than leave you wrestling with the terminology.
Кто смотрит с телефона, вам карточку сделки нормально видно? Я иногда забываю, насколько там всё маленькое. | If you're on your phone, can you read the trade card okay? I forget how tiny things get on that screen.
Мне нравится, когда вы спрашиваете, почему именно так. Это интереснее, чем просто молча смотреть на таймер. | I like it when you ask why. That's more interesting than silently staring at a countdown together.
Чат, а вы сначала замечаете движение цены или сразу ищете уровни? У всех, кажется, свой первый взгляд. | What do you notice first, chat: the price move or the levels? Everyone seems to have a different first look.
Только давайте без экзамена на знание сокращений. Если говорю непонятно — переводим на обычный язык. | No quiz on trading abbreviations here. If I make it sound complicated, we'll put it into plain English.
Кто здесь впервые, устраивайтесь. Я Винки, и комментировать графики вслух — это как раз моя история. | First time here? Make yourself comfortable. I'm Winky, and talking through charts is very much my thing.
Интересно, кто у нас любит разбирать причины входа, а кто больше следит за самим движением? | I'm curious: who enjoys the entry reasoning, and who mostly watches the move itself?
Если хочется, чтобы я объяснила какой-то момент подробнее, напишите сам момент. Так будет проще не разминуться. | If you'd like more detail, tell me which bit. That makes it easier for us to stay on the same page.
Мне нравится, когда чат замечает детали. Иногда один хороший вопрос делает разбор намного интереснее. | I love it when chat notices the details. One good question can make the whole discussion more interesting.
Так, кто с нами с начала эфира, а кто только залетел? Всем привет, даже если пока смотрите молча. | Who's been here from the start, and who just dropped in? Hey to the quiet viewers too.
Можно не соглашаться с моей идеей. Только расскажите, что именно видите на графике, — вот это интересно. | You can disagree with my read. Tell me what you're seeing on the chart; that's the interesting part.
Чатик, если я увлекусь терминами, возвращайте меня на землю. Объяснить просто — тоже навык. | If I disappear into jargon, chat, bring me back. Keeping things simple takes practice too.
Заходите без стеснения. Вопрос «а почему?» здесь вообще один из самых полезных. | Don't be shy about asking. Why is honestly one of the most useful questions here.
Кому удобнее коротко и по делу, а кому нравится разбор с деталями? Пытаюсь поймать ваш темп. | Do you like quick explanations or a bit more detail? I'm trying to find your pace.
Если вы просто фоном смотрите, тоже привет. Я постараюсь говорить так, чтобы смысл не терялся без экрана. | Hey to anyone watching in the background too. I'll try to keep things clear even without the screen.
Чат, вы больше любите наблюдать короткие сделки или разбирать минутные? Именно смотреть, не повторять за мной. | Chat, do you prefer watching the short trades or unpacking the minute-long ones? Watching, not copying me.
Мне интересно, какой момент здесь обычно вызывает больше вопросов: выбор пары, направления или времени? | Which part tends to raise the most questions: the pair, the direction, or the expiry?
Кто только подключился, не надо догонять всё сразу. По ходу объясню, что сейчас делаем. | If you just joined, no need to catch up all at once. I'll explain what we're doing as we go.
Я люблю вопросы без сложных слов. Иногда «почему не сейчас?» — это целый хороший разбор. | I like simple questions. Why not now can turn into a really useful discussion.
Если что-то на экране мелковато, скажите. Мне хочется, чтобы вы видели смысл, а не просто красивые огоньки. | Let me know if anything's too small on screen. I want you seeing the idea, not just the pretty lights.
Чат, можно честно: что труднее смотреть — ожидание входа или последние секунды сделки? | Be honest, chat: which is harder to watch, waiting for an entry or the last seconds of a trade?
Рада тем, кто не только за плюсами заглянул, но и хочет понять сам процесс. Вот это мне близко. | Lovely to see people interested in the process as well as the green closes. That's my kind of conversation.
""",
        deliveries=["friendly, curious", "warm, conversational", "smiling, relaxed"],
    )
    add(
        "NARRATE_TRADE",
        """
Так, сделка идёт. Всё, кнопку оставляем в покое, теперь смотрим, как закончится эта история. | Right, the trade's running. Hands off the button now; let's see how this one finishes.
Я на графике, чат. Пока не празднуем и не драматизируем — у нас ещё идёт время. | I'm watching, chat. No celebrating or spiralling yet; the clock's still running.
Сейчас самое сложное — просто дать сделке закончиться. Таймер от моего взгляда быстрее не побежит. | The tricky bit now is letting it finish. Staring at the timer won't speed it up.
Наблюдаем дальше. Я знаю, хочется уже итог, но сначала пусть график договорит. | Still watching. I know we want the result already, but let's let the chart finish its sentence.
Сделка в работе, я здесь. Новых выводов каждые полсекунды устраивать не буду. | Trade's in progress, I'm here. No need for a whole new conclusion every half-second.
Так, держим внимание на этой сделке. Параллельно открывать вторую ради движухи не собираюсь. | Keeping my attention on this trade. I'm not opening another one just to keep things busy.
Вот теперь наблюдаем, без лишней суеты. Мне самой интересно, как закроется именно этот вход. | Now we watch, without the fuss. I'm interested in how this particular entry closes too.
Чат, до результата ещё не дошли. Красивую финальную реплику пока придержу. | We're not at the result yet, chat. I'll save the grand finale for the actual close.
Смотрю до закрытия. Одна удачная секунда по дороге ещё не ставит точку в сделке. | Watching through to the close. One good second along the way doesn't finish the trade.
Теперь уже не подгоняем график словами. Сделка открыта, следим за фактическим движением. | No talking the chart into it now. The trade's open; we're watching what actually happens.
Мне нравится разбирать вход, а вот ждать закрытия приходится всем одинаково. Сидим красиво, наблюдаем. | I enjoy unpacking an entry, but everyone has to wait for the close. Settle in; we're watching.
Так, здесь пока без итога. Если я вдруг стану слишком торжественной, напоминайте про таймер. | No result here yet. If I sound too triumphant, feel free to remind me about the clock.
Продолжаю смотреть эту сделку. Финальную оценку оставлю до её закрытия, так честнее. | Still following this trade. I'll leave the final verdict until it closes; that's only fair.
Сейчас ничего дополнительно не нажимаю. Мне важнее довести до конца уже открытый вход. | I'm not clicking anything extra. I'd rather follow the entry we already have through to the end.
Чатик, пока всё внимание сюда. Следующую пару будем разбирать уже после этой сделки. | Keeping the attention here, chat. We can look at the next pair after this trade.
Вот эта часть — без перемотки. Смотрим реальное движение до самого закрытия. | This is the bit with no fast-forward button. Following the actual move all the way to the close.
Я ещё не знаю итог, сделка идёт. Зато могу спокойно дождаться и проверить его нормально. | I don't have the result yet; it's still running. I can wait and check it properly, though.
Не буду сейчас озвучивать каждое колебание. Сначала посмотрим, чем всё действительно закончится. | I won't narrate every tiny wobble. Let's see how it actually ends first.
Так, даём сценарию своё время. Не надо переименовывать его после каждого движения свечи. | Let's give the setup its time. We don't need to rename it after every candle movement.
Сделка ещё на экране, я слежу. Итог объявлю, когда будет что объявлять, без спойлеров из будущего. | The trade's still on screen and I'm following it. I'll call the result when there is one, no future spoilers.
Сейчас просто смотрим. Самое время проверить, умеем ли мы ждать без маленького сериала в голове. | Just watching now. A good time to practise waiting without writing a whole drama in our heads.
Я здесь, не переключаюсь. Хочу видеть не только красивое начало, но и фактическое закрытие. | I'm here, staying on this one. I want the actual close, not just a nice-looking beginning.
Пока наблюдаем эту сделку. Мне не хочется мешать ожиданию десятью разными прогнозами за минуту. | Still following this trade. I don't want ten different predictions cluttering up the wait.
Так, сделка работает по выбранному времени. Я лучше оставлю пару спокойных секунд, чем буду говорить ради слов. | The trade's running on its chosen expiry. I'd rather leave a calm moment than talk just to fill it.
""",
    )
    expiries = {
        "15s": """
Здесь пятнадцать секунд. Короткая история, так что следим внимательно и не растягиваем её на большой прогноз. | Fifteen seconds here. A short little chapter, so I'm watching closely without calling a whole trend.
Выбрала пятнадцать секунд. Сейчас важен именно этот короткий участок, а не то, что будет через полчаса. | I've chosen fifteen seconds. This short stretch matters, not a guess about half an hour from now.
На этот вход — пятнадцать секунд. Да, времени немного, поэтому лишний монолог пока отложу. | Fifteen seconds for this entry. Not much room for a speech, so I'll save that for later.
Так, пятнадцатисекундная сделка уже идёт. Смотрим конкретное окно, без больших обещаний маленькому таймеру. | The fifteen-second trade is running. One specific window, no huge promises to a tiny countdown.
""",
        "30s": """
Выбрала тридцать секунд. Мне нужен этот отрезок движения, а не универсальное время на все случаи. | I've gone with thirty seconds. It fits this stretch, rather than being my answer to everything.
Здесь полминуты, чат. Смотрим, как отработает именно выбранное окно, а не каждая отдельная секунда. | Half a minute here, chat. Watching the chosen window, not judging every single second on its own.
На эту сделку — тридцать секунд. Время выбрано под идею входа, не просто любимая цифра. | Thirty seconds for this trade. Chosen for the entry idea, not because it's my favourite number.
Сделка на полминуты. Сейчас я лучше спокойно досмотрю, чем буду передумывать каждые два тика. | A thirty-second trade. I'd rather watch it through than change my mind every couple of ticks.
""",
        "1m": """
Здесь минутная сделка. Дадим ей эту минуту, а не будем требовать весь результат от первой свечки. | This is a one-minute trade. Let's give it that minute rather than demand everything from the first candle.
Выбрала минуту. Мне интересен этот более длинный участок, короткое мельтешение само по себе не итог. | I've chosen a minute. I'm following the longer stretch; the little flickers aren't a verdict on their own.
На вход поставлена минута. Так что я смотрю движение целиком, а не устраиваю финал каждые пять секунд. | A minute on this entry. I'm watching the move as a whole, not staging a finale every five seconds.
Так, минутное окно уже идёт. Здесь можно чуть выдохнуть и спокойно проследить за всей сделкой. | The one-minute window's running. We can take a breath and follow the whole trade.
""",
        "2m": """
Здесь две минуты, чат. Смотрю более широкий участок движения, а не пытаюсь ловить каждый маленький тик. | Two minutes here, chat. I'm following the wider stretch, not trying to catch every tiny tick.
Выбрала две минуты. Поэтому на одном коротком колебании я не буду переписывать всю идею. | I've chosen two minutes. One quick wobble isn't a reason to rewrite the whole idea.
Это двухминутная сделка. Времени больше, но итог всё равно объявляем только после закрытия. | This is a two-minute trade. More time, but the result still waits until the actual close.
Две минуты на эту историю. Сейчас важнее посмотреть движение в целом, чем спорить с каждой свечой. | Two minutes for this chapter. Better to follow the overall move than argue with each candle.
""",
    }
    for expiry, lines in expiries.items():
        add(
            "NARRATE_EXPIRY",
            lines,
            {"expiry": expiry},
            ["confident, conversational", "warm, relaxed"],
        )
    families = {
        "TREND_PULLBACK": """
Есть, открыла {ru}! После отката движение снова подтвердилось — вот эту идею сейчас и смотрим. | There we go, opened {en}! The move confirmed again after the pullback; that's the idea I'm following.
Так, сделка {ru} уже в работе. Откат закончился с подтверждением, теперь смотрим фактическое закрытие. | The {en} trade is running. We got confirmation after the pullback; now let's watch the actual close.
Зашла {ru}, чат. Здесь меня зацепило возобновление движения после отката, без гадания по одной свече. | I'm in {en}, chat. The move picking up after the pullback caught my attention, not just one candle.
Открыла {ru}. Мне здесь интересен именно выход из отката: подтверждение было, сделка уже на экране. | Opened {en}. It's the move out of the pullback I'm interested in; confirmation came and the trade's on screen.
Ну всё, {ru} открыто! Откат дал продолжение с подтверждением. Красивое объяснение есть, теперь ждём сам итог. | Right, {en} is open! The pullback gave confirmed continuation. That's the reasoning; now we wait for the result.
""",
        "BREAKOUT_RETEST": """
Открыла {ru}! После пробоя цена вернулась к уровню и удержала новую сторону — это и было важно. | Opened {en}! Price came back after the breakout and held the new side of the level. That was the key bit.
Есть вход {ru}, чат. Пробой проверился возвратом, не просто эффектная свеча на пустом месте. | We're in {en}, chat. The breakout got tested on the return, rather than just giving us a flashy candle.
Так, {ru} уже в работе. Мне здесь понравилось подтверждение на ретесте, а не сам первый рывок. | The {en} trade is running. I liked the confirmation on the retest, not just that first jump.
Зашла {ru}. Уровень после пробоя удержался на возврате. Вот теперь у этой идеи есть основание. | I'm in {en}. The level held when price came back after the break. That gives the idea something to stand on.
Сделка {ru} открыта! Не погналась за пробоем, дождалась подтверждённого ретеста. Смотрим дальше. | The {en} trade is open! I waited for the confirmed retest instead of chasing the breakout. Let's watch.
""",
        "RANGE_REJECTION": """
Открыла {ru}, чат! На границе диапазона появилась подтверждённая реакция — на неё и опираюсь. | Opened {en}, chat! We got a confirmed reaction at the range boundary; that's what I'm working with.
Так, вход {ru} уже на экране. Здесь идея от реакции у края диапазона, а не от желания поймать тренд. | The {en} entry is on screen. This one's about the range-edge reaction, not trying to find a trend.
Есть, зашла {ru}! От границы диапазона получили подтверждение. Теперь наблюдаем, без победных речей заранее. | There, I'm in {en}! The range boundary gave confirmation. Now we watch, no victory speech just yet.
Сделка {ru} открыта. Здесь смотрю отбой от края диапазона; реакция была, идею объяснила. | The {en} trade is open. I'm following the bounce from the range edge; we had a reaction behind the idea.
Ну что, {ru} в работе! Цена дала подтверждённый отбой у границы, теперь интересно досмотреть этот сценарий. | Right, {en} is running! Price gave a confirmed rejection at the boundary. Let's see this setup through.
""",
        "LOCAL_REVERSAL": """
Зашла {ru}! Здесь не просто остановка: локальная структура изменилась и дала подтверждение разворота. | I'm in {en}! More than just a pause here: local structure changed and confirmed the reversal.
Открыла {ru}, чат. Реакция у уровня перешла в подтверждённый локальный разворот — вот моя причина входа. | Opened {en}, chat. The level reaction developed into a confirmed local reversal; that's my entry reason.
Так, сделка {ru} уже идёт. Дождалась изменения локальной структуры, одной красивой тени мне было мало. | The {en} trade is running. I waited for local structure to change; one nice wick wasn't enough.
Есть вход {ru}! Идея здесь в подтверждённом локальном развороте. Не переименовываю его в новый большой тренд. | We're in {en}! It's a confirmed local reversal idea, not me declaring a whole new major trend.
Открыла {ru}. Сначала была реакция у уровня, потом подтверждение разворота. Теперь смотрим саму сделку. | Opened {en}. First the level reaction, then reversal confirmation. Now we follow the trade itself.
""",
    }
    for family, lines in families.items():
        for direction, category, ru, en in [
            ("BUY", "OPEN_TRADE_CALL", "вверх", "up"),
            ("SELL", "OPEN_TRADE_PUT", "вниз", "down"),
        ]:
            add(
                category,
                lines.format(ru=ru, en=en),
                {
                    "setup": family,
                    "direction": direction,
                    "setup_confirmed": True,
                    "open_observed": True,
                },
                ["confident, lively", "bright, conversational", "pleased, focused"],
            )
    add(
        "TRADE_WIN",
        """
Е-е, закрылись в плюс! Вот за такие моменты я и люблю следить за графиком. Красиво получилось! | There we go, that closed green! Okay, I did enjoy that one. Nice little moment for the stream!
Есть плюс, чат! Теперь уже можно улыбаться: результат подтверждён, не просто красивая картинка в процессе. | That's a green close, chat! Now I can smile about it; confirmed result, not just a nice moment mid-trade.
Красота, эту закрыли в плюс! Люблю, когда можно спокойно досмотреть и уже потом порадоваться. | Lovely, that one closed green! I like seeing it through and then enjoying the result.
Да-а, плюс записан! Только не будем из одной сделки делать легенду, дальше всё так же внимательно. | Yes, green is on the board! Let's not turn one trade into a legend, though. Same focus from here.
Вот теперь есть за что сказать «красиво»! Сделка закрылась в плюс, результат уже проверен. | Now there's a reason to say lovely! The trade closed green and the result's been checked.
Ура, здесь плюс! Маленький приятный момент эфира, можно выдохнуть и смотреть дальше. | Yay, that one's green! A nice little stream moment. Take a breath, then we carry on.
Закрылись в плюс, чатик! Спасибо тем, кто досмотрел со мной до самого конца. | Green close, chat! Thanks for watching that one all the way through with me.
Есть! Эта сделка в плюс. Я довольна, но корону из одного результата себе строить не буду. | There it is! That trade closed green. I'm pleased, but I'm not building myself a crown out of one result.
Плюс подтверждён! Вот теперь моя довольная интонация вполне по делу. | Green confirmed! Now the pleased voice is actually justified.
О, приятное закрытие — плюс! Люблю этот момент, когда таймер уже закончен и всё проверено. | Oh, nice close, green! I like the moment when the countdown's done and the result's checked.
Красиво закончили эту историю! Плюс на месте, дальше без лишнего геройства. | Nice ending to that chapter! Green is there; no need to get carried away now.
Да, эту забрали в плюс! Сейчас спокойно зафиксируем и вернёмся к графикам. | Yes, that closed green! Let's register it properly and get back to the charts.
Вот и результат: плюс! Можно пару секунд порадоваться, я разрешаю себе официально. | And there's the result: green! I'm officially allowing myself a little happy moment.
Чат, закрылись хорошо — плюс! Но следующий вход всё равно будем проверять с нуля. | That closed nicely, chat, green! The next entry still gets checked from scratch.
Мне нравится этот финал! Подтверждённый плюс, без объявления победы за пять секунд до закрытия. | I like that ending! Confirmed green, without calling a win five seconds too early.
Есть положительный итог! Я сейчас улыбаюсь вполне заслуженно, но дальше держим тот же темп проверки. | Positive result! The smile's earned this time, but we keep the same careful checks from here.
Окей, эта сделка закрыта в плюс. Приятно, спорить не буду! Дальше смотрим уже новую ситуацию. | Okay, that trade closed green. Lovely, no complaints from me! Next we look at a fresh situation.
Плюс, чат! Вот так можно порадоваться конкретному результату и не обещать ничего следующему графику. | Green, chat! We can enjoy this result without making promises about the next chart.
""",
        deliveries=["happy, smiling", "pleased, lively", "bright, warm"],
    )
    add(
        "TRADE_LOSS",
        """
Эх, тут минус. Неприятно, да. Сейчас спокойно разберусь и посмотрю, что предлагает следующий график. | Ah, that one closed red. Bit annoying, honestly. Let me reset and see what the next chart has for us.
Так, эту закрыли в минус. Расстраиваться можно, спорить с уже закрытой сделкой — занятие бесполезное. | Right, that closed red. It's okay to be annoyed; arguing with a closed trade won't get us anywhere.
Минус подтверждён, чат. Я не буду делать вид, что так и задумано. Спокойно идём по плану дальше. | Red confirmed, chat. I won't pretend that was the plan. We reset and follow the process.
Эх, не наш итог. Сделка в минус, сейчас без суеты проверю дальнейший шаг. | Ah, not our result. The trade closed red; I'll calmly check the next step.
Ну вот, эта не сложилась — минус. Неприятный момент, но превращать его в драму я не хочу. | Well, that one didn't work out, red. Not a fun moment, but I don't want to make a drama out of it.
Здесь закрылись в минус. Я лучше честно это скажу, чем начну придумывать красивое оправдание. | This one closed red. I'd rather say that plainly than start inventing a lovely excuse.
Так, результат отрицательный. Выдохнули, чат. Следующее решение не будем принимать из обиды. | Negative result. Take a breath, chat. The next decision doesn't need to come from frustration.
Эх, минус на закрытии. Сейчас мне важнее сохранить нормальный разбор, чем срочно доказать графику свою правоту. | Ah, red at the close. I'd rather keep the analysis sensible than rush to prove the chart wrong.
Эта сделка ушла в минус. Да, хотелось другого, но итог уже есть — работаем с тем, что произошло. | That trade closed red. Yes, I wanted a different finish, but we'll work with what actually happened.
Обидно, тут минус. Я могу расстроиться на секунду и всё равно не торопить следующий вход. | Annoying, that one's red. I can be disappointed for a second without rushing the next entry.
Зафиксировали минус. Сейчас спокойно посмотрю дальше, без обещания всё исправить одним нажатием. | Red registered. I'll take a calm look ahead, without promising to fix it all in one click.
Чат, эту закрыли не в нашу сторону. Минус честно учтён; дальше снова смотрим условия, а не эмоции. | That didn't close our way, chat. The loss is counted honestly; next we look at conditions, not emotions.
""",
        deliveries=[
            "slightly disappointed, composed",
            "thoughtful, conversational",
            "gentle, steady",
        ],
    )
    add(
        "TRADE_REFUND",
        """
О, возврат! Ну что, график оставил нас без финального поворота сюжета. Ставка вернулась. | Oh, a refund! The chart skipped the big plot twist this time. Stake returned.
Тут возврат, чат. Ни победную речь, ни грустную музыку не включаем — просто идём дальше. | A refund here, chat. No victory speech or sad soundtrack; we just move on.
Нулевой итог, ставка вернулась. Такой вот спокойный финал у этой сделки. | Neutral result, stake returned. A quiet ending for this trade.
Закрытие с возвратом. Ну, сегодня эта история решила обойтись без плюса и минуса. | That closed as a refund. This chapter decided to skip both the green and the red.
Возврат подтверждён! Баланс получил ставку обратно, дальше проверю новую ситуацию. | Refund confirmed! The stake's back; I'll check the next situation.
Так, здесь вернули ставку. Я этот итог не буду украшать словом «победа», он просто нейтральный. | The stake came back here. I won't dress that up as a win; it's a neutral result.
Чат, возврат. Сделка закончилась без итогового плюса или минуса, смотрим дальше спокойно. | Refund, chat. The trade finished without a net win or loss; we calmly carry on.
Ну вот, вернулись со ставкой. Не самый драматичный финал, зато итог понятен — возврат. | Well, we've got the stake back. Not the most dramatic ending, but the result's clear: refund.
""",
        deliveries=["lightly amused, relaxed", "warm, conversational"],
    )
    add(
        "NARRATE_RESULT",
        """
Следующий шаг — сто десять, перекрытие по плану. Но сам вход всё равно сначала проверю, просто так не жму. | Next step is one hundred and ten, as planned. I still check the entry first; the stake isn't a reason to click.
Так, теперь ставка сто десять. Шаг изменился, а требования к графику остались прежними. | Right, the stake's one hundred and ten now. The step changed; my chart checks didn't.
На следующую сделку выставлено сто десять. Сейчас ищу нормальную ситуацию, а не обещаю чудо после минуса. | One hundred and ten is set for the next trade. I'm looking for a proper setup, not promising a miracle after a loss.
Перекрытие сейчас на сто десять, чат. Это следующий шаг плана, а не повод торопиться с кнопкой. | The recovery step is one hundred and ten, chat. That's the planned step, not a reason to rush the button.
""",
        {"result_kind": "LOSS_110"},
        ["composed, conversational", "confident, steady"],
    )
    add(
        "NARRATE_RESULT",
        """
Следующий шаг — двести сорок два. Цифра больше, но график от этого понятнее не стал: снова проверяю условия. | Next step is two hundred and forty-two. A bigger number doesn't make the chart clearer; I check the conditions again.
Теперь выставлено двести сорок два. Дальше только по подтверждённому входу, без суеты после результата. | Two hundred and forty-two is set now. Next comes a confirmed entry, not a hurried reaction to the result.
Так, перекрытие на двести сорок два. План вижу, спешку выключаю, ищу следующую подходящую ситуацию. | Right, recovery step at two hundred and forty-two. Plan noted, hurry switched off; looking for a suitable setup.
На следующий вход ставка двести сорок два. Просто увеличение ставки не обещает нам другой исход. | The next entry's stake is two hundred and forty-two. Increasing it doesn't promise a different outcome.
""",
        {"result_kind": "LOSS_242"},
        ["composed, conversational", "focused, steady"],
    )
    add(
        "NARRATE_RESULT",
        """
Этот цикл перекрытия закончен, вернулись к пятидесяти. Начинаем проверку заново, без попытки спорить с прошлым. | That recovery cycle is finished; back to fifty. Fresh checks, without arguing with the past.
Так, снова базовые пятьдесят. Следующий график будем разбирать отдельно, он за предыдущие не отвечает. | Back to the base fifty. We'll read the next chart separately; it isn't responsible for the previous ones.
После этого шага вернулась база — пятьдесят. Сейчас спокойно пересоберу картину и начну проверку с чистого листа. | The stake returns to fifty after that step. I'll calmly rebuild the picture, no promises to recover everything at once.
""",
        {"result_kind": "LOSS_RESET"},
        ["composed, gentle"],
    )
    add(
        "NARRATE_RESULT",
        """
Эх, срезало на закрытии. В последние секунды были в положительной зоне, а итог вышел совсем рядом, но в минус. | Ah, caught at the close. It was positive in the final seconds, then finished just the wrong side, in red.
Вот обидный финал: прямо перед закрытием были в плюсовой зоне, но совсем небольшой сдвиг дал минус. | That's a frustrating finish: positive just before the close, then a tiny move left it red.
Тут действительно срезало под закрытие. До последнего были в положительной зоне, итоговый минус получился рядом со входом. | That really was caught at the close. Positive near the end, then a small red finish close to the entry.
""",
        {"result_kind": "NEAR_LOSS"},
        ["disappointed, composed"],
    )
    add(
        "NARRATE_VOLATILITY",
        """
Ого, вот сейчас движения стали заметно резче. Это не просто эмоция: последние свечи шире привычного диапазона. | Oh, the moves have got sharper now. That's not just me reacting; the recent candles are wider than usual.
Так, сейчас график ощутимо штормит. Диапазон последних свечей вырос, я это учитываю в комментарии. | The chart's getting choppy now. Recent candle ranges have expanded; that's what I'm pointing out.
Чат, тут движения разогнались. Не буду называть каждую резкую свечу красивой возможностью. | The moves have picked up, chat. I won't call every sharp candle a lovely opportunity.
Вот сейчас темп действительно изменился: последние свечи заметно шире. Так что без лишнего геройства. | The pace really has changed here: the recent candles are wider. No need to get heroic.
Ого, график добавил резкости. Есть измеренное расширение диапазона, а не просто мне показалось. | Oh, the chart's got a sharper edge. There's a measured range expansion behind that, not just a feeling.
Сейчас движения сильнее обычного, это видно по диапазону свечей. Устраивать восторг только из-за скорости я не буду. | Moves are stronger than usual, judging by the candle ranges. Speed alone isn't a reason for excitement.
""",
        {"high_volatility": True},
        ["alert, composed", "focused, conversational"],
    )
    add(
        "START_STREAM_READY",
        """
Всем привет! Винки на связи. Устраивайтесь, будем смотреть графики, разбирать входы и разговаривать по ходу. | Hey everyone, Winky here! Settle in; we'll watch charts, unpack the entries, and chat as we go.
Так, мы на месте! Всем, кто уже залетел, привет. Сейчас посмотрим рынок и начнём разбор без лишней суеты. | Right, we're here! Hey to everyone who's dropped in. Let's look at the charts and get into it without the rush.
Привет, чатик! Рада вас видеть. Сегодня снова смотрим графики вместе: я объясняю, вы спрашиваете, разбираемся. | Hey, chat! Lovely to see you. Charts together again: I'll explain, you ask, and we'll work through it.
Ну что, поехали! Я Винки. Здесь можно смотреть, задавать вопросы и спокойно разбирать, что происходит на графике. | Shall we get into it? I'm Winky. You can watch, ask questions, and follow what's happening on the chart.
""",
        deliveries=["welcoming, bright", "friendly, lively"],
    )
    assert len(rows) == 500, len(rows)
    assert len({r["text"] for r in rows}) == 500
    return rows


if __name__ == "__main__":
    rows = catalog()
    target = ROOT / "docs/voice-audit/streamer-v2/catalog-500.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(
            {"version": 1, "review_status": "draft_not_activated", "records": rows},
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(
        json.dumps(
            {
                "records": len(rows),
                "utf8_bytes": sum(len(r["tts_text"].encode()) for r in rows),
                "estimated_usd": round(
                    sum(len(r["tts_text"].encode()) for r in rows) * 15 / 1e6, 4
                ),
                "max_request_bytes": max(len(r["tts_text"].encode()) for r in rows),
            }
        )
    )
