"""Owner decisions apply to every stock speech route, including old recordings.

The checked-in decision snapshot contains no credentials or viewer messages.
Drafts and adapted English scripts require separate text/audio acceptance.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from winky.speech_rotation import fingerprint

ROOT = Path(__file__).resolve().parents[1]
DECISIONS = ROOT / 'docs/voice-audit/conversation-v1/editorial.json'
DISABLED_CATEGORIES = frozenset({
    'NARRATE_PAIR', 'NARRATE_EXPIRY', 'NARRATE_LESSON', 'NARRATE_TRADE',
    'NARRATE_RESULT', 'ANALYZING_CHART', 'WEAK_SIGNAL_SWITCH_PAIR',
    'PAIR_SWITCHED_NEW_SCAN', 'PREPARE_ENTRY', 'IN_TRADE_WAITING',
    'PAUSE_BETWEEN_TRADES', 'STREAM_INSIGHT', 'CHAT_ACK',
})


@lru_cache(maxsize=1)
def decisions():
    # Fail closed: absence of the owner snapshot must not resurrect an old bank.
    try:
        data = json.loads(DECISIONS.read_text())
        return {k: set(data.get(k, [])) for k in ('approved', 'legacy', 'rejected')}
    except (OSError, ValueError, KeyError, TypeError):
        return {'approved': set(), 'legacy': {'*'}, 'rejected': {'*'}}


def approved(text):
    return fingerprint(text) in decisions()['approved']


def text_allowed(text):
    """Block known old scripts everywhere, including explicit previews/cache hits."""
    key = fingerprint(text)
    return '*' not in decisions()['legacy'] and (key in decisions()['approved'] or key not in decisions()['legacy'])


def reply_allowed(text):
    """A real answer can say 'hello'; it cannot repeat an explicitly rejected script."""
    return '*' not in decisions()['rejected'] and fingerprint(text) not in decisions()['rejected']


def recording_allowed(text, root):
    # Temporary fixture/third-party banks retain their own acceptance contract.
    # All project voice banks, including future ones, require an owner text hash.
    if Path(root).resolve().is_relative_to((ROOT / 'assets/voices').resolve()):
        return approved(text)
    return True


def annotate(row):
    """One semantic group per purpose: wording changes don't create new topics."""
    row = dict(row)
    category = row.get('category', '')
    purpose = row.get('purpose') or {
        'NARRATE_SCAN': 'search_interest', 'NARRATE_CTA': 'access_reminder',
        'OPEN_TRADE_CALL': 'entry_up', 'OPEN_TRADE_PUT': 'entry_down',
        'TRADE_WIN': 'result_win', 'TRADE_LOSS': 'result_loss',
        'TRADE_REFUND': 'result_refund',
    }.get(category, category.lower())
    if category == 'CHAT_REACTION':
        purpose = 'social_' + str(row.get('conditions', {}).get('chat_kind', 'reaction'))
    row.setdefault('purpose', purpose)
    row['semantic_group'] = row.get('lang', 'ru') + ':' + purpose
    row.setdefault('repeat_after_sec', 0 if category.startswith('OPEN_') or category.startswith('TRADE_') else 120)
    return row
