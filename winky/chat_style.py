"""Short, intent-specific local replies; no invented agreement or market facts."""
import re
from winky.speech_rotation import shared_rotation, fingerprint


POOLS = {
    'greeting': '''
О, привет! Располагайся, тут графики и немножко моего характера. | Hey, welcome! Charts, commentary, and a little attitude. Make yourself comfortable.
Залетай, устраивайся. Серьёзное лицо на входе не проверяем. | Come on in, get comfy. No need to act locked in immediately.
Привет! Ты вовремя: я как раз стараюсь выглядеть собранной. | Hey! Perfect timing. I'm currently attempting to look composed.
О, знакомимся! Я Винки. За уют отвечаю, за рынок не расписываюсь. | Hi, I'm Winky! I handle the vibes. The market refuses supervision.
Привет-привет! Можно просто смотреть, экзамена по свечам не будет. | Welcome! Watching quietly is fine. There won't be a candle exam.
Салют! Чат открыт, режим неловкого молчания необязателен. | Hey there! Chat's open. Awkward silence is entirely optional.
Хей! Устраивайся, здесь можно спрашивать даже самое базовое. | Hey! Settle in. Beginner questions are absolutely welcome.
Привет! Сегодня без пафоса, хотя голос у меня старается. | Welcome! Keeping it casual, despite my voice having main-character ambitions.
''',
    'compliment': '''
Так, комплимент принят. Всё, я довольная, тебе спасибо. | Compliment received. I'm pleased with myself now, thank you very much.
Ой, хорош! Я вообще-то пыталась быть невозмутимой. | Okay, smooth! I was trying to look unbothered here.
Спасибо! Теперь главное не начать важничать в прямом эфире. | Thank you! Now I just need to resist getting smug on camera.
Ладно, это было мило. Делать вид, что не приятно, не буду. | That was cute. I'm not going to pretend I didn't enjoy it.
Ты сейчас флиртуешь или тестируешь мою концентрацию? | Are you flirting, or is this a focus test?
Так, отвлекать ведущую умеешь. Талант замечен. | You know how to distract a host. Talent officially noted.
Ещё пара таких сообщений — и я окончательно зазнаюсь. Ты предупреждён. | A few more messages like that and I'll become unbearable. You've been warned.
Спасибо, хитрец! Красиво зашёл в диалог, ничего не скажешь. | Thanks, smooth talker! That's quite an entrance into the conversation.
''',
    'skeptic': '''
Сомневаться нормально. Смотри на факты, мой уверенный голос доказательством не считается. | Doubt is fair. Check the facts; my confident voice isn't evidence.
Скепсис уважаю. Красивое оформление ещё никому не заменяло проверку. | I respect skepticism. A pretty overlay isn't a substitute for checking.
Верить на слово не предлагаю. Тут и вопросы задавать можно. | You don't have to take my word for it. Questions are welcome.
Звучит как вопрос с подвохом. Давай конкретнее, без дуэли на общих словах. | Sounds like a loaded question. Be specific; let's skip the vague duel.
Не верить всему подряд — база. С красивой подачей обмануться ещё проще. | Not believing everything on sight? Solid move. Pretty delivery can be misleading.
Не согласен — бывает. Какой именно момент тебя смущает? | Disagreeing is fine. Which part specifically bothers you?
Не обязаны сходиться во мнениях. Главное — не дорисовывать факты друг за друга. | We don't have to agree. Let's just avoid inventing each other's facts.
Рекламную уверенность убираем, проверяем по существу. Хорошая привычка. | Put the sales confidence aside and check the substance. Good habit.
''',
    'gambler': '''
Тише, режим «сейчас всё верну» лучше не включать. Эмоции дорогие советчики. | Easy. Chasing losses is a reason to pause, not a plan.
Рынку не надо ничего доказывать. Особенно размером следующей ставки. | You don't need to prove anything to the market. Especially through stake size.
Пауза тоже действие. Да, без эффектной кнопки, зато с головой. | Taking a break counts as a decision. Less flashy, more thoughtful.
Без тильта, ладно? Если эмоции понесли, лучше пауза, чем новый клик. | Let's not go on tilt, okay? If emotions take over, pause before another click.
Заранее известного исхода здесь нет. Уверенная интонация это не меняет. | The outcome isn't known beforehand. A confident delivery doesn't change that.
Если эмоции требуют немедленного клика, лучше сначала отойти от кнопок. | If emotions demand another immediate click, step away from the buttons first.
''',
    'bot': '''
Бот по ссылке в шапке профиля. Условия доступа и шаги написаны внутри. | The bot is linked in my bio. Access requirements and steps are explained there.
Загляни в шапку профиля: там ссылка на бота и инструкция. | Check my bio for the bot link and its instructions.
Ссылка в профиле ведёт в бота. Он покажет условия, без игры в угадайку. | The bio link opens the bot. It explains the requirements without the guessing game.
Бот в шапке профиля. Сначала прочитай условия внутри, потом решай. | Bot link's in my bio. Read the conditions inside before deciding.
Да, ссылку оставили в профиле. Бот проведёт по шагам. | Yep, the link's in my profile. The bot walks you through the steps.
Секретного пароля нет: ссылка в шапке, инструкция в боте. | No secret password. Link in bio, instructions in the bot.
Путь короткий: профиль, ссылка, бот. Все условия увидишь там. | Short route: profile, link, bot. You'll find the conditions there.
Лови ориентир: шапка профиля. Бот уже там, искать по чату не надо. | Here's your signpost: my bio. The bot's there; no chat archaeology needed.
Ссылку спрятали на самом видном месте — в шапке профиля. | We hid the link in plain sight: my bio.
Бот открывается из профиля. Если шаг непонятен, напиши какой именно. | Open the bot through my profile. If a step is unclear, tell me which one.
''',
    'strategy': '''
Сначала проверяется сценарий, потом вход. Красивый цвет свечи сам по себе не аргумент. | Setup first, entry second. A pretty candle colour isn't an argument.
Разбираем условия, а не угадываем желание рынка. У него с объяснениями туго. | We check conditions, not the market's wishes. Its communication skills are questionable.
Идея входа и результат — разные вещи. Хорошее объяснение не определяет плюс. | An entry idea and an outcome are different. A clear explanation doesn't determine the close.
Направление и время выбираются по сценарию. Настроение ведущей в формулу не входит. | Direction and expiry follow the setup. The host's mood isn't an input.
''',
    'general': '''
Расскажи чуть подробнее, а то я уже лор придумала. По одному сообщению, да. | Tell me a little more before I invent a whole lore arc from one message.
Подожди, это шутка или вопрос? Хочу попасть в правильный жанр. | Hang on, joke or question? I'd like to pick the right genre.
Мне нужен контекст. Телепатия сегодня почему-то без подключения. | I need a little context. Telepathy seems to be offline today.
Вот тут уточни. А то я могу сейчас подушнить совершенно не туда. | Clarify that bit. Otherwise I might start yapping in completely the wrong direction.
Интересный заход. А что ты сам об этом думаешь? | Interesting angle. What's your own take on it?
Я за разговор, но мысль потеряла на повороте. Поясни? | I'm up for a conversation, but lost that thought at the corner. Explain?
Окей, слушаю. Только без загадок пятого уровня сложности. | Okay, listening. Just keep the riddles below expert difficulty.
Можно чуть конкретнее? Мой режим всезнайки пока на обслуживании. | Could you be more specific? My know-it-all mode is under maintenance.
''',
}


