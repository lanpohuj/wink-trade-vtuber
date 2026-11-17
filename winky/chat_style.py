"""Short, intent-specific local replies; no invented agreement or market facts."""
import re
from winky.speech_rotation import shared_rotation, fingerprint


# Only owner-approved, intent-specific emergency replies. No generic agreement,
# forced humour or paid synthesis of unrelated filler when the LLM is unavailable.
POOLS = {
    'bot': (
        ('Бот по ссылке в шапке профиля. Условия доступа и шаги написаны внутри.', ''),
        ('Доступ объясняется в боте, он по ссылке в профиле. Если шаг непонятен, уточни какой.', ''),
        ('Если хочешь разобраться с инструментами, начни с бота в шапке. Он объяснит шаги.', ''),
    ),
}


def reply_pool(comment, lang='ru'):
    low = comment.lower()
    kind = 'general'
    if re.search(r'отыгр|ва.?банк|гарант|all.?in|recover.*loss|guarantee', low):
        kind = 'gambler'
    elif re.search(r'скам|развод|обман|scam|fake|не верю', low):
        kind = 'skeptic'
    elif re.search(r'(?:ты|она|это)\s+(?:[а-яё]+\s+){0,2}(?:бот|ии)\b|\b(?:are you|you are|you[’\x27]re|is this|this is)\s+(?:an?\s+)?(?:ai\s+)?(?:bot|ai)\b',low):
        kind = 'identity'
    elif re.search(r'ссылк|шапк|био|\bbio\b|\blink\b|\baccess\b|доступ|как начать|как зайти|(?:где|дай|скинь|пришли|найти|хочу|нужен).{0,30}бот|бот.{0,30}(?:где|найти|зайти|подключ|сигнал|инструмент|телеграм)|\b(?:where|get|join).{0,30}\bbot\b', low):
        kind = 'bot'
    elif re.search(r'красот|мил[а-я]*|краш|люблю|cute|pretty|beautiful|marry|love you', low):
        kind = 'compliment'
    elif re.search(r'привет|салют|здаров|\b(?:hi|hey|hello)\b', low):
        kind = 'greeting'
    elif re.search(r'стратег|анализ|сценар|strategy|setup|analysis', low):
        kind = 'strategy'
    index = 0 if lang == 'ru' else 1
    pool = []
    from winky.editorial import approved
    for variants in POOLS.get(kind, ()):
        text = variants[index]
        if not text or not approved(text):
            continue
        pool.append(dict(id='chat_' + fingerprint(text), text=text, lang=lang,
                         topic='chat_' + kind, tone='neutral'))
    return lang + ':chat_local:' + kind, pool


def reply(comment, lang='ru'):
    key, pool = reply_pool(comment, lang)
    if not pool:
        return ''
    rotation = shared_rotation()
    row = rotation.reserve(pool, key)
    if not row:
        return ''
    # Preparation is not playback. Recheck and commit the exact prepared answer
    # in SpeechController when it reaches the player; cancelled synthesis uses no slot.
    rotation.release(row['id'])
    return row['text']
