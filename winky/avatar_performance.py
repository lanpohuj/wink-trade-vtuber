"""Local avatar metadata. Audio and trading events remain owned by their existing queues."""
from __future__ import annotations
import json
import hashlib
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP_PATH = ROOT / 'winky/web/avatar-phrases.json'


def describe(text='', category='', conditions=None, tone='', emotion='happy', action=None):
    category = {'START_STREAM_READY':'GREETING', 'ANALYZING_CHART':'NARRATE_SCAN',
                'WEAK_SIGNAL_SWITCH_PAIR':'NARRATE_SCAN','PAIR_SWITCHED_NEW_SCAN':'NARRATE_PAIR',
                'PREPARE_ENTRY':'OPEN_TRADE_CALL','IN_TRADE_WAITING':'NARRATE_TRADE',
                'STREAM_INSIGHT':'NARRATE_LESSON'}.get(category, category)
    conditions = conditions or {}
    kind = conditions.get('chat_kind', '')
    if category == 'TRADE_LOSS' or category == 'NARRATE_RESULT':
        profile = 'loss'
    elif category == 'TRADE_WIN':
        profile = 'win'
    elif category == 'TRADE_REFUND':
        profile = 'refund'
    elif category.startswith('OPEN_') or category == 'NARRATE_EXPIRY':
        profile = 'opening'
    elif category in ('NARRATE_LESSON', 'NARRATE_VOLATILITY', 'NARRATE_TRADE'):
        profile = 'explain'
    elif category in ('NARRATE_SCAN', 'NARRATE_PAIR'):
        profile = 'focus'
    elif kind in ('follow', 'gift', 'like'):
        profile = 'thanks'
    elif category == 'GREETING' or kind == 'join' or emotion in ('wave', 'greeting'):
        profile = 'greet'
    elif kind == 'bot' or category == 'NARRATE_CTA':
        profile = 'cta'
    elif emotion in ('blush', 'shy'):
        profile = 'flirt'
    elif emotion == 'thinking':
        profile = 'explain'
    elif tone == 'sarcastic' or emotion == 'wink':
        profile = 'ironic'
    else:
        profile = 'chat'
    # Chat emotion tags cannot reinterpret a confirmed loss or opening as flirt.
    return dict(profile=profile, tone=tone or 'conversational',
                flirt_allowed=profile in ('chat', 'flirt', 'ironic', 'thanks', 'greet', 'cta'),
                emotion={'loss':'thinking','opening':'neutral','focus':'neutral',
                         'explain':'thinking','win':'happy','refund':'neutral',
                         'thanks':'happy','flirt':'blush','ironic':'wink'}.get(profile,'happy'),
                cue_offsets=[0.25])


@lru_cache(maxsize=1)
def phrase_map():
    try:
        return json.loads(MAP_PATH.read_text())['records']
    except (OSError, ValueError, KeyError):
        return {}


def for_item(item):
    known = phrase_map().get(item.bank_id)
    if known and known.get('text_sha256') == hashlib.sha256(item.text.encode()).hexdigest():
        return dict(known)
    event = item.event or {}
    category = event.get('category', '')
    if item.source == 'signal_announcement':
        category = 'OPEN_TRADE_CALL'
    elif item.source.startswith('trade_event_'):
        legacy_kind = item.source[len('trade_event_'):]
        category = {'win':'TRADE_WIN','loss_step1':'TRADE_LOSS','loss_step2':'TRADE_LOSS',
                    'flat_skip':'NARRATE_SCAN','start_analysis':'NARRATE_SCAN','switch_pair':'NARRATE_PAIR'}.get(legacy_kind, category)
    result = describe(item.text, category, event,
                      item.animation.get('tone', ''), item.emotion, item.action)
    # Local/LLM replies use their actual text and parsed emotion, not a pre-reply gesture.
    if result['profile'] == 'chat' and re.search(r'спасибо|благодар|thank', item.text, re.I):
        result.update(profile='thanks', emotion='happy')
    if item.chat_item and result['profile'] in ('chat','thanks','greet','flirt'):
        intent=chat_animation_intent(getattr(item.chat_item,'text',''))
        if intent in ('blush','wave'):
            result.update(profile='flirt' if intent=='blush' else 'greet',emotion=intent)
    return result


def chat_animation_intent(text: str):
    """Whole-word intent only: 'купил' is not 'ку', 'миллион' is not a compliment."""
    if re.search(r"\b(?:красотк\w*|красив(?:ая|о|ый)|милая|миленьк\w*|милашк\w*|люблю\s+тебя|ты\s+лучшая|cute|beautiful|gorgeous|love\s+you)\b",text,re.I):
        return 'blush'
    if re.search(r"\b(?:привет\w*|хей|ку|здарова|добрый\s+(?:день|вечер)|hi|hello|hey|салют)\b",text,re.I):
        return 'wave'
    if re.search(r"\b(?:выиграл\w*|победа|win|won)\b",text,re.I):
        return 'excited'
    return None