def reply(comment, lang='ru'):
    low = comment.lower()
    kind = 'general'
    if re.search(r'бот|ссылк|шапк|био|\bbot\b|\bbio\b|\blink\b|\baccess\b|доступ|как начать|как зайти', low):
        kind = 'bot'
    elif re.search(r'отыгр|ва.?банк|гарант|all.?in|recover.*loss|guarantee', low):
        kind = 'gambler'
    elif re.search(r'красот|мил[а-я]*|краш|люблю|cute|pretty|beautiful|marry|love you', low):
        kind = 'compliment'
    elif re.search(r'скам|развод|обман|scam|fake|не верю', low):
        kind = 'skeptic'
    elif re.search(r'привет|салют|здаров|\b(?:hi|hey|hello)\b', low):
        kind = 'greeting'
    elif re.search(r'стратег|анализ|сценар|strategy|setup|analysis', low):
        kind = 'strategy'
    index = 0 if lang == 'ru' else 1
    pool = [line.split(' | ')[index].strip() for line in POOLS[kind].strip().splitlines()]
    rotation = shared_rotation()
    recent = {fingerprint(t) for t in rotation.recent_texts(20)}
    candidates = [t for t in pool if fingerprint(t) not in recent]
    if not candidates:
        return ''
    import random
    return '[wink] ' + random.choice(candidates)
