"""Facts for the autonomous bank. This module never controls trading or invents chat."""
from __future__ import annotations

import math
import re
from winky.commentary import context_valid, seconds

CONTRACT = 'autonomous_v1'
DERIVED = frozenset(('confirmed_result', 'previous_expressed_concern', 'cta_due',
                     'dialogue_active', 'recent_loss', 'real_written_greeting',
                     'speech_facts_confirmed', 'phase', 'remaining_sec', 'high_volatility',
                     'setup_confirmed', 'next_stake', 'open_observed'))


def finite(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def speech_context(event, current, phase, received_at, now, *, dialogue_active=False,
                   cta_due=False, last_loss_at=0, concern_episode=None):
    """Derive guarded fields again at playback; payload flags cannot grant permission."""
    result = {k: v for k, v in event.items() if k not in DERIVED and k != '_autonomous_context'}
    result.update(phase='UNKNOWN', speech_facts_confirmed=False, dialogue_active=bool(dialogue_active),
                  cta_due=bool(cta_due), recent_loss=now-last_loss_at < 60,
                  real_written_greeting=False, previous_expressed_concern=False)
    if event.get('category') == 'CHAT_REPLY' and event.get('chat_kind') == 'comment':
        result['real_written_greeting'] = bool(re.fullmatch(
            r'\s*(?:привет(?:ик|-привет)?|здравствуй(?:те)?|hello|hey|hi)[\s!.,🙂👋]*',
            str(event.get('comment', '')), re.I))
    matching = (bool(event.get('session_id')) and event.get('session_id') == current.get('session_id')
                and event.get('lang', 'ru') == current.get('lang', 'ru'))
    if not matching or not context_valid(current, received_at, now):
        return result
    category = event.get('category', '')
    same_trade = event.get('trade_seq') is not None and event.get('trade_seq') == current.get('trade_seq')
    same_search = (event.get('search_generation') is not None
                   and event.get('search_generation') == current.get('search_generation'))
    if not (same_search if category == 'NARRATE_SCAN' else same_trade):
        return result
    normalize_pair = lambda pair: re.sub(r'[^a-z0-9]', '', str(pair).lower())
    if event.get('pair') and normalize_pair(event['pair']) != normalize_pair(current.get('pair')):
        return result
    result.update(phase=phase, speech_facts_confirmed=True)
    setup = current.get('analysis_setup_confirmed') if phase == 'ANALYZING' else current.get('setup_confirmed')
    if type(setup) is bool:
        result['setup_confirmed'] = setup
    result['open_observed'] = current.get('open_observed') is True and phase == 'IN_TRADE'
    remaining = finite(current.get('remaining_sec'))
    if remaining is not None:
        result['remaining_sec'] = max(0, remaining - max(0, now-received_at))
    result['high_volatility'] = (current.get('high_volatility') is True
                                  and 0 <= now-seconds(current.get('market_observed_at')) <= 3)
    # A result must match both the trade and the category. UNKNOWN never means refund.
    last = current.get('last_result') or {}
    # The result request may arrive just before the next heartbeat. Its own
    # observed close is usable, unless a current result for that trade overrides it.
    if last.get('seq') != event.get('trade_seq'):
        observed = event.get('last_result') or {}
        if observed.get('seq') == event.get('trade_seq'):
            last = observed
    if (last.get('seq') == event.get('trade_seq') and last.get('outcome') in ('WIN', 'LOSS', 'REFUND')
            and category == 'TRADE_' + last['outcome']
            and 0 <= now-seconds(last.get('closed_at')) <= 12):
        result['confirmed_result'] = last['outcome']
        result['previous_expressed_concern'] = concern_episode == (event['session_id'], event['trade_seq'])
        if finite(current.get('next_stake')) is not None:
            result['next_stake'] = current['next_stake']
    if last.get('outcome') == 'LOSS' and 0 <= now-seconds(last.get('closed_at')) < 60:
        result['recent_loss'] = True
    # Direction comes from the current observed trade, not the stale queued payload.
    result['direction'] = current.get('direction')
    return result


def rejection_reason(record, event):
    """Empty string means eligible. Lists are choices; *_range means a numeric interval."""
    if record.get('speech_contract') and record['speech_contract'] != CONTRACT:
        return 'unsupported_speech_contract'
    if record.get('speech_contract') == CONTRACT:
        event = event.get('_autonomous_context', event)
        if record.get('requires_fresh_context') and event.get('speech_facts_confirmed') is not True:
            return 'fresh_trade_context_required'
        if record.get('dialogue_policy') == 'defer' and event.get('dialogue_active') is True:
            return 'dialogue_has_priority'
    for key, expected in record.get('conditions', {}).items():
        if key.endswith('_range'):
            value = finite(event.get(key[:-6]))
            if (not isinstance(expected, list) or len(expected) != 2 or value is None
                    or any(finite(v) is None for v in expected)
                    or not float(expected[0]) <= value <= float(expected[1])):
                return 'condition:' + key
        else:
            value = event.get(key)
            choices = expected if isinstance(expected, list) else [expected]
            if not any((type(value) is bool and value is option) if type(option) is bool
                       else value == option for option in choices):
                return 'condition:' + key
    return ''
